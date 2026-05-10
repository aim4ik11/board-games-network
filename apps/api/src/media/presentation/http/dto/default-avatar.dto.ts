import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DefaultAvatarDto {
  @ApiProperty({ example: 'user-id-or-email' })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  seed: string;
}
