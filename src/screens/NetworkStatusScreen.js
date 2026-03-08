// src/screens/NetworkStatusScreen.js
// Shows mesh network status, connected peers, and packet buffer stats
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';

const NetworkStatusScreen = ({ container }) => {
  const [meshRunning, setMeshRunning] = useState(false);
  const [peers, setPeers] = useState([]);
  const [packetCounts, setPacketCounts] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (container?.transportAdapter) {
        setMeshRunning(container.transportAdapter.isRunning());
        setPeers(container.transportAdapter.getPeers?.() || []);
      }
      if (container?.storageAdapter) {
        const counts = await container.storageAdapter.getPacketCounts();
        setPacketCounts(counts);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [container]);

  const handleSyncNow = async () => {
    if (container?.syncWorker) {
      const result = await container.syncWorker.syncNow();
      console.log('Manual sync result:', result);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 Network Status</Text>

      {/* Mesh Status */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View
            style={[styles.dot, meshRunning ? styles.dotGreen : styles.dotRed]}
          />
          <Text style={styles.statusLabel}>
            Mesh: {meshRunning ? 'RUNNING' : 'STOPPED'}
          </Text>
        </View>
        <Text style={styles.peerCount}>Connected Peers: {peers.length}</Text>
      </View>

      {/* Packet Buffer Stats */}
      {packetCounts && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Packet Buffer</Text>
          <View style={styles.statsGrid}>
            <StatBlock
              label="Total"
              value={packetCounts.total}
              color="#00d4ff"
            />
            <StatBlock
              label="Pending"
              value={packetCounts.pending}
              color="#ff6b35"
            />
            <StatBlock
              label="Forwarded"
              value={packetCounts.forwarded}
              color="#a8dadc"
            />
            <StatBlock
              label="Delivered"
              value={packetCounts.delivered}
              color="#4ade80"
            />
          </View>
        </View>
      )}

      {/* Sync Button */}
      <TouchableOpacity style={styles.syncBtn} onPress={handleSyncNow}>
        <Text style={styles.syncBtnText}>⬆️ Sync to Dashboard Now</Text>
      </TouchableOpacity>

      {/* Peer List */}
      <Text style={styles.cardTitle}>👥 Nearby Peers</Text>
      <FlatList
        data={peers}
        keyExtractor={item => item.peerId}
        renderItem={({ item }) => (
          <View style={styles.peerItem}>
            <Text style={styles.peerId}>{item.peerId.slice(0, 12)}...</Text>
            <Text style={styles.peerSignal}>
              📶 {item.signalStrength || '?'} dBm
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No peers found yet. Keep the app running.
          </Text>
        }
      />
    </View>
  );
};

const StatBlock = ({ label, value, color }) => (
  <View style={styles.statBlock}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  cardTitle: {
    color: '#a8dadc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  dotGreen: { backgroundColor: '#4ade80' },
  dotRed: { backgroundColor: '#e63946' },
  statusLabel: { color: '#fff', fontSize: 18, fontWeight: '600' },
  peerCount: { color: '#a8dadc', fontSize: 14 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statBlock: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 4 },
  syncBtn: {
    backgroundColor: '#0f3460',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  syncBtnText: { color: '#00d4ff', fontSize: 16, fontWeight: '600' },
  peerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  peerId: { color: '#fff', fontSize: 14, fontFamily: 'monospace' },
  peerSignal: { color: '#a8dadc', fontSize: 14 },
  emptyText: { color: '#888', textAlign: 'center', padding: 20 },
});

export default NetworkStatusScreen;
