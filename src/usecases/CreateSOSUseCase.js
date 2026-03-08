// src/usecases/CreateSOSUseCase.js
// Use Case: Create and enqueue an SOS packet for mesh broadcast
const SOSPacket = require('../domain/entities/SOSPacket');
const CryptoJS = require('crypto-js');

class CreateSOSUseCase {
  /**
   * @param {LocationPort} locationPort
   * @param {StoragePort} storagePort
   * @param {TransportPort} transportPort
   * @param {EventBus} eventBus
   */
  constructor(locationPort, storagePort, transportPort, eventBus) {
    this.locationPort = locationPort;
    this.storagePort = storagePort;
    this.transportPort = transportPort;
    this.eventBus = eventBus;
  }

  /**
   * Execute the SOS creation flow.
   * @param {object} params
   * @param {string} params.message - The SOS message
   * @param {number} params.injuredCount - Number of injured
   * @param {boolean} params.waterAvailable - Whether water is available
   * @param {number} params.batteryPercent - Current battery level
   * @param {string} params.deviceId - Hashed device identity
   * @returns {object} { success, packet, error }
   */
  async execute({
    message,
    injuredCount = 0,
    waterAvailable = false,
    batteryPercent = 100,
    deviceId,
  }) {
    try {
      // Step 1: Get best available location (live GPS → cached → none)
      const location = await this.locationPort.getBestLocation();

      // Step 2: Build the SOS packet entity
      const packet = new SOSPacket({
        senderDeviceId: deviceId,
        location: location ? location.toJSON() : { source: 'NONE' },
        payload: {
          message,
          injuredCount,
          waterAvailable,
          batteryPercent,
        },
      });

      // Step 3: Generate checksum for integrity
      const packetJson = JSON.stringify(packet.toJSON());
      packet.checksum = CryptoJS.SHA256(packetJson).toString();

      // Step 4: Save to local storage buffer
      await this.storagePort.savePacket(packet.toJSON());

      // Step 5: Broadcast to mesh network
      if (this.transportPort.isRunning()) {
        await this.transportPort.sendPacket(packet.toJSON());
      }

      // Step 6: Emit domain event
      if (this.eventBus) {
        const { SOSCreatedEvent } = require('../domain/events');
        this.eventBus.emit(new SOSCreatedEvent(packet.packetId));
      }

      return { success: true, packet: packet.toJSON(), error: null };
    } catch (error) {
      return { success: false, packet: null, error: error.message };
    }
  }
}

module.exports = CreateSOSUseCase;
