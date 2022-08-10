export interface AxiosError extends Error {
  code?: string;
  request?: any;
  response?: any;
  isAxiosError: boolean;
  status?: string;
  toJSON: () => object;
}
