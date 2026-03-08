// src/screens/OnboardingScreen.js
// Permission request flow and app introduction
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';

const STEPS = [
  {
    icon: '📡',
    title: 'Mesh Network',
    description:
      'P2P Rescue creates a mesh network using Bluetooth to connect you with nearby people — even without cell service.',
    permission: null,
  },
  {
    icon: '📍',
    title: 'Location Access',
    description:
      'Your GPS coordinates are attached to SOS signals so rescue teams know exactly where to find you.',
    permission: 'location',
  },
  {
    icon: '📶',
    title: 'Bluetooth Access',
    description:
      'Bluetooth is used to discover and communicate with other P2P Rescue devices nearby.',
    permission: 'bluetooth',
  },
  {
    icon: '🔔',
    title: 'Background Access',
    description:
      'The mesh network needs to stay active when your screen is off. This uses a small amount of battery.',
    permission: 'battery',
  },
];

const OnboardingScreen = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const requestPermission = async type => {
    if (Platform.OS !== 'android') {
      // iOS permissions are requested via Info.plist
      return true;
    }

    try {
      switch (type) {
        case 'location': {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message:
                'P2P Rescue needs GPS to send your location with SOS signals.',
              buttonPositive: 'Allow',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        case 'bluetooth': {
          if (Platform.Version >= 31) {
            const results = await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
            ]);
            return Object.values(results).every(
              r => r === PermissionsAndroid.RESULTS.GRANTED,
            );
          }
          return true;
        }
        case 'battery': {
          // Request battery optimization exemption
          Alert.alert(
            'Battery Optimization',
            'To keep the mesh network alive, please disable battery optimization for P2P Rescue in your device settings.',
            [{ text: 'OK' }],
          );
          return true;
        }
        default:
          return true;
      }
    } catch {
      return false;
    }
  };

  const handleNext = async () => {
    if (current.permission) {
      await requestPermission(current.permission);
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete?.();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{current.icon}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.description}>{current.description}</Text>
      </View>

      <View style={styles.footer}>
        {/* Step dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {step === STEPS.length - 1 ? 'Get Started 🚀' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'space-between',
    padding: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 80, marginBottom: 30 },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    color: '#a8dadc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: { paddingBottom: 20 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0f3460',
  },
  dotActive: { backgroundColor: '#00d4ff', width: 30 },
  nextBtn: {
    backgroundColor: '#e63946',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default OnboardingScreen;
