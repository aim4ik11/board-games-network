import { ApiPropertyOptional } from '@nestjs/swagger';
import { COLLECTION_STATUSES, type CollectionStatus } from '@boardgame/shared';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchCollectionDto {
  @ApiPropertyOptional({ enum: COLLECTION_STATUSES })
  @IsOptional()
  @IsIn([...COLLECTION_STATUSES])
  status?: CollectionStatus;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
