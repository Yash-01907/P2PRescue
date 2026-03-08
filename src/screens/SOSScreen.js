// src/screens/SOSScreen.js
// Main SOS screen — the big red button
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Vibration,
  ScrollView,
} from 'react-native';

const SOSScreen = ({ container }) => {
  const [message, setMessage] = useState('');
  const [injuredCount, setInjuredCount] = useState(0);
  const [waterAvailable, setWaterAvailable] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [peerCount, setPeerCount] = useState(0);

  useEffect(() => {
    // Update peer count periodically
    const interval = setInterval(() => {
      if (container?.transportAdapter) {
        setPeerCount(container.transportAdapter.getConnectedPeerCount());
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [container]);

  const handleSendSOS = async () => {
    if (!container?.createSOSUseCase) {
      Alert.alert('Error', 'System not initialized');
      return;
    }

    setIsSending(true);
    Vibration.vibrate([0, 200, 100, 200, 100, 200]); // SOS pattern

    const result = await container.createSOSUseCase.execute({
      message: message || 'EMERGENCY: Need immediate help',
      injuredCount,
      waterAvailable,
      batteryPercent: 100, // TODO: Get actual battery
      deviceId: container.deviceId.toString(),
    });

    setIsSending(false);

    if (result.success) {
      setSentCount(c => c + 1);
      Alert.alert(
        '📡 SOS Sent',
        `Your SOS is being relayed through the mesh network.\nPacket ID: ${result.packet.packetId.slice(
          0,
          8,
        )}...`,
      );
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          📡 Peers: {peerCount} | 📤 Sent: {sentCount}
        </Text>
      </View>

      {/* SOS Button */}
      <TouchableOpacity
        style={[styles.sosButton, isSending && styles.sosButtonSending]}
        onPress={handleSendSOS}
        disabled={isSending}
        activeOpacity={0.7}
      >
        <Text style={styles.sosButtonText}>
          {isSending ? '📡 SENDING...' : '🆘 SEND SOS'}
        </Text>
      </TouchableOpacity>

      {/* Message Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Message (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe your situation..."
          placeholderTextColor="#888"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Quick Info */}
      <View style={styles.section}>
        <Text style={styles.label}>Injured Count</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setInjuredCount(Math.max(0, injuredCount - 1))}
          >
            <Text style={styles.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{injuredCount}</Text>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setInjuredCount(injuredCount + 1)}
          >
            <Text style={styles.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.toggleBtn, waterAvailable && styles.toggleBtnActive]}
        onPress={() => setWaterAvailable(!waterAvailable)}
      >
        <Text style={styles.toggleText}>
          {waterAvailable ? '💧 Water Available' : '🚫 No Water'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20,
  },
  statusBar: {
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    color: '#00d4ff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  sosButton: {
    backgroundColor: '#e63946',
    paddingVertical: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 8,
    shadowColor: '#e63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  sosButtonSending: {
    backgroundColor: '#ff6b35',
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    color: '#a8dadc',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#16213e',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
    textAlignVertical: 'top',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  counterBtn: {
    backgroundColor: '#0f3460',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  counterValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
  },
  toggleBtn: {
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
    marginBottom: 30,
  },
  toggleBtnActive: {
    backgroundColor: '#0f3460',
    borderColor: '#00d4ff',
  },
  toggleText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default SOSScreen;
