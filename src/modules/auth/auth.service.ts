import { TokenType } from '@/base/common/enums/token-type.enum';
import {
  InvitePayload,
  JwtPayload,
  ResetPasswordPayload,
} from '@/base/interfaces/jwt.interface';
import { HashUtils, JwtUtils } from '@/common/utils/crypto.utils';
import { configs } from '@/configs/config.service';
import {
  IFilter,
  IServiceOption,
} from '@base/apis/services/base-common.service';
import { SYSTEM_USER_ID } from '@base/common/constants/system.constants';
import { IAuditLogOptions } from '@base/interfaces/audit-log.interface';
import { MailService } from '@base/mail/mail.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/services/users.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Token } from './entities/token.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtUtils: JwtUtils,
    private mailService: MailService,
    private i18n: I18nService,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {}

  async validateUserByPassword(email: string, pass: string): Promise<User> {
    const user = await this.usersService.findByEmail(email, true);
    if (!user) {
      throw new UnauthorizedException(
        I18nContext.current()?.t('auth.invalid_credentials'),
      );
    }
    if (!(await HashUtils.isMatchPassword(pass, user.password))) {
      throw new UnauthorizedException(
        I18nContext.current()?.t('auth.invalid_credentials'),
      );
    }
    return user;
  }

  async login(user: Omit<User, 'password'>) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: TokenType.ACCESS,
    };
    return {
      access_token: this.jwtUtils.generateToken({
        ...payload,
        type: TokenType.ACCESS,
      }),
      refresh_token: this.jwtUtils.generateToken({
        ...payload,
        type: TokenType.REFRESH,
      }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        isActive: user.isActive,
      } as User,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email, false);
    if (!user) {
      return { message: 'Password reset email sent' };
    }
    const token = this.jwtUtils.generateToken({
      email: user.email,
      userId: user.id,
      type: TokenType.RESET_PASSWORD,
    });

    const decoded = this.jwtUtils.verifyToken<
      ResetPasswordPayload & { exp: number }
    >(token, TokenType.RESET_PASSWORD);
    await this.tokenRepository.save({
      token,
      type: TokenType.RESET_PASSWORD,
      userId: user.id,
      expiresAt: new Date(decoded.exp * 1000),
      createUserId: user.id,
      updateUserId: user.id,
    });

    const lang = I18nContext.current()?.lang || 'vi';
    const resetUrl = `${configs.FRONTEND_URL}/reset-password?token=${token}&lang=${lang}`;

    const t = I18nContext.current() ?? this.i18n;

    await this.mailService.sendMail(
      configs.MAIL.auth.user,
      user.email,
      t.t('mail.forgot_password.subject', { lang }),
      'forgot-password',
      {
        title: t.t('mail.forgot_password.title', { lang }),
        greeting: t.t('mail.forgot_password.greeting', {
          lang,
          args: { name: user.fullName || user.email },
        }),
        body_text: t.t('mail.forgot_password.body_text', { lang }),
        button_text: t.t('mail.forgot_password.button_text', { lang }),
        expiration_text: t.t('mail.forgot_password.expiration_text', { lang }),
        footer_text: t.t('mail.forgot_password.footer_text', { lang }),
        link: resetUrl,
      },
    );

    return { message: 'Password reset email sent' };
  }

  async verifyInviteToken(token: string) {
    try {
      const payload = this.jwtUtils.verifyToken<InvitePayload>(
        token,
        TokenType.INVITE,
      );
      if (payload.type !== TokenType.INVITE) {
        throw new BadRequestException(this.i18n.t('auth.invite_invalid'));
      }

      // Check if user already exists
      const existingUser = await this.usersService.findByEmail(payload.email);
      if (existingUser) {
        throw new BadRequestException(
          this.i18n.t('auth.invite_already_accepted'),
        );
      }

      return {
        isValid: true,
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName,
      };
    } catch {
      throw new BadRequestException(this.i18n.t('auth.invite_invalid'));
    }
  }

  async verifyResetToken(token: string) {
    try {
      const payload = this.jwtUtils.verifyToken<ResetPasswordPayload>(
        token,
        TokenType.RESET_PASSWORD,
      );
      if (payload.type !== TokenType.RESET_PASSWORD) {
        throw new BadRequestException(this.i18n.t('auth.reset_token_invalid'));
      }

      // Check if token exists in database (and hasn't been used/deleted)
      // AND belongs to the user claimed in the payload
      const dbToken = await this.tokenRepository.findOne({
        where: {
          token,
          type: TokenType.RESET_PASSWORD,
          userId: payload.userId,
        },
      });

      if (!dbToken) {
        throw new BadRequestException(this.i18n.t('auth.reset_token_invalid'));
      }

      return { isValid: true };
    } catch {
      throw new BadRequestException(this.i18n.t('auth.reset_token_invalid'));
    }
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<{ message: string }> {
    const payload = await this.verifyInviteToken(dto.token);

    await this.usersService.createOne(SYSTEM_USER_ID, {
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
      password: dto.password,
    });

    return {
      message: this.i18n.t('auth.invite_accepted'),
    };
  }

  async resetPassword(token: string, newPass: string) {
    let payload;
    try {
      payload = this.jwtUtils.verifyToken<ResetPasswordPayload>(
        token,
        TokenType.RESET_PASSWORD,
      );
    } catch {
      throw new BadRequestException(this.i18n.t('auth.reset_token_invalid'));
    }

    if (payload.type !== TokenType.RESET_PASSWORD) {
      throw new BadRequestException(this.i18n.t('auth.reset_token_invalid'));
    }

    const dbToken = await this.tokenRepository.findOne({
      where: {
        token,
        type: TokenType.RESET_PASSWORD,
        userId: payload.userId,
      },
    });

    if (!dbToken) {
      throw new BadRequestException(this.i18n.t('auth.reset_token_invalid'));
    }

    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new BadRequestException(this.i18n.t('auth.reset_token_invalid'));
    }

    if (!user.isActive) {
      throw new BadRequestException(this.i18n.t('auth.account_disabled'));
    }

    await this.usersService.update(
      user.id,
      {
        password: newPass,
      },
      { where: { id: user.id } },
    );

    await this.tokenRepository.delete(dbToken.id);

    return {
      message: this.i18n.t('auth.reset_password_success'),
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtUtils.verifyToken<JwtPayload>(
        refreshToken,
        TokenType.REFRESH,
      );

      const user = await this.usersService.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException(this.i18n.t('auth.account_not_found'));
      }

      if (!user.isActive) {
        throw new UnauthorizedException(this.i18n.t('auth.account_disabled'));
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: TokenType.ACCESS,
      };

      return {
        access_token: this.jwtUtils.generateToken({
          ...newPayload,
          type: TokenType.ACCESS,
        }),
        refresh_token: this.jwtUtils.generateToken({
          ...newPayload,
          type: TokenType.REFRESH,
        }),
      };
    } catch {
      throw new UnauthorizedException(
        this.i18n.t('auth.refresh_token_invalid'),
      );
    }
  }
}
