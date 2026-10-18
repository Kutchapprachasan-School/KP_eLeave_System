import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';

/**
 * ชนิดข้อมูลมาตรฐานสำหรับส่งเข้าชั้น Service / Repository
 * รองรับทั้ง PrismaClient หลัก และ TransactionClient ตอนรันเทสต์
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

const ROLLBACK_SIGNAL = 'INTENTIONAL_TEST_ROLLBACK_SIGNAL' as const;

export class IntentionalRollbackError extends Error {
  public readonly isIntentionalRollback = true;

  constructor() {
    super(ROLLBACK_SIGNAL);
    this.name = 'IntentionalRollbackError';
  }
}

/**
 * ห่อหุ้ม TransactionClient (tx) ด้วย Proxy เพื่อให้:
 * 1. เมื่อ Service เรียก `db.$transaction(fn)` ซ้ำข้างใน จะแปลงเป็น SAVEPOINT อัตโนมัติ
 * 2. เมื่อทดสอบเคส P2003 (Foreign Key Error) แล้วทำ Soft-Delete (RETIRED)
 *    สามารถใช้ Savepoint เพื่อไม่ให้ PostgreSQL ตัดจบ Transaction ทั้งก้อน
 */
function createNestedTransactionProxy(
  tx: Prisma.TransactionClient
): PrismaClient {
  let savepointCounter = 0;
  let proxyClient: PrismaClient;

  const runWithSavepoint = async <T>(
    fn: (client: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> => {
    savepointCounter += 1;
    const spName = `sp_test_${savepointCounter}`;

    await tx.$executeRawUnsafe(`SAVEPOINT ${spName}`);
    try {
      const result = await fn(proxyClient as unknown as Prisma.TransactionClient);
      await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${spName}`);
      return result;
    } catch (error) {
      await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${spName}`);
      await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${spName}`);
      throw error;
    }
  };

  proxyClient = new Proxy(tx, {
    get(target, prop, receiver) {
      // ดักจับกรณีที่ชั้น Service เรียก db.$transaction(...) ซ้อนข้างใน
      if (prop === '$transaction') {
        return async <T>(
          arg:
            | ((client: Prisma.TransactionClient) => Promise<T>)
            | Array<Prisma.PrismaPromise<unknown>>
        ): Promise<T | Array<unknown>> => {
          if (typeof arg === 'function') {
            return runWithSavepoint(arg);
          }
          // กรณีส่งเป็น Array ของ PrismaPromise
          return runWithSavepoint(async () => Promise.all(arg));
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as unknown as PrismaClient;

  return proxyClient;
}

/**
 * Helper สำหรับรัน Integration Test ภายใต้ Transaction และบังคับ Rollback 100%
 * - ไม่ทิ้งบัญชีทดสอบหรือข้อมูลขยะใน Production/Staging DB
 * - รองรับ SELECT ... FOR UPDATE NOWAIT และ Nested $transaction
 */
export async function withRollbackTransaction(
  testFn: (db: PrismaClient) => Promise<void>,
  options?: {
    client?: PrismaClient;
    maxWait?: number;
    timeout?: number;
  }
): Promise<void> {
  const client = options?.client ?? defaultPrisma;
  const maxWait = options?.maxWait ?? 5000;
  const timeout = options?.timeout ?? 15000;

  try {
    await client.$transaction(
      async (tx) => {
        const proxiedDb = createNestedTransactionProxy(tx);

        // รันเนื้อหาของเทสต์และ Assertions ทั้งหมด
        await testFn(proxiedDb);

        // โยน Signal บังคับให้ PostgreSQL Rollback ทันทีเมื่อจบเทสต์
        throw new IntentionalRollbackError();
      },
      { maxWait, timeout }
    );
  } catch (error) {
    // หากเป็นสัญญาณ Rollback ที่เราโยนเอง ถือว่าเทสต์ผ่านสมบูรณ์
    if (error instanceof IntentionalRollbackError) {
      return;
    }
    // หากเป็น AssertionError หรือ Bug จริง ให้โยนต่อไปเพื่อให้เทสต์แสดงผล Failed
    throw error;
  }
}

/**
 * Helper เสริมสำหรับครอบจุดที่ต้องการทดสอบ Error ระดับ Database (เช่น Prisma P2003)
 * เพื่อป้องกันอาการ PostgreSQL `25P02: current transaction is aborted`
 */
export async function withSavepoint<T>(
  db: DbClient,
  action: () => Promise<T>
): Promise<T> {
  const spName = `sp_guard_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  await db.$executeRawUnsafe(`SAVEPOINT ${spName}`);
  try {
    const result = await action();
    await db.$executeRawUnsafe(`RELEASE SAVEPOINT ${spName}`);
    return result;
  } catch (error) {
    await db.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${spName}`);
    await db.$executeRawUnsafe(`RELEASE SAVEPOINT ${spName}`);
    throw error;
  }
}
