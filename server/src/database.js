const { Pool } = require('pg');

let pool;

// Fallback for local development if no Postgres is available yet.
// In production, pass the DATABASE_URL environment variable.
const DB_CONFIG = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/p2prescue',
};

async function initDB() {
  pool = new Pool(DB_CONFIG);

  try {
    const client = await pool.connect();

    // Create table if it doesn't exist (PostgreSQL syntax)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sos_packets (
        packetId VARCHAR(255) PRIMARY KEY,
        message TEXT,
        injuredCount INTEGER,
        waterAvailable BOOLEAN,
        batteryPercent INTEGER,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        locationSource VARCHAR(50),
        senderDeviceId VARCHAR(255),
        checksum VARCHAR(255),
        hopCount INTEGER,
        createdAt TIMESTAMP,
        receivedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Wait, PostGIS extension can be added here if needed:
    // await client.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    console.log('✅ PostgreSQL database initialized.');
    client.release();
    return pool;
  } catch (err) {
    console.error(
      '❌ Failed to connect to PostgreSQL. Is the server running?',
      err.message,
    );
    // In a real app we might gracefully degrade or exit,
    // but for the demo we log and don't crash.
  }
}

async function insertSOS(packet) {
  if (!pool) await initDB();

  const {
    packetId,
    payload,
    location,
    senderDeviceId,
    checksum,
    hopCount,
    createdAt,
  } = packet;

  try {
    // ON CONFLICT DO NOTHING prevents duplicate packet insertion based on packetId primary key
    const query = `
      INSERT INTO sos_packets (
        packetId, message, injuredCount, waterAvailable, batteryPercent, 
        latitude, longitude, locationSource, senderDeviceId, checksum, 
        hopCount, createdAt, receivedAt
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (packetId) DO NOTHING
    `;

    const values = [
      packetId,
      payload.message,
      payload.injuredCount,
      payload.waterAvailable ? 1 : 0,
      payload.batteryPercent,
      location.latitude || null,
      location.longitude || null,
      location.source,
      senderDeviceId,
      checksum,
      hopCount,
      new Date(createdAt),
      new Date(),
    ];

    await pool.query(query, values);
    return true;
  } catch (err) {
    console.error('Error inserting SOS to PG DB:', err);
    return false;
  }
}

async function getAllSOS() {
  if (!pool) await initDB();

  try {
    const result = await pool.query(
      `SELECT * FROM sos_packets ORDER BY receivedAt DESC`,
    );
    const rows = result.rows;

    return rows.map(r => ({
      packetId: r.packetid,
      senderDeviceId: r.senderdeviceid,
      createdAt: r.createdat,
      hopCount: r.hopcount,
      checksum: r.checksum,
      location: {
        latitude: r.latitude,
        longitude: r.longitude,
        source: r.locationsource,
      },
      payload: {
        message: r.message,
        injuredCount: r.injuredcount,
        waterAvailable: !!r.wateravailable,
        batteryPercent: r.batterypercent,
      },
    }));
  } catch (error) {
    console.error('Error fetching all SOS:', error);
    return [];
  }
}

module.exports = { initDB, insertSOS, getAllSOS };
