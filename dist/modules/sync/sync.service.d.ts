import { PrismaService } from '../../database/prisma.service';
import { SyncPullResponseDto, SyncPushRequestDto, SyncPushResponseDto, SyncStatusResponseDto } from './dto/sync.dto';
export declare class SyncService {
    private prisma;
    constructor(prisma: PrismaService);
    pull(userId: string, lastSyncAt?: Date): Promise<SyncPullResponseDto>;
    push(userId: string, dto: SyncPushRequestDto): Promise<SyncPushResponseDto>;
    getStatus(userId: string): Promise<SyncStatusResponseDto>;
    clearQueue(userId: string): Promise<void>;
    private handleCreateMeal;
    private handleUpdateMeal;
    private handleDeleteMeal;
    private handleUpdateProfile;
    private handleUpdateSettings;
    private mapToMealResponse;
    private mapToProfileResponse;
    private mapToSettingsResponse;
    private mapToCuisineUnlockResponse;
}
