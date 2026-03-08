// src/adapters/storage/SQLiteAdapter.js
// Adapter: Persistent SQLite Database for offline-first SOS storage and logging
import SQLite from 'react-native-sqlite-storage';
import StoragePort from '../../domain/ports/StoragePort';

// Enable Promises
SQLite.enablePromise(true);

class SQLiteAdapter extends StoragePort {
  constructor() {
    super();
    this.db = null;
  }

  async init() {
    try {
      this.db = await SQLite.openDatabase({
        name: 'p2prescue.db',
        location: 'default',
      });
      console.log('[SQLiteAdapter] Initialized p2prescue.db');

      // Create Tables
      await this.db.transaction(tx => {
        // SOS Packets
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS SOS_PACKET (
            packet_id TEXT PRIMARY KEY,
            type TEXT,
            priority TEXT,
            created_at TEXT,
            ttl_hours INTEGER,
            hop_count INTEGER,
            payload_json TEXT,  -- Store the raw JSON packet for easy reconstruction
            status TEXT,        -- PENDING, FORWARDED, DELIVERED
            checksum TEXT
          );`,
        );

        // Location Cache
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS LOCATION_CACHE (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude REAL,
            longitude REAL,
            accuracy REAL,
            timestamp TEXT,
            source TEXT
          );`,
        );

        // Peer Log
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS PEER_LOG (
            peer_id TEXT PRIMARY KEY,
            first_seen TEXT,
            last_seen TEXT,
            packets_exchanged INTEGER DEFAULT 0,
            avg_rssi REAL
          );`,
        );

        // Relay Log
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS RELAY_LOG (
            relay_id TEXT PRIMARY KEY,
            packet_id TEXT,
            relayed_to TEXT,
            relayed_at TEXT,
            relay_location_json TEXT,
            FOREIGN KEY (packet_id) REFERENCES SOS_PACKET (packet_id)
          );`,
        );
      });
    } catch (error) {
      console.error('[SQLiteAdapter] Init error:', error);
      throw error;
    }
  }

  async savePacket(packetData) {
    if (!this.db) await this.init();
    try {
      await this.db.transaction(async tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO SOS_PACKET 
           (packet_id, type, priority, created_at, ttl_hours, hop_count, payload_json, status, checksum) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            packetData.packetId,
            packetData.type,
            packetData.priority,
            packetData.createdAt,
            packetData.ttlHours,
            packetData.hopCount,
            JSON.stringify(packetData), // Dump whole object for relay reconstruction
            packetData.status || 'PENDING',
            packetData.checksum || '',
          ],
        );
      });
    } catch (error) {
      console.warn('[SQLiteAdapter] savePacket error', error);
      throw error;
    }
  }

  async getPacket(packetId) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT payload_json FROM SOS_PACKET WHERE packet_id = ?',
          [packetId],
          (tx, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              resolve(JSON.parse(row.payload_json));
            } else {
              resolve(null);
            }
          },
          (tx, error) => reject(error),
        );
      });
    });
  }

  async getAllPackets() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT payload_json FROM SOS_PACKET',
          [],
          (tx, results) => {
            const packets = [];
            for (let i = 0; i < results.rows.length; i++) {
              packets.push(JSON.parse(results.rows.item(i).payload_json));
            }
            resolve(packets);
          },
          (tx, error) => reject(error),
        );
      });
    });
  }

  async packetExists(packetId) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT COUNT(*) as cnt FROM SOS_PACKET WHERE packet_id = ?',
          [packetId],
          (tx, results) => {
            resolve(results.rows.item(0).cnt > 0);
          },
          (tx, error) => reject(error),
        );
      });
    });
  }

  async getBufferedPackets(status = 'PENDING') {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT payload_json FROM SOS_PACKET WHERE status = ?',
          [status],
          (tx, results) => {
            const packets = [];
            for (let i = 0; i < results.rows.length; i++) {
              let p = JSON.parse(results.rows.item(i).payload_json);
              p.status = status; // Ensure status matches query
              packets.push(p);
            }
            resolve(packets);
          },
          (tx, error) => reject(error),
        );
      });
    });
  }

  async markAsForwarded(packetIds) {
    if (!packetIds || packetIds.length === 0) return;
    if (!this.db) await this.init();
    const placeholders = packetIds.map(() => '?').join(',');
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `UPDATE SOS_PACKET SET status = 'FORWARDED' WHERE packet_id IN (${placeholders})`,
          packetIds,
          () => resolve(),
          (tx, error) => reject(error),
        );
      });
    });
  }

  async markAsDelivered(packetIds) {
    if (!packetIds || packetIds.length === 0) return;
    if (!this.db) await this.init();
    const placeholders = packetIds.map(() => '?').join(',');
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `UPDATE SOS_PACKET SET status = 'DELIVERED' WHERE packet_id IN (${placeholders})`,
          packetIds,
          () => resolve(),
          (tx, error) => reject(error),
        );
      });
    });
  }

  async deleteExpiredPackets() {
    if (!this.db) await this.init();
    // Packets are considered expired if current time > created_at + ttl_hours
    // SQLite dates are a bit tricky, doing simple bulk fetch + delete memory filter for safety
    const packets = await this.getAllPackets();
    const now = new Date();
    const expiredIds = packets
      .filter(p => {
        const createTime = new Date(p.createdAt).getTime();
        const expiryTime = createTime + p.ttlHours * 60 * 60 * 1000;
        return now.getTime() > expiryTime;
      })
      .map(p => p.packetId);

    if (expiredIds.length > 0) {
      const placeholders = expiredIds.map(() => '?').join(',');
      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          tx.executeSql(
            `DELETE FROM SOS_PACKET WHERE packet_id IN (${placeholders})`,
            expiredIds,
            () => resolve(expiredIds.length),
            (tx, error) => reject(error),
          );
        });
      });
    }
    return 0;
  }

  async purgeStaleLogs() {
    if (!this.db) await this.init();

    const now = new Date();
    const twentyFourHoursAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const seventyTwoHoursAgo = new Date(
      now.getTime() - 72 * 60 * 60 * 1000,
    ).toISOString();

    return new Promise((resolve, reject) => {
      this.db.transaction(
        tx => {
          // Purge Location Cache > 24h
          tx.executeSql(`DELETE FROM LOCATION_CACHE WHERE timestamp < ?`, [
            twentyFourHoursAgo,
          ]);

          // Purge Peer Log > 7 days
          tx.executeSql(`DELETE FROM PEER_LOG WHERE last_seen < ?`, [
            sevenDaysAgo,
          ]);

          // Purge Relay Log > 72 hours
          tx.executeSql(`DELETE FROM RELAY_LOG WHERE relayed_at < ?`, [
            seventyTwoHoursAgo,
          ]);
        },
        error => {
          console.error(
            '[SQLiteAdapter] purgeStaleLogs transaction error:',
            error,
          );
          reject(error);
        },
        () => {
          console.log(
            '[SQLiteAdapter] Successfully purged stale logs (Location, Peers, Relays).',
          );
          resolve();
        },
      );
    });
  }

  async logPeer(peerId, rssi = 0) {
    if (!this.db) await this.init();
    try {
      await this.db.transaction(async tx => {
        const now = new Date().toISOString();
        tx.executeSql(
          `INSERT OR IGNORE INTO PEER_LOG (peer_id, first_seen, last_seen, packets_exchanged, avg_rssi)
           VALUES (?, ?, ?, 0, ?)`,
          [peerId, now, now, rssi],
          () => {
            tx.executeSql(
              `UPDATE PEER_LOG SET last_seen = ?, packets_exchanged = packets_exchanged + 1 WHERE peer_id = ?`,
              [now, peerId],
            );
          },
        );
      });
    } catch (e) {
      console.warn('[SQLiteAdapter] logPeer error', e);
    }
  }

  async logRelay(relayId, packetId, relayedTo, relayLocation) {
    if (!this.db) await this.init();
    try {
      await this.db.transaction(async tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO RELAY_LOG (relay_id, packet_id, relayed_to, relayed_at, relay_location_json)
           VALUES (?, ?, ?, ?, ?)`,
          [
            relayId || 'unknown',
            packetId,
            relayedTo,
            new Date().toISOString(),
            JSON.stringify(relayLocation || {}),
          ],
        );
      });
    } catch (e) {
      console.warn('[SQLiteAdapter] logRelay error', e);
    }
  }
}

export default SQLiteAdapter;
