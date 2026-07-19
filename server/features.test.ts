import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

function createMockContext(): TrpcContext {
  return {
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

describe('Tasks Router', () => {
  it('should list tasks', async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Goals Router', () => {
  it('should list goals', async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.goals.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Habits Router', () => {
  it('should list habits', async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.habits.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Projects Router', () => {
  it('should list projects', async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Books Router', () => {
  it('should list books', async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.books.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Plans Router', () => {
  it('should list plans', async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.plans.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Dashboard Router', () => {
  it('should get dashboard stats', async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.stats();

    expect(result).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(result.goals).toBeDefined();
    expect(result.habits).toBeDefined();
    expect(result.projects).toBeDefined();
  });
});
