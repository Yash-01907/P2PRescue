// src/screens/MapScreen.js
// Shows SOS locations on a simple map view (placeholder for map library)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const MapScreen = ({ container }) => {
  const [packets, setPackets] = useState([]);

  useEffect(() => {
    const loadPackets = async () => {
      if (container?.storageAdapter) {
        const all = await container.storageAdapter.getBufferedPackets();
        setPackets(all.filter(p => p.location && p.location.source !== 'NONE'));
      }
    };
    loadPackets();
    const interval = setInterval(loadPackets, 5000);
    return () => clearInterval(interval);
  }, [container]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗺️ SOS Map</Text>
      <Text style={styles.subtitle}>
        {packets.length} SOS signals with location data
      </Text>

      {/* Map Placeholder — integrate react-native-maps in production */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>
          🌍 Map View{'\n'}
          (Add react-native-maps for production)
        </Text>
      </View>

      {/* SOS Location List */}
      <FlatList
        data={packets}
        keyExtractor={item => item.packetId}
        renderItem={({ item }) => (
          <View style={styles.packetCard}>
            <View style={styles.packetHeader}>
              <Text style={styles.packetId}>
                📍 {item.packetId.slice(0, 8)}...
              </Text>
              <Text style={styles.packetHops}>Hops: {item.hopCount}</Text>
            </View>
            <Text style={styles.packetLocation}>
              {item.location.latitude.toFixed(4)}°,{' '}
              {item.location.longitude.toFixed(4)}° ({item.location.source})
            </Text>
            <Text style={styles.packetMessage}>
              {item.payload?.message || 'No message'}
            </Text>
            <Text style={styles.packetTime}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No SOS signals with location data yet.
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#a8dadc', fontSize: 14, marginBottom: 16 },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#16213e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  mapPlaceholderText: {
    color: '#555',
    textAlign: 'center',
    fontSize: 16,
  },
  packetCard: {
    backgroundColor: '#16213e',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#e63946',
  },
  packetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  packetId: { color: '#00d4ff', fontSize: 14, fontWeight: '600' },
  packetHops: { color: '#888', fontSize: 12 },
  packetLocation: { color: '#a8dadc', fontSize: 13, marginBottom: 4 },
  packetMessage: { color: '#fff', fontSize: 14, marginBottom: 4 },
  packetTime: { color: '#666', fontSize: 11 },
  emptyText: { color: '#888', textAlign: 'center', padding: 30 },
});

export default MapScreen;
