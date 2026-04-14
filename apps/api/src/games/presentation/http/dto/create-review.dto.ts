import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ minLength: 10, maxLength: 8000 })
  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  body: string;
}
