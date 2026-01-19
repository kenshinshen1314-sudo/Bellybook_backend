-- Drop dependent views first
DROP VIEW IF EXISTS daily_nutrition CASCADE;
DROP VIEW IF EXISTS weekly_nutrition CASCADE;
DROP VIEW IF EXISTS cuisine_leaderboard CASCADE;

-- Drop old/unused tables
DROP VIEW IF EXISTS user_info CASCADE;
DROP VIEW IF EXISTS cuisine_info CASCADE;
DROP VIEW IF EXISTS dishes_info CASCADE;
DROP VIEW IF EXISTS unlocked_dishes CASCADE;
DROP VIEW IF EXISTS user_follows CASCADE;

DROP TABLE IF EXISTS user_info CASCADE;
DROP TABLE IF EXISTS cuisine_info CASCADE;
DROP TABLE IF EXISTS dishes_info CASCADE;
DROP TABLE IF EXISTS unlocked_dishes CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
