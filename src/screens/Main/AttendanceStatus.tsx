import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '../../components/CustomHeader';
import { StackNavigationProp } from '@react-navigation/stack';
import { DrawerActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { colors } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;
const ACCENT = '#55e6ee';
const SCREEN_BG = '#132746';

type RootStackParamList = {
  AttendanceStatus: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
};

type AttendanceStatusNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AttendanceStatus'
>;

const AttendanceStatus = () => {
  const navigation = useNavigation<AttendanceStatusNavigationProp>();
  const { t, formatName } = useLanguage();

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notification');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchUserName = async () => {
    const user = await AsyncStorage.getItem('user_firstname');
    if (user) setUserName(user);
  };

  const fetchAttendance = async (selectedDate: Date) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('user_id');
      const empCode = await AsyncStorage.getItem('user_emp_code');
      if (!token) { setLoading(false); return; }


      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const res = await fetch(`${API_BASE_URL}/api/attendance/get-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, id: userId, empCode, date: dateStr }),
      });
      const json = await res.json();
      setRecords(json.records || []);
    } catch (err) {
      console.error(err);
      setRecords([]);
    }
    setLoading(false);
  };


  useFocusEffect(
    useCallback(() => {
      const today = new Date();
      setDate(today);
      fetchAttendance(today);
      fetchUserName();
    }, [])
  );


  const onChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => {
          navigation.navigate('PreHome', { screen: 'PaymentLeave' });
        }}
      />

      <LinearGradient colors={[SCREEN_BG, '#1f456f']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>{t('Hi')}, {formatName(userName)}</Text>
            <Text style={styles.subText}>{t('Employee Attendance Status')}</Text>
          </View>

          <View style={styles.searchSection}>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.inputText}>
                {date.toDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => fetchAttendance(date)}
            >
              <Text style={styles.searchButtonText}>{t('SEARCH')}</Text>
            </TouchableOpacity>
          </View>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={onChange}
            />
          )}

          <View style={styles.sectionContainer}>
            {loading ? (
              <ActivityIndicator color={ACCENT} size="large" style={styles.loader} />
            ) : records && records.length > 0 ? (
              records.map((item, index) => (
                <View key={index} style={styles.recordWrapper}>
                  {item.source === 'Attendance' ? (
                    <>
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('Check In session')} {index + 1}</Text>
                        <Text style={styles.infoText}>
                          {t('Time')}: {item.atd_intime || 'N/A'} | {t('Status')}: {item.atd_in_status}{'\n'}
                          {item.atd_intime_image ? `${item.atd_intime_image}\n` : ''}
                          {item.atd_in_latitude ? `Coords: ${item.atd_in_latitude}, ${item.atd_in_longitude}` : ''}
                        </Text>
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('Check Out session')} {index + 1}</Text>
                        <Text style={styles.infoText}>
                          {t('Time')}: {item.atd_outtime || t('On Duty')} | {t('Status')}: {item.atd_out_status}{'\n'}
                          {item.atd_outtime_image ? `${item.atd_outtime_image}\n` : ''}
                          {item.atd_out_latitude ? `Coords: ${item.atd_out_latitude}, ${item.atd_out_longitude}` : ''}
                        </Text>
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('Session')} {index + 1} {t('Result')}</Text>
                        <Text style={styles.infoText}>
                          {t('Final')}: {item.atd_final_status || t('Pending')}
                          {item.remark ? `\n${t('Note')}: ${item.remark}` : ''}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>{t(item.type)} {t('Log Entry')}</Text>
                      <Text style={styles.infoText}>
                        {t('Time')}: {item.atd_time} | {t('Status')}: {item.atd_status}{'\n'}
                        {item.atd_address ? `${item.atd_address}\n` : ''}
                        {item.atd_latitude ? `Coords: ${item.atd_latitude}, ${item.atd_longitude}` : ''}
                      </Text>
                    </View>
                  )}
                  {index < records.length - 1 && <View style={styles.separator} />}
                </View>
              ))
            ) : (
              <View style={styles.noRecordContainer}>
                <Text style={styles.infoText}>{t('No record found for this date')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default AttendanceStatus;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 24,
  },
  welcomeContainer: {
    width: CARD_WIDTH,
    padding: 16,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(19,39,70,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.24)',
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subText: {
    color: '#dbeafe',
    fontSize: 13,
    marginTop: 5,
  },
  searchSection: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(19,39,70,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.22)',
  },
  input: {
    flex: 1,
    backgroundColor: colors.panel,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.18)',
  },
  inputText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  searchButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 22,
  },
  searchButtonText: {
    color: SCREEN_BG,
    fontWeight: '800',
    fontSize: 12,
  },
  sectionContainer: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(19,39,70,0.95)',
    flex: 1,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.22)',
  },
  loader: {
    marginTop: 20,
  },
  recordWrapper: {
    marginBottom: 10,
  },
  separator: {
    height: 10,
    backgroundColor: 'rgba(231,169,61,0.1)',
    marginVertical: 10,
  },
  section: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.16)',
    marginBottom: 8,
  },
  sectionTitle: {
    backgroundColor: 'rgba(85,230,238,0.12)',
    color: '#FFFFFF',
    fontWeight: 'bold',
    padding: 8,
    textAlign: 'center',
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    padding: 8,
  },
  noRecordContainer: {
    padding: 20,
    alignItems: 'center',
  },
});
