import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('API (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    app.setGlobalPrefix('/api/v1');
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Clean database
    await prismaService.cleanDatabase();
  });

  afterAll(async () => {
    await prismaService.cleanDatabase();
    await app.close();
  });

  describe('Auth', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should register a new user', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            username: 'testuser',
            password: 'password123',
            displayName: 'Test User',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('user');
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            expect(res.body.user.username).toBe('testuser');
            accessToken = res.body.accessToken;
            userId = res.body.user.id;
          });
      });

      it('should throw error for duplicate username', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            username: 'testuser',
            password: 'password123',
          })
          .expect(409);
      });

      it('should throw validation error for invalid username', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            username: 'ab',
            password: 'password123',
          })
          .expect(400);
      });

      it('should throw validation error for weak password', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            username: 'newuser',
            password: 'weak',
          })
          .expect(400);
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login with valid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            username: 'testuser',
            password: 'password123',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            accessToken = res.body.accessToken;
          });
      });

      it('should throw error for invalid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            username: 'testuser',
            password: 'wrongpassword',
          })
          .expect(401);
      });

      it('should throw error for non-existent user', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            username: 'nonexistent',
            password: 'password123',
          })
          .expect(401);
      });
    });

    describe('GET /api/v1/auth/me', () => {
      it('should get current user', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.username).toBe('testuser');
          });
      });

      it('should throw error without auth token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .expect(401);
      });

      it('should throw error with invalid token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('POST /api/v1/auth/logout', () => {
      it('should logout user', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
          });
      });
    });
  });

  describe('Users', () => {
    let userAccessToken: string;

    beforeAll(async () => {
      // Create a new user for user tests
      const registerRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'usertest',
          password: 'password123',
        });
      userAccessToken = registerRes.body.accessToken;
    });

    describe('GET /api/v1/users/profile', () => {
      it('should get user profile', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${userAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('username');
          });
      });
    });

    describe('PUT /api/v1/users/profile', () => {
      it('should update user profile', () => {
        return request(app.getHttpServer())
          .put('/api/v1/users/profile')
          .set('Authorization', `Bearer ${userAccessToken}`)
          .send({
            displayName: 'Updated Name',
            bio: 'This is my bio',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.displayName).toBe('Updated Name');
            expect(res.body.bio).toBe('This is my bio');
          });
      });

      it('should validate avatar URL', () => {
        return request(app.getHttpServer())
          .put('/api/v1/users/profile')
          .set('Authorization', `Bearer ${userAccessToken}`)
          .send({
            avatarUrl: 'not-a-url',
          })
          .expect(400);
      });
    });

    describe('PUT /api/v1/users/settings', () => {
      it('should update user settings', () => {
        return request(app.getHttpServer())
          .put('/api/v1/users/settings')
          .set('Authorization', `Bearer ${userAccessToken}`)
          .send({
            theme: 'DARK',
            language: 'EN',
            notificationsEnabled: false,
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.theme).toBe('DARK');
            expect(res.body.language).toBe('EN');
          });
      });
    });

    describe('GET /api/v1/users/stats', () => {
      it('should get user statistics', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users/stats')
          .set('Authorization', `Bearer ${userAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('totalMeals');
            expect(res.body).toHaveProperty('totalCuisines');
          });
      });
    });
  });

  describe('Meals', () => {
    let mealAccessToken: string;
    let createdMealId: string;

    beforeAll(async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'mealtest',
          password: 'password123',
        });
      mealAccessToken = registerRes.body.accessToken;
    });

    describe('POST /api/v1/meals', () => {
      it('should create a new meal', () => {
        return request(app.getHttpServer())
          .post('/api/v1/meals')
          .set('Authorization', `Bearer ${mealAccessToken}`)
          .send({
            imageUrl: 'https://example.com/food.jpg',
            analysis: {
              foodName: 'Delicious Food',
              cuisine: 'Chinese',
              nutrition: {
                calories: 500,
                protein: 20,
                fat: 15,
                carbohydrates: 60,
              },
              analyzedAt: new Date().toISOString(),
            },
            mealType: 'LUNCH',
            notes: 'Tasted great!',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.foodName).toBe('Delicious Food');
            createdMealId = res.body.id;
          });
      });

      it('should validate image URL', () => {
        return request(app.getHttpServer())
          .post('/api/v1/meals')
          .set('Authorization', `Bearer ${mealAccessToken}`)
          .send({
            imageUrl: 'not-a-url',
            analysis: {
              foodName: 'Food',
              cuisine: 'Chinese',
              nutrition: {
                calories: 500,
                protein: 20,
                fat: 15,
                carbohydrates: 60,
              },
              analyzedAt: new Date().toISOString(),
            },
          })
          .expect(400);
      });
    });

    describe('GET /api/v1/meals', () => {
      it('should get paginated meals', () => {
        return request(app.getHttpServer())
          .get('/api/v1/meals')
          .set('Authorization', `Bearer ${mealAccessToken}`)
          .query({ page: 1, limit: 10 })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('total');
            expect(Array.isArray(res.body.data)).toBe(true);
          });
      });
    });

    describe('GET /api/v1/meals/today', () => {
      it('should get today\'s meals', () => {
        return request(app.getHttpServer())
          .get('/api/v1/meals/today')
          .set('Authorization', `Bearer ${mealAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });

    describe('PUT /api/v1/meals/:id', () => {
      it('should update meal', () => {
        return request(app.getHttpServer())
          .put(`/api/v1/meals/${createdMealId}`)
          .set('Authorization', `Bearer ${mealAccessToken}`)
          .send({
            mealType: 'DINNER',
            notes: 'Updated notes',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.mealType).toBe('DINNER');
          });
      });
    });

    describe('DELETE /api/v1/meals/:id', () => {
      it('should delete meal', () => {
        return request(app.getHttpServer())
          .delete(`/api/v1/meals/${createdMealId}`)
          .set('Authorization', `Bearer ${mealAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
          });
      });
    });
  });

  describe('Sync', () => {
    let syncAccessToken: string;

    beforeAll(async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'synctest',
          password: 'password123',
        });
      syncAccessToken = registerRes.body.accessToken;
    });

    describe('GET /api/v1/sync/pull', () => {
      it('should pull data from server', () => {
        return request(app.getHttpServer())
          .get('/api/v1/sync/pull')
          .set('Authorization', `Bearer ${syncAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('meals');
            expect(res.body).toHaveProperty('serverTime');
            expect(Array.isArray(res.body.meals)).toBe(true);
          });
      });
    });

    describe('POST /api/v1/sync/push', () => {
      it('should push data to server', () => {
        return request(app.getHttpServer())
          .post('/api/v1/sync/push')
          .set('Authorization', `Bearer ${syncAccessToken}`)
          .send({
            items: [
              {
                id: 'local1',
                type: 'UPDATE_PROFILE',
                payload: { displayName: 'Synced Name' },
                clientId: 'client1',
                timestamp: new Date().toISOString(),
              },
            ],
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('success');
            expect(Array.isArray(res.body.success)).toBe(true);
          });
      });
    });

    describe('GET /api/v1/sync/status', () => {
      it('should get sync status', () => {
        return request(app.getHttpServer())
          .get('/api/v1/sync/status')
          .set('Authorization', `Bearer ${syncAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('pendingItems');
            expect(res.body).toHaveProperty('isHealthy');
          });
      });
    });
  });

  describe('Cuisines', () => {
    describe('GET /api/v1/cuisines', () => {
      it('should get all cuisine configs (public)', () => {
        return request(app.getHttpServer())
          .get('/api/v1/cuisines')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });
  });

  describe('Nutrition', () => {
    let nutritionAccessToken: string;

    beforeAll(async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'nutritiontest',
          password: 'password123',
        });
      nutritionAccessToken = registerRes.body.accessToken;
    });

    describe('GET /api/v1/nutrition/daily', () => {
      it('should get daily nutrition', () => {
        return request(app.getHttpServer())
          .get('/api/v1/nutrition/daily')
          .set('Authorization', `Bearer ${nutritionAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('totalCalories');
            expect(res.body).toHaveProperty('totalProtein');
          });
      });
    });

    describe('GET /api/v1/nutrition/summary', () => {
      it('should get nutrition summary', () => {
        return request(app.getHttpServer())
          .get('/api/v1/nutrition/summary')
          .set('Authorization', `Bearer ${nutritionAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('period');
            expect(res.body).toHaveProperty('totalMeals');
          });
      });
    });
  });
});
