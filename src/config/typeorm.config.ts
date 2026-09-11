import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Client } from 'pg';
import { ParkingSpot } from '../parking-spots/entities/parking-spot.entity';
import { ParkingSpotSchedule } from '../parking-spots/entities/parking-spot-schedule.entity';
import { Favorite } from '../favorites/entities/favorite.entity';

const POSTGIS_RETRY_ATTEMPTS = 5;
const POSTGIS_RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Habilita PostGIS antes de que TypeORM abra su propia conexión y sincronice
 * -- `synchronize: true` (abajo) crea la columna `location` como `geography`,
 * un tipo que sólo existe si la extensión ya está prendida. En una base
 * recién creada (Render, o cualquier Postgres sin la imagen postgis/postgis
 * que usa el compose local) eso rompería el primer boot. No puede resolverse
 * desde SchemaBootstrapService porque ese corre DESPUÉS de synchronize (ver
 * el comentario ahí) -- por eso una conexión aparte, acá, antes de todo.
 * Reintenta unas veces por si el Postgres recién provisionado todavía no
 * acepta conexiones en el primer intento (mismo motivo que
 * booking-service/cmd/setup_rabbitmq.go reintenta el dial a RabbitMQ).
 * Idempotente (`IF NOT EXISTS`) y sin efecto en local, donde la imagen
 * postgis/postgis ya trae la extensión habilitada.
 */
async function ensurePostgisExtension(clientConfig: {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= POSTGIS_RETRY_ATTEMPTS; attempt++) {
    const client = new Client(clientConfig);
    try {
      await client.connect();
      await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      if (attempt < POSTGIS_RETRY_ATTEMPTS) await sleep(POSTGIS_RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

export const typeOrmConfig = async (): Promise<TypeOrmModuleOptions> => {
  // DATABASE_URL es una alternativa a DB_HOST/PORT/USER/PASSWORD/NAME sueltos
  // -- Render Blueprint sólo puede exponer el connection string completo de
  // una base gestionada (no host/port por separado), así que este camino
  // existe para poder deployar ahí sin tocar nada más. El compose local
  // sigue usando las variables sueltas de siempre.
  const databaseUrl = process.env.DATABASE_URL;
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT) || 5432;
  const username = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  await ensurePostgisExtension(
    databaseUrl ? { connectionString: databaseUrl } : { host, port, user: username, password, database },
  );

  return {
    type: 'postgres',
    ...(databaseUrl ? { url: databaseUrl } : { host, port, username, password, database }),
    entities: [ParkingSpot, ParkingSpotSchedule, Favorite],
    // synchronize solo para desarrollo/TFI. En un entorno real se reemplaza por migraciones.
    synchronize: true,
    logging: ['error', 'warn'],
  };
};
