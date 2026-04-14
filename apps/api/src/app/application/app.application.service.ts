import { Injectable } from '@nestjs/common';

@Injectable()
export class AppApplicationService {
  getHello(): string {
    return 'Hello World!';
  }
}
