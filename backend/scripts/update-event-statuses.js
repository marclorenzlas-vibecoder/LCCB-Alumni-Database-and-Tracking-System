const eventStatusService = require('../src/services/eventStatusService');

async function runStatusUpdate() {
  try {
    console.log('Running event status update...\n');
    const result = await eventStatusService.updateEventStatuses();
    console.log('\n✅ Event status update complete!');
    console.log(`- Events transitioned to CURRENT: ${result.upcomingToCurrent}`);
    console.log(`- Events transitioned to PREVIOUS: ${result.currentToPrevious}`);
    console.log(`- Total events processed: ${result.totalProcessed}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating event statuses:', error);
    process.exit(1);
  }
}

runStatusUpdate();
