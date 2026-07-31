import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { I18nContext } from 'nestjs-i18n';
import { Strategy } from 'passport-local';
import { AuthService } from '@/modules/auth/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, pass: string): Promise<any> {
    try {
      return await this.authService.validateUserByPassword(email, pass);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(
          I18nContext.current()?.t('auth.invalid_credentials'),
        );
      }
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException(
          I18nContext.current()?.t('auth.account_disabled'),
        );
      }
      throw error;
    }
  }
}
