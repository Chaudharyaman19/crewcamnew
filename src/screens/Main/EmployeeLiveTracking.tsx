import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { colors } from '../../theme';
import CustomHeader from '../../components/CustomHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { travelTrackingApi } from '../../services/travelTrackingApi';
import { useLanguage } from '../../context/LanguageContext';

type RootStackParamList = {
  Notification: undefined;
  EmployeeLiveTracking: undefined;
  PreHome: { screen?: string };
};

type EmployeeLiveTrackingNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EmployeeLiveTracking'
>;

type EmployeeRecord = {
  _id?: string;
  emp_id?: string;
  emp_name: string;
  designation?: string;
  status?: string;
  lastLat?: string | number;
  lastLong?: string | number;
  datetime?: string;
  battery?: string;
  tower?: string;
  address?: string;
  totalDistanceKm?: number;
  totalTravelSeconds?: number;
  clientVisitCount?: number;
  routePointCount?: number;
};

const EmployeeLiveTrackingScreen = () => {
  const { t, formatName } = useLanguage();
  const [searchText, setSearchText] = useState('');
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigation = useNavigation<EmployeeLiveTrackingNavigationProp>();

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notification');

  const mapSessionToRecord = (session: any): EmployeeRecord => ({
    _id: String(session.id || session._id || ''),
    emp_id: session.empCode,
    emp_name: session.employeeName || session.empCode || 'Unknown',
    status: session.status,
    lastLat: session.lastLocation?.lat ?? session.lastLocation?.latitude,
    lastLong: session.lastLocation?.lng ?? session.lastLocation?.longitude,
    datetime: session.lastLocation?.capturedAt || session.lastLocation?.recordedAt || session.updatedAt,
    address: session.lastLocation?.address || session.currentDestination?.address,
    totalDistanceKm: session.totalKm ?? ((session.metrics?.totalDistanceMeters || 0) / 1000),
    totalTravelSeconds: session.metrics?.travelDurationSeconds || session.metrics?.totalTravelSeconds,
    clientVisitCount: session.metrics?.clientVisitCount,
    routePointCount: session.route?.length || session.routePointCount || 0,
  });

  const fetchLiveSessions = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await travelTrackingApi.getLiveSessions(true);
      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      setRecords(sessions.map(mapSessionToRecord));
    } catch (err) {
      console.error(err);
      setError(t('Error fetching data. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const filteredRecords = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {return records;}
    return records.filter((item) =>
      [item.emp_name, item.emp_id, item.status, item.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [records, searchText]);

  const handleSearch = () => fetchLiveSessions();

  useEffect(() => {
    fetchLiveSessions();
    const interval = setInterval(fetchLiveSessions, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveSessions]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) {return '0m';}
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const renderCard = ({ item }: { item: EmployeeRecord }) => (
    <View style={styles.card}>
      <Text style={styles.cardText}>
        {formatName(item.emp_name, 1)} | {item.status || 'N/A'}
      </Text>
      <Text style={styles.cardText}>
        {Number(item.totalDistanceKm || 0).toFixed(2)} km | {formatDuration(item.totalTravelSeconds)} | Meetings {item.clientVisitCount || 0}
      </Text>
      <Text style={[styles.cardText, styles.bold]}>{t('Last Active Location')}:</Text>
      <Text style={styles.cardText}>
        {item.address || 'Unknown'} | {item.datetime || 'N/A'}
      </Text>
      <Text style={styles.cardText}>
        Lat {item.lastLat || 'N/A'} | Long {item.lastLong || 'N/A'} | Route points {item.routePointCount || 0}
      </Text>
      <View style={styles.iconContainer}>
        <FontAwesomeIcon icon={faLocationDot} size={26} color="red" />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => navigation.navigate('PreHome', { screen: 'PaymentLeave' })}
      />

      <View style={styles.searchSection}>
        <View style={[styles.inputWrapper, {backgroundColor: '#2A2A3E'}]}>
          <View style={styles.inputInner}>
            <TextInput
              style={styles.input}
              placeholder={t('Enter Employee Name')}
              placeholderTextColor="#3A3A4E"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>{t('Search')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 20 }} />
      ) : error ? (
        <Text style={{ color: '#FFFFFF', textAlign: 'center', marginTop: 20 }}>
          {error}
        </Text>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item, index) => item._id || item.emp_id || index.toString()}
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={{ color: '#FFFFFF', textAlign: 'center', marginTop: 20 }}>
              {t('No records found')}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default EmployeeLiveTrackingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchSection: { flexDirection: 'row', margin: 10 },
  inputWrapper: { flex: 1, marginRight: 10, height: 48, padding: 2 },
  inputInner: { flex: 1, backgroundColor: '#2A2A3E', justifyContent: 'center' },
  input: { height: '100%', color: '#FFFFFF', paddingHorizontal: 12, fontSize: 14 },
  searchButton: { backgroundColor: '#55e6ee', paddingHorizontal: 20, justifyContent: 'center' },
  searchButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  card: { backgroundColor: colors.panel, margin: 10, padding: 12 },
  cardText: { color: '#FFFFFF', fontSize: 14, marginBottom: 6 },
  bold: { fontWeight: 'bold', textDecorationLine: 'underline' },
  iconContainer: { alignItems: 'flex-end', marginTop: 10 },
});
