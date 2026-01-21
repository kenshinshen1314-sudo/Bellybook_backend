import { OnModuleInit } from '@nestjs/common';
export declare class AiService implements OnModuleInit {
    private readonly logger;
    private genAI;
    onModuleInit(): Promise<void>;
    private getTimePeriod;
    private getDiningTimeScenery;
    private getTimePrefix;
    private getPoeticSuffix;
    private _validateAndNormalizeNutrition;
    private delay;
    private isRetriableError;
    analyzeFoodImage(imageBase64: string): Promise<{
        dishes: Array<{
            foodName: string;
            cuisine: string;
            nutrition: {
                calories: number;
                protein: number;
                fat: number;
                carbohydrates: number;
            };
        }>;
        nutrition: {
            calories: number;
            protein: number;
            fat: number;
            carbohydrates: number;
        };
        plating?: string;
        description?: string;
        ingredients?: string[];
        historicalOrigins?: string;
        poeticDescription?: string;
        foodNamePoetic?: string;
        foodPrice?: number;
        dishSuggestion?: string;
    }>;
    imageToBase64(buffer: Buffer): string;
}
