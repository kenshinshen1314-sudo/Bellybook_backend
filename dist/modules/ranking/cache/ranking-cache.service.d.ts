import { PrismaService } from '../../../database/prisma.service';
export declare class RankingCacheService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, data: T, ttlMinutes?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clearExpired(): Promise<void>;
    clearAll(): Promise<void>;
}
