# P2P Rescue — Task Breakdown

> **Stack:** React Native + Bridgefy SDK + Foreground Service  
> **Architecture:** Hexagonal (Ports & Adapters) + Store-and-Forward DTN  
> **Each phase has a ✅ verification step — do not move on until it passes.**

---

## Phase 0 — Project Scaffolding

> _Goal: Runnable skeleton on a physical device_

- [ ] **0.1** Initialize React Native project (`npx react-native init P2PRescue`)
- [ ] **0.2** Set up folder structure matching Hexagonal Architecture
  ```
  src/
  ├── domain/        # entities, ports (interfaces), events
  ├── usecases/      # application business logic
  ├── adapters/      # Bridgefy, GPS, storage, network
  ├── services/      # foreground service, background workers
  ├── screens/       # UI screens (thin)
  └── di/            # dependency wiring
  ```
- [ ] **0.3** Install core dependencies
  - `react-native-bridgefy` (mesh SDK)
  - `@react-native-async-storage/async-storage` (local persistence)
  - `react-native-geolocation-service` (GPS)
  - `@react-native-community/netinfo` (connectivity detection)
  - `react-native-push-notification` (persistent notification for foreground service)
  - `uuid` (packet IDs)
  - `react-native-crypto-js` (AES encryption)
- [ ] **0.4** Configure Android permissions in `AndroidManifest.xml`
  - `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
  - `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE`
  - `ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`, `NEARBY_WIFI_DEVICES`
  - `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE`
  - `RECEIVE_BOOT_COMPLETED`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
- [ ] **0.5** Configure iOS permissions in `Info.plist`
  - `NSBluetoothAlwaysUsageDescription`
  - `NSLocationAlwaysAndWhenInUseUsageDescription`
  - `UIBackgroundModes`: `bluetooth-central`, `bluetooth-peripheral`, `location`

> **✅ Verify:** App launches on Android emulator AND physical device. No crash on startup. Folder structure matches the plan.

---

## Phase 1 — Domain Core (Zero Dependencies)

> _Goal: Pure business logic that can be unit tested without any device_

- [ ] **1.1** Create `SOSPacket` entity
  - Fields: `packetId`, `type`, `priority`, `createdAt`, `ttlHours`, `hopCount`, `maxHops`, `senderDeviceId`, `location`, `payload`, `relayChain`, `checksum`
  - Methods: `isExpired()`, `canRelay()`, `addRelayHop()`, `incrementHop()`
- [ ] **1.2** Create Value Objects
  - `DeviceId` (SHA-256 hash, immutable)
  - `GeoCoordinate` (lat, lng, accuracy, staleness, source enum)
  - `PacketId` (UUID v4 wrapper)
- [ ] **1.3** Define Port interfaces (abstract contracts)
  - `TransportPort`: `startMesh()`, `stopMesh()`, `sendPacket()`, `onPacketReceived()`, `onPeerDiscovered()`
  - `LocationPort`: `getCurrentLocation()`, `getCachedLocation()`, `startCaching()`
  - `StoragePort`: `savePacket()`, `getBufferedPackets()`, `markAsForwarded()`, `markAsDelivered()`, `purgeExpired()`
  - `ConnectivityPort`: `hasCellSignal()`, `onConnectivityChanged()`
- [ ] **1.4** Define Domain Events
  - `SOSCreatedEvent`, `PeerDiscoveredEvent`, `PacketRelayedEvent`, `PacketDeliveredEvent`, `CellSignalRestoredEvent`

> **✅ Verify:** Write unit tests for `SOSPacket`. Test: `isExpired()` returns true after TTL. `canRelay()` returns false when `hopCount >= maxHops`. `addRelayHop()` appends to relay chain. All tests pass with `npm test` — no Android device needed.

---

## Phase 2 — Use Cases (Application Business Logic)

> _Goal: Orchestration logic that wires domain entities together_

- [ ] **2.1** `CreateSOSUseCase`
  - Inputs: message, injured count, water available, battery percent
  - Steps: get location (live or cached) → build SOSPacket → encrypt → save to storage → enqueue for mesh broadcast
  - Output: `SOSPacket` with status
- [ ] **2.2** `RelayPacketUseCase`
  - Triggered when a packet arrives from another peer
  - Steps: validate checksum → check if already seen (dedup by packetId) → check TTL → increment hop → store in buffer → re-broadcast
- [ ] **2.3** `SyncToDashboardUseCase`
  - Triggered when cell signal is detected
  - Steps: get all undelivered packets from storage → batch HTTP POST to dashboard API → mark as delivered on server ACK
- [ ] **2.4** `CacheLocationUseCase`
  - Runs periodically (every 5 minutes via background worker)
  - Steps: get GPS fix → if successful, store coordinates + timestamp in cache → if GPS times out, keep previous cache

> **✅ Verify:** Write unit tests with mock ports. Test: `CreateSOSUseCase` produces a valid encrypted packet. `RelayPacketUseCase` rejects duplicate packets (same packetId). `RelayPacketUseCase` rejects packets where `hopCount >= maxHops`. `SyncToDashboardUseCase` marks packets as delivered after successful HTTP response. Run with `npm test`.

---

## Phase 3 — Adapters: Bridgefy Mesh (Transport Layer)

> _Goal: Phones discover each other and exchange data over BLE/Wi-Fi mesh_

- [ ] **3.1** Create `BridgefyTransportAdapter` implementing `TransportPort`
  - Initialize Bridgefy SDK with API key
  - Map Bridgefy callbacks to port interface: `onMessageReceived` → `onPacketReceived()`
  - Map Bridgefy `sendMessage()` → `sendPacket()`
  - Handle connection/disconnection events
- [ ] **3.2** Configure Bridgefy mesh mode
  - Enable mesh networking (multi-hop relay)
  - Set transmission mode to `MESH` (not direct)
  - Configure encryption at SDK level
- [ ] **3.3** Handle Bridgefy lifecycle
  - Start on Foreground Service start
  - Stop on app destruction or user opt-out
  - Handle SDK errors gracefully (Bluetooth off, permissions denied)

> **✅ Verify:** On **2 physical phones** with the app installed:
>
> 1. Phone A creates an SOS packet
> 2. Phone B receives it within 30 seconds
> 3. The received packet has correct fields (message, location, timestamp)
> 4. Turn off Bluetooth on Phone B → app shows "Bluetooth required" error, does not crash

---

## Phase 4 — Adapters: GPS & Location Cache

> _Goal: GPS works without network; cached fallback is reliable_

- [ ] **4.1** Create `GPSLocationAdapter` implementing `LocationPort`
  - Use `react-native-geolocation-service` for GPS access
  - Implement `getCurrentLocation()` with 30-second timeout
  - Implement cold-start fallback: if GPS times out, return cached location with `staleness_seconds`
- [ ] **4.2** Implement location caching
  - Store last GPS fix to AsyncStorage with timestamp
  - Background periodic caching via Headless JS task (every 5 minutes)
- [ ] **4.3** Handle "never had GPS" edge case
  - If no cached location AND GPS times out, return `{ source: "NONE" }`
  - SOS packet still sends, flagged as `LOCATION_PENDING`

> **✅ Verify:**
>
> 1. Open app outdoors → GPS fix appears in < 30 seconds
> 2. Turn on Airplane Mode → close and reopen app → cached location is displayed with "Last known: X minutes ago"
> 3. On a factory-reset device with no prior GPS → SOS sends with `LOCATION_PENDING` flag, no crash

---

## Phase 5 — Adapters: Local Storage (Store-and-Forward Buffer)

> _Goal: Packets survive app restarts and are forwarded when peers appear_

- [ ] **5.1** Create `AsyncStorageAdapter` implementing `StoragePort`
  - Store SOS packets as JSON in AsyncStorage (keyed by packetId)
  - Index by status: `PENDING`, `FORWARDED`, `DELIVERED`
  - Implement `purgeExpired()`: delete packets older than TTL (72 hours)
- [ ] **5.2** Implement deduplication
  - Before storing relayed packet, check if `packetId` already exists
  - Maintain a `Set<packetId>` in memory for fast lookup, backed by storage
- [ ] **5.3** Implement buffer-relay loop
  - When a new peer is discovered, iterate all `PENDING` packets and send via TransportPort
  - On successful send + ACK, update status to `FORWARDED` (keep local copy)

> **✅ Verify:**
>
> 1. Create 3 SOS packets → kill app → reopen → all 3 packets are still in buffer
> 2. Create a packet → wait 73 hours (or mock the TTL) → run `purgeExpired()` → packet is deleted
> 3. Send same packetId twice → only 1 copy exists in storage

---

## Phase 6 — Adapters: Connectivity & Dashboard Sync

> _Goal: When cell signal returns, all buffered packets upload to the dashboard_

- [ ] **6.1** Create `NetInfoConnectivityAdapter` implementing `ConnectivityPort`
  - Use `@react-native-community/netinfo` to detect cell/Wi-Fi connectivity
  - Emit `CellSignalRestoredEvent` when transitioning from offline → online
- [ ] **6.2** Implement opportunistic sync
  - On `CellSignalRestoredEvent`, trigger `SyncToDashboardUseCase`
  - POST all undelivered packets to dashboard REST API
  - On server 200 response, mark packets as `DELIVERED`
- [ ] **6.3** Handle sync failures
  - If server is unreachable, re-queue and retry on next connectivity event
  - Implement exponential backoff (1s, 2s, 4s, max 60s)

> **✅ Verify:**
>
> 1. Create 2 SOS packets in Airplane Mode → turn Airplane Mode off → packets appear in dashboard within 30 seconds
> 2. Set dashboard URL to invalid → sync fails gracefully → packets remain in buffer → fix URL → packets sync on next connectivity event

---

## Phase 7 — Background Survival (Foreground Service)

> _Goal: Mesh stays active even when screen is off_

- [ ] **7.1** Implement Android Foreground Service
  - Show persistent notification: "P2P Rescue is active"
  - Service type: `FOREGROUND_SERVICE_CONNECTED_DEVICE`
  - Start Bridgefy mesh inside the service
- [ ] **7.2** Request battery optimization exemption
  - On first launch, prompt user with `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
  - Show explanation dialog before the system prompt
- [ ] **7.3** Implement Boot Receiver
  - `BroadcastReceiver` on `BOOT_COMPLETED`
  - Restarts foreground service after phone reboot
- [ ] **7.4** Implement Headless JS for periodic GPS caching
  - React Native Headless Task runs every 15 minutes
  - Caches GPS coordinates even when app UI is closed

> **✅ Verify:**
>
> 1. Open app → lock screen → wait 5 minutes → send SOS from another phone → notification still shows, packet received
> 2. Force-kill app from Recent Apps → foreground service should restart
> 3. Reboot phone → after boot, notification appears without opening the app
> 4. Check battery stats → app shows "Foreground Service" not "Background", confirming OS won't kill it

---

## Phase 8 — UI Screens (Thin Presentation Layer)

> _Goal: Clean, functional UI — minimum viable screens_

- [ ] **8.1** SOS Screen (Home)
  - Big red SOS button
  - Optional message input (e.g., "3 survivors, 1 injured")
  - Quick toggles: injured count, water/food available
  - Battery level display
  - GPS status indicator (Live / Cached / No Fix)
  - Send button → triggers `CreateSOSUseCase`
- [ ] **8.2** Network Status Screen
  - Number of peers currently connected
  - Packets in buffer (pending / forwarded / delivered)
  - Cell signal status (online / offline)
  - Last sync timestamp
- [ ] **8.3** Map Screen (if time permits)
  - Show own location on map
  - Show locations from received SOS packets
  - Offline map tiles (pre-cached or use `react-native-maps` with offline support)
- [ ] **8.4** Permissions Onboarding Screen
  - Request Bluetooth, Location, Battery Optimization on first launch
  - Explain why each permission is needed (judges appreciate this)

> **✅ Verify:**
>
> 1. SOS Screen: Tap SOS → confirm dialog → packet created → "SOS Sent" toast
> 2. Network Status: Shows real peer count when 2 devices running
> 3. Navigate between all screens without crash
> 4. All screens render correctly in dark mode

---

## Phase 9 — Rescue Dashboard (Web)

> _Goal: Coordinators see all SOS signals on a live map_

- [ ] **9.1** Initialize React web app (Vite or Next.js)
- [ ] **9.2** Build REST API endpoint: `POST /api/sos` — receives batched SOS packets
- [ ] **9.3** Build REST API endpoint: `GET /api/sos` — returns all SOS packets for dashboard
- [ ] **9.4** Dashboard UI
  - Map view (Leaflet or Mapbox) with pins for each SOS
  - SOS detail panel: message, timestamp, relay chain, battery level
  - Confidence radius circle based on `staleness_seconds`
  - Auto-refresh via polling or WebSocket
- [ ] **9.5** Handle stale locations
  - Display confidence radius: `staleness < 5min` = small circle, `> 1hr` = large circle
  - Color code: Red = critical, Yellow = has water, Green = rescued

> **✅ Verify:**
>
> 1. Send SOS from phone (with cell signal) → packet appears on dashboard map within 30 seconds
> 2. Send SOS with cached GPS (5 min old) → dashboard shows location with larger confidence radius
> 3. Dashboard auto-refreshes and shows new packets without page reload

---

## Phase 10 — Encryption & Security Hardening

> _Goal: All packets are encrypted; relay integrity is verified_

- [ ] **10.1** Implement AES-256-GCM encryption for SOS payloads
- [ ] **10.2** Implement SHA-256 checksum on every packet
- [ ] **10.3** Validate checksum on receive — discard corrupted packets
- [ ] **10.4** Implement packet dedup + anti-replay (packetId + timestamp + nonce)
- [ ] **10.5** Device identity: SHA-256 hash of hardware ID (pseudonymous)

> **✅ Verify:**
>
> 1. Intercept a packet (log the raw bytes) → payload is unreadable ciphertext
> 2. Manually corrupt a packet's checksum → relay rejects it
> 3. Send the same packet twice → second copy is discarded

---

## Phase 11 — Integration Testing & Polish

> _Goal: Full end-to-end flow works on real devices_

- [ ] **11.1** 3-device relay test
  - Phone A sends SOS (no cell signal) → Phone B receives via mesh (no cell signal) → Phone C receives from B (has cell signal) → Dashboard shows SOS
- [ ] **11.2** Store-and-forward test
  - Phone A sends SOS → no peers in range → put Phone A in a room
  - Phone B walks into range 10 minutes later → receives the packet → walks to cell signal → uploads to dashboard
- [ ] **11.3** GPS cold-start test
  - Factory-reset GPS → send SOS → verify cached/pending location handling
- [ ] **11.4** Battery stress test
  - Run mesh for 2 hours → measure battery drain → should be < 5% per hour
- [ ] **11.5** Edge case: full storage → verify oldest relayed packets evicted, own SOS never evicted

> **✅ Verify:** All 5 integration tests pass on physical devices. Document results with screenshots/video for the pitch.

---

## Phase 12 — Hackathon Pitch Prep

> _Goal: Demo that impresses judges_

- [ ] **12.1** Record a 2-minute demo video of 3-device relay
- [ ] **12.2** Prepare architecture diagram slides (from architecture.md)
- [ ] **12.3** Prepare answers for judge Q&A (GPS, range, sparse network — already documented)
- [ ] **12.4** Update README.md with setup instructions, architecture overview, and screenshots

> **✅ Verify:** Pitch rehearsed. Demo runs without crash. All judge questions have prepared answers.

---

## Progress Summary

| Phase | Description         | Status         |
| ----- | ------------------- | -------------- |
| 0     | Project Scaffolding | ⬜ Not Started |
| 1     | Domain Core         | ⬜ Not Started |
| 2     | Use Cases           | ⬜ Not Started |
| 3     | Bridgefy Mesh       | ⬜ Not Started |
| 4     | GPS & Location      | ⬜ Not Started |
| 5     | Local Storage       | ⬜ Not Started |
| 6     | Connectivity & Sync | ⬜ Not Started |
| 7     | Background Survival | ⬜ Not Started |
| 8     | UI Screens          | ⬜ Not Started |
| 9     | Rescue Dashboard    | ⬜ Not Started |
| 10    | Encryption          | ⬜ Not Started |
| 11    | Integration Testing | ⬜ Not Started |
| 12    | Pitch Prep          | ⬜ Not Started |

> **Minimum Viable Demo (Phases 0–8):** A working app that sends SOS, relays via mesh, survives background, and shows on a dashboard.  
> **Complete Product (Phases 0–12):** Production-hardened with encryption, full integration tests, and polished pitch.
