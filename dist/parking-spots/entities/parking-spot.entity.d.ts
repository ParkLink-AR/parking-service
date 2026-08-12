export declare enum ParkingSpotStatus {
    ACTIVE = "active",
    PAUSED = "paused",
    DELETED = "deleted"
}
export declare class ParkingSpot {
    id: string;
    ownerId: string;
    title: string;
    description: string;
    address: string;
    location: any;
    pricePerHour: number;
    photos: string[];
    rules: string[];
    status: ParkingSpotStatus;
    createdAt: Date;
    updatedAt: Date;
}
