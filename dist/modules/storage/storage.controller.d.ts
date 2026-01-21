import { StorageService } from './storage.service';
import { AiService } from '../ai/ai.service';
import { MealsService } from '../meals/meals.service';
import { UsersService } from '../users/users.service';
import { SuccessResponse } from '../../common/dto/response.dto';
export declare class StorageController {
    private readonly storageService;
    private readonly aiService;
    private readonly mealsService;
    private readonly usersService;
    constructor(storageService: StorageService, aiService: AiService, mealsService: MealsService, usersService: UsersService);
    uploadImage(userId: string, file: Express.Multer.File): Promise<any>;
    uploadWithAnalysis(userId: string, file: Express.Multer.File): Promise<{
        upload: {
            url: string;
            thumbnailUrl: string;
            key: string;
            size: number;
        };
        analysis: {
            foodName: string;
            cuisine: string;
            nutrition: {
                calories: number;
                protein: number;
                fat: number;
                carbohydrates: number;
                fiber?: number;
                sugar?: number;
                sodium?: number;
            };
            dishes?: Array<{
                foodName: string;
                cuisine?: string;
                nutrition: {
                    calories: number;
                    protein: number;
                    fat: number;
                    carbohydrates: number;
                };
            }>;
            plating?: string;
            description?: string;
            ingredients?: string[];
            historicalOrigins?: string;
            poeticDescription?: string;
            foodNamePoetic?: string;
            foodPrice?: number;
            dishSuggestion?: string;
        };
        meal: import("../meals/dto/meal-response.dto").MealResponseDto;
        quota: {
            limit: number;
            remaining: number;
        };
    }>;
    private processAiAnalysis;
    deleteFile(key: string): Promise<SuccessResponse>;
    getPresignedUrl(filename: string, type: string): Promise<any>;
}
