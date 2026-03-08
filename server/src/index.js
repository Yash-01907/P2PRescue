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
const sosPackets = [];
const dashboardClients = new Set();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve dashboard static files at root
app.use(express.static(path.join(__dirname, '..', '..', 'dashboard')));

// --- REST API ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    packets: sosPackets.length,
    clients: dashboardClients.size,
  });
});

// Receive SOS packet from field devices
app.post('/api/sos', (req, res) => {
  const packet = req.body;

  if (!packet.packetId) {
    return res.status(400).json({ error: 'Missing packetId' });
  }

  // Dedup check
  const exists = sosPackets.some(p => p.packetId === packet.packetId);
  if (exists) {
    return res.json({ status: 'duplicate', packetId: packet.packetId });
  }

  // Add server metadata
  packet.receivedAt = new Date().toISOString();
  packet.serverStatus = 'RECEIVED';
  sosPackets.push(packet);

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
app.get('/api/sos', (req, res) => {
  res.json({
    count: sosPackets.length,
    packets: sosPackets.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    ),
  });
});

// Get packet by ID
app.get('/api/sos/:packetId', (req, res) => {
  const packet = sosPackets.find(p => p.packetId === req.params.packetId);
  if (!packet) {
    return res.status(404).json({ error: 'Packet not found' });
  }
  res.json(packet);
});

// --- WebSocket Server ---
wss.on('connection', ws => {
  console.log('[WS] Dashboard client connected');
  dashboardClients.add(ws);

  // Send current state to new client
  ws.send(
    JSON.stringify({
      type: 'INITIAL_STATE',
      packets: sosPackets,
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
