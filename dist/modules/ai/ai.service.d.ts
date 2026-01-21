import { OnModuleInit } from '@nestjs/common';
import { FoodAnalysisResult } from './ai-types';
export declare class AiService implements OnModuleInit {
    private readonly logger;
    private genAI;
    onModuleInit(): Promise<void>;
    analyzeFoodImage(imageBase64: string): Promise<FoodAnalysisResult>;
    imageToBase64(buffer: Buffer): string;
    private normalizeDishes;
    private calculateTotalNutrition;
    private validateAndNormalizeNutrition;
    private isRetriableError;
    private extractErrorCode;
    private getTimePeriod;
    private getDiningTimeScenery;
    private getTimePrefix;
    private getPoeticSuffix;
    private delay;
    private buildPrompt;
}
