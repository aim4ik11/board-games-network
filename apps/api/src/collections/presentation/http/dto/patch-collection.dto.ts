import { CollectionStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchCollectionDto {
  @ApiPropertyOptional({ enum: CollectionStatus })
  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
