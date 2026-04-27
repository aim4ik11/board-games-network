import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class InviteToConversationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  userId!: string;
}
