import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.field_required') })
  token: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({
    message: i18nValidationMessage('validation.password_required'),
  })
  password: string;
}
