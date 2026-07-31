import { JwtPayload } from '@/base/interfaces/jwt.interface';
import { configs } from '@/configs/config.service';
import { UsersRepository } from '@modules/users/repositories/users.repository';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { I18nService } from 'nestjs-i18n';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersRepository: UsersRepository,
    private i18n: I18nService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configs.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'role', 'isActive'],
    });

    if (!user) {
      throw new UnauthorizedException(this.i18n.t('auth.account_not_found'));
    }

    if (!user.isActive) {
      throw new ForbiddenException(this.i18n.t('auth.account_disabled'));
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
