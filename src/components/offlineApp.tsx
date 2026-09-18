// OfflineNotice.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const OfflineNotice = ({ onRetry }:any) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        {/* WiFi cross symbol */}
        <FontAwesome name="wifi" size={80} color="#f87171" style={styles.icon} />
        <View style={styles.crossLine} />

        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.subtitle}>Please check your Wi-Fi or Mobile Data.</Text>

        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    position: 'relative',
  },
  icon: {
    marginBottom: 20,
  },
  crossLine: {
    position: 'absolute',
    top: 30,
    width: 90,
    height: 4,
    backgroundColor: '#ef4444',
    transform: [{ rotate: '45deg' }],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default OfflineNotice;
