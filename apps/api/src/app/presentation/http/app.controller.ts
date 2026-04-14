import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../auth/presentation/http/decorators/public.decorator';
import { AppApplicationService } from '../../application/app.application.service';

@Controller()
export class AppController {
  constructor(private readonly appApplicationService: AppApplicationService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appApplicationService.getHello();
  }
}
