import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { StorageService } from '../storage/storage.service';
import { DEMO_MARKER, profileFor } from './demo-content';

export interface DemoSpotRef {
  id: string;
  ownerId: string;
  pricePerHour: number | null;
}

/** URLs de las fotos de ejemplo: las `covered-*` son garages techados y las `open-*` patios sin techo. */
export interface DemoPhotoUrls {
  covered: string[];
  open: string[];
}

const PHOTOS_DIR = join(process.cwd(), 'assets', 'demo-photos');
const PHOTO_KEY_PREFIX = 'parking-spots/demo';

/**
 * Datos de demostración: cocheras con nombre, dirección, descripción y foto decentes, a nombre de
 * dueños de ejemplo. Parte de las cocheras que ya existen marcadas con DEMO_MARKER (las que cargó
 * el generador de datos demo), les pone contenido real y las anota en `demo_spots` para no
 * repetirlas. Las reseñas de esas cocheras las agrega booking-service, que le pide a este servicio
 * la lista en `GET /internal/demo-spots`.
 *
 * Solo corre con SEED_DEMO_DATA=true y nunca frena el arranque si algo falla: en el próximo
 * arranque retoma donde quedó (todo es idempotente).
 */
@Injectable()
export class DemoSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get<string>('SEED_DEMO_DATA') !== 'true') return;
    // En segundo plano: la carga no debe demorar ni romper el arranque del servicio.
    void this.run().catch((error) => this.logger.error(`Demo seed falló: ${error?.message ?? error}`));
  }

  async run(): Promise<{ seeded: number; photosFilled: number }> {
    await this.ensureTable();

    const pending: { id: string; address: string; covered: boolean }[] = await this.dataSource.query(
      `SELECT id, address, covered FROM parking_spots
        WHERE description LIKE $1 AND status <> 'deleted'
          AND id NOT IN (SELECT spot_id FROM demo_spots)`,
      [`%${DEMO_MARKER}%`],
    );
    const withoutPhotos: { spot_id: string; covered: boolean }[] = await this.dataSource.query(
      `SELECT d.spot_id, s.covered FROM demo_spots d JOIN parking_spots s ON s.id = d.spot_id WHERE NOT d.photos_done`,
    );
    if (pending.length === 0 && withoutPhotos.length === 0) return { seeded: 0, photosFilled: 0 };

    const photoUrls = await this.resolvePhotoUrls();

    let seeded = 0;
    for (const spot of pending) {
      if (await this.seedSpot(spot, photoUrls)) seeded++;
    }

    let photosFilled = 0;
    for (const { spot_id: spotId, covered } of withoutPhotos) {
      const photos = this.photosFor(photoUrls, covered, profileFor({ id: spotId, address: '', covered }).photoSeed);
      if (photos.length === 0) continue;
      await this.dataSource.query('UPDATE parking_spots SET photos = $2::jsonb WHERE id = $1', [spotId, JSON.stringify(photos)]);
      await this.dataSource.query('UPDATE demo_spots SET photos_done = true WHERE spot_id = $1', [spotId]);
      photosFilled++;
    }

    this.logger.log(`Demo seed: ${seeded} cocheras completadas, ${photosFilled} con foto agregada después.`);
    return { seeded, photosFilled };
  }

  /** Las cocheras demo ya completadas, para que booking-service les cargue reseñas. */
  async listDemoSpots(): Promise<DemoSpotRef[]> {
    await this.ensureTable();
    const rows: { id: string; owner_id: string; price_per_hour: string | null }[] = await this.dataSource.query(
      `SELECT s.id, s.owner_id, s.price_per_hour
         FROM demo_spots d JOIN parking_spots s ON s.id = d.spot_id
        WHERE s.status = 'active'
        ORDER BY s.id`,
    );
    return rows.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      pricePerHour: row.price_per_hour === null ? null : Number(row.price_per_hour),
    }));
  }

  private async ensureTable(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS demo_spots (
        spot_id      uuid PRIMARY KEY,
        photos_done  boolean NOT NULL DEFAULT false,
        seeded_at    timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  /** Completa una cochera. Devuelve false si otra instancia ya la tomó. */
  private async seedSpot(spot: { id: string; address: string; covered: boolean }, photoUrls: DemoPhotoUrls): Promise<boolean> {
    const profile = profileFor(spot);
    const photos = this.photosFor(photoUrls, spot.covered, profile.photoSeed);

    return this.dataSource.transaction(async (manager) => {
      const claimed = await manager.query(
        'INSERT INTO demo_spots (spot_id, photos_done) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING spot_id',
        [spot.id, photos.length > 0],
      );
      if (claimed.length === 0) return false;

      await manager.query(
        `UPDATE parking_spots
            SET title = $2, description = $3, address = $4, owner_id = $5,
                photos = $6::jsonb, rules = $7::jsonb, access_instructions = $8, updated_at = now()
          WHERE id = $1`,
        [
          spot.id,
          profile.title,
          profile.description,
          profile.address,
          profile.ownerId,
          JSON.stringify(photos),
          JSON.stringify(profile.rules),
          profile.accessInstructions,
        ],
      );
      return true;
    });
  }

  /** Una foto acorde al tipo de cochera: una descubierta no muestra un garage techado, y al revés. */
  private photosFor(urls: DemoPhotoUrls, covered: boolean, seed: number): string[] {
    const preferred = covered ? urls.covered : urls.open;
    const pool = preferred.length > 0 ? preferred : covered ? urls.open : urls.covered;
    return pool.length > 0 ? [pool[seed % pool.length]] : [];
  }

  /**
   * Las URLs de las fotos de ejemplo. Con DEMO_PHOTOS_BASE_URL se usan tal cual (fotos alojadas en
   * otro lado); si no, se suben al mismo almacenamiento que las fotos reales de las cocheras.
   * Sin ninguna de las dos cosas queda vacío y las fotos se completan en un arranque posterior.
   */
  private async resolvePhotoUrls(): Promise<DemoPhotoUrls> {
    const empty: DemoPhotoUrls = { covered: [], open: [] };

    let files: string[];
    try {
      files = (await readdir(PHOTOS_DIR)).filter((name) => /\.(jpe?g|png|webp)$/i.test(name)).sort();
    } catch {
      this.logger.warn(`No hay fotos de ejemplo en ${PHOTOS_DIR}; las cocheras demo quedan sin foto.`);
      return empty;
    }

    const urlOf = await this.publish(files);
    if (!urlOf) return empty;
    return {
      covered: files.filter((name) => name.startsWith('covered')).map(urlOf),
      open: files.filter((name) => name.startsWith('open')).map(urlOf),
    };
  }

  /** nombre de archivo -> URL pública, o null si no hay dónde publicarlas. */
  private async publish(files: string[]): Promise<((name: string) => string) | null> {
    const baseUrl = (this.config.get<string>('DEMO_PHOTOS_BASE_URL') ?? '').replace(/\/$/, '');
    if (baseUrl) return (name) => `${baseUrl}/${name}`;

    if (!this.config.get<string>('R2_PUBLIC_URL') || !this.config.get<string>('R2_BUCKET_NAME')) {
      this.logger.warn('Sin almacenamiento de fotos configurado (R2): las cocheras demo quedan sin foto por ahora.');
      return null;
    }

    try {
      const uploaded = new Map<string, string>();
      for (const name of files) {
        const contentType = name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        uploaded.set(name, await this.storage.uploadObject(`${PHOTO_KEY_PREFIX}/${name}`, await readFile(join(PHOTOS_DIR, name)), contentType));
      }
      return (name) => uploaded.get(name)!;
    } catch (error) {
      this.logger.error(`No se pudieron subir las fotos de ejemplo: ${(error as Error).message}`);
      return null;
    }
  }
}
