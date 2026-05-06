import { IsString, MinLength } from 'class-validator';

export class ChatRoomDto {
  @IsString()
  @MinLength(1)
  conversationId!: string;
}
