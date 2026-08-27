export interface TelemetryRecord {
  id: string;
  actionName: string;
  durationMs: number;
  payloadBytes: number;
  timestamp: string;
  userId?: string;
  status: 'ok' | 'warn' | 'error';
  tag?: 'DB' | 'STORAGE' | 'API';
}

const MAX_BUFFER_SIZE = 500;
// Global in-memory ring buffer across server requests in Node process
const globalTelemetryBuffer: TelemetryRecord[] = (globalThis as any).__eleaveTelemetryBuffer || [];
(globalThis as any).__eleaveTelemetryBuffer = globalTelemetryBuffer;

/**
 * Record a telemetry event
 */
export function recordTelemetry({
  actionName,
  durationMs,
  payloadBytes,
  userId,
  status = 'ok',
  tag = 'API'
}: {
  actionName: string;
  durationMs: number;
  payloadBytes: number;
  userId?: string;
  status?: 'ok' | 'warn' | 'error';
  tag?: 'DB' | 'STORAGE' | 'API';
}): TelemetryRecord {
  // Flag high payload > 150KB as warn
  let finalStatus = status;
  if (payloadBytes > 150 * 1024 && finalStatus === 'ok') {
    finalStatus = 'warn';
  }

  const record: TelemetryRecord = {
    id: 'tel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    actionName,
    durationMs: Math.round(durationMs),
    payloadBytes: Math.round(payloadBytes),
    timestamp: new Date().toISOString(),
    userId,
    status: finalStatus,
    tag
  };

  globalTelemetryBuffer.unshift(record);
  if (globalTelemetryBuffer.length > MAX_BUFFER_SIZE) {
    globalTelemetryBuffer.pop();
  }

  return record;
}

/**
 * Wrapper for Server Actions to measure payload size and execution latency
 */
export async function withTelemetry<T>(
  actionName: string,
  fn: () => Promise<T>,
  options?: { tag?: 'DB' | 'STORAGE' | 'API'; userId?: string }
): Promise<T> {
  const start = performance.now();
  let status: 'ok' | 'error' = 'ok';

  try {
    const result = await fn();
    const durationMs = performance.now() - start;
    let payloadBytes = 0;

    try {
      if (result !== undefined && result !== null) {
        payloadBytes = Buffer.byteLength(JSON.stringify(result), 'utf8');
      }
    } catch {
      payloadBytes = 256;
    }

    recordTelemetry({
      actionName,
      durationMs,
      payloadBytes,
      userId: options?.userId,
      status,
      tag: options?.tag || 'API'
    });

    return result;
  } catch (err) {
    const durationMs = performance.now() - start;
    recordTelemetry({
      actionName,
      durationMs,
      payloadBytes: 128,
      userId: options?.userId,
      status: 'error',
      tag: options?.tag || 'API'
    });
    throw err;
  }
}

/**
 * Get aggregated summary of telemetry
 */
export function getTelemetrySummary() {
  const totalRequests = globalTelemetryBuffer.length;
  let totalBytes = 0;

  const actionMap: Record<string, { count: number; totalBytes: number; avgDurationMs: number; totalDuration: number }> = {};

  for (const item of globalTelemetryBuffer) {
    totalBytes += item.payloadBytes;
    if (!actionMap[item.actionName]) {
      actionMap[item.actionName] = { count: 0, totalBytes: 0, avgDurationMs: 0, totalDuration: 0 };
    }
    actionMap[item.actionName].count++;
    actionMap[item.actionName].totalBytes += item.payloadBytes;
    actionMap[item.actionName].totalDuration += item.durationMs;
  }

  const topConsumers = Object.entries(actionMap)
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalBytes: data.totalBytes,
      totalKb: (data.totalBytes / 1024).toFixed(1),
      avgDurationMs: Math.round(data.totalDuration / data.count)
    }))
    .sort((a, b) => b.totalBytes - a.totalBytes)
    .slice(0, 8);

  const alerts = globalTelemetryBuffer.filter(
    (item) => item.payloadBytes > 100 * 1024 || item.status === 'warn' || item.status === 'error'
  ).slice(0, 10);

  return {
    totalRequests,
    totalBytes,
    totalMb: (totalBytes / (1024 * 1024)).toFixed(2),
    recentRecords: globalTelemetryBuffer.slice(0, 20),
    topConsumers,
    alerts
  };
}
