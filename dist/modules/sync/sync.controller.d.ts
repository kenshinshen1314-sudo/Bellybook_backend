import { SyncService } from './sync.service';
import { SyncPullResponseDto, SyncPushRequestDto, SyncPushResponseDto, SyncStatusResponseDto } from './dto/sync.dto';
import { SuccessResponse } from '../../common/dto/response.dto';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    pull(userId: string, lastSyncAtStr?: string): Promise<SyncPullResponseDto>;
    push(userId: string, dto: SyncPushRequestDto): Promise<SyncPushResponseDto>;
    getStatus(userId: string): Promise<SyncStatusResponseDto>;
    fullSync(userId: string): Promise<SyncPullResponseDto>;
    clearQueue(userId: string): Promise<SuccessResponse>;
}
