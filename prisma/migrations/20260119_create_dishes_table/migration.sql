-- CreateDishesTable
-- Create dishes knowledge base table

CREATE TABLE IF NOT EXISTS "dishes" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) UNIQUE NOT NULL,
    "cuisine" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "historicalOrigins" TEXT,
    "appearanceCount" INTEGER NOT NULL DEFAULT 0,
    "averagePrice" DECIMAL(10, 2),
    "averageCalories" DECIMAL(10, 2),
    "averageProtein" DECIMAL(10, 2),
    "averageFat" DECIMAL(10, 2),
    "averageCarbs" DECIMAL(10, 2),
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "dishes_cuisine_idx" ON "dishes"("cuisine");
CREATE INDEX IF NOT EXISTS "dishes_appearanceCount_idx" ON "dishes"("appearanceCount");

-- Create trigger to update updatedAt
CREATE OR REPLACE FUNCTION update_dishes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dishes_updated_at
    BEFORE UPDATE ON "dishes"
    FOR EACH ROW
    EXECUTE FUNCTION update_dishes_updated_at();
