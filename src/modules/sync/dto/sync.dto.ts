import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDate } from 'class-validator';
import { MealResponseDto } from '../../meals/dto/meal-response.dto';
import { ProfileResponseDto } from '../../users/dto/user-response.dto';
import { SettingsResponseDto } from '../../users/dto/user-response.dto';

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

export class SyncPushItem {
  @IsString()
  id!: string;

  @IsEnum(['CREATE_MEAL', 'UPDATE_MEAL', 'DELETE_MEAL', 'UPDATE_PROFILE', 'UPDATE_SETTINGS'])
  type!: 'CREATE_MEAL' | 'UPDATE_MEAL' | 'DELETE_MEAL' | 'UPDATE_PROFILE' | 'UPDATE_SETTINGS';

  payload!: any;

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

  serverVersion!: any;

  clientVersion!: any;
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

  manualValue?: any;
}
