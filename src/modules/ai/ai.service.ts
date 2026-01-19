import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { HttpsProxyAgent } from 'https-proxy-agent';

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
   * 分析食物图像并返回营养信息
   */
  async analyzeFoodImage(imageBase64: string): Promise<{
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
    plating?: string;
    description?: string;
    ingredients?: string[];
    historicalOrigins?: string;
    poeticDescription?: string;
    foodNamePoetic?: string;
    foodPrice?: number;
    dishSuggestion?: string;
  }> {
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
3. ingredients 数组至少包含 3 个主要食材
4. 菜系请从标准分类中选择

## JSON Schema
{
  "foodName": "具体菜名，如：宫保鸡丁",
  "cuisine": "菜系分类（川菜/粤菜/鲁菜/苏菜/浙菜/湘菜/闽菜/徽菜/京菜/东北菜/西北菜/云贵菜/西餐/日料/韩料/东南亚菜/印度菜/家常菜/其他）",
  "nutrition": {
    "calories": "根据图片中的分量估算总热量（千卡），一般正餐300-800，小吃100-300",
    "protein": "蛋白质含量（克），参考同类菜品标准值",
    "fat": "脂肪含量（克），注意调料和油脂含量",
    "carbohydrates": "碳水化合物（克），包含主食和糖分",
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

      // 验证必需字段
      if (!analysis.foodName || !analysis.cuisine || !analysis.nutrition) {
        throw new Error('Missing required fields in AI response');
      }

      // 验证食材列表
      if (!analysis.ingredients || !Array.isArray(analysis.ingredients) || analysis.ingredients.length < 2) {
        this.logger.warn(`Ingredients list is incomplete: ${JSON.stringify(analysis.ingredients)}`);
      }

      // 验证营养数据合理性
      const { calories, protein, fat, carbohydrates, sodium } = analysis.nutrition;

      if (typeof calories !== 'number' || calories < 0 || calories > 5000) {
        this.logger.warn(`Unusual calories detected: ${calories}, using fallback`);
        analysis.nutrition.calories = Math.max(0, Math.min(5000, Number(calories) || 300));
      }
      if (typeof protein !== 'number' || protein < 0 || protein > 200) {
        this.logger.warn(`Unusual protein detected: ${protein}, using fallback`);
        analysis.nutrition.protein = Math.max(0, Math.min(200, Number(protein) || 15));
      }
      if (typeof fat !== 'number' || fat < 0 || fat > 200) {
        this.logger.warn(`Unusual fat detected: ${fat}, using fallback`);
        analysis.nutrition.fat = Math.max(0, Math.min(200, Number(fat) || 20));
      }
      if (typeof carbohydrates !== 'number' || carbohydrates < 0 || carbohydrates > 500) {
        this.logger.warn(`Unusual carbohydrates detected: ${carbohydrates}, using fallback`);
        analysis.nutrition.carbohydrates = Math.max(0, Math.min(500, Number(carbohydrates) || 40));
      }
      if (sodium !== undefined && (typeof sodium !== 'number' || sodium < 0 || sodium > 10000)) {
        this.logger.warn(`Unusual sodium detected: ${sodium}, using fallback`);
        analysis.nutrition.sodium = Math.max(0, Math.min(10000, Number(sodium) || 1000));
      }

      // 生成诗意化的食物名称
      const foodNamePoetic = `${this.getTimePrefix()}${analysis.foodName}${this.getPoeticSuffix()}`;

      this.logger.log(`Successfully analyzed food: ${analysis.foodName}`);

      return {
        foodName: analysis.foodName,
        cuisine: analysis.cuisine,
        nutrition: {
          calories: Number(analysis.nutrition.calories) || 0,
          protein: Number(analysis.nutrition.protein) || 0,
          fat: Number(analysis.nutrition.fat) || 0,
          carbohydrates: Number(analysis.nutrition.carbohydrates) || 0,
          fiber: analysis.nutrition.fiber ? Number(analysis.nutrition.fiber) : undefined,
          sugar: analysis.nutrition.sugar ? Number(analysis.nutrition.sugar) : undefined,
          sodium: analysis.nutrition.sodium ? Number(analysis.nutrition.sodium) : undefined,
        },
        plating: analysis.plating,
        description: analysis.description,
        ingredients: analysis.ingredients,
        historicalOrigins: analysis.historicalOrigins,
        poeticDescription: analysis.poeticDescription,
        foodNamePoetic,
        foodPrice: analysis.foodPrice ? Number(analysis.foodPrice) : undefined,
        dishSuggestion: analysis.dishSuggestion,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.logger.error('Failed to parse AI response as JSON', error.stack);
        throw new Error('AI returned invalid JSON format');
      }
      this.logger.error(`Failed to analyze food image: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 将图片文件转换为 base64
   */
  imageToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }
}
