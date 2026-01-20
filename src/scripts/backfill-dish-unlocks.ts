
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting backfill of dish_unlocks...');

    // 1. Fetch all relevant meal data
    console.log('Fetching all meals...');
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

    console.log(`Found ${meals.length} meals. Processing...`);

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

    console.log(`Identified ${statsMap.size} unique user-dish pairs.`);

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
            console.log(`Processed ${processed}/${total}...`);
        }
    }

    console.log('Backfill completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
