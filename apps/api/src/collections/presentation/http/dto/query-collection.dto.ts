import { ApiPropertyOptional } from '@nestjs/swagger';
import { COLLECTION_STATUSES, type CollectionStatus } from '@boardgame/shared';
import { IsIn, IsOptional } from 'class-validator';

export class QueryCollectionDto {
  @ApiPropertyOptional({ enum: COLLECTION_STATUSES })
  @IsOptional()
  @IsIn([...COLLECTION_STATUSES])
  status?: CollectionStatus;
}
