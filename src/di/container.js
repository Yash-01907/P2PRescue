// src/di/container.js
// Dependency Injection: Wire all adapters, use cases, and services together
const BridgefyTransportAdapter = require('../adapters/transport/BridgefyTransportAdapter');
const GPSLocationAdapter = require('../adapters/location/GPSLocationAdapter');
const SQLiteAdapter = require('../adapters/storage/SQLiteAdapter').default;
const NetInfoConnectivityAdapter = require('../adapters/network/NetInfoConnectivityAdapter');
const CryptoAdapter = require('../adapters/encryption/CryptoAdapter');

const CreateSOSUseCase = require('../usecases/CreateSOSUseCase');
const RelayPacketUseCase = require('../usecases/RelayPacketUseCase');
const SyncToDashboardUseCase = require('../usecases/SyncToDashboardUseCase');
const CacheLocationUseCase = require('../usecases/CacheLocationUseCase');

const MeshForegroundService = require('../services/MeshForegroundService');
const SyncWorker = require('../services/SyncWorker');

const { EventBus } = require('../domain/events');
const DeviceId = require('../domain/valueobjects/DeviceId');

const DASHBOARD_URL = 'https://p2prescue.example.com'; // TODO: Configure per env

// Singleton container
let _container = null;

function createContainer() {
  // --- Event Bus ---
  const eventBus = new EventBus();

  // --- Adapters ---
  const transportAdapter = new BridgefyTransportAdapter();
  const storageAdapter = new SQLiteAdapter();
  const locationAdapter = new GPSLocationAdapter(storageAdapter);
  const connectivityAdapter = new NetInfoConnectivityAdapter();
  const cryptoAdapter = new CryptoAdapter();

  // --- Device Identity ---
  const deviceId = new DeviceId(
    `P2PRescue_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  );

  // --- Use Cases ---
  const createSOSUseCase = new CreateSOSUseCase(
    locationAdapter,
    storageAdapter,
    transportAdapter,
    eventBus,
  );

  const relayPacketUseCase = new RelayPacketUseCase(
    storageAdapter,
    transportAdapter,
    eventBus,
  );

  const syncToDashboardUseCase = new SyncToDashboardUseCase(
    storageAdapter,
    connectivityAdapter,
    DASHBOARD_URL,
  );

  const cacheLocationUseCase = new CacheLocationUseCase(locationAdapter);

  // --- Services ---
  const meshForegroundService = new MeshForegroundService(
    transportAdapter,
    locationAdapter,
    storageAdapter,
  );

  const syncWorker = new SyncWorker(
    connectivityAdapter,
    syncToDashboardUseCase,
  );

  // --- Wire incoming packet handler ---
  transportAdapter.onPacketReceived(async packetData => {
    const result = await relayPacketUseCase.execute(
      packetData,
      deviceId.toString(),
      null, // Will be populated with current location
    );
    console.log('[Container] Incoming packet:', result.action);
  });

  return {
    // Adapters (for direct access when needed)
    transportAdapter,
    storageAdapter,
    locationAdapter,
    connectivityAdapter,
    cryptoAdapter,

    // Use Cases
    createSOSUseCase,
    relayPacketUseCase,
    syncToDashboardUseCase,
    cacheLocationUseCase,

    // Services
    meshForegroundService,
    syncWorker,

    // Shared
    eventBus,
    deviceId,
  };
}

function getContainer() {
  if (!_container) {
    _container = createContainer();
  }
  return _container;
}

module.exports = { getContainer, createContainer };
