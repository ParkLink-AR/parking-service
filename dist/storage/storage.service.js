"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
let StorageService = class StorageService {
    constructor(config) {
        this.config = config;
        const accountId = this.config.get('R2_ACCOUNT_ID', '');
        this.bucket = this.config.get('R2_BUCKET_NAME', '');
        this.publicUrl = this.config.get('R2_PUBLIC_URL', '').replace(/\/$/, '');
        this.client = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: this.config.get('R2_ACCESS_KEY_ID', ''),
                secretAccessKey: this.config.get('R2_SECRET_ACCESS_KEY', ''),
            },
        });
    }
    async uploadObject(key, body, contentType) {
        await this.client.send(new client_s3_1.PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
        return `${this.publicUrl}/${key}`;
    }
    async deleteObject(url) {
        if (!url || !this.publicUrl || !url.startsWith(`${this.publicUrl}/`))
            return;
        const key = url.slice(this.publicUrl.length + 1);
        await this.client.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map