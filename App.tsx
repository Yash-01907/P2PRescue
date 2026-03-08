// App.tsx — Main entry point for P2P Rescue
// Wires DI container to screens with tab navigation

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';

import SOSScreen from './src/screens/SOSScreen';
import NetworkStatusScreen from './src/screens/NetworkStatusScreen';
import MapScreen from './src/screens/MapScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

// DI container — wires all adapters, use cases, and services
const { getContainer } = require('./src/di/container');

const TABS = [
  { key: 'sos', label: '🆘 SOS', icon: '🆘' },
  { key: 'status', label: '📡 Status', icon: '📡' },
  { key: 'map', label: '🗺️ Map', icon: '🗺️' },
];

function App(): React.JSX.Element {
  const [onboarded, setOnboarded] = useState(false);
  const [activeTab, setActiveTab] = useState('sos');
  const [container, setContainer] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const c = getContainer();
        setContainer(c);

        // Start foreground service (mesh + GPS caching)
        await c.meshForegroundService.start();

        // Start sync worker (auto-upload on cell restore)
        c.syncWorker.start();

        console.log('[App] P2P Rescue initialized');
      } catch (error) {
        console.error('[App] Init error:', error);
      }
    };

    if (onboarded) {
      init();
    }

    return () => {
      // Cleanup on unmount
      if (container) {
        container.meshForegroundService?.stop();
        container.syncWorker?.stop();
      }
    };
  }, [onboarded]);

  if (!onboarded) {
    return <OnboardingScreen onComplete={() => setOnboarded(true)} />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'sos':
        return <SOSScreen container={container} />;
      case 'status':
        return <NetworkStatusScreen container={container} />;
      case 'map':
        return <MapScreen container={container} />;
      default:
        return <SOSScreen container={container} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Main Content */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.key.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    paddingVertical: 8,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: '#00d4ff',
  },
  tabIcon: { fontSize: 22, marginBottom: 2 },
  tabLabel: { color: '#888', fontSize: 10, fontWeight: '600' },
  tabLabelActive: { color: '#00d4ff' },
});

export default App;
