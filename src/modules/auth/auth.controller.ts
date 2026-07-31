import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept invitation and set password' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  async acceptInvite(@Body() acceptInviteDto: AcceptInviteDto) {
    return this.authService.acceptInvite(acceptInviteDto);
  }

  @Get('verify-invite-token')
  @ApiOperation({
    summary: 'Verify invitation token',
    description:
      'Validates the invite token from the invitation link (e.g. from email). ' +
      'Use this before showing the "Accept invite" / "Set password" form. ' +
      'Returns the invited email so the frontend can pre-fill or display it.',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'JWT invite token from the invitation link',
  })
  @ApiResponse({
    status: 200,
    description: 'Token is valid. Proceed to accept-invite with this token.',
    schema: { example: { isValid: true, email: 'invited@example.com' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Token invalid, expired, or invite already accepted',
  })
  async verifyInviteToken(@Query('token') token: string) {
    const payload = await this.authService.verifyInviteToken(token);
    return { isValid: true, email: payload.email };
  }

  @Get('verify-reset-token')
  @ApiOperation({
    summary: 'Verify reset password token',
    description:
      'Validates the reset-password token from the "forgot password" email link. ' +
      'Use this before showing the "New password" form to ensure the link is still valid and not already used.',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'JWT reset-password token from the email link',
  })
  @ApiResponse({
    status: 200,
    description: 'Token is valid. Proceed to reset-password with this token.',
    schema: { example: { isValid: true } },
  })
  @ApiResponse({
    status: 400,
    description: 'Token invalid, expired, or already used',
  })
  async verifyResetToken(@Query('token') token: string) {
    return this.authService.verifyResetToken(token);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
}
