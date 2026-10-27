import { DemoSeedService } from '../../src/demo/demo-seed.service';
import { DEMO_MARKER, DEMO_OWNER_IDS } from '../../src/demo/demo-content';

type Row = Record<string, unknown>;

/** Un DataSource en memoria que entiende las consultas que hace el servicio. */
function fakeDataSource(spots: { id: string; address: string; covered: boolean; description: string }[]) {
  const demoSpots = new Map<string, { photos_done: boolean }>();
  const updates: Row[] = [];
  const query = jest.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('CREATE TABLE')) return [];
    if (sql.includes('FROM parking_spots') && sql.includes('NOT IN')) {
      return spots.filter((s) => s.description.includes(DEMO_MARKER) && !demoSpots.has(s.id));
    }
    if (sql.includes('FROM demo_spots d JOIN parking_spots s ON s.id = d.spot_id WHERE NOT d.photos_done')) {
      return [...demoSpots]
        .filter(([, v]) => !v.photos_done)
        .map(([spot_id]) => ({ spot_id, covered: spots.find((s) => s.id === spot_id)!.covered }));
    }
    if (sql.startsWith('INSERT INTO demo_spots')) {
      const [spotId, photosDone] = params as [string, boolean];
      if (demoSpots.has(spotId)) return [];
      demoSpots.set(spotId, { photos_done: photosDone });
      return [{ spot_id: spotId }];
    }
    if (sql.includes('UPDATE parking_spots SET photos')) {
      updates.push({ id: params[0], photos: JSON.parse(params[1] as string) });
      return [];
    }
    if (sql.includes('UPDATE parking_spots')) {
      const [id, title, description, address, ownerId, photos, rules, access] = params as string[];
      updates.push({ id, title, description, address, ownerId, photos: JSON.parse(photos), rules: JSON.parse(rules), access });
      const spot = spots.find((s) => s.id === id)!;
      spot.description = description;
      return [];
    }
    if (sql.includes('UPDATE demo_spots SET photos_done')) {
      demoSpots.get(params[0] as string)!.photos_done = true;
      return [];
    }
    if (sql.includes('FROM demo_spots d JOIN parking_spots s')) {
      return [...demoSpots.keys()].map((id) => ({ id, owner_id: DEMO_OWNER_IDS[0], price_per_hour: '7500.00' }));
    }
    throw new Error(`consulta no prevista: ${sql}`);
  });
  const dataSource = { query, transaction: async (fn: (m: unknown) => unknown) => fn({ query }) };
  return { dataSource, updates, demoSpots, query };
}

const spots = () =>
  [1, 2, 3].map((n) => ({
    id: `ff602e93-534d-5d48-b908-00000000000${n}`,
    address: 'Palermo, Ciudad Autónoma de Buenos Aires, Argentina',
    covered: n !== 3,
    description: `Publicación demo repartida por CABA. ${DEMO_MARKER}`,
  }));

function serviceWith(data: ReturnType<typeof fakeDataSource>, env: Record<string, string> = {}, storage = { uploadObject: jest.fn() }) {
  const config = { get: (key: string) => env[key] };
  return new DemoSeedService(data.dataSource as never, storage as never, config as never);
}

describe('DemoSeedService', () => {
  it('completa las cocheras demo con contenido, un dueño de ejemplo y foto', async () => {
    const data = fakeDataSource(spots());
    const result = await serviceWith(data, { DEMO_PHOTOS_BASE_URL: 'https://fotos.example/demo/' }).run();

    expect(result).toEqual({ seeded: 3, photosFilled: 0 });
    expect(data.updates).toHaveLength(3);
    for (const update of data.updates) {
      expect(update.description).not.toContain(DEMO_MARKER);
      expect(String(update.title)).toMatch(/\d+$/);
      expect(DEMO_OWNER_IDS).toContain(update.ownerId);
      expect((update.photos as string[])[0]).toMatch(/^https:\/\/fotos\.example\/demo\/(covered|open)-\d+\.jpg$/);
    }
  });

  it('una cochera cubierta recibe un garage techado y una descubierta un patio sin techo', async () => {
    const data = fakeDataSource(spots()); // la 1 y la 2 son cubiertas, la 3 no
    await serviceWith(data, { DEMO_PHOTOS_BASE_URL: 'https://f.example' }).run();

    const photoOf = (id: string) => (data.updates.find((u) => u.id === id)!.photos as string[])[0];
    expect(photoOf(spots()[0].id)).toMatch(/\/covered-\d\.jpg$/);
    expect(photoOf(spots()[1].id)).toMatch(/\/covered-\d\.jpg$/);
    expect(photoOf(spots()[2].id)).toMatch(/\/open-\d\.jpg$/);
  });

  it('es idempotente: una segunda pasada no toca nada', async () => {
    const data = fakeDataSource(spots());
    const service = serviceWith(data, { DEMO_PHOTOS_BASE_URL: 'https://fotos.example' });
    await service.run();
    const updatesAfterFirst = data.updates.length;

    expect(await service.run()).toEqual({ seeded: 0, photosFilled: 0 });
    expect(data.updates).toHaveLength(updatesAfterFirst);
  });

  it('no repite una cochera que otra instancia ya tomó', async () => {
    const data = fakeDataSource(spots());
    data.demoSpots.set(spots()[0].id, { photos_done: true });
    expect((await serviceWith(data, { DEMO_PHOTOS_BASE_URL: 'https://f.example' }).run()).seeded).toBe(2);
  });

  it('sin almacenamiento de fotos completa el resto y agrega la foto en un arranque posterior', async () => {
    const data = fakeDataSource(spots());
    expect(await serviceWith(data).run()).toEqual({ seeded: 3, photosFilled: 0 });
    expect(data.updates.every((u) => (u.photos as string[]).length === 0)).toBe(true);

    const later = serviceWith(data, { DEMO_PHOTOS_BASE_URL: 'https://f.example' });
    expect(await later.run()).toEqual({ seeded: 0, photosFilled: 3 });
    expect([...data.demoSpots.values()].every((v) => v.photos_done)).toBe(true);
  });

  it('sube las fotos al almacenamiento de las cocheras cuando está configurado', async () => {
    const data = fakeDataSource(spots());
    const storage = { uploadObject: jest.fn(async (key: string, _body: Buffer, _type: string) => `https://cdn.example/${key}`) };
    await serviceWith(data, { R2_PUBLIC_URL: 'https://cdn.example', R2_BUCKET_NAME: 'bucket' }, storage).run();

    expect(storage.uploadObject).toHaveBeenCalledTimes(8);
    expect(storage.uploadObject.mock.calls[0][0]).toBe('parking-spots/demo/covered-1.jpg');
    expect(storage.uploadObject.mock.calls[0][2]).toBe('image/jpeg');
    expect((data.updates[0].photos as string[])[0]).toMatch(/^https:\/\/cdn\.example\/parking-spots\/demo\/(covered|open)-\d+\.jpg$/);
  });

  it('si falla la subida de fotos deja las cocheras sin foto y sigue', async () => {
    const data = fakeDataSource(spots());
    const storage = { uploadObject: jest.fn().mockRejectedValue(new Error('R2 caído')) };
    const result = await serviceWith(data, { R2_PUBLIC_URL: 'https://cdn.example', R2_BUCKET_NAME: 'bucket' }, storage).run();
    expect(result.seeded).toBe(3);
    expect(data.updates.every((u) => (u.photos as string[]).length === 0)).toBe(true);
  });

  it('lista las cocheras demo con su dueño y precio para booking-service', async () => {
    const data = fakeDataSource(spots());
    const service = serviceWith(data, { DEMO_PHOTOS_BASE_URL: 'https://f.example' });
    await service.run();
    const list = await service.listDemoSpots();
    expect(list).toHaveLength(3);
    expect(list[0]).toEqual({ id: expect.any(String), ownerId: DEMO_OWNER_IDS[0], pricePerHour: 7500 });
  });

  it('solo corre al arrancar con SEED_DEMO_DATA=true', () => {
    const data = fakeDataSource(spots());
    serviceWith(data).onApplicationBootstrap();
    expect(data.query).not.toHaveBeenCalled();
  });

  it('un fallo al arrancar no se propaga', async () => {
    const data = fakeDataSource(spots());
    data.query.mockRejectedValue(new Error('base caída'));
    const service = serviceWith(data, { SEED_DEMO_DATA: 'true' });
    expect(() => service.onApplicationBootstrap()).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
  });
});
