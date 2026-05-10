import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryGamesDto {
  @ApiPropertyOptional({ description: 'Search in title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Comma-separated genre slugs (e.g. strategy,family)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  genres?: string;

  @ApiPropertyOptional({ description: 'Minimum playtime filter (minutes)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99999)
  ptMin?: number;

  @ApiPropertyOptional({ description: 'Maximum playtime filter (minutes)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99999)
  ptMax?: number;

  @ApiPropertyOptional({
    description:
      'Comma-separated complexity bands: very-light, light, medium, heavy, expert',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  complexity?: string;

  @ApiPropertyOptional({ enum: ['title', 'year'] })
  @IsOptional()
  @IsIn(['title', 'year'])
  sort?: 'title' | 'year';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
