"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const prisma = new client_1.PrismaClient();
const logger = new common_1.Logger('BackfillDishUnlocks');
async function main() {
    logger.log('Starting backfill of dish_unlocks...');
    logger.log('Fetching all meals...');
    const meals = await prisma.meal.findMany({
        where: {
            deletedAt: null,
        },
        select: {
            userId: true,
            foodName: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });
    logger.log(`Found ${meals.length} meals. Processing...`);
    const statsMap = new Map();
    for (const meal of meals) {
        if (!meal.foodName)
            continue;
        const key = `${meal.userId}:${meal.foodName}`;
        const existing = statsMap.get(key);
        if (!existing) {
            statsMap.set(key, {
                userId: meal.userId,
                dishName: meal.foodName,
                mealCount: 1,
                firstMealAt: meal.createdAt,
                lastMealAt: meal.createdAt,
            });
        }
        else {
            existing.mealCount++;
            if (meal.createdAt > existing.lastMealAt) {
                existing.lastMealAt = meal.createdAt;
            }
        }
    }
    logger.log(`Identified ${statsMap.size} unique user-dish pairs.`);
    let processed = 0;
    const total = statsMap.size;
    for (const stats of statsMap.values()) {
        await prisma.dish_unlocks.upsert({
            where: {
                userId_dishName: {
                    userId: stats.userId,
                    dishName: stats.dishName,
                },
            },
            update: {
                mealCount: stats.mealCount,
                firstMealAt: stats.firstMealAt,
                lastMealAt: stats.lastMealAt,
            },
            create: {
                userId: stats.userId,
                dishName: stats.dishName,
                mealCount: stats.mealCount,
                firstMealAt: stats.firstMealAt,
                lastMealAt: stats.lastMealAt,
            },
        });
        processed++;
        if (processed % 50 === 0) {
            logger.log(`Processed ${processed}/${total}...`);
        }
    }
    logger.log('Backfill completed successfully!');
}
main()
    .catch((e) => {
    logger.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=backfill-dish-unlocks.js.map