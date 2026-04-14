import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthApplicationService } from '../../application/auth.application.service';
import {
  CurrentUser,
  type AuthUser,
} from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authApplicationService: AuthApplicationService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authApplicationService.register({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
    });
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authApplicationService.login({
      email: dto.email,
      password: dto.password,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Current user (full profile)' })
  me(@CurrentUser() user: AuthUser) {
    return this.authApplicationService.me(user);
  }

  @Patch('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update my profile' })
  patchMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.authApplicationService.updateMyProfile(user, dto);
  }
}
