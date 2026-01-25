export declare const QUEUE_NAMES: {
    readonly AI_ANALYSIS: "ai-analysis";
    readonly EMAIL: "email";
    readonly NOTIFICATION: "notification";
    readonly SYNC: "sync";
    readonly WEBHOOK: "webhook";
    readonly CLEANUP: "cleanup";
};
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
export declare const QUEUE_CONFIGS: {
    readonly "ai-analysis": {
        readonly defaultJobOptions: {
            readonly attempts: 3;
            readonly backoff: {
                readonly type: "exponential";
                readonly delay: 2000;
            };
            readonly removeOnComplete: {
                readonly count: 100;
                readonly age: 86400;
            };
            readonly removeOnFail: {
                readonly count: 500;
                readonly age: 604800;
            };
            readonly timeout: 60000;
        };
        readonly limiter: {
            readonly max: 5;
            readonly duration: 1000;
        };
    };
    readonly email: {
        readonly defaultJobOptions: {
            readonly attempts: 5;
            readonly backoff: {
                readonly type: "exponential";
                readonly delay: 5000;
            };
            readonly removeOnComplete: {
                readonly count: 50;
            };
            readonly removeOnFail: {
                readonly count: 200;
            };
            readonly timeout: 30000;
        };
        readonly limiter: {
            readonly max: 10;
            readonly duration: 60000;
        };
    };
    readonly notification: {
        readonly defaultJobOptions: {
            readonly attempts: 2;
            readonly backoff: {
                readonly type: "fixed";
                readonly delay: 1000;
            };
            readonly removeOnComplete: {
                readonly count: 100;
            };
            readonly removeOnFail: {
                readonly count: 100;
            };
            readonly timeout: 10000;
        };
    };
    readonly sync: {
        readonly defaultJobOptions: {
            readonly attempts: 3;
            readonly backoff: {
                readonly type: "exponential";
                readonly delay: 3000;
            };
            readonly removeOnComplete: {
                readonly count: 200;
            };
            readonly removeOnFail: {
                readonly count: 500;
            };
            readonly timeout: 120000;
        };
    };
    readonly webhook: {
        readonly defaultJobOptions: {
            readonly attempts: 3;
            readonly backoff: {
                readonly type: "exponential";
                readonly delay: 2000;
            };
            readonly removeOnComplete: {
                readonly count: 100;
            };
            readonly removeOnFail: {
                readonly count: 300;
            };
            readonly timeout: 30000;
        };
    };
    readonly cleanup: {
        readonly defaultJobOptions: {
            readonly attempts: 1;
            readonly removeOnComplete: {
                readonly count: 10;
            };
            readonly removeOnFail: {
                readonly count: 10;
            };
            readonly timeout: 300000;
        };
    };
};
