import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDate, IsNumber, IsObject } from 'class-validator';
import { MealResponseDto } from '../../meals/dto/meal-response.dto';
import { ProfileResponseDto } from '../../users/dto/user-response.dto';
import { SettingsResponseDto } from '../../users/dto/user-response.dto';
import { CreateMealDto } from '../../meals/dto/create-meal.dto';

// Re-export DTO types for convenience
export type { MealResponseDto, ProfileResponseDto, SettingsResponseDto };

export class CuisineUnlockDto {
  cuisineName!: string;
  icon?: string;
  color?: string;
  firstMealAt!: Date;
  mealCount!: number;
  lastMealAt?: Date;
}

export class SyncPullResponseDto {
  meals!: MealResponseDto[];
  profile?: ProfileResponseDto;
  settings?: SettingsResponseDto;
  cuisineUnlocks?: CuisineUnlockDto[];
  serverTime!: string;
  hasMore!: boolean;
}

// Payload types for sync operations
export type SyncPushPayload =
  | CreateMealDto
  | { id: string; version: number; imageUrl?: string; thumbnailUrl?: string; analysis?: object; notes?: string }
  | { id: string }
  | ProfileResponseDto
  | SettingsResponseDto;

export class SyncPushItem {
  @IsString()
  id!: string;

  @IsEnum(['CREATE_MEAL', 'UPDATE_MEAL', 'DELETE_MEAL', 'UPDATE_PROFILE', 'UPDATE_SETTINGS'])
  type!: 'CREATE_MEAL' | 'UPDATE_MEAL' | 'DELETE_MEAL' | 'UPDATE_PROFILE' | 'UPDATE_SETTINGS';

  @IsObject()
  payload!: SyncPushPayload;

  @IsString()
  clientId!: string;

  @IsString()
  timestamp!: string;
}

export class SyncPushRequestDto {
  @IsArray()
  items!: SyncPushItem[];
}

export class SyncPushFailedItem {
  @IsString()
  clientId!: string;

  @IsString()
  error!: string;

  @IsString()
  code!: string;
}

export class SyncPushConflictItem {
  @IsString()
  clientId!: string;

  @IsString()
  type!: string;

  @IsNumber()
  serverVersion!: number;

  @IsNumber()
  clientVersion!: number;
}

export class SyncPushResponseDto {
  success!: string[];
  failed!: SyncPushFailedItem[];
  conflicts!: SyncPushConflictItem[];
  serverTime!: string;
}

export class SyncStatusResponseDto {
  pendingItems!: number;
  lastSyncAt?: string;
  serverTime!: string;
  isHealthy!: boolean;
}

export class ConflictResolutionDto {
  @IsString()
  recordId!: string;

  @IsString()
  table!: string;

  @IsEnum(['LAST_WRITE_WINS', 'SERVER_WINS', 'CLIENT_WINS', 'MANUAL'])
  resolution!: 'LAST_WRITE_WINS' | 'SERVER_WINS' | 'CLIENT_WINS' | 'MANUAL';

  @IsOptional()
  @IsObject()
  manualValue?: Record<string, unknown>;
}
