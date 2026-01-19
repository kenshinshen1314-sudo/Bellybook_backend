# Bellybook 后端架构设计文档 v2.0

> 基于前端项目的完整分析，重新设计的后端架构方案

**项目目录**: `/Users/kenshin/projects/Bellybook_backend`
**技术栈**: NestJS + Prisma + PostgreSQL (Supabase)
**创建日期**: 2026-01-17
**版本**: 2.0

---

## 目录

- [一、项目架构总览](#一项目架构总览)
- [二、数据库设计](#二数据库设计完整版)
- [三、API 接口清单](#三api-接口清单完整版)
- [四、同步机制设计](#四同步机制设计)
- [五、安全设计](#五安全设计)
- [六、缓存策略](#六缓存策略)
- [七、环境配置](#七环境配置)
- [八、部署方案](#八部署方案)
- [九、开发阶段规划](#九开发阶段规划)
- [十、项目依赖清单](#十项目依赖清单)

---

## 一、项目架构总览

### 1.1 技术栈确定

```
┌─────────────────────────────────────────────────────────────┐
│                        Bellybook Backend                    │
├─────────────────────────────────────────────────────────────┤
│  框架层     │  NestJS 10.x + TypeScript 5.x                 │
│  ORM层      │  Prisma 5.x                                   │
│  数据库     │  PostgreSQL 15 (Supabase)                     │
│  存储层     │  Supabase Storage                              │
│  缓存层     │  Redis (可选，用于排行榜缓存)                  │
│  认证层     │  JWT + Passport.js                             │
│  验证层     │  class-validator + class-transformer          │
│  AI集成     │  Google Gemini API                             │
│  任务队列   │  Bull (可选，用于异步任务)                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 项目目录结构

```
Bellybook_backend/
├── src/
│   ├── main.ts                           # 应用入口
│   ├── app.module.ts                     # 根模块
│   │
│   ├── config/                           # 配置模块
│   │   ├── env.ts                        # 环境变量验证 (zod)
│   │   ├── supabase.ts                   # Supabase 客户端
│   │   ├── gemini.ts                     # Gemini AI 客户端
│   │   ├── redis.ts                      # Redis 客户端
│   │   ├── constants.ts                  # 常量定义
│   │   └── cuicine.config.ts             # 菜系配置
│   │
│   ├── common/                           # 通用模块
│   │   ├── decorators/                   # 自定义装饰器
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── guards/                       # 守卫
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── premium.guard.ts          # 会员守卫
│   │   │   └── rate-limit.guard.ts       # 限流守卫
│   │   ├── interceptors/                 # 拦截器
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   └── cache.interceptor.ts      # 缓存拦截器
│   │   ├── filters/                      # 异常过滤器
│   │   │   ├── http-exception.filter.ts
│   │   │   └── query-failed.filter.ts
│   │   ├── pipes/                        # 管道
│   │   │   ├── validation.pipe.ts
│   │   │   └── parse-query.pipe.ts
│   │   ├── dto/                          # 通用 DTO
│   │   │   ├── pagination.dto.ts
│   │   │   ├── response.dto.ts
│   │   │   └── sync.dto.ts
│   │   └── utils/                        # 工具函数
│   │       ├── crypto.util.ts            # 密码哈希
│   │       ├── date.util.ts              # 日期处理
│   │       ├── image.util.ts             # 图片处理
│   │       └── sync.util.ts              # 同步工具
│   │
│   ├── modules/                          # 业务模块
│   │   │
│   │   ├── auth/                         # 认证模块
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts        # /api/v1/auth
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── refresh.strategy.ts
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       ├── login.dto.ts
│   │   │       ├── refresh.dto.ts
│   │   │       └── reset-password.dto.ts
│   │   │
│   │   ├── users/                        # 用户模块
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts       # /api/v1/users
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   │       ├── profile.dto.ts
│   │   │       ├── settings.dto.ts
│   │   │       └── user-stats.dto.ts
│   │   │
│   │   ├── meals/                        # 餐食模块
│   │   │   ├── meals.module.ts
│   │   │   ├── meals.controller.ts       # /api/v1/meals
│   │   │   ├── meals.service.ts
│   │   │   ├── meals.repository.ts       # 数据访问层
│   │   │   └── dto/
│   │   │       ├── create-meal.dto.ts
│   │   │       ├── update-meal.dto.ts
│   │   │       ├── meal-response.dto.ts
│   │   │       └── meal-query.dto.ts
│   │   │
│   │   ├── nutrition/                    # 营养分析模块
│   │   │   ├── nutrition.module.ts
│   │   │   ├── nutrition.controller.ts   # /api/v1/nutrition
│   │   │   ├── nutrition.service.ts
│   │   │   └── dto/
│   │   │       ├── daily.dto.ts
│   │   │       ├── weekly.dto.ts
│   │   │       ├── summary.dto.ts
│   │   │       └── trends.dto.ts
│   │   │
│   │   ├── cuisines/                     # 菜系模块
│   │   │   ├── cuisines.module.ts
│   │   │   ├── cuisines.controller.ts    # /api/v1/cuisines
│   │   │   ├── cuisines.service.ts
│   │   │   └── dto/
│   │   │       ├── cuisine-unlock.dto.ts
│   │   │       └── cuisine-stats.dto.ts
│   │   │
│   │   ├── sync/                         # 数据同步模块
│   │   │   ├── sync.module.ts
│   │   │   ├── sync.controller.ts        # /api/v1/sync
│   │   │   ├── sync.service.ts
│   │   │   ├── sync-queue.service.ts     # 同步队列管理
│   │   │   ├── conflict.service.ts       # 冲突解决
│   │   │   └── dto/
│   │   │       ├── sync-pull.dto.ts
│   │   │       ├── sync-push.dto.ts
│   │   │       ├── sync-response.dto.ts
│   │   │       └── conflict-resolution.dto.ts
│   │   │
│   │   ├── storage/                      # 文件存储模块
│   │   │   ├── storage.module.ts
│   │   │   ├── storage.controller.ts     # /api/v1/storage
│   │   │   ├── storage.service.ts
│   │   │   └── dto/
│   │   │       ├── upload.dto.ts
│   │   │       └── upload-response.dto.ts
│   │   │
│   │   ├── ai/                           # AI 分析模块
│   │   │   ├── ai.module.ts
│   │   │   ├── ai.controller.ts          # /api/v1/ai
│   │   │   ├── ai.service.ts
│   │   │   ├── gemini.service.ts         # Gemini API 封装
│   │   │   ├── prompt.service.ts         # Prompt 管理
│   │   │   └── dto/
│   │   │       ├── analyze.dto.ts
│   │   │       └── analysis-response.dto.ts
│   │   │
│   │   ├── community/                    # 社区模块
│   │   │   ├── community.module.ts
│   │   │   ├── community.controller.ts   # /api/v1/community
│   │   │   ├── community.service.ts
│   │   │   ├── ranking.service.ts        # 排行榜服务
│   │   │   └── dto/
│   │   │       ├── leaderboard.dto.ts
│   │   │       ├── ranking-stats.dto.ts
│   │   │       └── user-achievement.dto.ts
│   │   │
│   │   ├── premium/                      # 会员模块
│   │   │   ├── premium.module.ts
│   │   │   ├── premium.controller.ts     # /api/v1/premium
│   │   │   ├── premium.service.ts
│   │   │   ├── quota.service.ts          # 配额管理
│   │   │   └── dto/
│   │   │       ├── subscription.dto.ts
│   │   │       ├── quota.dto.ts
│   │   │       └── usage.dto.ts
│   │   │
│   │   ├── analytics/                    # 数据分析模块
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts   # /api/v1/analytics
│   │   │   ├── analytics.service.ts
│   │   │   └── dto/
│   │   │       ├── patterns.dto.ts
│   │   │       ├── diversity.dto.ts
│   │   │       └── export.dto.ts
│   │   │
│   │   └── webhooks/                     # Webhook 模块
│   │       ├── webhooks.module.ts
│   │       ├── webhooks.controller.ts    # /rest/v1/webhooks
│   │       └── webhooks.service.ts
│   │
│   ├── database/                         # 数据库模块
│   │   ├── database.module.ts
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   │
│   └── prisma/                           # Prisma 相关
│       ├── schema.prisma                 # 数据库模型
│       └── migrations/                   # 迁移文件
│
├── test/                                 # 测试
│   ├── unit/
│   ├── e2e/
│   └── jest.config.js
│
├── .env                                  # 环境变量
├── .env.example
├── package.json
├── tsconfig.json
├── nest-cli.json
├── README.md
└── docs/                                 # 文档
    ├── api.md                            # API 文档
    └── database.md                       # 数据库文档
```

---

## 二、数据库设计（完整版）

### 2.1 Prisma Schema

```prisma
// ==================== 生成配置 ====================

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "fullTextIndex"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== 枚举定义 ====================

enum MealType {
  BREAKFAST
  LUNCH
  DINNER
  SNACK
}

enum Language {
  ZH
  EN
}

enum Theme {
  LIGHT
  DARK
  AUTO
}

enum SyncStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum SyncOperationType {
  CREATE_MEAL
  UPDATE_MEAL
  DELETE_MEAL
  UPDATE_PROFILE
  UPDATE_SETTINGS
}

enum ConflictResolution {
  LAST_WRITE_WINS
  SERVER_WINS
  CLIENT_WINS
  MANUAL
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  EXPIRED
  PENDING
}

enum SubscriptionTier {
  FREE
  PREMIUM
  PRO
}

enum RankingPeriod {
  WEEKLY
  MONTHLY
  YEARLY
  ALL_TIME
}

// ==================== 用户相关 ====================

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String?  @unique
  passwordHash String // bcrypt hash

  // 档案信息
  displayName String?
  bio         String? @db.Text
  avatarUrl   String?

  // 设置
  language   Language @default(ZH)
  theme      Theme    @default(AUTO)
  notificationsEnabled Boolean @default(true)
  reminderTime String // HH:mm format
  hideRanking Boolean  @default(false) // 不参与排行榜

  // 会员信息
  subscriptionStatus SubscriptionStatus @default(FREE)
  subscriptionTier   SubscriptionTier   @default(FREE)
  subscriptionExpiresAt DateTime?
  premiumExpiresAt   DateTime? // 兼容旧字段

  // 配额使用
  dailyAnalysisCount Int      @default(0)
  dailyAnalysisReset DateTime @default(now()) // 每日重置时间

  // 时间戳
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lastLoginAt DateTime?
  deletedAt  DateTime? // 软删除

  // 关系
  profile     UserProfile?
  settings    UserSettings?
  meals       Meal[]
  dailyNutritions DailyNutrition[]
  cuisineUnlocks CuisineUnlock[]
  syncQueues  SyncQueue[]
  refreshTokens RefreshToken[]
  achievements UserAchievement[]

  @@index([username])
  @@index([email])
  @@index([createdAt])
  @@index([subscriptionTier])
  @@index([deletedAt])
  @@map("users")
}

model UserProfile {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  displayName String
  bio         String? @db.Text
  avatarUrl   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("user_profiles")
}

model UserSettings {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  language  Language @default(ZH)
  theme     Theme    @default(AUTO)
  notificationsEnabled Boolean @default(true)
  reminderTime String?
  hideRanking Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("user_settings")
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  revokedAt DateTime?

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

// ==================== 餐食相关 ====================

model Meal {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // 图片
  imageUrl      String
  thumbnailUrl  String?
  imageHash     String? // SHA-256 hash for deduplication

  // 基本信息
  foodName      String
  cuisine       String
  mealType      MealType @default(SNACK)

  // AI 分析结果 (存储为 JSON)
  analysis      Json     // MealAnalysis object

  // 单独索引的字段（便于查询）
  calories      Float?
  protein       Float?
  fat           Float?
  carbohydrates Float?

  // 用户输入
  notes         String? @db.Text

  // 同步信息
  isSynced      Boolean  @default(false)
  syncedAt      DateTime?
  version       Int      @default(1) // 乐观锁版本号

  // 时间戳
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  analyzedAt    DateTime?
  deletedAt     DateTime? // 软删除

  // 全文搜索
  searchText    String?  // "食物名 菜系 备注" 用于搜索

  @@index([userId])
  @@index([userId, createdAt])
  @@index([userId, mealType])
  @@index([createdAt])
  @@index([cuisine])
  @@index([isSynced])
  @@index([imageHash])
  @@index([deletedAt])
  @@map("meals")
}

// ==================== 营养统计 ====================

model DailyNutrition {
  id          Int      @id @default(autoincrement())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date        DateTime @db.Date

  totalCalories      Float @default(0)
  totalProtein       Float @default(0)
  totalFat           Float @default(0)
  totalCarbohydrates Float @default(0)
  totalFiber         Float @default(0)
  totalSugar         Float @default(0)
  totalSodium        Float @default(0)

  mealCount    Int @default(0)
  breakfastCount Int @default(0)
  lunchCount    Int @default(0)
  dinnerCount   Int @default(0)
  snackCount    Int @default(0)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId])
  @@index([date])
  @@map("daily_nutritions")
}

// ==================== 菜系解锁 ====================

model CuisineUnlock {
  id          Int      @id @default(autoincrement())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  cuisineName String

  firstMealAt DateTime
  mealCount   Int      @default(1)
  lastMealAt  DateTime?

  // 菜系元数据（从配置表获取，冗余存储提高性能）
  cuisineIcon    String?
  cuisineColor   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, cuisineName])
  @@index([userId])
  @@index([cuisineName])
  @@index([userId, mealCount]) // 用于排行查询
  @@map("cuisine_unlocks")
}

// ==================== 菜系配置 ====================

model CuisineConfig {
  id          Int      @id @default(autoincrement())
  name        String   @unique // 菜系名称（中英文）
  nameEn      String?  // 英文名称
  nameZh      String?  // 中文名称
  category    String?  // 分类（亚洲/欧洲等）

  icon        String   // Emoji
  color       String   // Hex color
  description String?  @db.Text

  // 展示顺序
  displayOrder Int     @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([category])
  @@index([displayOrder])
  @@map("cuisine_configs")
}

// ==================== 同步相关 ====================

model SyncQueue {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type       SyncOperationType
  payload    Json
  resourceId String?  // 关联的资源ID
  status     SyncStatus @default(PENDING)

  // 冲突解决
  conflictType String?
  resolution   ConflictResolution?

  retryCount  Int      @default(0)
  lastError   String?  @db.Text

  processedAt DateTime?
  expiresAt   DateTime? // 过期时间，清理用

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, status])
  @@index([type])
  @@index([createdAt])
  @@index([expiresAt])
  @@map("sync_queues")
}

model SyncLog {
  id        String   @id @default(cuid())
  userId    String

  operation SyncOperationType
  tableName String
  recordId  String

  action    String   // created | updated | deleted
  changes   Json?    // 变更详情

  ipAddress String?
  userAgent String?

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([tableName, recordId])
  @@index([createdAt])
  @@map("sync_logs")
}

// ==================== 社区相关 ====================

model UserAchievement {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type      String   // cuisine_master | food_explorer | etc
  title     String
  description String? @db.Text
  icon      String?

  unlockedAt DateTime @default(now())

  // 元数据
  metadata  Json?

  @@index([userId])
  @@index([type])
  @@map("user_achievements")
}

// ==================== 排行榜缓存 ====================

model RankingCache {
  id        String   @id @default(cuid())
  period    RankingPeriod
  cuisineName String? // null = 总榜
  tier      SubscriptionTier @default(FREE) // 分组

  // 排行数据（JSON）
  rankings  Json     // [{userId, username, avatarUrl, score, count}]

  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([period, cuisineName, tier])
  @@index([expiresAt])
  @@map("ranking_caches")
}

// ==================== 系统配置 ====================

model SystemConfig {
  id        String   @id @default("system")
  key       String   @unique
  value     Json
  valueType String   // string | number | boolean | json
  updatedAt DateTime @updatedAt

  @@map("system_configs")
}

// ==================== 分析配额记录 ====================

model AnalysisQuota {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime @db.Date

  count     Int      @default(0)
  limit     Int      @default(10) // 免费用户10次
  resetAt   DateTime

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId, date])
  @@map("analysis_quotas")
}

// ==================== Webhook 事件 ====================

model WebhookEvent {
  id        String   @id @default(cuid())
  type      String   // payment | analysis | etc
  payload   Json
  status    String   @default("pending") // pending | processed | failed

  processedAt DateTime?
  result     Json?
  error      String?

  retryCount Int     @default(0)
  createdAt DateTime @default(now())

  @@index([type, status])
  @@index([createdAt])
  @@map("webhook_events")
}
```

### 2.2 数据库表清单

| 表名 | 描述 | 主要字段 |
|------|------|----------|
| `users` | 用户主表 | id, username, email, passwordHash, subscriptionTier |
| `user_profiles` | 用户档案 | userId, displayName, bio, avatarUrl |
| `user_settings` | 用户设置 | userId, language, theme, reminderTime |
| `refresh_tokens` | 刷新令牌 | token, userId, expiresAt, revokedAt |
| `meals` | 餐食记录 | userId, imageUrl, analysis, mealType, version |
| `daily_nutritions` | 每日营养汇总 | userId, date, totalCalories, mealCount |
| `cuisine_unlocks` | 菜系解锁记录 | userId, cuisineName, mealCount |
| `cuisine_configs` | 菜系配置 | name, icon, color, category |
| `sync_queues` | 同步队列 | userId, type, payload, status |
| `sync_logs` | 同步日志 | userId, operation, tableName, action |
| `user_achievements` | 用户成就 | userId, type, title, unlockedAt |
| `ranking_caches` | 排行榜缓存 | period, cuisineName, rankings |
| `system_configs` | 系统配置 | key, value, valueType |
| `analysis_quotas` | 分析配额 | userId, date, count, limit |
| `webhook_events` | Webhook 事件 | type, payload, status |

### 2.3 索引策略

| 表名 | 索引 | 用途 |
|------|------|------|
| `users` | username, email, subscriptionTier | 登录查询、会员筛选 |
| `meals` | userId, createdAt, mealType, cuisine | 用户餐食查询、统计 |
| `daily_nutritions` | userId+date (unique) | 每日营养查询 |
| `cuisine_unlocks` | userId+cuisineName (unique), mealCount | 解锁查询、排行 |
| `sync_queues` | userId+status, createdAt | 同步队列处理 |
| `ranking_caches` | period+cuisineName+tier (unique), expiresAt | 排行榜缓存 |

---

## 三、API 接口清单（完整版）

### 3.1 认证模块 `/api/v1/auth`

| 方法 | 路径 | 描述 | 认证 | 请求体 | 响应 |
|------|------|------|------|--------|------|
| POST | `/register` | 用户注册 | ❌ | `RegisterDto` | `AuthResponseDto` |
| POST | `/login` | 用户登录 | ❌ | `LoginDto` | `AuthResponseDto` |
| POST | `/logout` | 用户登出 | ✅ | - | `{ success }` |
| POST | `/refresh` | 刷新令牌 | ❌ | `RefreshDto` | `AuthResponseDto` |
| POST | `/verify-email` | 验证邮箱 | ❌ | `{ code }` | `{ success }` |
| POST | `/request-reset` | 请求重置密码 | ❌ | `{ email }` | `{ success }` |
| POST | `/reset-password` | 重置密码 | ❌ | `ResetPasswordDto` | `{ success }` |
| GET | `/me` | 获取当前用户 | ✅ | - | `UserResponseDto` |

**DTO 定义**:
```typescript
// RegisterDto
{
  username: string;      // 3-20字符，字母数字下划线
  email?: string;        // 可选邮箱
  password: string;      // 8-50字符
  displayName?: string;  // 显示名称
}

// LoginDto
{
  username: string;      // 用户名或邮箱
  password: string;
}

// RefreshDto
{
  refreshToken: string;
}

// AuthResponseDto
{
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;     // 秒
}

// ResetPasswordDto
{
  token: string;         // 重置令牌
  newPassword: string;
}
```

### 3.2 用户模块 `/api/v1/users`

| 方法 | 路径 | 描述 | 认证 | 请求体 | 响应 |
|------|------|------|------|--------|------|
| GET | `/profile` | 获取用户资料 | ✅ | - | `ProfileResponseDto` |
| PUT | `/profile` | 更新用户资料 | ✅ | `UpdateProfileDto` | `ProfileResponseDto` |
| GET | `/settings` | 获取用户设置 | ✅ | - | `SettingsResponseDto` |
| PUT | `/settings` | 更新用户设置 | ✅ | `UpdateSettingsDto` | `SettingsResponseDto` |
| POST | `/avatar` | 上传头像 | ✅ | `FormData` | `{ avatarUrl }` |
| GET | `/stats` | 获取用户统计 | ✅ | - | `UserStatsDto` |
| DELETE | `/account` | 删除账户 | ✅ | - | `{ success }` |

**DTO 定义**:
```typescript
// ProfileResponseDto
{
  profile: {
    id: string;
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    createdAt: string;
  };
  settings?: UserSettings;
}

// UpdateProfileDto
{
  displayName?: string;
  bio?: string;
}

// SettingsResponseDto
{
  language: 'zh' | 'en';
  theme: 'light' | 'dark' | 'auto';
  notificationsEnabled: boolean;
  reminderTime?: string;
  hideRanking: boolean;
  premiumExpiresAt?: string;
}

// UpdateSettingsDto
{
  language?: 'zh' | 'en';
  theme?: 'light' | 'dark' | 'auto';
  notificationsEnabled?: boolean;
  reminderTime?: string;
  hideRanking?: boolean;
}

// UserStatsDto
{
  totalMeals: number;
  totalCuisines: number;
  currentStreak: number;      // 连续记录天数
  longestStreak: number;
  thisWeekMeals: number;
  thisMonthMeals: number;
  favoriteCuisines: Array<{
    name: string;
    count: number;
  }>;
}
```

### 3.3 餐食模块 `/api/v1/meals`

| 方法 | 路径 | 描述 | 认证 | 参数/请求 | 响应 |
|------|------|------|------|----------|------|
| GET | `/` | 获取餐食列表 | ✅ | `MealQueryDto` | `PaginatedMealsDto` |
| GET | `/:id` | 获取餐食详情 | ✅ | - | `MealResponseDto` |
| POST | `/` | 创建餐食 | ✅ | `CreateMealDto` | `MealResponseDto` |
| PUT | `/:id` | 更新餐食 | ✅ | `UpdateMealDto` | `MealResponseDto` |
| DELETE | `/:id` | 删除餐食 | ✅ | - | `{ success }` |
| GET | `/today` | 今日餐食 | ✅ | - | `MealResponseDto[]` |
| GET | `/by-date` | 指定日期餐食 | ✅ | `{ date }` | `MealResponseDto[]` |
| GET | `/by-date-range` | 日期范围查询 | ✅ | `DateRangeDto` | `PaginatedMealsDto` |
| POST | `/analyze` | AI 分析图片 | ✅ | `AnalyzeDto` | `AnalysisResponseDto` |
| POST | `/upload-image` | 上传图片 | ✅ | `FormData` | `{ imageUrl, thumbnailUrl }` |

**DTO 定义**:
```typescript
// MealQueryDto
{
  page?: number;           // 默认 1
  limit?: number;          // 默认 20
  offset?: number;
  mealType?: MealType;
  startDate?: string;      // ISO date
  endDate?: string;        // ISO date
  cuisine?: string;
  sortBy?: 'createdAt' | 'calories' | 'protein';
  sortOrder?: 'asc' | 'desc';
}

// PaginatedMealsDto
{
  data: MealResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// CreateMealDto
{
  imageUrl: string;
  thumbnailUrl?: string;
  analysis: MealAnalysis;
  mealType?: MealType;
  notes?: string;
}

// UpdateMealDto
{
  mealType?: MealType;
  notes?: string;
}

// MealResponseDto
{
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  analysis: MealAnalysis;
  mealType: MealType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

// DateRangeDto
{
  startDate: string;       // ISO date
  endDate: string;         // ISO date
  page?: number;
  limit?: number;
}

// AnalyzeDto
{
  imageBase64: string;
  language?: 'zh' | 'en';  // 默认从用户设置获取
}

// MealAnalysis
{
  foodName: string;
  cuisine: string;
  plating?: string;
  sensory?: string;
  container?: string;
  description?: string;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  ingredients?: Array<{
    name: string;
    percentage: number;
    icon?: string;
    description?: string;
  }>;
  suggestions?: string[];
  poeticDescription?: string;
  nutritionCommentary?: string;
  analyzedAt: string;
}
```

### 3.4 营养模块 `/api/v1/nutrition`

| 方法 | 路径 | 描述 | 认证 | 参数 | 响应 |
|------|------|------|------|------|------|
| GET | `/daily` | 每日营养 | ✅ | `date?` | `DailyNutritionDto` |
| GET | `/weekly` | 周营养趋势 | ✅ | `startDate?, endDate?` | `WeeklyTrendsDto` |
| GET | `/monthly` | 月营养趋势 | ✅ | `year?, month?` | `MonthlyTrendsDto` |
| GET | `/summary` | 营养总览 | ✅ | `period?` | `NutritionSummaryDto` |
| GET | `/averages` | 平均营养 | ✅ | `period?` | `AverageNutritionDto` |

**DTO 定义**:
```typescript
// DailyNutritionDto
{
  date: string;            // YYYY-MM-DD
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbohydrates: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
  mealCount: number;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  snackCount: number;
  meals: MealResponseDto[];
}

// WeeklyTrendsDto
{
  startDate: string;
  endDate: string;
  dailyData: Array<{
    date: string;
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
  }>;
  averages: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
  };
  totalMeals: number;
}

// NutritionSummaryDto
{
  period: 'week' | 'month' | 'year' | 'all';
  startDate: string;
  endDate: string;
  totalMeals: number;
  totalCalories: number;
  averages: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
  };
  topCuisines: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  topMeals: Array<{
    foodName: string;
    cuisine: string;
    count: number;
  }>;
}
```

### 3.5 菜系模块 `/api/v1/cuisines`

| 方法 | 路径 | 描述 | 认证 | 响应 |
|------|------|------|------|------|
| GET | `/` | 获取所有菜系 | ✅ | `CuisineConfigDto[]` |
| GET | `/unlocked` | 已解锁菜系 | ✅ | `CuisineUnlockDto[]` |
| GET | `/stats` | 菜系统计 | ✅ | `CuisineStatsDto` |
| GET | `/:name` | 菜系详情 | ✅ | `CuisineDetailDto` |

**DTO 定义**:
```typescript
// CuisineConfigDto
{
  name: string;
  nameEn?: string;
  nameZh?: string;
  category?: string;
  icon: string;
  color: string;
  description?: string;
  displayOrder: number;
}

// CuisineUnlockDto
{
  cuisineName: string;
  icon: string;
  color: string;
  firstMealAt: string;
  mealCount: number;
  lastMealAt?: string;
}

// CuisineStatsDto
{
  totalUnlocked: number;
  totalAvailable: number;
  unlockProgress: number;   // 0-1
  topCuisines: Array<{
    name: string;
    count: number;
  }>;
  recentUnlocks: Array<{
    name: string;
    unlockedAt: string;
  }>;
}

// CuisineDetailDto
{
  name: string;
  icon: string;
  color: string;
  description?: string;
  mealCount: number;
  firstMealAt: string;
  lastMealAt?: string;
  recentMeals: MealResponseDto[];
  nutritionSummary: {
    avgCalories: number;
    avgProtein: number;
    avgFat: number;
    avgCarbs: number;
  };
}
```

### 3.6 同步模块 `/api/v1/sync`

| 方法 | 路径 | 描述 | 认证 | 请求/参数 | 响应 |
|------|------|------|------|----------|------|
| GET | `/pull` | 拉取更新 | ✅ | `SyncPullParams` | `SyncPullResponse` |
| POST | `/push` | 推送更新 | ✅ | `SyncPushRequest` | `SyncPushResponse` |
| GET | `/status` | 同步状态 | ✅ | - | `SyncStatusResponse` |
| POST | `/full` | 全量同步 | ✅ | - | `SyncPullResponse` |
| DELETE | `/queue` | 清空队列 | ✅ | - | `{ success }` |
| POST | `/resolve-conflict` | 解决冲突 | ✅ | `ConflictResolutionDto` | `{ success }` |

**DTO 定义**:
```typescript
// SyncPullParams
{
  lastSyncAt?: string;      // ISO timestamp
  includeMeals?: boolean;
  includeProfile?: boolean;
  includeSettings?: boolean;
  includeCuisines?: boolean;
}

// SyncPullResponse
{
  meals: MealResponseDto[];
  profile?: ProfileResponseDto;
  settings?: SettingsResponseDto;
  cuisineUnlocks?: CuisineUnlockDto[];
  serverTime: string;
  hasMore: boolean;
}

// SyncPushRequest
{
  items: Array<{
    id: string;             // 客户端生成的ID
    type: SyncOperationType;
    payload: any;
    clientId: string;       // 客户端ID
    timestamp: string;      // 客户端时间戳
  }>;
}

// SyncPushResponse
{
  success: string[];        // 成功的客户端ID列表
  failed: Array<{
    clientId: string;
    error: string;
    code: string;
  }>;
  conflicts: Array<{
    clientId: string;
    type: string;
    serverVersion: any;
    clientVersion: any;
  }>;
  serverTime: string;
}

// SyncStatusResponse
{
  pendingItems: number;
  lastSyncAt?: string;
  serverTime: string;
  isHealthy: boolean;
}

// ConflictResolutionDto
{
  recordId: string;
  table: string;
  resolution: ConflictResolution;
  manualValue?: any;        // 手动解决时的值
}
```

### 3.7 存储模块 `/api/v1/storage`

| 方法 | 路径 | 描述 | 认证 | 请求 | 响应 |
|------|------|------|------|------|------|
| POST | `/upload` | 上传文件 | ✅ | `FormData` | `UploadResponseDto` |
| DELETE | `/delete` | 删除文件 | ✅ | `{ url }` | `{ success }` |
| GET | `/presigned-url` | 获取预签名URL | ✅ | `{ filename, type }` | `{ url, key }` |

**DTO 定义**:
```typescript
// UploadResponseDto
{
  url: string;             // 原图URL
  thumbnailUrl?: string;   // 缩略图URL
  key: string;             // 存储key
  size: number;            // 文件大小
  width?: number;          // 图片宽度
  height?: number;         // 图片高度
}
```

### 3.8 AI 分析模块 `/api/v1/ai`

| 方法 | 路径 | 描述 | 认证 | 请求 | 响应 |
|------|------|------|------|------|------|
| POST | `/analyze` | 分析食物图片 | ✅ | `AnalyzeDto` | `AnalysisResponseDto` |
| POST | `/analyze-batch` | 批量分析 | ✅ | `images: string[]` | `AnalysisResponseDto[]` |
| GET | `/quota` | 查询配额 | ✅ | - | `QuotaResponseDto` |
| GET | `/usage` | 使用统计 | ✅ | `period?` | `UsageResponseDto` |

**DTO 定义**:
```typescript
// AnalyzeDto
{
  imageBase64: string;
  language?: 'zh' | 'en';
  includePoetic?: boolean;
}

// AnalysisResponseDto
{
  success: boolean;
  analysis?: MealAnalysis;
  error?: string;
  quotaRemaining?: number;
  quotaResetAt?: string;
}

// QuotaResponseDto
{
  limit: number;           // 总限制
  used: number;            // 已使用
  remaining: number;       // 剩余
  resetAt: string;         // 重置时间
  isPremium: boolean;
}

// UsageResponseDto
{
  period: 'day' | 'week' | 'month';
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  avgResponseTime: number;
  topCuisines: Array<{
    name: string;
    count: number;
  }>;
}
```

### 3.9 社区模块 `/api/v1/community`

| 方法 | 路径 | 描述 | 认证 | 参数 | 响应 |
|------|------|------|------|------|------|
| GET | `/leaderboard` | 排行榜 | ✅ | `LeaderboardQueryDto` | `LeaderboardDto` |
| GET | `/cuisine-masters` | 菜系专家榜 | ✅ | `cuisineName?, period?` | `CuisineMastersDto` |
| GET | `/achievements` | 用户成就 | ✅ | `userId?` | `AchievementsDto` |
| GET | `/ranking-stats` | 排行统计 | ✅ | `period?` | `RankingStatsDto` |

**DTO 定义**:
```typescript
// LeaderboardQueryDto
{
  period?: 'weekly' | 'monthly' | 'yearly' | 'all_time';
  cuisineName?: string;    // null = 总榜
  page?: number;
  limit?: number;
}

// LeaderboardDto
{
  period: string;
  cuisineName?: string;
  rankings: Array<{
    rank: number;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    score: number;         // 菜系数量或餐食数量
    badge?: string;        // 勋章
  }>;
  currentUserRank?: number;
  totalUsers: number;
}

// CuisineMastersDto
{
  cuisineName: string;
  period: string;
  masters: Array<{
    rank: number;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    mealCount: number;
  }>;
}

// AchievementsDto
{
  userId: string;
  achievements: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    icon?: string;
    unlockedAt: string;
    metadata?: any;
  }>;
  totalUnlocked: number;
  totalAvailable: number;
}

// RankingStatsDto
{
  period: string;
  totalUsers: number;
  activeUsers: number;
  totalMeals: number;
  totalCuisines: number;
  topCuisines: Array<{
    name: string;
    count: number;
  }>;
}
```

### 3.10 会员模块 `/api/v1/premium`

| 方法 | 路径 | 描述 | 认证 | 请求 | 响应 |
|------|------|------|------|------|------|
| GET | `/subscription` | 订阅信息 | ✅ | - | `SubscriptionDto` |
| POST | `/subscribe` | 创建订阅 | ✅ | `SubscribeDto` | `{ checkoutUrl }` |
| POST | `/cancel` | 取消订阅 | ✅ | - | `{ success }` |
| POST | `/webhook` | 支付回调 | ❌ | (Stripe/等) | `{ success }` |
| GET | `/benefits` | 会员权益 | ❌ | - | `BenefitsDto` |

**DTO 定义**:
```typescript
// SubscriptionDto
{
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  expiresAt?: string;
  cancelAtPeriodEnd?: boolean;
  benefits: string[];
}

// SubscribeDto
{
  tier: 'premium' | 'pro';
  paymentMethod: 'stripe' | 'alipay' | 'wechat';
  billingPeriod: 'monthly' | 'yearly';
}

// BenefitsDto
{
  free: BenefitsTierDto;
  premium: BenefitsTierDto;
  pro: BenefitsTierDto;
}

// BenefitsTierDto
{
  name: string;
  price: { monthly: number; yearly: number };
  dailyAnalysisLimit: number;
  features: string[];
}
```

### 3.11 数据分析模块 `/api/v1/analytics`

| 方法 | 路径 | 描述 | 认证 | 参数 | 响应 |
|------|------|------|------|------|------|
| GET | `/patterns` | 用餐规律 | ✅ | `period?` | `PatternsDto` |
| GET | `/diversity` | 食物多样性 | ✅ | `period?` | `DiversityDto` |
| POST | `/export` | 导出数据 | ✅ | `ExportDto` | `{ downloadUrl }` |
| GET | `/insights` | 数据洞察 | ✅ | - | `InsightsDto` |

**DTO 定义**:
```typescript
// PatternsDto
{
  period: string;
  mealTiming: {
    breakfast: { avgTime: string; frequency: number };
    lunch: { avgTime: string; frequency: number };
    dinner: { avgTime: string; frequency: number };
    snack: { avgTime: string; frequency: number };
  };
  preferredDays: Array<{
    day: string;
    mealCount: number;
  }>;
  preferredCuisines: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
}

// DiversityDto
{
  period: string;
  totalUniqueMeals: number;
  totalUniqueCuisines: number;
  diversityScore: number;    // 0-100
  varietyBreakdown: {
    newThisPeriod: number;
    recurring: number;
    oneTime: number;
  };
  explorationLevel: 'low' | 'medium' | 'high' | 'adventurous';
}

// ExportDto
{
  format: 'json' | 'csv' | 'pdf';
  startDate?: string;
  endDate?: string;
  includeImages?: boolean;
  includeAnalysis?: boolean;
}

// InsightsDto
{
  nutritionQuality: {
    score: number;
    strengths: string[];
    improvements: string[];
  };
  eatingHabits: {
    mostConsistent: string;
    areasForImprovement: string[];
  };
  recommendations: string[];
}
```

### 3.12 外部 API `/rest/v1/*`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/health` | 健康检查 | ❌ |
| GET | `/version` | 版本信息 | ❌ |
| POST | `/webhooks/payment` | 支付回调 | ❌ (签名验证) |
| POST | `/webhooks/gemini` | AI 回调 | ❌ (签名验证) |

---

## 四、同步机制设计

### 4.1 同步策略

```
┌─────────────────────────────────────────────────────────────┐
│                      同步架构                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   客户端                           服务端                    │
│      │                              │                       │
│      │  1. Pull 请求                 │                       │
│      │  GET /sync/pull?lastSyncAt=xxx │                       │
│      │ ──────────────────────────────>│                       │
│      │                              │ 查询变更记录           │
│      │                              │ (createdAt > lastSyncAt)│
│      │  2. 返回变更数据               │                       │
│      │  <──────────────────────────────│                       │
│      │                              │                       │
│      │  3. 检测冲突 & 解决            │                       │
│      │                              │                       │
│      │  4. Push 本地变更              │                       │
│      │  POST /sync/push              │                       │
│      │ ──────────────────────────────>│                       │
│      │                              │ 批量处理              │
│      │                              │ 记录变更日志          │
│      │  5. 返回处理结果               │                       │
│      │  <──────────────────────────────│                       │
│      │                              │                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 冲突解决策略

| 冲突类型 | 检测条件 | 默认策略 |
|----------|----------|----------|
| `SAME_RECORD_CONCURRENT` | 同一记录被并发修改 | LAST_WRITE_WINS |
| `DELETE_CONFLICT` | 一方删除，一方修改 | SERVER_WINS (删除优先) |
| `VERSION_MISMATCH` | 版本号不匹配 | 客户端选择 |

### 4.3 版本控制

```typescript
// 乐观锁实现
interface VersionedModel {
  version: number;  // 每次更新 +1
  updatedAt: DateTime;
}

// 更新时检查版本
UPDATE meals
SET data = $1, version = version + 1
WHERE id = $2 AND version = $3
```

### 4.4 同步队列清理

- 已完成项：保留 7 天后删除
- 失败项：重试 5 次后标记为失败，保留 30 天
- 过期项：`expiresAt < now()` 自动清理

---

## 五、安全设计

### 5.1 认证安全

```
┌─────────────────────────────────────────────────────────────┐
│                      认证流程                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 注册/登录 → 验证密码 → 生成 JWT Token                   │
│                                                             │
│  2. Token 结构:                                              │
│     {                                                       │
│       sub: userId,                                          │
│       iat: issuedAt,                                        │
│       exp: expiresAt (15min),                               │
│       tier: subscriptionTier                                │
│     }                                                       │
│                                                             │
│  3. Refresh Token:                                          │
│     - 存储 7 天                                             │
│     - 单次使用（使用后失效）                                 │
│     - 存储在数据库，可撤销                                   │
│                                                             │
│  4. 密码安全:                                               │
│     - bcrypt (salt rounds: 10)                              │
│     - 最小 8 字符                                            │
│     - 不存储明文                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 API 限流

```typescript
// 限流规则
const rateLimits = {
  public:      { requests: 10,  window: 60000 },  // 10/分钟
  auth:        { requests: 5,   window: 300000 },  // 5/5分钟
  user:        { requests: 100, window: 60000 },  // 100/分钟
  ai:          { requests: 20,  window: 86400000 }, // 20/天（免费用户）
  premium:     { requests: 100, window: 86400000 }, // 100/天（会员）
};
```

### 5.3 数据隔离

- 所有查询必须带 `userId` 过滤
- Row Level Security (PostgreSQL)
- API 守卫验证用户所有权

---

## 六、缓存策略

### 6.1 Redis 缓存

```
┌─────────────────────────────────────────────────────────────┐
│                      缓存策略                                │
├─────────────────────────────────────────────────────────────┤
│  数据类型              TTL        缓存键格式                  │
│  ─────────────────────────────────────────────────────────  │
│  用户会话              7天      session:{userId}             │
│  排行榜                1小时    leaderboard:{period}:{cuisine}│
│  菜系配置              永久     cuisine:*                    │
│  用户统计              5分钟    stats:{userId}               │
│  API 限流计数          滑动窗口  ratelimit:{userId}:{type}    │
│  同步 Token            1小时    synctoken:{userId}           │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 缓存失效

- 用户更新数据时清除相关缓存
- 排行榜定时更新（CRON）
- 手动刷新接口

---

## 七、环境配置

### 7.1 环境变量

```env
# ==================== 数据库 ====================
DATABASE_URL="postgresql://postgres.tefbwfzpcojzxfabnsxu:***@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.tefbwfzpcojzxfabnsxu:***@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

# ==================== Supabase ====================
SUPABASE_URL="https://tefbwfzpcojzxfabnsxu.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ==================== JWT ====================
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# ==================== Gemini AI ====================
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash-preview"

# ==================== Redis (可选) ====================
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0

# ==================== 服务器 ====================
PORT=3000
NODE_ENV="development"
API_PREFIX="/api/v1"
CORS_ORIGIN="http://localhost:5173,https://bellybook.app"

# ==================== 文件上传 ====================
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES="image/jpeg,image/png,image/webp,image/heic"

# ==================== 限流 ====================
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# ==================== 日志 ====================
LOG_LEVEL="debug"
LOG_FORMAT="json"

# ==================== 支付 (可选) ====================
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
ALIPAY_APP_ID=""
WECHAT_PAY_MCH_ID=""

# ==================== 邮件 (可选) ====================
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM="noreply@bellybook.app"
```

---

## 八、部署方案

### 8.1 推荐部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                      部署架构                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─────────────┐      ┌─────────────┐      ┌───────────┐ │
│    │   Nginx     │─────>│   NestJS    │─────>│ Supabase  │ │
│    │  (反向代理)  │      │  (API服务)   │      │  (数据库)  │ │
│    └─────────────┘      └─────────────┘      └───────────┘ │
│                                  │                           │
│                                  v                           │
│                           ┌─────────────┐                   │
│                           │    Redis    │                   │
│                           │  (可选缓存)  │                   │
│                           └─────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 部署选项对比

| 平台 | 优势 | 劣势 | 价格 | 推荐度 |
|------|------|------|------|--------|
| **Railway** | 简单、自动部署、支持PostgreSQL | 免费层有限制 | $5-20/月 | ⭐⭐⭐⭐⭐ |
| **Render** | 免费层、Docker支持 | 冷启动 | 免费起 | ⭐⭐⭐⭐ |
| **Fly.io** | 全球部署、性能好 | 配置稍复杂 | 免费起 | ⭐⭐⭐⭐ |
| **Vercel** | Serverless、CI/CD | 不适合长连接 | 按量 | ⭐⭐⭐ |
| **自建 VPS** | 完全控制 | 需运维 | $5-10/月 | ⭐⭐⭐ |

### 8.3 推荐方案：Railway

```bash
# 1. 安装 Railway CLI
npm install -g @railway/cli

# 2. 登录并链接项目
railway login
railway init

# 3. 添加 PostgreSQL 服务
railway add postgresql

# 4. 添加 Redis（可选）
railway add redis

# 5. 设置环境变量
railway variables set JWT_SECRET="..."

# 6. 部署
railway up
```

---

## 九、开发阶段规划

| 阶段 | 任务 | 优先级 | 预估 |
|------|------|--------|------|
| **Phase 1** | 项目初始化 + Prisma 配置 | P0 | 0.5 天 |
| **Phase 2** | 认证模块（注册/登录/JWT） | P0 | 1.5 天 |
| **Phase 3** | 用户模块 + 头像上传 | P0 | 1 天 |
| **Phase 4** | 存储模块（Supabase Storage） | P0 | 0.5 天 |
| **Phase 5** | 菜品模块（CRUD） | P0 | 1 天 |
| **Phase 6** | AI 分析模块（Gemini 集成） | P0 | 1 天 |
| **Phase 7** | 营养 + 菜系模块 | P1 | 1 天 |
| **Phase 8** | 同步模块（Pull/Push + 冲突） | P0 | 2 天 |
| **Phase 9** | 社区模块（排行榜） | P1 | 1 天 |
| **Phase 10** | 会员模块（配额管理） | P2 | 1 天 |
| **Phase 11** | 测试 + 部署 | P0 | 1 天 |

**总计：约 11.5 天**

---

## 十、项目依赖清单

### 10.1 生产依赖

```json
{
  "@nestjs/common": "^10.3.0",
  "@nestjs/core": "^10.3.0",
  "@nestjs/platform-express": "^10.3.0",
  "@nestjs/config": "^3.1.0",
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "@nestjs/throttler": "^5.1.0",
  "@prisma/client": "^5.8.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1",
  "@supabase/supabase-js": "^2.39.0",
  "@google/generative-ai": "^0.21.0",
  "ioredis": "^5.3.2",
  "sharp": "^0.33.1",
  "zod": "^3.22.4"
}
```

### 10.2 开发依赖

```json
{
  "@nestjs/cli": "^10.3.0",
  "@nestjs/schematics": "^10.1.0",
  "@nestjs/testing": "^10.3.0",
  "@types/express": "^4.17.21",
  "@types/node": "^20.11.0",
  "@types/passport-jwt": "^4.0.0",
  "@types/bcrypt": "^5.0.2",
  "@types/multer": "^1.4.11",
  "prisma": "^5.8.0",
  "typescript": "^5.3.3",
  "jest": "^29.7.0",
  "@types/jest": "^29.5.11",
  "supertest": "^6.3.4",
  "eslint": "^8.56.0",
  "@typescript-eslint/eslint-plugin": "^6.19.0",
  "prettier": "^3.2.4"
}
```

---

## 十一、关键决策总结

### 技术选型

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 框架 | NestJS | 企业级、模块化、TypeScript 原生支持 |
| ORM | Prisma | 类型安全、迁移管理、开发体验好 |
| 数据库 | PostgreSQL (Supabase) | 关系型、JSON 支持、托管服务 |
| 认证 | JWT + Passport | 无状态、标准、易于集成 |
| 存储 | Supabase Storage | 与数据库同平台、CDN 加速 |
| 缓存 | Redis (可选) | 排行榜性能优化 |
| 图片处理 | Sharp | 高性能、功能完善 |

---

**文档版本**: 2.1
**最后更新**: 2026-01-17

---

## 十二、前端项目分析总结

### 12.1 核心功能清单

**主要Tab功能:**
- **首页 (Tab1Home)**: 餐食记录、AI图片分析、营养展示、近期解锁
- **护照 (TabPassport)**: 菜系探索、菜品详情、美食收藏、历史渊源
- **数据 (Tab2History)**: 条形日历、历史记录、营养趋势
- **社区 (Tab4Social)**: 排行榜、菜系专家榜、用户成就

**核心业务流程:**
1. **AI餐食分析流程**: 拍照 → Gemini API分析 → 营养数据 → 保存到IndexedDB
2. **用户认证流程**: 注册/登录 → localStorage存储session → IndexedDB创建profile
3. **同步流程**: 本地操作 → SyncQueue → 离线重试 → (待接入后端)

### 12.2 IndexedDB表结构分析

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| **users** | 用户资料+设置 | profile+settings, id |
| **meals** | 餐食记录 | imageUrl, analysis(Json), isSynced, userId, createdAt |
| **syncQueue** | 离线同步队列 | type, payload, retryCount |
| **dailyNutrition** | 每日营养汇总 | date, totalCalories, mealCount |
| **cuisineUnlocks** | 菜系解锁 | cuisineName, mealCount, firstMealAt |

**索引策略:**
- meals: userId, userId+createdAt, isSynced
- syncQueue: userId, type, createdAt
- dailyNutrition: userId+date (unique)
- cuisineUnlocks: userId, cuisineName

### 12.3 当前数据架构

```
┌─────────────────────────────────────────────────┐
│         前端数据存储层次                          │
├─────────────────────────────────────────────────┤
│                                              │
│  localStorage (认证状态)                       │
│  └─ accessToken, refreshToken                │
│                                              │
│  IndexedDB (业务数据)                          │
│  ├─ users (profile+settings)                 │
│  ├─ meals (餐食记录)                          │
│  ├─ syncQueue (离线操作队列)                    │
│  ├─ dailyNutrition (营养汇总)                   │
│  └─ cuisineUnlocks (菜系解锁)                  │
│                                              │
│  React Context (运行时状态)                     │
│  ├─ AppContext (全局应用状态)                   │
│  ├─ AuthContext (用户认证状态)                   │
│  └─ ToastContext (通知状态)                     │
│                                              │
│  Memory (临时数据)                             │
│  ├─ 当前分析结果                              │
│  ├─ UI状态(模态框、导航)                      │
│  └─ 会员状态                                  │
└─────────────────────────────────────────────────┘
```

### 12.4 技术栈总结

- **框架**: React 19.2.3 + TypeScript 5.8.2
- **构建工具**: Vite 6.2.0
- **UI库**: Tailwind CSS 4.0.0 + Framer Motion 11.15.0
- **本地存储**: IndexedDB (idb 8.0.3)
- **AI集成**: Google Gemini (@google/genai 1.34.0)
- **状态管理**: React Context API
- **图表**: Recharts 3.6.0
- **认证**: 自定义 authService + localStorage

---

## 十三、前后端集成待完善问题

### 13.1 🔴 P0 - 阻塞迁移的关键问题

#### 问题1: 前后端数据模型不一致

| 字段 | 前端IndexedDB | 后端Prisma | 问题 |
|------|----------------------|----------------|------|
| 用户ID | `string` (CUID) | `string` (CUID) | ✅ 一致 |
| 菜系名称 | `cuisine` (String) | `cuisine` (String) | ✅ 一致 |
| 营养数据 | `nutrition: Json` | `nutrition: Json` + 冗余字段 | ⚠️ 冗余 |
| 菜系icon | ❌ 前端无存储 | `cuisineIcon` (String) | 🚫 缺失 |
| 菜系color | ❌ 前端无存储 | `cuisineColor` (String) | 🚫 缺失 |
| 版本号 | ❌ 前端无 | `version` (Int) | 🚫 缺失 |
| 图片哈希 | ❌ 前端无 | `imageHash` (String) | 🚫 缺失 |
| 软删除 | ❌ 前端无 | `deletedAt` (DateTime?) | 🚫 缺失 |
| 缩略图 | ❌ 前端无 | `thumbnailUrl` (String?) | 🚫 缺失 |

**影响**:
- 菜系icon/color无法同步
- 乐观锁无法工作
- 图片去重无法实现
- 软删除冲突

#### 问题2: 前端认证机制与后端不匹配

**前端当前实现**:
```typescript
// 前端当前使用简单的session存储
localStorage.setItem('bb_session', JSON.stringify(session))
```

**后端期望的Token格式**:
```typescript
{
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;     // 秒
}
```

**问题**:
1. 前端session格式与后端响应不匹配
2. Token刷新机制前端未实现
3. 前端API Client已准备好,但未连接真实后端

#### 问题3: 文件存储方案未明确

**前端现状**:
```typescript
// 餐食图片存储在IndexedDB
imageUrl: string; // Base64或blob URL
imageBlob?: Blob; // 离线存储
```

**后端设计**:
```prisma
// Supabase Storage
imageUrl: String
thumbnailUrl: String?
imageHash: String?
```

**缺失**:
1. ❌ 前端没有图片上传逻辑
2. ❌ 图片压缩/缩略图生成
3. ❌ Base64转Blob上传
4. ❌ 图片去重机制(后端有imageHash,前端无)

**风险**:
- IndexedDB配额约5GB,Base64存储会快速耗尽
- 无法跨设备同步
- 网络传输效率低

### 13.2 🟡 P1 - 核心功能缺失

#### 问题4: 同步机制设计不完整

**前端已有**:
- ✅ SyncQueueManager (离线队列)
- ✅ 指数退避重试
- ✅ 批量处理
- ✅ 状态监听

**后端设计**:
- ✅ /api/v1/sync/pull
- ✅ /api/v1/sync/push
- ✅ SyncQueue表
- ✅ 冲突解决

**缺失的关键环节**:

```typescript
// ❌ 前端缺少: 后端API调用实现
const syncProcessor = async (item: SyncQueueItem) => {
  switch(item.type) {
    case 'CREATE_MEAL':
      // TODO: 调用后端 API
      await apiClient.post('/meals', item.payload);
      break;
  }
};

// ❌ 前端缺少: Pull逻辑
const pullFromServer = async (lastSyncAt: string) => {
  // TODO: 调用后端 /sync/pull
  const data = await apiClient.get('/sync/pull', { lastSyncAt });
  // TODO: 合并到IndexedDB
};

// ❌ 冲突解决策略未定义
// 后端有LAST_WRITE_WINS/SERVER_WINS/CLIENT_WINS/MANUAL
// 前端conflict resolver是空实现
```

#### 问题5: 会员系统未连接后端

**前端现状**:
```typescript
const [isPremium, setIsPremium] = useState(false);
// 硬编码的会员逻辑 (App.tsx第77行)
```

**后端设计**:
```prisma
model User {
  subscriptionStatus SubscriptionStatus @default(FREE)
  subscriptionTier   SubscriptionTier   @default(FREE)
  subscriptionExpiresAt DateTime?
  dailyAnalysisCount  Int      @default(0)
}
```

**问题**:
1. ❌ 会员状态验证未连接后端
2. ❌ 配额管理在前端(App.tsx第167-184行)
3. ❌ 支付流程是模拟的

#### 问题6: 菜系配置硬编码

**前端**:
```typescript
// types.ts中硬编码
cuisine_cantonese: '粤菜',
cuisine_japanese: '日料',
cuisine_italian: '意大利菜',
// ...
```

**后端**:
```prisma
model CuisineConfig {
  name        String   @unique
  nameEn      String?
  nameZh      String?
  icon        String
  color       String
  displayOrder Int
}
```

**影响**:
- 新增菜系需要前端发版
- icon/color无法动态配置
- 多语言支持不完整

#### 问题7: AI分析流程需要改造

**当前流程**:
```
前端 → Gemini API (直接调用) → 存IndexedDB
```

**后端设计期望**:
```
前端 → 上传图片到Supabase → 后端 /ai/analyze → 后端调用Gemini → 存储结果
```

**问题**:
1. ✅ 前端已有Gemini集成
2. ❌ 未通过后端统一调用
3. ❌ 配额管理在后端,前端无法验证

**建议**:
- **方案A**: 保留前端直接调用,但配额同步到后端
- **方案B**: 全部通过后端,前端只上传图片

### 13.3 🟢 P2 - 优化项

#### 问题8: API接口与前端需求不完全匹配

**后端API缺失前端需要的功能**:

| 前端需求 | 后端API | 状态 |
|---------|---------|------|
| 菜系详情(历史渊源) | ❌ 无 | 缺失 |
| 按菜系统计餐食 | GET /meals?cuisine=xxx | ✅ 有 |
| 菜系专家榜 | GET /community/cuisine-masters | ✅ 有 |
| 用户成就系统 | GET /community/achievements | ✅ 有 |
| 食物多样性分析 | GET /analytics/diversity | ✅ 有 |

**前端需要补充的API调用**:
```typescript
// ❌ 需要实现
export const mealsApi = {
  create: (data: CreateMealDto) => apiClient.post('/meals', data),
  update: (id: string, data: UpdateMealDto) => apiClient.put(`/meals/${id}`, data),
  delete: (id: string) => apiClient.delete(`/meals/${id}`),
  getByDateRange: (startDate: string, endDate: string) => 
    apiClient.get('/meals/by-date-range', { startDate, endDate }),
};
```

---

## 十四、具体改进建议

### 14.1 前端数据模型统一

需要在 `/Users/kenshin/projects/Bellybook_app/src/db/schema.ts` 中补充缺失字段：

```typescript
// 更新 Meal 接口
export interface Meal {
  id: string;
  userId: string;
  imageUrl: string;
  imageHash?: string; // 新增: 用于去重
  thumbnailUrl?: string; // 新增: 缩略图
  analysis: MealAnalysis;
  mealType?: MealType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  isSynced: boolean;
  version: number; // 新增: 乐观锁
  deletedAt?: string; // 新增: 软删除
}

// 更新 CuisineUnlock 接口
export interface CuisineUnlock {
  id?: number;
  userId: string;
  cuisineName: string;
  firstMealAt: string;
  mealCount: number;
  lastMealAt?: string; // 新增
  cuisineIcon?: string; // 新增
  cuisineColor?: string; // 新增
}
```

### 14.2 图片上传实现

创建新文件 `/Users/kenshin/projects/Bellybook_app/src/services/storageService.ts`:

```typescript
import { apiClient } from '@/api/client';

/**
 * 计算图片SHA-256哈希
 */
async function calculateImageHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 压缩图片
 */
async function compressImage(
  file: File,
  options: { maxWidth: number; quality: number }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // 计算新尺寸
      let width = img.width;
      let height = img.height;
      if (width > options.maxWidth) {
        height = Math.round((height * options.maxWidth) / width);
        width = options.maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制并压缩
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/webp',
        options.quality
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 生成缩略图
 */
async function generateThumbnail(image: Blob, size: number): Promise<Blob> {
  return compressImage(new File([image], 'image.jpg'), {
    maxWidth: size,
    quality: 0.8,
  });
}

/**
 * 上传文件到Supabase Storage
 */
async function uploadToSupabase(file: Blob, key: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);

  const response = await apiClient.post<{ url: string }>(
    '/storage/upload',
    formData,
    { 
      headers: { 'Content-Type': 'multipart/form-data' } as any,
      skipAuth: false
    }
  );

  return response.url;
}

/**
 * 上传餐食图片
 */
export async function uploadMealImage(file: File): Promise<{
  imageUrl: string;
  thumbnailUrl: string;
  hash: string;
}> {
  // 1. 计算SHA-256哈希
  const hash = await calculateImageHash(file);

  // 2. 压缩图片
  const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.85 });

  // 3. 生成缩略图
  const thumbnail = await generateThumbnail(compressed, 300);

  // 4. 上传到Supabase Storage
  const imageUrl = await uploadToSupabase(compressed, `meals/${hash}`);
  const thumbnailUrl = await uploadToSupabase(thumbnail, `thumbnails/${hash}`);

  return { url: imageUrl, thumbnailUrl, hash };
}

/**
 * 清理本地Base64数据
 */
export async function cleanupBase64Images(): Promise<void> {
  // TODO: 迁移所有Base64图片到云存储
  console.log('[Storage] Cleaning up Base64 images...');
}
```

### 14.3 同步处理器实现

创建新文件 `/Users/kenshin/projects/Bellybook_app/src/sync/processor.ts`:

```typescript
import { apiClient } from '@/api/client';
import { meals, cuisineUnlocks, dailyNutrition } from '@/db';
import type { SyncQueueItem, Meal, CuisineUnlock, DailyNutrition } from '@/db';

/**
 * 同步处理器 - 连接前端队列和后端API
 */
export const syncProcessor = async (item: SyncQueueItem): Promise<boolean> => {
  try {
    switch (item.type) {
      case 'CREATE_MEAL':
        return await handleCreateMeal(item.payload);
        
      case 'UPDATE_MEAL':
        return await handleUpdateMeal(item.payload);
        
      case 'DELETE_MEAL':
        return await handleDeleteMeal(item.payload);
        
      case 'UPDATE_PROFILE':
        return await handleUpdateProfile(item.payload);
        
      case 'UPDATE_SETTINGS':
        return await handleUpdateSettings(item.payload);
        
      default:
        console.warn('[SyncProcessor] Unknown operation type:', item.type);
        return false;
    }
  } catch (error) {
    console.error('[SyncProcessor] Failed:', error);
    return false;
  }
};

/**
 * 创建餐食
 */
async function handleCreateMeal(payload: any): Promise<boolean> {
  const meal = payload as Meal;
  
  const response = await apiClient.post<{ id: string; version: number }>('/meals', {
    imageUrl: meal.imageUrl,
    thumbnailUrl: meal.thumbnailUrl,
    analysis: meal.analysis,
    mealType: meal.mealType,
    notes: meal.notes,
  });

  // 更新本地ID为服务器ID
  const updatedMeal: Meal = {
    ...meal,
    id: response.id,
    version: response.version,
    isSynced: true,
    syncedAt: new Date().toISOString(),
  };

  await meals.update(updatedMeal);

  // 更新菜系统计
  if (meal.analysis?.cuisine) {
    await cuisineUnlocks.incrementMealCount(meal.userId, meal.analysis.cuisine);
  }

  console.log('[SyncProcessor] Meal created:', response.id);
  return true;
}

/**
 * 更新餐食
 */
async function handleUpdateMeal(payload: any): Promise<boolean> {
  const { id, version, ...updateData } = payload as Meal & { version: number };
  
  await apiClient.put(`/meals/${id}`, updateData);
  await meals.markSynced(id);
  
  console.log('[SyncProcessor] Meal updated:', id);
  return true;
}

/**
 * 删除餐食
 */
async function handleDeleteMeal(payload: { id: string }): Promise<boolean> {
  const { id } = payload;
  
  await apiClient.delete(`/meals/${id}`);
  await meals.delete(id);
  
  console.log('[SyncProcessor] Meal deleted:', id);
  return true;
}

/**
 * 更新用户资料
 */
async function handleUpdateProfile(payload: any): Promise<boolean> {
  await apiClient.put('/users/profile', payload);
  console.log('[SyncProcessor] Profile updated');
  return true;
}

/**
 * 更新用户设置
 */
async function handleUpdateSettings(payload: any): Promise<boolean> {
  await apiClient.put('/users/settings', payload);
  console.log('[SyncProcessor] Settings updated');
  return true;
}

/**
 * 从服务器拉取更新
 */
export async function pullFromServer(lastSyncAt?: string): Promise<void> {
  console.log('[SyncProcessor] Pulling from server, lastSyncAt:', lastSyncAt);

  try {
    const response = await apiClient.get<{
      meals: any[];
      profile?: any;
      settings?: any;
      cuisineUnlocks?: any[];
      serverTime: string;
    }>('/sync/pull', { lastSyncAt });

    // 1. 合并餐食数据
    for (const serverMeal of response.meals) {
      const localMeal = await meals.get(serverMeal.id);
      
      if (!localMeal) {
        // 新餐食,直接保存
        await meals.add(serverMeal);
      } else if (serverMeal.version > (localMeal.version || 0)) {
        // 服务器版本更新,需要处理冲突
        // TODO: 实现冲突解决策略
        await meals.update(serverMeal);
      }
    }

    // 2. 更新菜系统计
    if (response.cuisineUnlocks) {
      for (const unlock of response.cuisineUnlocks) {
        const local = await cuisineUnlocks.getOrCreate(
          unlock.userId,
          unlock.cuisineName
        );
        if (unlock.mealCount > local.mealCount) {
          await cuisineUnlocks.update(unlock);
        }
      }
    }

    // 3. 更新本地同步时间
    localStorage.setItem('bb_last_sync_at', response.serverTime);

    console.log('[SyncProcessor] Pull completed');
  } catch (error) {
    console.error('[SyncProcessor] Pull failed:', error);
    throw error;
  }
}

/**
 * 全量同步
 */
export async function fullSync(): Promise<void> {
  await pullFromServer(); // 拉取所有数据
  
  // 推送本地未同步数据
  // TODO: 实现批量推送
}
```

### 14.4 认证模块对接

更新 `/Users/kenshin/projects/Bellybook_app/src/services/authService.ts`:

```typescript
import { apiClient, tokenManager } from '@/api/client';
import type { UserProfile, UserSettings } from '@/db';

// 扩展类型定义
export interface AuthSession {
  userId: string;
  username: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
}

export interface RegisterData {
  username: string;
  email?: string;
  password: string;
  displayName?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: AuthSession;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * 用户注册
 */
export async function register(data: RegisterData): Promise<AuthSession> {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  
  // 保存token
  tokenManager.saveTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresIn: response.expiresIn,
  });
  
  // 保存session到localStorage
  localStorage.setItem('bb_session', JSON.stringify(response.user));
  
  return response.user;
}

/**
 * 用户登录
 */
export async function login(data: LoginData): Promise<AuthSession> {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  
  // 保存token
  tokenManager.saveTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresIn: response.expiresIn,
  });
  
  // 保存session到localStorage
  localStorage.setItem('bb_session', JSON.stringify(response.user));
  
  return response.user;
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout', {});
  } catch (error) {
    console.error('[AuthService] Logout API call failed:', error);
  } finally {
    // 清理本地数据
    tokenManager.clearTokens();
    localStorage.removeItem('bb_session');
  }
}

/**
 * 获取当前用户
 */
export function getCurrentUser(): AuthSession | null {
  const session = localStorage.getItem('bb_session');
  return session ? JSON.parse(session) : null;
}

/**
 * 更新用户资料
 */
export async function updateProfile(userId: string, data: Partial<AuthSession>): Promise<void> {
  await apiClient.put('/users/profile', data);
  
  // 更新本地session
  const currentUser = getCurrentUser();
  if (currentUser) {
    const updated = { ...currentUser, ...data };
    localStorage.setItem('bb_session', JSON.stringify(updated));
  }
}

/**
 * 检查认证状态
 */
export function isAuthenticated(): boolean {
  return tokenManager.isAuthenticated();
}
```

### 14.5 会员系统迁移

创建新文件 `/Users/kenshin/projects/Bellybook_app/src/services/premiumService.ts`:

```typescript
import { apiClient } from '@/api/client';

export interface SubscriptionInfo {
  status: string;
  tier: string;
  expiresAt?: string;
  benefits: string[];
}

export interface UsageStats {
  dailyAnalysisCount: number;
  dailyAnalysisLimit: number;
  resetAt: string;
}

/**
 * 获取订阅信息
 */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  const response = await apiClient.get<SubscriptionInfo>('/premium/subscription');
  return response;
}

/**
 * 获取使用统计
 */
export async function getUsageStats(): Promise<UsageStats> {
  const response = await apiClient.get<UsageStats>('/premium/usage');
  return response;
}

/**
 * 检查是否为会员
 */
export async function isPremiumUser(): Promise<boolean> {
  try {
    const info = await getSubscriptionInfo();
    return info.status === 'ACTIVE' && info.tier !== 'FREE';
  } catch {
    return false;
  }
}

/**
 * 检查今日分析次数限制
 */
export async function checkDailyLimit(): Promise<boolean> {
  try {
    const stats = await getUsageStats();
    return stats.dailyAnalysisCount < stats.dailyAnalysisLimit;
  } catch {
    // API失败时,前端本地验证
    return true;
  }
}
```

### 14.6 菜系动态配置加载

创建新文件 `/Users/kenshin/projects/Bellybook_app/src/services/cuisineService.ts`:

```typescript
import { apiClient } from '@/api/client';

export interface CuisineConfig {
  name: string;
  nameEn?: string;
  nameZh?: string;
  category?: string;
  icon: string;
  color: string;
  description?: string;
  displayOrder: number;
}

let cuisineCache: CuisineConfig[] | null = null;

/**
 * 获取所有菜系配置
 */
export async function getCuisines(): Promise<CuisineConfig[]> {
  if (cuisineCache) {
    return cuisineCache;
  }

  const response = await apiClient.get<CuisineConfig[]>('/cuisines');
  cuisineCache = response;
  return response;
}

/**
 * 根据名称获取菜系配置
 */
export async function getCuisineByName(name: string): Promise<CuisineConfig | undefined> {
  const cuisines = await getCuisines();
  return cuisines.find(c => c.name === name);
}

/**
 * 根据分类获取菜系
 */
export async function getCuisinesByCategory(category: string): Promise<CuisineConfig[]> {
  const cuisines = await getCuisines();
  return cuisines.filter(c => c.category === category);
}

/**
 * 清除缓存
 */
export function clearCuisineCache(): void {
  cuisineCache = null;
}
```

---

## 十五、优先级建议

### 15.1 P0 (阻塞迁移)

| 任务 | 工作量 | 风险 | 预估时间 |
|------|--------|------|----------|
| 1. 统一前后端数据模型 | 中 | 低 | 0.5天 |
| 2. 实现前端图片上传逻辑 | 高 | 中 | 1天 |
| 3. 认证模块对接后端API | 中 | 中 | 0.5天 |
| 4. 环境变量配置 | 低 | 低 | 0.5天 |

**总计: 2.5天**

### 15.2 P1 (核心功能)

| 任务 | 工作量 | 风险 | 预估时间 |
|------|--------|------|----------|
| 5. 实现同步处理器 | 高 | 中 | 1.5天 |
| 6. 实现Pull逻辑 | 高 | 中 | 1天 |
| 7. 冲突解决UI实现 | 中 | 高 | 1天 |
| 8. 会员系统对接 | 中 | 低 | 0.5天 |
| 9. 配额管理迁移 | 中 | 低 | 0.5天 |

**总计: 4.5天**

### 15.3 P2 (优化项)

| 任务 | 工作量 | 风险 | 预估时间 |
|------|--------|------|----------|
| 10. 菜系配置动态加载 | 低 | 低 | 0.5天 |
| 11. 图片去重机制实现 | 中 | 低 | 0.5天 |
| 12. AI分析流程改造 | 高 | 高 | 1天 |
| 13. 性能优化(图片压缩等) | 中 | 低 | 0.5天 |

**总计: 2.5天**

---

## 十六、迁移风险评估

### 16.1 风险矩阵

| 风险 | 严重性 | 可能性 | 缓解措施 |
|------|--------|--------|----------|
| **用户数据丢失** | 🔴 高 | 🟡 中 | 1. 实现数据迁移脚本<br>2. 备份IndexedDB<br>3. 分批迁移验证 |
| **认证中断** | 🔴 高 | 🟢 低 | 1. 支持双认证模式<br>2. 逐步切换<br>3. 回滚方案 |
| **图片存储配额超限** | 🟡 中 | 🟡 中 | 1. 清理Base64数据<br>2. 迁移到云存储<br>3. 提示用户清理 |
| **同步冲突** | 🟡 中 | 🟡 中 | 1. 完善冲突解决UI<br>2. 支持手动选择<br>3. 保留冲突日志 |
| **会员功能失效** | 🟢 低 | 🟢 低 | 1. 先迁移免费用户<br>2. 逐步迁移付费用户<br>3. 延长会员有效期补偿 |
| **性能下降** | 🟡 中 | 🟢 低 | 1. 实现增量同步<br>2. 添加缓存层<br>3. 优化查询索引 |

### 16.2 数据备份策略

```bash
# 1. 导出IndexedDB数据
# 在浏览器控制台执行
const exportData = async () => {
  const db = await openDB('bellybook-db', 1);
  const data = {
    users: await db.getAll('users'),
    meals: await db.getAll('meals'),
    syncQueue: await db.getAll('syncQueue'),
    dailyNutrition: await db.getAll('dailyNutrition'),
    cuisineUnlocks: await db.getAll('cuisineUnlocks'),
  };
  
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bellybook-backup-${Date.now()}.json`;
  a.click();
};

exportData();
```

### 16.3 回滚方案

1. **保留原有前端代码分支**
   ```bash
   git checkout -b backup/pre-backend-migration
   ```

2. **数据库迁移回滚**
   ```bash
   npx prisma migrate resolve --rolled-back [migration-name]
   ```

3. **前端功能开关**
   ```typescript
   const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';
   
   if (USE_BACKEND) {
     // 使用后端API
   } else {
     // 使用本地逻辑
   }
   ```

---

## 十七、渐进式迁移策略

### 17.1 迁移阶段划分

#### Phase 1: 基础设施 (Week 1)

**目标**: 搭建后端环境和基础数据连接

```
Day 1-2: 后端项目初始化
- 搭建NestJS项目
- 配置Prisma + PostgreSQL
- 运行数据库迁移

Day 3-4: 认证模块开发
- 实现注册/登录API
- 前端对接认证流程
- Token管理集成

Day 5: 图片上传
- 实现Supabase Storage集成
- 前端图片上传逻辑
- 测试图片存储

验证标准:
- ✅ 用户可以注册/登录
- ✅ 图片上传到云存储
- ✅ Token自动刷新
```

#### Phase 2: 核心数据同步 (Week 2)

**目标**: 实现餐食数据的双向同步

```
Day 6-7: 同步模块开发
- 实现SyncQueue后端处理
- 前端sync processor实现
- Pull/Push API完成

Day 8-9: 数据模型统一
- 前端IndexedDB schema更新
- 增加version字段
- 增加imageHash字段

Day 10: 同步测试
- 端到端同步测试
- 冲突场景测试
- 性能测试

验证标准:
- ✅ 餐食可以上传到服务器
- ✅ 服务器数据可以拉取到前端
- ✅ 离线操作可以同步
```

#### Phase 3: 业务功能迁移 (Week 3)

**目标**: 迁移剩余核心功能

```
Day 11-12: 菜系模块
- 菜系配置API
- 前端动态加载菜系
- 菜系统计迁移

Day 13: 营养模块
- 营养统计API
- 前端对接营养查询
- 数据对比验证

Day 14: 会员系统
- 会员API对接
- 配额管理迁移
- 支付流程(如需要)

Day 15: 社区模块
- 排行榜API
- 成就系统
- 前端展示

验证标准:
- ✅ 所有菜系动态加载
- ✅ 营养数据准确
- ✅ 会员状态正确
```

#### Phase 4: 优化与上线 (Week 4)

**目标**: 性能优化和灰度发布

```
Day 16-17: 性能优化
- 图片压缩优化
- 同批批量处理
- 缓存策略实现

Day 18-19: 全面测试
- E2E测试
- 压力测试
- 安全测试

Day 20: 灰度发布
- 5%用户迁移
- 监控指标
- 问题修复

验证标准:
- ✅ 性能指标达标
- ✅ 测试覆盖率>80%
- ✅ 无严重bug
```

### 17.2 功能开关策略

```typescript
// src/config/featureFlags.ts
export const FEATURE_FLAGS = {
  // 后端集成开关
  USE_BACKEND: import.meta.env.VITE_USE_BACKEND === 'true',
  
  // 新功能开关
  NEW_CUISINE_LOADING: import.meta.env.VITE_NEW_CUISINE === 'true',
  USE_CLOUD_STORAGE: import.meta.env.VITE_CLOUD_STORAGE === 'true',
  
  // A/B测试
  AI_ANALYSIS_V2: false,
} as const;

// 使用示例
if (FEATURE_FLAGS.USE_BACKEND) {
  await syncProcessor(item);
} else {
  // 使用本地逻辑
  await processLocally(item);
}
```

### 17.3 监控指标

**关键指标**:
1. **同步成功率**: >99%
2. **API响应时间**: P95 < 500ms
3. **错误率**: <0.1%
4. **用户活跃度**: 环比 > 80%
5. **数据一致性**: 100%

**告警阈值**:
- 同步失败率 > 1% → 立即告警
- API错误率 > 0.5% → 立即告警
- 数据不一致 > 0 → 严重告警

### 17.4 用户沟通计划

**迁移前通知**:
- 提前1周通过App通知
- 迁移说明文档
- 数据备份引导

**迁移中提示**:
- 进度实时显示
- 预计完成时间
- 支持联系客服

**迁移后跟进**:
- 功能使用引导
- 反馈收集
- 问题快速响应

---

## 十八、待办事项清单

### 18.1 前端待办

- [ ] 更新IndexedDB schema (version, imageHash等字段)
- [ ] 实现图片上传服务 (storageService.ts)
- [ ] 实现同步处理器 (sync/processor.ts)
- [ ] 实现Pull逻辑
- [ ] 实现冲突解决UI
- [ ] 更新认证服务 (authService.ts)
- [ ] 实现会员服务 (premiumService.ts)
- [ ] 实现菜系动态加载 (cuisineService.ts)
- [ ] 清理Base64图片数据
- [ ] 更新环境变量配置

### 18.2 后端待办

- [ ] 完善API接口文档
- [ ] 实现图片压缩中间件
- [ ] 实现图片去重逻辑
- [ ] 完善同步API的错误处理
- [ ] 实现数据导入/导出工具
- [ ] 添加API监控和日志
- [ ] 实现数据备份策略
- [ ] 添加单元测试和集成测试

### 18.3 联调待办

- [ ] 前后端数据模型对齐
- [ ] 认证流程联调
- [ ] 图片上传联调
- [ ] 同步流程联调
- [ ] 冲突解决场景测试
- [ ] 性能测试
- [ ] 安全测试

---

## 十九、附录

### 19.1 参考资料

- [NestJS官方文档](https://docs.nestjs.com/)
- [Prisma文档](https://www.prisma.io/docs)
- [Supabase文档](https://supabase.com/docs)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [SyncAdapter模式](https://redux-observable.js.org/)

### 19.2 关键代码文件路径

**前端关键文件**:
- `/Users/kenshin/projects/Bellybook_app/src/db/schema.ts` - 数据模型定义
- `/Users/kenshin/projects/Bellybook_app/src/db/index.ts` - IndexedDB封装
- `/Users/kenshin/projects/Bellybook_app/src/api/client.ts` - HTTP客户端
- `/Users/kenshin/projects/Bellybook_app/src/sync/SyncQueue.ts` - 同步队列
- `/Users/kenshin/projects/Bellybook_app/src/contexts/AuthContext.tsx` - 认证上下文
- `/Users/kenshin/projects/Bellybook_app/src/contexts/AppContext.tsx` - 应用上下文

**后端关键文件**:
- `/Users/kenshin/projects/Bellybook_backend/prisma/schema.prisma` - 数据库模型
- `/Users/kenshin/projects/Bellybook_backend/src/modules/auth/` - 认证模块
- `/Users/kenshin/projects/Bellybook_backend/src/modules/sync/` - 同步模块
- `/Users/kenshin/projects/Bellybook_backend/src/modules/storage/` - 存储模块
- `/Users/kenshin/projects/Bellybook_backend/src/modules/ai/` - AI模块

### 19.3 技术支持

**问题反馈**:
- GitHub Issues: [项目仓库链接]
- 邮件: support@bellybook.app

**开发团队**:
- 前端负责人: [联系方式]
- 后端负责人: [联系方式]
- DevOps负责人: [联系方式]

---

**文档版本**: 2.2
**最后更新**: 2026-01-17
**更新人**: 架构评审分析
**状态**: 待实施
