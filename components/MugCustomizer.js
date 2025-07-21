import React from 'react';
import { WebView } from 'react-native-webview';

export default function DesignLab() {
  return (
    <WebView
      source={{ uri: 'http://192.168.0.102:3000' }}// Change after run on different internet
      style={{ flex: 1 }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
}