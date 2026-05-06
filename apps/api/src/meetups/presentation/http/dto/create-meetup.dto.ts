import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PLAY_SESSION_VISIBILITIES,
  type PlaySessionVisibility,
} from '@boardgame/shared';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMeetupDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsISO8601()
  scheduledAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  gameId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(500)
  maxPlayers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ enum: PLAY_SESSION_VISIBILITIES })
  @IsOptional()
  @IsIn([...PLAY_SESSION_VISIBILITIES])
  visibility?: PlaySessionVisibility;
}
