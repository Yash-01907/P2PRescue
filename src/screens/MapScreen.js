// src/screens/MapScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { diContainer } from '../di/container';

const MapScreen = () => {
  const [packets, setPackets] = useState([]);
  const [region, setRegion] = useState({
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const loadPackets = async () => {
    try {
      const storagePort = diContainer.resolve('StoragePort');
      const allPackets = await storagePort.getAllPackets();
      setPackets(
        allPackets.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        ),
      );

      // Auto-center on most recent valid location
      for (const p of allPackets) {
        if (p.location && p.location.source !== 'NONE' && p.location.latitude) {
          setRegion({
            latitude: p.location.latitude,
            longitude: p.location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
          break;
        }
      }
    } catch (e) {
      console.warn('Failed to load map data', e);
    }
  };

  useEffect(() => {
    loadPackets();
    const interval = setInterval(loadPackets, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const renderSOSItem = ({ item }) => {
    const time = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const locStr =
      item.location.source !== 'NONE' && item.location.latitude
        ? `${item.location.latitude.toFixed(
            4,
          )}, ${item.location.longitude.toFixed(4)}`
        : 'Unknown Loc';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>🆘 {item.packetId.slice(0, 8)}...</Text>
          <Text style={styles.cardTime}>{time}</Text>
        </View>
        <Text style={styles.cardMsg} numberOfLines={1}>
          {item.payload.message || 'No specific msg'}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {locStr} • Hops: {item.hopCount}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Map View Area */}
      <View style={styles.mapContainer}>
        <MapView provider={PROVIDER_DEFAULT} style={styles.map} region={region}>
          {packets.map(p => {
            if (
              !p.location ||
              p.location.source === 'NONE' ||
              !p.location.latitude
            )
              return null;
            return (
              <Marker
                key={p.packetId}
                coordinate={{
                  latitude: p.location.latitude,
                  longitude: p.location.longitude,
                }}
                title="🆘 SOS Beacon"
                description={
                  p.payload.message || `ID: ${p.packetId.slice(0, 8)}`
                }
                pinColor="red"
              />
            );
          })}
        </MapView>
      </View>

      {/* List Area */}
      <View style={styles.listContainer}>
        <Text style={styles.header}>Received SOS Beacons</Text>
        <FlatList
          data={packets}
          keyExtractor={item => item.packetId}
          renderItem={renderSOSItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No SOS signals received yet.</Text>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mapContainer: {
    flex: 1.5,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a8dadc',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#e63946',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardId: {
    color: '#00d4ff',
    fontWeight: 'bold',
    fontFamily: process.env.NODE_ENV === 'test' ? 'sans-serif' : 'monospace',
    fontSize: 12,
  },
  cardTime: {
    color: '#666',
    fontSize: 12,
  },
  cardMsg: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  cardMeta: {
    color: '#888',
    fontSize: 12,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default MapScreen;
