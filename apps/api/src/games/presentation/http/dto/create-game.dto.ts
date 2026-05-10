import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGameDto {
  @ApiProperty({ example: 'Wingspan' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(3000)
  yearPublished?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  minPlayers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  maxPlayers?: number;

  @ApiPropertyOptional({ description: 'Typical play time in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  playTimeMin?: number;

  @ApiPropertyOptional({ description: 'Upper typical play time in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  playTimeMax?: number;

  @ApiPropertyOptional({
    description: 'BGG-style complexity / weight (about 1–5)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  complexity?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Genre slugs to attach (must exist)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  genreSlugs?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'External catalog id (e.g. BGG)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  externalId?: string;
}
