export const CONNECTION_NOT_FOUND =
  'Connection provider not found in application context';

export const TIMEOUT_EXCEEDED = (timeout: number) =>
  `timeout of ${timeout.toString()}ms exceeded`;

export const STORAGE_EXCEEDED = (keyword: string) =>
  `Used ${keyword} exceeded the set threshold`;
