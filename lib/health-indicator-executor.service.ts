import { Injectable } from '@nestjs/common';
import { HealthIndicatorFunction } from './interfaces';
import { HealthCheckError } from '@godaddy/terminus';

@Injectable()
export class HealthIndicatorExecutor {
  async execute(
    healthIndicators: HealthIndicatorFunction[],
  ): Promise<{ results: any[]; errors: any[] }> {
    const results: any[] = [];
    const errors: any[] = [];
    await Promise.all(
      healthIndicators
        // Register all promises
        .map(healthIndicator => healthIndicator())
        .map((p: Promise<any>) =>
          p.catch((error: any) => {
            // Is not an expected error. Throw further!
            if (!error.causes) throw error;
            // Is a expected health check error
            errors.push((error as HealthCheckError).causes);
          }),
        )
        .map((p: Promise<any>) =>
          p.then((result: any) => result && results.push(result)),
        ),
    );

    return { results, errors };
  }
}
