import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGroupConversationDto {
  @ApiProperty({
    type: [String],
    description: 'IDs of users to include in the group chat (excluding self)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  memberIds!: string[];

  @ApiProperty({ description: 'Group chat title' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;
}
