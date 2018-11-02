export type HealthIndicatorResult = {
  [key: string]: {
    status: string;
    [optionalKeys: string]: any;
  };
};

export type HealthIndicatorFunction = () => Promise<HealthIndicatorResult>;
