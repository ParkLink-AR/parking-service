import { DEMO_OWNER_IDS, hashOf, neighborhoodOf, profileFor } from '../../src/demo/demo-content';

const id = (n: number) => `ff602e93-534d-5d48-b908-${String(n).padStart(12, '0')}`;
const spot = (n: number, address = 'Palermo, Ciudad Autónoma de Buenos Aires, Argentina', covered = true) => ({ id: id(n), address, covered });

describe('demo content', () => {
  it('es siempre el mismo para la misma cochera', () => {
    expect(profileFor(spot(1))).toEqual(profileFor(spot(1)));
    expect(hashOf('abc')).toBe(hashOf('abc'));
  });

  it('toma el barrio de lo primero que dice la dirección', () => {
    expect(neighborhoodOf('Villa Urquiza, Ciudad Autónoma de Buenos Aires, Argentina')).toBe('Villa Urquiza');
    expect(neighborhoodOf('')).toBe('Buenos Aires');
  });

  it('arma un título y una dirección con calle y número, no con un numerito de serie', () => {
    const profile = profileFor(spot(7, 'Colegiales, Ciudad Autónoma de Buenos Aires, Argentina'));
    expect(profile.title).toMatch(/^(Cochera|Garage) .+ \d+$/);
    expect(profile.title).not.toContain('#');
    expect(profile.address).toMatch(/, Colegiales, CABA$/);
    expect(profile.address).toMatch(/\d+, Colegiales/);
  });

  it('usa una calle y una altura del barrio', () => {
    for (let n = 0; n < 40; n++) {
      const { address } = profileFor(spot(n, 'Belgrano, Ciudad Autónoma de Buenos Aires, Argentina'));
      const [, street, number] = address.match(/^(.+) (\d+), Belgrano, CABA$/)!;
      expect(['Av. Cabildo', 'Av. Juramento', 'Av. Monroe']).toContain(street);
      expect(Number(number)).toBeGreaterThanOrEqual(1500);
      expect(Number(number)).toBeLessThanOrEqual(3300);
    }
  });

  it('un barrio que no conoce igual recibe calle y número', () => {
    const profile = profileFor(spot(3, 'Barrio Nuevo, Ciudad Autónoma de Buenos Aires, Argentina'));
    expect(profile.address).toMatch(/^Av\. .+ \d+, Barrio Nuevo, CABA$/);
  });

  it('nunca deja la marca interna ni texto sin completar en lo que ve el usuario', () => {
    for (let n = 0; n < 60; n++) {
      const profile = profileFor(spot(n, 'Palermo, Ciudad Autónoma de Buenos Aires, Argentina', n % 2 === 0));
      const visible = [profile.title, profile.address, profile.description, profile.accessInstructions, ...profile.rules].join(' ');
      expect(visible).not.toContain('parklink-demo');
      expect(visible).not.toMatch(/[{}]/);
      expect(profile.description.length).toBeGreaterThan(40);
    }
  });

  it('la descripción de una cochera cubierta no dice que es descubierta, y al revés', () => {
    for (let n = 0; n < 30; n++) {
      expect(profileFor(spot(n, undefined, true)).description.toLowerCase()).not.toMatch(/al aire libre|descubiert|sin techo/);
      expect(profileFor(spot(n, undefined, false)).description.toLowerCase()).not.toMatch(/cubiert|techad|con techo/);
    }
  });

  it('elige dos reglas distintas', () => {
    for (let n = 0; n < 50; n++) {
      const { rules } = profileFor(spot(n));
      expect(rules).toHaveLength(2);
      expect(rules[0]).not.toBe(rules[1]);
    }
  });

  it('reparte las cocheras entre los dueños de ejemplo y las fotos', () => {
    const profiles = Array.from({ length: 200 }, (_, n) => profileFor(spot(n)));
    const owners = new Set(profiles.map((p) => p.ownerId));
    expect(owners.size).toBeGreaterThanOrEqual(8);
    owners.forEach((owner) => expect(DEMO_OWNER_IDS).toContain(owner));
    expect(new Set(profiles.map((p) => p.photoSeed % 8)).size).toBeGreaterThanOrEqual(6);
  });

  it('dos cocheras del mismo barrio rara vez se llaman igual', () => {
    const titles = Array.from({ length: 60 }, (_, n) => profileFor(spot(n)).title);
    expect(new Set(titles).size).toBeGreaterThan(50);
  });
});
