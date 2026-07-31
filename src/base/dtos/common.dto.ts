import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, Matches } from 'class-validator';
import { RegexConstants } from '@base/common/constants/regex.constant';

export class BaseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(RegexConstants.OFFSET_TIMESTAMP, {
    message: 'updateTimestamp required format offset timestamp',
  })
  updateTimestamp: string;
}

export class BaseWithDeleteDto extends BaseDto {
  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
