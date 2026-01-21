import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { HttpsProxyAgent } from 'https-proxy-agent';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;

  async onModuleInit() {
    // 配置代理（如果设置了）
    if (env.HTTPS_PROXY) {
      this.logger.log(`Using proxy: ${env.HTTPS_PROXY}`);
      const agent = new HttpsProxyAgent(env.HTTPS_PROXY);

      // 配置全局 fetch 使用代理
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        if (typeof input === 'string' && input.includes('googleapis.com')) {
          return originalFetch(input, {
            ...init,
            // @ts-ignore - agent is supported by undici
            dispatcher: agent,
          });
        }
        return originalFetch(input, init);
      };

      this.logger.log('Proxy configured for Google API requests');
    }

    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');
  }

  /**
   * 根据时间获取时段描述
   */
  private getTimePeriod(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return '晨光';
    if (hour >= 9 && hour < 11) return '上午';
    if (hour >= 11 && hour < 14) return '正午';
    if (hour >= 14 && hour < 17) return '午后';
    if (hour >= 17 && hour < 19) return '傍晚';
    if (hour >= 19 && hour < 22) return '暮色';
    return '深夜';
  }

  /**
   * 获取就餐时间的景色描述
   */
  private getDiningTimeScenery(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return '清晨的微光';
    if (hour >= 11 && hour < 16) return '正午的阳光';
    if (hour >= 16 && hour < 19) return '傍晚时分的暮色';
    return '夜晚的灯火';
  }

  /**
   * 获取时间前缀用于 foodNamePoetic
   */
  private getTimePrefix(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return '晨光中的';
    if (hour >= 9 && hour < 11) return '晨午交织中的';
    if (hour >= 11 && hour < 14) return '正午时分的';
    if (hour >= 14 && hour < 17) return '慵懒午后的';
    if (hour >= 17 && hour < 19) return '傍晚时分的';
    if (hour >= 19 && hour < 22) return '暮色四合下的';
    return '夜色温柔中的';
  }

  /**
   * 随机选择诗意后缀
   */
  private getPoeticSuffix(): string {
    const suffixes = ['私语', '低语', '独白', '絮语', '慰藉'];
    return suffixes[Math.floor(Math.random() * suffixes.length)];
  }

  /**
   * 验证并规范化营养数据
   * 清洗 AI 返回的原始数据，确保在合理范围内
   */
  private _validateAndNormalizeNutrition(nutrition: any): {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
  } {
    const calories = Number(nutrition?.calories) || 0;
    const protein = Number(nutrition?.protein) || 0;
    const fat = Number(nutrition?.fat) || 0;
    const carbohydrates = Number(nutrition?.carbohydrates) || 0;

    // 验证并修正异常值
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

  /**
   * 延迟函数，用于重试间隔
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 判断错误是否为可重试的错误
   */
  private isRetriableError(error: any): boolean {
    // 503 Service Unavailable - 服务过载
    if (error?.status === 503) return true;
    // 429 Too Many Requests - 速率限制
    if (error?.status === 429) return true;
    // 500 Internal Server Error - 服务器错误
    if (error?.status === 500) return true;
    // 502 Bad Gateway
    if (error?.status === 502) return true;
    // 504 Gateway Timeout
    if (error?.status === 504) return true;
    // 网络错误
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND') return true;
    return false;
  }

  /**
   * 分析食物图像并返回营养信息
   * 统一 API 契约：始终返回 dishes 数组（单菜品也是数组长度为 1）
   */
  async analyzeFoodImage(imageBase64: string): Promise<{
    // 核心：菜品数组（统一数据结构）
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
    // 总营养数据（所有菜品汇总，方便前端直接使用）
    nutrition: {
      calories: number;
      protein: number;
      fat: number;
      carbohydrates: number;
    };
    // 其他元数据
    plating?: string;
    description?: string;
    ingredients?: string[];
    historicalOrigins?: string;
    poeticDescription?: string;
    foodNamePoetic?: string;
    foodPrice?: number;
    dishSuggestion?: string;
  }> {
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: env.GEMINI_MODEL,
        });

        const diningTimeScenery = this.getDiningTimeScenery();

      // 构建提示词
      const prompt = `你是一位专业的美食分析师。请仔细分析这张食物图片，并严格按照以下 JSON 格式返回分析结果。

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

      // 调用 Gemini API 进行图像分析
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

      // 提取 JSON（去除可能的 markdown 标记）
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // 统一规范化为 dishes 数组结构
      let normalizedDishes: Array<{
        foodName: string;
        cuisine: string;
        nutrition: {
          calories: number;
          protein: number;
          fat: number;
          carbohydrates: number;
        };
      }> = [];

      // 如果 AI 返回了 dishes 数组，使用它；否则将单菜品包装成数组
      if (analysis.dishes && Array.isArray(analysis.dishes) && analysis.dishes.length > 0) {
        normalizedDishes = analysis.dishes.map((dish: any) => ({
          foodName: dish.foodName || '未知菜品',
          cuisine: dish.cuisine || '其他',
          nutrition: this._validateAndNormalizeNutrition(dish.nutrition),
        }));
      } else if (analysis.foodName) {
        // 单菜品模式：包装成数组
        normalizedDishes = [{
          foodName: analysis.foodName,
          cuisine: analysis.cuisine || '其他',
          nutrition: this._validateAndNormalizeNutrition(analysis.nutrition),
        }];
      } else {
        throw new Error('Invalid AI response: neither dishes nor foodName found');
      }

      // 验证食材列表
      const ingredients = analysis.ingredients || [];
      if (!Array.isArray(ingredients) || ingredients.length < 2) {
        this.logger.warn(`Ingredients list is incomplete: ${JSON.stringify(ingredients)}`);
      }

      // 计算总营养（所有菜品的总和）
      const totalNutrition = normalizedDishes.reduce(
        (acc, dish) => ({
          calories: acc.calories + dish.nutrition.calories,
          protein: acc.protein + dish.nutrition.protein,
          fat: acc.fat + dish.nutrition.fat,
          carbohydrates: acc.carbohydrates + dish.nutrition.carbohydrates,
        }),
        { calories: 0, protein: 0, fat: 0, carbohydrates: 0 }
      );

      // 生成诗意化的食物名称（使用主菜品）
      const foodNamePoetic = `${this.getTimePrefix()}${normalizedDishes[0].foodName}${this.getPoeticSuffix()}`;

      this.logger.log(`Successfully analyzed ${normalizedDishes.length} dish(es)`);

      return {
        // 统一的 API 契约：始终返回 dishes 数组
        dishes: normalizedDishes,
        // 总营养数据（所有菜品汇总）
        nutrition: {
          calories: totalNutrition.calories,
          protein: totalNutrition.protein,
          fat: totalNutrition.fat,
          carbohydrates: totalNutrition.carbohydrates,
        },
        // 其他元数据
        plating: analysis.plating,
        description: analysis.description,
        ingredients: ingredients,
        historicalOrigins: analysis.historicalOrigins,
        poeticDescription: analysis.poeticDescription,
        foodNamePoetic,
        foodPrice: analysis.foodPrice ? Number(analysis.foodPrice) : undefined,
        dishSuggestion: analysis.dishSuggestion,
      };
      // 成功则直接返回，不进行重试
      } catch (error) {
        lastError = error;

        // JSON 解析错误不重试
        if (error instanceof SyntaxError) {
          this.logger.error('Failed to parse AI response as JSON', error.stack);
          throw new Error('AI returned invalid JSON format');
        }

        // 检查是否为可重试的错误
        if (this.isRetriableError(error) && attempt < MAX_RETRIES - 1) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
          this.logger.warn(
            `AI analysis attempt ${attempt + 1} failed (${error.status || error.code || 'unknown'}): ${error.message}. ` +
            `Retrying in ${delayMs}ms...`
          );
          await this.delay(delayMs);
          continue;
        }

        // 不可重试的错误或已达到最大重试次数
        break;
      }
    }

    // 所有重试都失败
    this.logger.error(
      `Failed to analyze food image after ${MAX_RETRIES} attempts: ${lastError.message}`,
      lastError.stack
    );
    throw lastError;
  }

  /**
   * 将图片文件转换为 base64
   */
  imageToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }
}
