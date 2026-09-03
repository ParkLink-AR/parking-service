import { ConfigService } from '@nestjs/config';
export declare class StorageService {
    private readonly config;
    private readonly client;
    private readonly bucket;
    private readonly publicUrl;
    constructor(config: ConfigService);
    uploadObject(key: string, body: Buffer, contentType: string): Promise<string>;
    deleteObject(url: string | null | undefined): Promise<void>;
}
