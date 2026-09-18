import { API_BASE_URL } from '@env';
// src/screens/Main/HolidayScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { gradients, spacing, radius, colors } from '../../theme';

const HolidayScreen = ({ navigation }: any) => {
  const [holidays, setHolidays] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/app-api/holidays`);
        const data = await res.json();
        setHolidays(data);
      } catch (e) {
        console.error('Holiday fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Holidays</Text>
      </View>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {holidays.map((h, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.title}>{h.title}</Text>
              <Text style={styles.date}>{h.date}</Text>
              <Text style={styles.desc}>{h.description}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#363435', padding: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { padding: 16 },
  card: {
    backgroundColor: '#55e6ee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  date: { fontSize: 14, color: '#555', marginVertical: 4 },
  desc: { fontSize: 14, color: '#777' },
});

export default HolidayScreen;
