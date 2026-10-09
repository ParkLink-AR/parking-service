// Tipos de vehículo para los que puede ser apta una cochera. Una cochera
// puede aceptar más de uno a la vez (p.ej. auto y moto), así que se guarda
// como array, no como un solo valor -- ver ParkingSpot.vehicleTypes.
export enum VehicleType {
  CAR = 'car',
  PICKUP = 'pickup',
  SUV = 'suv',
  // Trafic, Sprinter, Master, Ducato, Hiace, combis -- taller and longer than a car: many
  // covered spots don't fit one.
  VAN = 'van',
  MOTORCYCLE = 'motorcycle',
  BICYCLE = 'bicycle',
}

export const VEHICLE_TYPES: VehicleType[] = Object.values(VehicleType);

// Tarifas de estadía de un tipo de vehículo -- ver ParkingSpot.stayPricesByVehicleType.
export interface StayRates {
  day: number;
  week: number;
  month: number;
}
