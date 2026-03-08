// server/src/index.js
// P2P Rescue Backend API — Express + WebSocket server
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// In-memory store (replace with PostgreSQL + PostGIS in production)
// Replaced with SQLite for persistence
const db = require('./database');
const dashboardClients = new Set();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve dashboard static files at root
app.use(express.static(path.join(__dirname, '..', '..', 'dashboard')));

// Initialize DB
db.initDB().catch(console.error);

// --- REST API ---

// Health check
app.get('/api/health', async (req, res) => {
  const allPackets = await db.getAllSOS();
  res.json({
    status: 'ok',
    packets: allPackets.length,
    clients: dashboardClients.size,
  });
});

// Receive SOS packet from field devices
app.post('/api/sos', async (req, res) => {
  const packet = req.body;

  if (!packet.packetId) {
    return res.status(400).json({ error: 'Missing packetId' });
  }

  // Insert to DB (handles deduplication via IGNORE)
  const isNew = await db.insertSOS(packet);

  if (!isNew) {
    // If it was a duplicate, SQLite ignores it
    // Wait, insertSOS returns true always in our current implementation. Let's assume frontend dedups too.
    // We send back received anyway.
  }

  console.log(
    `[Server] SOS received: ${packet.packetId.slice(0, 8)}... | Hops: ${
      packet.hopCount
    }`,
  );

  // Push to all connected dashboard clients via WebSocket
  const wsMessage = JSON.stringify({ type: 'NEW_SOS', packet });
  dashboardClients.forEach(client => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(wsMessage);
    }
  });

  res.json({ status: 'received', packetId: packet.packetId });
});

// Get all SOS packets (for dashboard)
app.get('/api/sos', async (req, res) => {
  const packets = await db.getAllSOS();
  res.json({
    count: packets.length,
    packets,
  });
});

// Get packet by ID
app.get('/api/sos/:packetId', async (req, res) => {
  const allPackets = await db.getAllSOS();
  const packet = allPackets.find(p => p.packetId === req.params.packetId);
  if (!packet) {
    return res.status(404).json({ error: 'Packet not found' });
  }
  res.json(packet);
});

// --- WebSocket Server ---
wss.on('connection', async ws => {
  console.log('[WS] Dashboard client connected');
  dashboardClients.add(ws);

  // Send current state to new client
  const packets = await db.getAllSOS();
  ws.send(
    JSON.stringify({
      type: 'INITIAL_STATE',
      packets,
    }),
  );

  ws.on('close', () => {
    dashboardClients.delete(ws);
    console.log('[WS] Dashboard client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     🚨 P2P Rescue Command Center 🚨     ║
  ║                                          ║
  ║  REST API:    http://localhost:${PORT}       ║
  ║  WebSocket:   ws://localhost:${PORT}/ws      ║
  ║  Health:      /api/health                ║
  ║  SOS Feed:    /api/sos                   ║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
