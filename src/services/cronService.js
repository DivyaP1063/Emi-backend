/**
 * Cron Service - Interval-based Job Scheduler
 * 
 * This service manages the EMI reminder and device lock cron job
 * as a server-side interval that runs every 30 minutes (TESTING MODE).
 * 
 * Features:
 * - Runs every 30 minutes (for testing)
 * - Prevents concurrent executions
 * - Handles errors gracefully
 * - Can be started/stopped programmatically
 */

const { runEmiReminderCron } = require('../cron/emiReminderCron');

let intervalId = null;
let isRunning = false;
let executionCount = 0;
let lastExecutionTime = null;
let lastExecutionDuration = null;

/**
 * Execute the cron job
 * Prevents concurrent executions using a lock flag
 */
async function executeCronJob() {
    // Skip if previous execution is still running
    if (isRunning) {
        console.log('⏭️  [CRON] Skipping - Previous execution still running');
        return;
    }

    isRunning = true;
    const startTime = Date.now();
    executionCount++;

    try {
        console.log(`\n🔄 [CRON] Execution #${executionCount} started at ${new Date().toISOString()}`);

        await runEmiReminderCron();

        const duration = Date.now() - startTime;
        lastExecutionTime = new Date();
        lastExecutionDuration = duration;

        console.log(`✅ [CRON] Execution #${executionCount} completed in ${duration}ms\n`);
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [CRON] Execution #${executionCount} failed after ${duration}ms:`, error.message);
        console.error('Error stack:', error.stack);
    } finally {
        isRunning = false;
    }
}

/**
 * Start the cron service
 * Runs the job immediately, then every 30 minutes
 */
function startCronService() {
    if (intervalId) {
        console.log('⚠️  [CRON] Service already running');
        return;
    }

    console.log('\n🚀 [CRON] Starting cron service');
    console.log('📅 [CRON] Interval: Every 30 minutes (TESTING MODE)');
    console.log('🎯 [CRON] Job: EMI Reminder and Device Lock\n');

    // Run immediately on start
    executeCronJob();

    // Then run every 30 minutes (1800000ms)
    intervalId = setInterval(executeCronJob, 1800000);

    console.log('✅ [CRON] Service started successfully\n');
}

/**
 * Stop the cron service
 * Clears the interval and resets state
 */
function stopCronService() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;

        console.log('\n🛑 [CRON] Service stopped');
        console.log(`📊 [CRON] Total executions: ${executionCount}`);
        if (lastExecutionTime) {
            console.log(`⏰ [CRON] Last execution: ${lastExecutionTime.toISOString()}`);
            console.log(`⏱️  [CRON] Last duration: ${lastExecutionDuration}ms\n`);
        }
    } else {
        console.log('⚠️  [CRON] Service is not running');
    }
}

/**
 * Get cron service status
 * Returns current state and statistics
 */
function getCronStatus() {
    return {
        isRunning: intervalId !== null,
        isExecuting: isRunning,
        executionCount,
        lastExecutionTime,
        lastExecutionDuration,
        intervalMs: 1800000 // 30 minutes (TESTING MODE)
    };
}

module.exports = {
    startCronService,
    stopCronService,
    getCronStatus
};
