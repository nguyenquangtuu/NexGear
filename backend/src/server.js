const app = require('./app');
const env = require('./config/env');
const pool = require('./config/mysql');
const { connectMongo } = require('./config/mongo');
const { initMysqlSchema } = require('./db/init-mysql');
const { syncUserServices } = require('./services/user-service.service');
const { cancelExpiredOrdersBatch } = require('./services/order-timeout.service');

const SERVICE_SYNC_INTERVAL_MS = 60 * 60 * 1000;

let serviceSyncTimer = null;
let orderTimeoutCleanupTimer = null;

async function runServiceSyncJob() {
  try {
    await syncUserServices(pool);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Service sync job failed:', error.message);
  }
}

function startServiceSyncJob() {
  if (serviceSyncTimer) return;

  runServiceSyncJob();
  serviceSyncTimer = setInterval(runServiceSyncJob, SERVICE_SYNC_INTERVAL_MS);
}

async function runOrderTimeoutCleanupJob() {
  try {
    const cancelledCount = await cancelExpiredOrdersBatch();
    if (cancelledCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Order timeout cleanup cancelled ${cancelledCount} expired order(s)`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Order timeout cleanup job failed:', error.message);
  }
}

function startOrderTimeoutCleanupJob() {
  if (orderTimeoutCleanupTimer) return;

  runOrderTimeoutCleanupJob();
  orderTimeoutCleanupTimer = setInterval(
    runOrderTimeoutCleanupJob,
    env.orders.timeoutCleanupIntervalMs
  );
}


async function bootstrap() {
  try {
    await pool.query('SELECT 1');
    // eslint-disable-next-line no-console
    console.log('MySQL connected');

    await initMysqlSchema();
    await connectMongo();
    startServiceSyncJob();
    startOrderTimeoutCleanupJob();

    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Bootstrap failed:', error.message);
    process.exit(1);
  }
}

bootstrap();
