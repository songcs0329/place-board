import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AuthGuard (e2e)', () => {
  let application: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    application = moduleFixture.createNestApplication();
    await application.init();
  });

  it('토큰 없이 POST /search → 401', () => {
    return request(application.getHttpServer())
      .post('/search')
      .send({ query: '카페' })
      .expect(401);
  });

  it('GET /health는 토큰 없이 200', () => {
    return request(application.getHttpServer())
      .get('/health')
      .expect(200, { status: 'ok' });
  });

  afterEach(async () => {
    await application.close();
  });
});
