import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderPhotosDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  photos!: string[];
}
