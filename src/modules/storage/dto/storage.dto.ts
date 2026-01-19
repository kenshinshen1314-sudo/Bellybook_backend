import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UploadResponseDto {
  url!: string;
  thumbnailUrl?: string;
  key!: string;
  size!: number;
  width?: number;
  height?: number;
}
