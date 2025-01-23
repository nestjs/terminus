export { TerminusModule } from './terminus.module';
export { TerminusModuleOptions } from './terminus-options.interface';
export * from './health-indicator';
export * from './errors';
export {
  HealthCheck,
  HealthCheckService,
  // eslint-disable-next-line deprecation/deprecation
  HealthCheckError,
  HealthCheckStatus,
  HealthCheckResult,
} from './health-check';
