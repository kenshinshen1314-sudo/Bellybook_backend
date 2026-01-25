import { MealResponseDto } from '../../meals/dto/meal-response.dto';
import { ProfileResponseDto } from '../../users/dto/user-response.dto';
import { SettingsResponseDto } from '../../users/dto/user-response.dto';
import { CreateMealDto } from '../../meals/dto/create-meal.dto';
export type { MealResponseDto, ProfileResponseDto, SettingsResponseDto };
export declare class CuisineUnlockDto {
    cuisineName: string;
    icon?: string;
    color?: string;
    firstMealAt: Date;
    mealCount: number;
    lastMealAt?: Date;
}
export declare class SyncPullResponseDto {
    meals: MealResponseDto[];
    profile?: ProfileResponseDto;
    settings?: SettingsResponseDto;
    cuisineUnlocks?: CuisineUnlockDto[];
    serverTime: string;
    hasMore: boolean;
}
export type SyncPushPayload = CreateMealDto | {
    id: string;
    version: number;
    imageUrl?: string;
    thumbnailUrl?: string;
    analysis?: object;
    notes?: string;
} | {
    id: string;
} | ProfileResponseDto | SettingsResponseDto;
export declare class SyncPushItem {
    id: string;
    type: 'CREATE_MEAL' | 'UPDATE_MEAL' | 'DELETE_MEAL' | 'UPDATE_PROFILE' | 'UPDATE_SETTINGS';
    payload: SyncPushPayload;
    clientId: string;
    timestamp: string;
}
export declare class SyncPushRequestDto {
    items: SyncPushItem[];
}
export declare class SyncPushFailedItem {
    clientId: string;
    error: string;
    code: string;
}
export declare class SyncPushConflictItem {
    clientId: string;
    type: string;
    serverVersion: number;
    clientVersion: number;
}
export declare class SyncPushResponseDto {
    success: string[];
    failed: SyncPushFailedItem[];
    conflicts: SyncPushConflictItem[];
    serverTime: string;
}
export declare class SyncStatusResponseDto {
    pendingItems: number;
    lastSyncAt?: string;
    serverTime: string;
    isHealthy: boolean;
}
export declare class ConflictResolutionDto {
    recordId: string;
    table: string;
    resolution: 'LAST_WRITE_WINS' | 'SERVER_WINS' | 'CLIENT_WINS' | 'MANUAL';
    manualValue?: Record<string, unknown>;
}
