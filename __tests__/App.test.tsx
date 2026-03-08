/**
 * @format
 */
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = (props: any) => <View {...props} testID="mock-map" />;
  const MockMarker = (props: any) => <View {...props} testID="mock-marker" />;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    PROVIDER_DEFAULT: 'default',
  };
});

jest.mock('bridgefy-react-native', () => ({
  BridgefyClient: {
    initialize: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    sendBroadcastMessage: jest.fn(),
  },
  BridgefyMessageListener: { onMessageReceived: jest.fn() },
  BridgefyStateListener: { onStarted: jest.fn(), onStartError: jest.fn() },
}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
