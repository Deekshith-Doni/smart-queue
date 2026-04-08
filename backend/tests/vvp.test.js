import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { createApp } from '../app.js';
import Admin from '../models/Admin.js';
import Queue from '../models/Queue.js';
import Counter from '../models/Counter.js';
import ServiceTime from '../models/ServiceTime.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'vvp-test-secret';

const app = createApp();

let mongo;
let adminToken;

async function loginAsAdmin() {
  const res = await request(app)
    .post('/api/admin/login')
    .send({ username: 'admin', password: 'admin123' });
  return res.body.token;
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const password = await bcrypt.hash('admin123', 10);
  await Admin.create({ username: 'admin', password });
  adminToken = await loginAsAdmin();
});

afterEach(async () => {
  await Queue.deleteMany({});
  await Counter.deleteMany({});
  await ServiceTime.deleteMany({});
});

afterAll(async () => {
  await Admin.deleteMany({});
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

describe('Unit Testing', () => {
  it('rejects token generation when serviceType is missing', async () => {
    const res = await request(app).post('/api/queue/token').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('serviceType is required');
  });

  it('rejects token generation for unsupported service type', async () => {
    const res = await request(app)
      .post('/api/queue/token')
      .send({ serviceType: 'UnknownService' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('serviceType must be one of');
  });

  it('returns health check payload', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('rejects admin login when username/password are missing', async () => {
    const res = await request(app).post('/api/admin/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('username and password are required');
  });

  it('rejects admin login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid credentials');
  });
});

describe('Integration Testing', () => {
  it('creates sequential tokens and moves queue to next token as admin', async () => {
    await request(app).post('/api/queue/token').send({ serviceType: 'General' });
    await request(app).post('/api/queue/token').send({ serviceType: 'Billing' });

    const moveRes = await request(app)
      .post('/api/admin/next')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.currentServingToken).toBe(1);

    const statusRes = await request(app)
      .get('/api/queue/status')
      .query({ tokenNumber: 2 });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.currentServingToken).toBe(1);
    expect(statusRes.body.userToken.tokenNumber).toBe(2);
    expect(statusRes.body.userToken.status).toBe('waiting');
  });

  it('requires JWT token for protected admin endpoints', async () => {
    const res = await request(app).post('/api/admin/next').send();

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authorization token missing');
  });

  it('rejects malformed JWT token on protected endpoint', async () => {
    const res = await request(app)
      .get('/api/admin/waiting')
      .set('Authorization', 'Bearer malformed.token.value');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid token');
  });

  it('returns waiting list for authorized admin', async () => {
    await request(app).post('/api/queue/token').send({ serviceType: 'General' });
    await request(app).post('/api/queue/token').send({ serviceType: 'Billing' });

    const res = await request(app)
      .get('/api/admin/waiting')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.waiting)).toBe(true);
    expect(res.body.waiting.length).toBe(2);
    expect(res.body.waiting[0].tokenNumber).toBe(1);
    expect(res.body.waiting[1].tokenNumber).toBe(2);
  });
});

describe('System Testing', () => {
  it('supports end-to-end user to served lifecycle', async () => {
    await request(app).post('/api/queue/token').send({ serviceType: 'General' });
    await request(app).post('/api/queue/token').send({ serviceType: 'Support' });

    await request(app)
      .post('/api/admin/next')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    await request(app)
      .post('/api/admin/next')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    const statusToken1 = await request(app)
      .get('/api/queue/status')
      .query({ tokenNumber: 1 });

    const statusToken2 = await request(app)
      .get('/api/queue/status')
      .query({ tokenNumber: 2 });

    expect(statusToken1.body.userToken.status).toBe('served');
    expect(statusToken2.body.userToken.status).toBe('serving');
  });

  it('reports analytics after served tokens exist', async () => {
    await request(app).post('/api/queue/token').send({ serviceType: 'Technical' });
    await request(app)
      .post('/api/admin/next')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();
    await request(app)
      .post('/api/admin/next')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalTokensGenerated).toBe(1);
    expect(res.body.tokensServed).toBe(1);
  });

  it('returns no current serving token when queue is empty and admin moves next', async () => {
    const res = await request(app)
      .post('/api/admin/next')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.currentServingToken).toBe(null);
    expect(res.body.message).toContain('No waiting tokens');
  });

  it('applies assigned service time override in queue status estimation', async () => {
    await request(app)
      .post('/api/admin/service-times')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceType: 'General', estimatedMinutes: 10 });

    await request(app).post('/api/queue/token').send({ serviceType: 'General' });
    await request(app).post('/api/queue/token').send({ serviceType: 'General' });

    await request(app)
      .post('/api/admin/assign-time')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tokenNumber: 1, assignedServiceTime: 3 });

    const res = await request(app)
      .get('/api/queue/status')
      .query({ tokenNumber: 2 });

    expect(res.status).toBe(200);
    expect(res.body.userTokenEstimatedWaitTime).toBe(3);
  });
});

describe('Acceptance Testing', () => {
  it('uses configured service default time in wait-time estimation', async () => {
    await request(app)
      .post('/api/admin/service-times')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceType: 'General', estimatedMinutes: 7 });

    await request(app).post('/api/queue/token').send({ serviceType: 'General' });
    await request(app).post('/api/queue/token').send({ serviceType: 'General' });

    const res = await request(app)
      .get('/api/queue/status')
      .query({ tokenNumber: 2 });

    expect(res.status).toBe(200);
    expect(res.body.userTokenEstimatedWaitTime).toBe(7);
  });

  it('resets the queue and restarts token counter from 1', async () => {
    await request(app).post('/api/queue/token').send({ serviceType: 'Billing' });

    const resetRes = await request(app)
      .post('/api/admin/reset')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(resetRes.status).toBe(200);

    const newTokenRes = await request(app)
      .post('/api/queue/token')
      .send({ serviceType: 'Billing' });

    expect(newTokenRes.status).toBe(201);
    expect(newTokenRes.body.tokenNumber).toBe(1);
  });

  it('validates service time update input and rejects unknown service type', async () => {
    const res = await request(app)
      .post('/api/admin/service-times')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceType: 'InvalidType', estimatedMinutes: 8 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('serviceType must be one of');
  });

  it('clears configured service default when estimatedMinutes is null', async () => {
    await request(app)
      .post('/api/admin/service-times')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceType: 'Support', estimatedMinutes: 6 });

    const clearRes = await request(app)
      .post('/api/admin/service-times')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceType: 'Support', estimatedMinutes: null });

    expect(clearRes.status).toBe(200);
    expect(clearRes.body.message).toContain('Service time cleared');

    const listRes = await request(app)
      .get('/api/admin/service-times')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    const supportEntry = listRes.body.serviceTimes.find((item) => item.serviceType === 'Support');
    expect(supportEntry).toBeUndefined();
  });

  it('rejects assigned service time when token number is missing', async () => {
    const res = await request(app)
      .post('/api/admin/assign-time')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedServiceTime: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('tokenNumber is required');
  });

  it('rejects negative assigned service time', async () => {
    await request(app).post('/api/queue/token').send({ serviceType: 'Technical' });

    const res = await request(app)
      .post('/api/admin/assign-time')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tokenNumber: 1, assignedServiceTime: -2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('assignedServiceTime must be a non-negative number');
  });
});
