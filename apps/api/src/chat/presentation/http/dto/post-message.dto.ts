import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PostMessageDto {
  @ApiProperty({ maxLength: 8000 })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}
