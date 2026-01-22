import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
export type TransactionResult<T> = {
    data: T;
    error?: Error;
};
export type TransactionOptions = {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
};
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    runTransaction<T>(callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>, options?: TransactionOptions): Promise<T>;
    batchTransactions<T>(callbacks: Array<(tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>>): Promise<T[]>;
    cleanDatabase(): Promise<Record<string, number>>;
    healthCheck(): Promise<boolean>;
    getConnectionStats(): {
        connected: boolean;
    };
}
