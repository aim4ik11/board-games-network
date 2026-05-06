import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COLLECTION_STATUSES, type CollectionStatus } from '@boardgame/shared';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class AddToCollectionDto {
  @ApiProperty({ example: 'wingspan' })
  @IsString()
  @MinLength(1)
  slug!: string;

  @ApiPropertyOptional({
    enum: COLLECTION_STATUSES,
    default: 'OWNED',
  })
  @IsOptional()
  @IsIn([...COLLECTION_STATUSES])
  status?: CollectionStatus;
}
