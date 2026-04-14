import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateDirectConversationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  otherUserId!: string;
}
