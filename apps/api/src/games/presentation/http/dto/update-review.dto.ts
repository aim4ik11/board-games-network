import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateReviewDto {
  @ApiProperty({ minLength: 10, maxLength: 8000 })
  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  body: string;

  @ApiProperty({ required: false, type: [String], maxItems: 3 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}
