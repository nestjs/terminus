import { Injectable } from '@nestjs/common';
import { ErrorLogger } from './error-logger.interface';

@Injectable()
export class JsonErrorLogger implements ErrorLogger {
  getErrorMessage(message: string, causes: any) {
    return `${message} ${JSON.stringify(causes)}`;
  }
}
