# 🚨 P2P Rescue — Disaster-Resilient Communication System

> **When cell towers fall, the mesh rises.**

P2P Rescue is a peer-to-peer emergency communication system that works **without internet, cell signal, or infrastructure** — using only the phones in your pocket.

## 🧠 The Problem

During disasters (earthquakes, floods, hurricanes), cellular infrastructure is the **first thing to fail**. Victims are left unable to call for help, and rescue teams are blind to who needs saving.

## 💡 The Solution

P2P Rescue creates an **ad-hoc mesh network** using Bluetooth and Wi-Fi Direct. When you press the SOS button:

1. 📡 Your phone broadcasts an SOS packet over BLE mesh
2. 🔄 Nearby phones automatically relay it forward (store-and-forward)
3. 📍 Your GPS coordinates travel with the SOS — even without cell signal
4. 🌐 When any phone in the chain reaches internet, all queued SOS packets upload to the Rescue Dashboard
5. 🗺️ Command centers see SOS locations on a live map in real-time

## 🏗 Architecture

```
Hexagonal Architecture + Delay-Tolerant Networking (DTN)

  Domain Core  <-->  Use Cases  <-->  Adapters
  (Entities)        (Business       (Bridgefy,
  SOSPacket          Logic)          GPS, Store)
```

### Key Technical Decisions

| Decision   | Choice                   | Why                             |
| ---------- | ------------------------ | ------------------------------- |
| Framework  | React Native             | Cross-platform (Android + iOS)  |
| Mesh SDK   | Bridgefy                 | Battle-tested in real disasters |
| Background | Foreground Service       | Survives Android Doze mode      |
| GPS        | Cached Location Strategy | Works without A-GPS data        |
| Encryption | AES-256                  | End-to-end privacy              |
| Pattern    | Hexagonal + DTN          | Testable, protocol-agnostic     |

## 🧪 Test Results

```
Test Suites: 9 passed, 9 total
Tests:       63 passed, 63 total

 - Domain: SOSPacket, Location, GeoCoordinate
 - Use Cases: CreateSOS, RelayPacket
 - Adapters: AsyncStorage, Crypto, Integration
 - Integration: 3-device relay chain, dedup, TTL, encryption
```

## 🚀 Quick Start

```bash
# Install dependencies
cd P2PRescue && npm install

# Run tests
npx jest --verbose

# Start the rescue server
cd server && npm install && npm start

# Open the dashboard
open dashboard/index.html

# Run the mobile app
npx react-native run-android
```

## 📡 How the Mesh Works

```
Victim A         Person B         Person C        Gateway
(No signal)      (No signal)      (No signal)     (Has signal)
    |                 |                 |               |
    |-- BLE broadcast-|                 |               |
    |   [SOS + GPS]   |-- relay hop 1 ->|               |
    |                 |                 |-- relay h2 -->|
    |                 |                 |               |-- HTTP POST
    |                 |                 |               |   to Dashboard
    |                 |                 |               |
    |                 |        Dashboard shows SOS pin  |
```

## 🔑 Judge-Ready Answers

### "How does GPS work without network?"

GPS is a **passive radio receiver** — it listens to satellite signals, not cell towers. Cold-start takes 30s but we cache coordinates every 5 minutes. Even a 30-minute-old cached location narrows rescue area to 500 meters.

### "What's the actual range?"

BLE: 100m open field. Wi-Fi Direct: 200m. But range doesn't matter because of **store-and-forward**: People physically carry packets between isolated clusters.

### "What if there aren't enough phones?"

The system is **delay-tolerant**. Packets have a 72-hour TTL and survive 15 hops. Even if only 1 phone reaches signal hours later, every SOS it carried gets uploaded.

## 📄 License

MIT — Built for saving lives, not for profit.
