import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PLAY_SESSION_STATUSES,
  type PlaySessionStatus,
} from '@boardgame/shared';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

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
