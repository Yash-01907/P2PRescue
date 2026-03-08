// src/usecases/SyncToDashboardUseCase.js
// Use Case: Upload buffered packets to the Rescue Dashboard when cell is available

class SyncToDashboardUseCase {
  /**
   * @param {StoragePort} storagePort
   * @param {ConnectivityPort} connectivityPort
   * @param {string} dashboardUrl - REST API endpoint for the dashboard
   */
  constructor(storagePort, connectivityPort, dashboardUrl) {
    this.storagePort = storagePort;
    this.connectivityPort = connectivityPort;
    this.dashboardUrl = dashboardUrl;
  }

  /**
   * Attempt to sync all undelivered packets to the dashboard.
   * @returns {object} { success, synced, failed, error }
   */
  async execute() {
    try {
      // Step 1: Check if we have internet
      const isOnline = await this.connectivityPort.hasCellSignal();
      if (!isOnline) {
        return {
          success: false,
          synced: 0,
          failed: 0,
          error: 'No internet connection',
        };
      }

      // Step 2: Get all undelivered packets
      const pendingPackets = await this.storagePort.getBufferedPackets(
        'PENDING',
      );
      const forwardedPackets = await this.storagePort.getBufferedPackets(
        'FORWARDED',
      );
      const allUndelivered = [...pendingPackets, ...forwardedPackets];

      if (allUndelivered.length === 0) {
        return { success: true, synced: 0, failed: 0, error: null };
      }

      // Step 3: Batch POST to dashboard API
      let synced = 0;
      let failed = 0;
      const deliveredIds = [];

      for (const packet of allUndelivered) {
        try {
          const response = await fetch(`${this.dashboardUrl}/api/sos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(packet),
          });

          if (response.ok) {
            deliveredIds.push(packet.packetId);
            synced++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      // Step 4: Mark successfully synced packets as DELIVERED
      if (deliveredIds.length > 0) {
        await this.storagePort.markAsDelivered(deliveredIds);
      }

      return { success: true, synced, failed, error: null };
    } catch (error) {
      return { success: false, synced: 0, failed: 0, error: error.message };
    }
  }
}

module.exports = SyncToDashboardUseCase;
