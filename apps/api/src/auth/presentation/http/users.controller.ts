import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthApplicationService } from '../../application/auth.application.service';
import { Public } from './decorators/public.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly authApplicationService: AuthApplicationService,
  ) {}

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Public profile (no email)' })
  @ApiParam({ name: 'id' })
  getPublic(@Param('id') id: string) {
    return this.authApplicationService.getPublicProfile(id);
  }
}
