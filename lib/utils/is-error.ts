import { type AxiosError } from '../errors/axios.error';

export function isAxiosError(err: any): err is AxiosError {
  return err?.isAxiosError;
}

export function isError(err: any): err is Error {
  return !!err?.message;
}
