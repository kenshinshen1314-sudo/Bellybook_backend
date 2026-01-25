"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_CONFIGS = exports.QUEUE_NAMES = void 0;
exports.QUEUE_NAMES = {
    AI_ANALYSIS: 'ai-analysis',
    EMAIL: 'email',
    NOTIFICATION: 'notification',
    SYNC: 'sync',
    WEBHOOK: 'webhook',
    CLEANUP: 'cleanup',
};
exports.QUEUE_CONFIGS = {
    [exports.QUEUE_NAMES.AI_ANALYSIS]: {
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { count: 100, age: 86400 },
            removeOnFail: { count: 500, age: 604800 },
            timeout: 60000,
        },
        limiter: {
            max: 5,
            duration: 1000,
        },
    },
    [exports.QUEUE_NAMES.EMAIL]: {
        defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 50 },
            removeOnFail: { count: 200 },
            timeout: 30000,
        },
        limiter: {
            max: 10,
            duration: 60000,
        },
    },
    [exports.QUEUE_NAMES.NOTIFICATION]: {
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'fixed', delay: 1000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 100 },
            timeout: 10000,
        },
    },
    [exports.QUEUE_NAMES.SYNC]: {
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
            removeOnComplete: { count: 200 },
            removeOnFail: { count: 500 },
            timeout: 120000,
        },
    },
    [exports.QUEUE_NAMES.WEBHOOK]: {
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 300 },
            timeout: 30000,
        },
    },
    [exports.QUEUE_NAMES.CLEANUP]: {
        defaultJobOptions: {
            attempts: 1,
            removeOnComplete: { count: 10 },
            removeOnFail: { count: 10 },
            timeout: 300000,
        },
    },
};
//# sourceMappingURL=queue.constants.js.map