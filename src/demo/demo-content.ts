// Contenido de las cocheras de demostración: cada una recibe un título, una dirección, una
// descripción, reglas, indicaciones de acceso, un dueño y una foto, todo derivado del id de la
// cochera. Así el resultado es siempre el mismo para la misma cochera (no cambia entre deploys)
// y no hay dos cocheras iguales en la misma lista.

/** Marca con la que se crearon las cocheras demo de producción; se borra de la descripción al completarlas. */
export const DEMO_MARKER = '[parklink-demo-spread]';

// Los dueños de ejemplo existen en auth-service con estos mismos ids (ver auth-service/app/demo_seed.py).
export const DEMO_OWNER_IDS = Array.from({ length: 10 }, (_, index) => `0e000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);

/** Barrio -> calles conocidas con un rango de numeración razonable. */
const STREETS: Record<string, [string, number, number][]> = {
  'Agronomía': [['Av. San Martín', 5100, 5700], ['Av. Chorroarín', 400, 900], ['Cuenca', 3300, 3800]],
  'Almagro': [['Av. Rivadavia', 3500, 4500], ['Av. Corrientes', 3700, 4600], ['Medrano', 300, 1000]],
  'Barracas': [['Av. Montes de Oca', 100, 1000], ['Av. Iriarte', 200, 2200], ['Av. Vélez Sarsfield', 100, 900]],
  'Belgrano': [['Av. Cabildo', 1500, 2900], ['Av. Juramento', 1500, 2700], ['Av. Monroe', 2500, 3300]],
  'Boedo': [['Av. Boedo', 100, 900], ['Av. San Juan', 3400, 4400], ['Av. Independencia', 3500, 4300]],
  'Caballito': [['Av. Rivadavia', 4800, 6200], ['Av. Díaz Vélez', 4500, 5900], ['Pedro Goyena', 100, 900]],
  'Chacarita': [['Av. Corrientes', 6000, 6900], ['Av. Federico Lacroze', 3300, 4200], ['Av. Elcano', 3600, 4200]],
  'Coghlan': [['Av. Triunvirato', 3200, 3700], ['Av. Monroe', 4000, 4900], ['Av. Congreso', 3000, 3900]],
  'Colegiales': [['Av. Elcano', 3000, 3600], ['Av. Federico Lacroze', 2000, 3200], ['Av. Álvarez Thomas', 400, 1100]],
  'Constitución': [['Av. Brasil', 800, 1400], ['Av. Garay', 1100, 1900], ['Av. Entre Ríos', 1000, 1300]],
  'Flores': [['Av. Rivadavia', 6300, 7500], ['Av. Carabobo', 100, 900], ['Av. Directorio', 700, 1700]],
  'Floresta': [['Av. Gaona', 3800, 4400], ['Av. Avellaneda', 2400, 3600], ['Av. Juan B. Justo', 6200, 7000]],
  'La Boca': [['Av. Almirante Brown', 800, 1700], ['Av. Pedro de Mendoza', 1700, 2800], ['Av. Patricios', 100, 1100]],
  'Liniers': [['Av. Rivadavia', 11200, 11900], ['Av. Ramón L. Falcón', 5900, 6500], ['Av. Juan B. Justo', 8200, 9000]],
  'Mataderos': [['Av. Directorio', 6200, 7100], ['Av. Eva Perón', 6000, 7200], ['Av. Lisandro de la Torre', 2100, 2700]],
  'Microcentro': [['Av. Corrientes', 800, 1200], ['Reconquista', 300, 900], ['Sarmiento', 500, 1000]],
  'Monte Castro': [['Av. Álvarez Jonte', 4800, 5700], ['Av. Segurola', 1100, 1700], ['Av. Juan B. Justo', 6200, 7000]],
  'Nueva Pompeya': [['Av. Sáenz', 700, 1200], ['Av. Amancio Alcorta', 2700, 3300], ['Av. Perito Moreno', 1600, 2100]],
  'Núñez': [['Av. Cabildo', 3400, 4300], ['Av. del Libertador', 7200, 8300], ['Av. Congreso', 2500, 3200]],
  'Palermo': [['Av. Santa Fe', 3200, 4400], ['Av. Scalabrini Ortiz', 1400, 2400], ['Honduras', 4500, 5800]],
  'Parque Avellaneda': [['Av. Directorio', 4000, 5000], ['Av. Eva Perón', 5000, 5900], ['Av. Lisandro de la Torre', 1000, 1900]],
  'Parque Chas': [['Av. Triunvirato', 4200, 4600], ['Av. de los Constituyentes', 3300, 3900], ['Av. Chorroarín', 100, 800]],
  'Parque Patricios': [['Av. Caseros', 3200, 3900], ['Av. Chiclana', 3400, 3900], ['Av. Almafuerte', 200, 900]],
  'Paternal': [['Av. San Martín', 2700, 3500], ['Av. Warnes', 1700, 2400], ['Av. Chorroarín', 100, 800]],
  'Recoleta': [['Av. Santa Fe', 1700, 2800], ['Av. Las Heras', 2000, 3100], ['Junín', 1000, 1800]],
  'Retiro': [['Av. del Libertador', 100, 1000], ['Av. Santa Fe', 700, 1500], ['Av. Leandro N. Alem', 1000, 1700]],
  'Saavedra': [['Av. Cabildo', 4500, 5600], ['Av. Ricardo Balbín', 3800, 4600], ['Av. Crisólogo Larralde', 4100, 4900]],
  'San Telmo': [['Defensa', 600, 1300], ['Av. Paseo Colón', 100, 900], ['Balcarce', 400, 1100]],
  'Versalles': [['Av. Rivadavia', 10300, 10900], ['Av. Segurola', 1800, 2400], ['Av. Juan B. Justo', 7300, 8100]],
  'Villa Crespo': [['Av. Corrientes', 5100, 6000], ['Av. Warnes', 500, 1100], ['Av. Scalabrini Ortiz', 600, 1200]],
  'Villa Devoto': [['Av. Francisco Beiró', 4500, 5500], ['Av. Mosconi', 3000, 4000], ['Av. Lincoln', 3700, 4200]],
  'Villa Lugano': [['Av. Eva Perón', 7000, 8500], ['Av. Escalada', 4400, 5200], ['Av. Piedra Buena', 3800, 4800]],
  'Villa Pueyrredón': [['Av. Triunvirato', 5200, 5900], ['Av. Mosconi', 3200, 4100], ['Av. Chorroarín', 1200, 1900]],
  'Villa Riachuelo': [['Av. Escalada', 3200, 4400], ['Av. Eva Perón', 7200, 8000], ['Av. Coronel Roca', 6500, 7500]],
  'Villa Soldati': [['Av. Cruz', 4500, 5400], ['Av. Lacarra', 1200, 1800], ['Av. Roca', 4200, 5000]],
  'Villa Urquiza': [['Av. Triunvirato', 3900, 4800], ['Av. Congreso', 4200, 5000], ['Av. Monroe', 4500, 5400]],
  'Vélez Sarsfield': [['Av. Juan B. Justo', 5200, 6300], ['Av. Álvarez Jonte', 2800, 3800], ['Av. Lope de Vega', 3100, 3800]],
};

const FALLBACK_STREETS: [string, number, number][] = [['Av. Rivadavia', 1000, 9000], ['Av. Corrientes', 1000, 7000], ['Av. Cabildo', 1000, 5000]];

const COVERED_DESCRIPTIONS = [
  'Cochera cubierta en {barrio}, con acceso directo desde {calle}. Ideal para estacionar durante el día sin preocuparte por el clima.',
  'Lugar techado y seguro en {barrio}. Entra cómodo un auto mediano y el acceso es sin escalones.',
  'Cochera cubierta con buena iluminación, a pocas cuadras del transporte público de {barrio}.',
  'Espacio techado en {barrio}, sobre {calle}. Portón de acceso y entrada simple, sin maniobras complicadas.',
  'Cochera con techo en una zona tranquila de {barrio}. Podés reservarla por hora o por el día.',
  'Garage cubierto en {barrio}: lugar amplio, bien señalizado y con acceso las horas indicadas en el horario.',
];

const OPEN_DESCRIPTIONS = [
  'Lugar al aire libre en {barrio}, con acceso directo desde {calle}. Práctico para estacionar por unas horas.',
  'Playa descubierta en {barrio}, fácil de encontrar y con entrada amplia.',
  'Espacio descubierto en una cuadra tranquila de {barrio}. Entra cómodo un auto de tamaño medio.',
  'Cochera sin techo en {barrio}, sobre {calle}. Buena opción para estadías cortas durante el día.',
];

const RULES = [
  'Respetar el lugar asignado',
  'No dejar objetos de valor a la vista',
  'Ingresar y salir con cuidado, sin ruidos molestos',
  'No realizar reparaciones ni lavar el vehículo en la cochera',
  'Avisar al propietario si llegás fuera del horario reservado',
];

const ACCESS = [
  'Al llegar, tocá el timbre de la cochera y te abrimos el portón.',
  'El portón se abre con el código que te pasa el propietario por mensaje.',
  'Entrá por {calle}; el lugar está a la derecha, marcado en el piso.',
  'Escribile al propietario desde la reserva cuando estés cerca y te recibe en la puerta.',
];

/** FNV-1a: un entero estable derivado de un texto. */
export function hashOf(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const pick = <T>(list: T[], seed: number): T => list[seed % list.length];
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

export interface DemoSpotInput {
  id: string;
  address: string;
  covered: boolean;
}

export interface DemoSpotProfile {
  title: string;
  address: string;
  description: string;
  rules: string[];
  accessInstructions: string;
  ownerId: string;
  photoSeed: number;
}

/** El barrio es lo primero que dice la dirección demo ("Palermo, Ciudad Autónoma de Buenos Aires, Argentina"). */
export function neighborhoodOf(address: string): string {
  return (address.split(',')[0] ?? '').trim() || 'Buenos Aires';
}

export function profileFor(spot: DemoSpotInput): DemoSpotProfile {
  const barrio = neighborhoodOf(spot.address);
  const streets = STREETS[barrio] ?? FALLBACK_STREETS;
  const [street, minNumber, maxNumber] = pick(streets, hashOf(`${spot.id}:street`));
  const number = minNumber + (hashOf(`${spot.id}:number`) % (maxNumber - minNumber + 1));
  const shortStreet = street.replace(/^Av\.\s+/, '');
  const kind = pick(spot.covered ? ['Cochera', 'Garage', 'Cochera'] : ['Cochera', 'Playa', 'Cochera'], hashOf(`${spot.id}:kind`));
  const values = { barrio, calle: street };

  const rules = [...RULES];
  const first = hashOf(`${spot.id}:rule`) % rules.length;
  const picked = [rules[first], rules[(first + 1 + (hashOf(`${spot.id}:rule2`) % (rules.length - 1))) % rules.length]];

  return {
    title: `${kind} ${shortStreet} ${number}`,
    address: `${street} ${number}, ${barrio}, CABA`,
    description: fill(pick(spot.covered ? COVERED_DESCRIPTIONS : OPEN_DESCRIPTIONS, hashOf(`${spot.id}:desc`)), values),
    rules: picked,
    accessInstructions: fill(pick(ACCESS, hashOf(`${spot.id}:access`)), values),
    ownerId: pick(DEMO_OWNER_IDS, hashOf(`${spot.id}:owner`)),
    photoSeed: hashOf(`${spot.id}:photo`),
  };
}
