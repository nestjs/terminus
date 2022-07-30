import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult } from '../../health-indicator';
import { ErrorLogger } from './error-logger.interface';
import * as boxen from 'boxen';

const GREEN = '\x1b[0m\x1b[32m';
const RED = '\x1b[0m\x1b[31m';
const STOP_COLOR = '\x1b[0m';

@Injectable()
export class PrettyErrorLogger implements ErrorLogger {
  private printIndent(level: number) {
    if (level === 0) {
      return '';
    }
    return `${' '.repeat(level * 2)}- `;
  }

  private printIndicatorSummary(result: any, level = 0) {
    const messages: string[] = [];
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'object' && value !== null) {
        messages.push(
          `${this.printIndent(level)}${key}:\n${this.printIndicatorSummary(
            value,
            level + 1,
          )}`,
        );
      } else {
        const val = (value as any)?.toString
          ? (value as any).toString()
          : value;
        messages.push(`${this.printIndent(level)}${key}: ${val}`);
      }
    }
    return messages.join('\n');
  }

  private printSummary(result: HealthIndicatorResult) {
    let message = '';

    for (const [key, value] of Object.entries(result)) {
      const summary = this.printIndicatorSummary(value);

      if (value.status === 'up') {
        message +=
          GREEN +
          (boxen as any)(summary, {
            padding: 1,
            title: `✅ ${key}`,
          }) +
          STOP_COLOR +
          '\n';
      }
      if (value.status === 'down') {
        message +=
          RED +
          (boxen as any)(summary, {
            padding: 1,
            title: `❌ ${key}`,
          }) +
          STOP_COLOR +
          '\n';
      }
    }
    return message;
  }

  getErrorMessage(message: string, causes: HealthIndicatorResult) {
    return `${message}\n\n${this.printSummary(causes)}`;
  }
}
