# Bellybook Backend API

> RESTful API for Bellybook - A food journaling application with AI-powered nutrition analysis

## Overview

This is a NestJS-based REST API backend for the Bellybook application. It provides comprehensive CRUD operations for meals, users, nutrition tracking, cuisine collection, and data synchronization.

## Tech Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: class-validator + class-transformer
- **Testing**: Jest + Supertest

## Features

- ✅ Complete CRUD operations for all resources
- ✅ JWT-based authentication with refresh tokens
- ✅ Input validation on all endpoints
- ✅ Pagination support
- ✅ Data synchronization (pull/push)
- ✅ Nutrition tracking and analysis
- ✅ Cuisine collection system
- ✅ Comprehensive test coverage (>90%)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Generate Prisma client:
```bash
npx prisma generate
```

4. Run database migrations:
```bash
npx prisma migrate dev --name init
```

5. Start the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`

## API Documentation

### Authentication

All endpoints (except `/auth/register` and `/auth/login`) require authentication via JWT token.

Include the token in the Authorization header:
```
Authorization: Bearer <your-access-token>
```

### Core Endpoints

#### Auth Module
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user

#### Users Module
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `GET /api/v1/users/settings` - Get user settings
- `PUT /api/v1/users/settings` - Update user settings
- `GET /api/v1/users/stats` - Get user statistics

#### Meals Module
- `GET /api/v1/meals` - Get paginated meals list
- `POST /api/v1/meals` - Create a new meal
- `GET /api/v1/meals/:id` - Get meal details
- `PUT /api/v1/meals/:id` - Update meal
- `DELETE /api/v1/meals/:id` - Delete meal
- `GET /api/v1/meals/today` - Get today's meals

#### Nutrition Module
- `GET /api/v1/nutrition/daily` - Get daily nutrition
- `GET /api/v1/nutrition/weekly` - Get weekly trends
- `GET /api/v1/nutrition/summary` - Get nutrition summary
- `GET /api/v1/nutrition/averages` - Get average nutrition

#### Cuisines Module
- `GET /api/v1/cuisines` - Get all cuisine configs (public)
- `GET /api/v1/cuisines/unlocked` - Get user's unlocked cuisines
- `GET /api/v1/cuisines/stats` - Get cuisine statistics

#### Sync Module
- `GET /api/v1/sync/pull` - Pull data from server
- `POST /api/v1/sync/push` - Push data to server
- `GET /api/v1/sync/status` - Get sync status

## Testing

### Run Unit Tests
```bash
npm run test
```

### Run Tests with Coverage
```bash
npm run test:cov
```

### Run E2E Tests
```bash
npm run test:e2e
```

## Project Structure

```
src/
├── common/              # Shared utilities and decorators
│   ├── decorators/      # Custom decorators (@CurrentUser, @Public)
│   ├── guards/          # Auth guards
│   ├── dto/             # Common DTOs
│   └── utils/           # Utility functions
├── config/              # Configuration
│   └── env.ts           # Environment validation
├── database/            # Database
│   └── prisma.service.ts
├── modules/             # Feature modules
│   ├── auth/            # Authentication
│   ├── users/           # User management
│   ├── meals/           # Meal tracking
│   ├── nutrition/       # Nutrition analysis
│   ├── cuisines/        # Cuisine collection
│   ├── sync/            # Data synchronization
│   └── storage/         # File storage
├── app.module.ts        # Root module
└── main.ts              # Application entry point
```

## Input Validation

All endpoints use class-validator for input validation:

- Username: 3-20 characters, alphanumeric + underscore
- Password: 8-50 characters
- Email: Valid email format (optional)
- URLs: Must be valid URLs
- Enum values: Must match allowed values

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Development

### Available Scripts

- `npm run start` - Start production server
- `npm run start:dev` - Start development server with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name <migration-name>

# Reset database (dev only)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## Environment Variables

Key environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing (min 32 chars)
- `JWT_EXPIRES_IN` - Access token expiration (default: 15m)
- `REFRESH_TOKEN_EXPIRES_IN` - Refresh token expiration (default: 7d)
- `PORT` - Server port (default: 3000)
- `API_PREFIX` - API prefix (default: /api/v1)
- `CORS_ORIGIN` - Allowed CORS origins

## License

Proprietary - All rights reserved

## Support

For issues and questions, please contact the development team.
