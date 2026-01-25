"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../../config/env");
const https_proxy_agent_1 = require("https-proxy-agent");
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
let AiService = AiService_1 = class AiService {
    logger = new common_1.Logger(AiService_1.name);
    genAI;
    async onModuleInit() {
        if (env_1.env.HTTPS_PROXY) {
            this.logger.log(`Using proxy: ${env_1.env.HTTPS_PROXY}`);
            const agent = new https_proxy_agent_1.HttpsProxyAgent(env_1.env.HTTPS_PROXY);
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (input, init) => {
                if (typeof input === 'string' && input.includes('googleapis.com')) {
                    return originalFetch(input, {
                        ...init,
                        dispatcher: agent,
                    });
                }
                return originalFetch(input, init);
            };
            this.logger.log('Proxy configured for Google API requests');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY || '');
    }
    async analyzeFoodImage(imageBase64) {
        let lastError;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const model = this.genAI.getGenerativeModel({
                    model: env_1.env.GEMINI_MODEL,
                });
                const diningTimeScenery = this.getDiningTimeScenery();
                const prompt = this.buildPrompt(diningTimeScenery);
                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: imageBase64,
                            mimeType: 'image/jpeg',
                        },
                    },
                ]);
                const response = await result.response;
                const text = response.text();
                this.logger.debug(`AI raw response (first 500 chars): ${text.substring(0, 500)}`);
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    this.logger.error(`AI response format error. Response length: ${text.length}, Response: ${text}`);
                    throw new common_1.BadRequestException(`Invalid response format from AI. Response: ${text.substring(0, 200)}...`);
                }
                let analysis;
                try {
                    analysis = JSON.parse(jsonMatch[0]);
                }
                catch (parseError) {
                    this.logger.error(`Failed to parse JSON: ${jsonMatch[0]}`);
                    throw new common_1.BadRequestException(`AI returned invalid JSON format: ${parseError.message}`);
                }
                const normalizedDishes = this.normalizeDishes(analysis);
                const totalNutrition = this.calculateTotalNutrition(normalizedDishes);
                const foodNamePoetic = `${this.getTimePrefix()}${normalizedDishes[0].foodName}${this.getPoeticSuffix()}`;
                const ingredients = analysis.ingredients || [];
                if (!Array.isArray(ingredients) || ingredients.length < 2) {
                    this.logger.warn(`Ingredients list is incomplete: ${JSON.stringify(ingredients)}`);
                }
                this.logger.log(`Successfully analyzed ${normalizedDishes.length} dish(es)`);
                return {
                    dishes: normalizedDishes,
                    nutrition: totalNutrition,
                    plating: analysis.plating,
                    description: analysis.description,
                    ingredients: ingredients,
                    historicalOrigins: analysis.historicalOrigins,
                    poeticDescription: analysis.poeticDescription,
                    foodNamePoetic,
                    foodPrice: analysis.foodPrice ? Number(analysis.foodPrice) : undefined,
                    dishSuggestion: analysis.dishSuggestion,
                };
            }
            catch (error) {
                lastError = error;
                if (error instanceof SyntaxError) {
                    this.logger.error('Failed to parse AI response as JSON', error.stack);
                    throw new common_1.BadRequestException('AI returned invalid JSON format');
                }
                if (this.isRetriableError(error) && attempt < MAX_RETRIES - 1) {
                    const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
                    this.logger.warn(`AI analysis attempt ${attempt + 1} failed (${this.extractErrorCode(error)}): ${error.message}. ` +
                        `Retrying in ${delayMs}ms...`);
                    await this.delay(delayMs);
                    continue;
                }
                break;
            }
        }
        const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
        const errorStack = lastError instanceof Error ? lastError.stack : undefined;
        this.logger.error(`Failed to analyze food image after ${MAX_RETRIES} attempts: ${errorMessage}`, errorStack);
        throw lastError;
    }
    imageToBase64(buffer) {
        return buffer.toString('base64');
    }
    normalizeDishes(analysis) {
        if (analysis.dishes && Array.isArray(analysis.dishes) && analysis.dishes.length > 0) {
            return analysis.dishes.map((dish) => ({
                foodName: dish.foodName || '未知菜品',
                cuisine: dish.cuisine || '其他',
                nutrition: this.validateAndNormalizeNutrition(dish.nutrition),
            }));
        }
        else if (analysis.foodName) {
            return [{
                    foodName: analysis.foodName,
                    cuisine: analysis.cuisine || '其他',
                    nutrition: this.validateAndNormalizeNutrition(analysis.nutrition),
                }];
        }
        else {
            throw new common_1.BadRequestException('Invalid AI response: neither dishes nor foodName found');
        }
    }
    calculateTotalNutrition(dishes) {
        return dishes.reduce((acc, dish) => ({
            calories: acc.calories + dish.nutrition.calories,
            protein: acc.protein + dish.nutrition.protein,
            fat: acc.fat + dish.nutrition.fat,
            carbohydrates: acc.carbohydrates + dish.nutrition.carbohydrates,
        }), { calories: 0, protein: 0, fat: 0, carbohydrates: 0 });
    }
    validateAndNormalizeNutrition(nutrition) {
        const calories = Number(nutrition?.calories) || 0;
        const protein = Number(nutrition?.protein) || 0;
        const fat = Number(nutrition?.fat) || 0;
        const carbohydrates = Number(nutrition?.carbohydrates) || 0;
        if (calories < 0 || calories > 5000) {
            this.logger.warn(`Unusual calories detected: ${calories}, using fallback`);
            return { calories: 300, protein: 15, fat: 20, carbohydrates: 40 };
        }
        if (protein < 0 || protein > 200) {
            this.logger.warn(`Unusual protein detected: ${protein}, normalizing`);
        }
        if (fat < 0 || fat > 200) {
            this.logger.warn(`Unusual fat detected: ${fat}, normalizing`);
        }
        if (carbohydrates < 0 || carbohydrates > 500) {
            this.logger.warn(`Unusual carbohydrates detected: ${carbohydrates}, normalizing`);
        }
        return {
            calories: Math.max(0, Math.min(5000, calories)),
            protein: Math.max(0, Math.min(200, protein)),
            fat: Math.max(0, Math.min(200, fat)),
            carbohydrates: Math.max(0, Math.min(500, carbohydrates)),
        };
    }
    isRetriableError(error) {
        const aiError = error;
        if (aiError.status === 503)
            return true;
        if (aiError.status === 429)
            return true;
        if (aiError.status === 500)
            return true;
        if (aiError.status === 502)
            return true;
        if (aiError.status === 504)
            return true;
        if (aiError.code === 'ECONNRESET' || aiError.code === 'ETIMEDOUT' || aiError.code === 'ENOTFOUND')
            return true;
        return false;
    }
    extractErrorCode(error) {
        const aiError = error;
        return aiError.status?.toString() || aiError.code || 'unknown';
    }
    getTimePeriod() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 9)
            return '晨光';
        if (hour >= 9 && hour < 11)
            return '上午';
        if (hour >= 11 && hour < 14)
            return '正午';
        if (hour >= 14 && hour < 17)
            return '午后';
        if (hour >= 17 && hour < 19)
            return '傍晚';
        if (hour >= 19 && hour < 22)
            return '暮色';
        return '深夜';
    }
    getDiningTimeScenery() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11)
            return '清晨的微光';
        if (hour >= 11 && hour < 16)
            return '正午的阳光';
        if (hour >= 16 && hour < 19)
            return '傍晚时分的暮色';
        return '夜晚的灯火';
    }
    getTimePrefix() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 9)
            return '晨光中的';
        if (hour >= 9 && hour < 11)
            return '晨午交织中的';
        if (hour >= 11 && hour < 14)
            return '正午时分的';
        if (hour >= 14 && hour < 17)
            return '慵懒午后的';
        if (hour >= 17 && hour < 19)
            return '傍晚时分的';
        if (hour >= 19 && hour < 22)
            return '暮色四合下的';
        return '夜色温柔中的';
    }
    getPoeticSuffix() {
        const suffixes = ['私语', '低语', '独白', '絮语', '慰藉'];
        return suffixes[Math.floor(Math.random() * suffixes.length)];
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    buildPrompt(diningTimeScenery) {
        return `你是一位专业的美食分析师。请仔细分析这张食物图片，并严格按照以下 JSON 格式返回分析结果。

## 输出要求
1. 必须是纯 JSON 格式，不要使用 markdown 代码块（不要用 \`\`\`json 包裹）
2. 所有数值必须是数字类型，不要带单位
3. 如果图片中有多道菜，必须在 dishes 数组中分别列出每道菜的营养信息
4. 如果只有一道菜，dishes 数组只包含一道菜的数据即可
5. ingredients 数组至少包含 3 个主要食材
6. 菜系请从标准分类中选择

## JSON Schema
{
  "foodName": "主菜品名称（如果有多个菜品，填写主要菜品）",
  "cuisine": "主要菜系分类（川菜/粤菜/鲁菜/苏菜/浙菜/湘菜/闽菜/徽菜/京菜/东北菜/西北菜/云贵菜/西餐/日料/韩料/东南亚菜/印度菜/家常菜/其他）",
  "dishes": [
    {
      "foodName": "菜品1名称，如：宫保鸡丁",
      "cuisine": "该菜的菜系",
      "nutrition": {
        "calories": "该菜的热量（千卡）",
        "protein": "该菜的蛋白质（克）",
        "fat": "该菜的脂肪（克）",
        "carbohydrates": "该菜的碳水（克）"
      }
    },
    {
      "foodName": "菜品2名称（如果有）",
      "cuisine": "该菜的菜系",
      "nutrition": {
        "calories": "该菜的热量（千卡）",
        "protein": "该菜的蛋白质（克）",
        "fat": "该菜的脂肪（克）",
        "carbohydrates": "该菜的碳水（克）"
      }
    }
  ],
  "nutrition": {
    "calories": "所有菜品的总热量（千卡），如果只有一道菜就是该菜的热量",
    "protein": "蛋白质总含量（克）",
    "fat": "脂肪总含量（克）",
    "carbohydrates": "碳水化合物总含量（克）",
    "fiber": "膳食纤维（克），蔬菜含量高的菜品数值较高",
    "sugar": "添加糖分（克），甜品类较高",
    "sodium": "钠含量（毫克），重油重盐菜品数值较高，一般500-3000"
  },
  "plating": "摆盘风格描述，如：简约现代、传统中式、精致西式等",
  "description": "菜品外观、口感、风味的综合描述（1-2句话）",
  "ingredients": ["食材1", "食材2", "食材3", "根据实际情况列出主要食材"],
  "historicalOrigins": "菜品的历史渊源与文化背景（1-2句话）",
  "poeticDescription": "使用固定模板生成诗意描述：${diningTimeScenery}透过窗棂，他悠闲地坐在餐桌边，凝视着盘中美食，筷子轻拨间，仿佛在整理日常的脉络，每一口都带着时间的重置，{菜品中的代表食材}在光影中摇曳，像是对重复生活的温柔抵抗。请将{菜品中的代表食材}替换为ingredients数组中的一种代表性食材（选择最具特色或最主要的食材）。",
  "foodPrice": "根据菜品用料、分量和餐厅档次估算的人民币价格（数字），家常菜20-60，餐厅菜60-200",
  "dishSuggestion": "根据营养分析给出本餐建议（1-2句话）。例如：如果碳水比例过高，建议增加蛋白质和蔬菜摄入；如果油脂过多，建议搭配清淡菜肴；如果营养均衡，给予肯定。要具体、实用。"
}

现在请分析这张图片，返回纯 JSON 格式：`;
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)()
], AiService);
//# sourceMappingURL=ai.service.js.map