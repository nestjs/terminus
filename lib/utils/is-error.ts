import { type HealthCheckError } from '../';
import { type AxiosError } from '../errors/axios.error';

// eslint-disable-next-line deprecation/deprecation
export function isHealthCheckError(err: any): err is HealthCheckError {
  return err?.isHealthCheckError;
}

export function isAxiosError(err: any): err is AxiosError {
  return err?.isAxiosError;
}

export function isError(err: any): err is Error {
  return !!err?.message;
}
