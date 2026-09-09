// Tipos de vehículo para los que puede ser apta una cochera. Una cochera
// puede aceptar más de uno a la vez (p.ej. auto y moto), así que se guarda
// como array, no como un solo valor -- ver ParkingSpot.vehicleTypes.
export enum VehicleType {
  CAR = 'car',
  PICKUP = 'pickup',
  MOTORCYCLE = 'motorcycle',
  BICYCLE = 'bicycle',
}

export const VEHICLE_TYPES: VehicleType[] = Object.values(VehicleType);
