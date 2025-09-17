declare module 'bullmq' {
  export interface QueueOptions {
    connection?: Record<string, unknown>;
  }

  export interface BackoffOptions {
    type: string;
    delay: number;
  }

  export interface AddJobOptions {
    attempts?: number;
    backoff?: BackoffOptions;
  }

  export class Queue<T = unknown, R = unknown, N extends string = string> {
    constructor(name: N, opts?: QueueOptions);
    add(name: N, data: T, opts?: AddJobOptions): Promise<R | void>;
  }

  export class QueueScheduler {
    constructor(name: string, opts?: QueueOptions);
  }

  export interface WorkerOptions {
    connection?: Record<string, unknown>;
  }

  export interface Job<T> {
    data: T;
  }

  export class Worker<T = unknown, R = unknown, N extends string = string> {
    constructor(
      name: N,
      processor: (job: Job<T>) => Promise<R>,
      opts?: WorkerOptions,
    );
  }
}
