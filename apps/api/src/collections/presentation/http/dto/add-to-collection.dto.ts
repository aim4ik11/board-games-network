import { CollectionStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class AddToCollectionDto {
  @ApiProperty({ example: 'wingspan' })
  @IsString()
  @MinLength(1)
  slug!: string;

  @ApiPropertyOptional({
    enum: CollectionStatus,
    default: CollectionStatus.OWNED,
  })
  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;
}
