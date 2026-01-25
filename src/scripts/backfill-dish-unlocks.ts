
import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

const prisma = new PrismaClient();
const logger = new Logger('BackfillDishUnlocks');

async function main() {
    logger.log('Starting backfill of dish_unlocks...');

    // 1. Fetch all relevant meal data
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

    // 2. Aggregate data in memory
    // Key: `${userId}:${foodName}`
    const statsMap = new Map<string, {
        userId: string;
        dishName: string;
        mealCount: number;
        firstMealAt: Date;
        lastMealAt: Date;
    }>();

    for (const meal of meals) {
        if (!meal.foodName) continue;

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
        } else {
            existing.mealCount++;
            // Since sorted by asc, firstMealAt is already set correctly
            // Update lastMealAt
            if (meal.createdAt > existing.lastMealAt) {
                existing.lastMealAt = meal.createdAt;
            }
        }
    }

    logger.log(`Identified ${statsMap.size} unique user-dish pairs.`);

    // 3. Write to database
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
