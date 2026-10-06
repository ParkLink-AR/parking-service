export const SPOT_TITLE_MAX_LENGTH = 60;

/**
 * Normaliza el título que eligió el dueño: cada palabra arranca con mayúscula y el resto
 * va en minúscula ("COCHERA en PALERMO" -> "Cochera En Palermo"), sin espacios de más.
 * Lo que no es string se devuelve tal cual para que lo rechace @IsString().
 */
export function normalizeSpotTitle({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('es') + word.slice(1).toLocaleLowerCase('es'))
    .join(' ');
}
