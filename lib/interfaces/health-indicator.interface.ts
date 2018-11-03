export type HealthIndicatorResult = {
  [key: string]: {
    status: string;
    [optionalKeys: string]: unknown;
  };
};

export type HealthIndicatorFunction = () => Promise<HealthIndicatorResult>;
