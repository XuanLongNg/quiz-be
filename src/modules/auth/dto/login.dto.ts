import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @ApiProperty()
  @IsEmail({}, { message: i18nValidationMessage('validation.email_invalid') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.email_required') })
  email: string;

  @ApiProperty()
  @IsNotEmpty({
    message: i18nValidationMessage('validation.password_required'),
  })
  password: string;
}
