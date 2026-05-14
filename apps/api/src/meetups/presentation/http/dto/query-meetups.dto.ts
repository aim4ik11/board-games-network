import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PLAY_SESSION_STATUSES,
  type PlaySessionStatus,
} from '@boardgame/shared';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryMeetupsDto {
  @ApiPropertyOptional({ enum: PLAY_SESSION_STATUSES })
  @IsOptional()
  @IsIn([...PLAY_SESSION_STATUSES])
  status?: PlaySessionStatus;

  @ApiPropertyOptional({
    enum: ['true', 'false'],
    description: 'Omit or true: only future meetups. false: include past.',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  upcoming?: 'true' | 'false';

  @ApiPropertyOptional({
    description:
      'When set with `to` (or alone), bounds `scheduledAt`. If both are omitted and upcoming is true, defaults to now.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Upper bound for `scheduledAt`.' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Filter by linked board game id.' })
  @IsOptional()
  @IsString()
  gameId?: string;

  @ApiPropertyOptional({
    enum: ['ALL', 'PUBLIC', 'FRIENDS'],
    description:
      'Narrow by meetup visibility (within what you can already see).',
  })
  @IsOptional()
  @IsIn(['ALL', 'PUBLIC', 'FRIENDS'])
  visibility?: 'ALL' | 'PUBLIC' | 'FRIENDS';

  @ApiPropertyOptional({
    enum: ['me'],
    description: 'When `me`, only sessions you have joined as a player.',
  })
  @IsOptional()
  @IsIn(['me'])
  joined?: 'me';

  @ApiPropertyOptional({ description: 'Case-insensitive title substring.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
