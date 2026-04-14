import { CollectionStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryCollectionDto {
  @ApiPropertyOptional({ enum: CollectionStatus })
  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;
}
