import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomHeader from '../../components/CustomHeader';
import { colors } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchPhpEmployeeList,
  isPhpSuccess,
  normalizePhpEmployeeList,
  requestPhpCasualLeave,
} from '../../services/phpApi';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;
const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const INPUT_BG = '#132746';
const TEXT_DARK = colors.black;

type RootStackParamList = {
  CasualLeave: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
};

type CasualLeaveScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CasualLeave'
>;

export default function CasualLeaveScreen() {
  const { t, formatName } = useLanguage();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchName = async () => {
      const name = await AsyncStorage.getItem("user_firstname");
      if (name) setUserName(name);
    };
    fetchName();
  }, []);
  const [leaveDate, setLeaveDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [designation, setDesignation] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigation = useNavigation<CasualLeaveScreenNavigationProp>();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) return;

        const data = await fetchPhpEmployeeList({token});
        setEmployees(normalizePhpEmployeeList(data));
      } catch (err) {
        console.log('Error fetching employees:', err);
      }
    };

    fetchEmployees();
  }, []);

  const handleSend = async () => {
    if (isSubmitting) return;

    if (!reason.trim()) {
      Alert.alert(t('Please enter your reason.'));
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(leaveDate);
    selected.setHours(0, 0, 0, 0);
    if (selected.getTime() <= today.getTime()) {
      Alert.alert(t('Invalid Date'), t('You cannot apply leave for today or a previous date. Please select tomorrow or a future date.'));
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert(t('Token missing. Please login again.'));
        return;
      }
      const responsibleEmp = employees.find((emp) => emp.name === employeeName);

      const data = await requestPhpCasualLeave({
        token,
        startDate: leaveDate.toISOString().split('T')[0],
        reasonOfLeave: reason.trim(),
        responsibleEmpId: responsibleEmp?.id || '',
        empName: employeeName,
        responsibleDesignation: designation,
      });

      console.log('API Response:', data);

      if (isPhpSuccess(data) || data.status === 'SUCCESS' || data.error === false) {
        Alert.alert(t('Leave Request Sent!'), data.message || '');
        setLeaveDate(new Date());
        setReason('');
        setEmployeeName('');
        setDesignation('');
        navigation.goBack();
      } else {
        Alert.alert(t('Failed to send leave request'), data.message || t('Unknown error'));
      }
    } catch (err: unknown) {
      console.log('Error sending leave request:', err);
      let errorMsg = t('Unknown error');
      if (err instanceof Error) errorMsg = err.message;
      else if (typeof err === 'string') errorMsg = err;
      Alert.alert(t('Error sending leave request'), errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleReset = () => {
    setLeaveDate(new Date());
    setReason('');
    setEmployeeName('');
    setDesignation('');
  };

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notification');

  return (
    <SafeAreaView style={styles.safe}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => {
          navigation.navigate('PreHome', { screen: 'PaymentLeave' });
        }}
      />

      <LinearGradient colors={[SCREEN_BG, SCREEN_BG]} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.heroCard}>
              <Text style={styles.hi}>{t('Hi')}, {formatName(userName)}</Text>
              <Text style={styles.sub}>
                {t('Please write your reason below as to why you are requesting Casual Leave.')}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('CASUAL LEAVE REQUEST')}</Text>

            {/* Date Picker */}
            <Text style={styles.label}>{t('Leave start date *')}</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.inputText}>{leaveDate.toDateString()}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={leaveDate}
                mode="date"
                display="default"
                minimumDate={(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0,0,0,0); return d; })()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setLeaveDate(selectedDate);
                }}
              />
            )}

            {/* Reason */}
            <Text style={styles.label}>
              {t('Please Provide a Reason For Your Casual Leave? *')}
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder={t('Enter your reason')}
              placeholderTextColor="#FFFFFF"
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
            />

            <Text style={styles.sectionTitle}>
              {t('Who Has Taken Responsibility For Work During Your Leaves ?')}
            </Text>
            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={styles.label}>{t('Employee Name')}</Text>
                <Picker
                  selectedValue={employeeName}
                  onValueChange={(value, index) => {
                    setEmployeeName(value);
                    setDesignation(employees[index - 1]?.designation || '');
                  }}
                  style={[styles.picker, { color: employeeName === '' ? '#FFFFFF' : TEXT_DARK }]}
                  dropdownIconColor={TEXT_DARK}
                >
	                  <Picker.Item label={t('Select Employee')} value="" color="#FFFFFF" />
	                  {employees.map((emp) => (
	                    <Picker.Item key={emp.id} label={formatName(emp.name)} value={emp.name} />
	                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.fullInputBox}>
              <Text style={styles.label}>{t('Designation')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('Designation')}
                placeholderTextColor="#FFFFFF"
                value={designation}
                editable={false}
              />
            </View>

            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.sendBtn, isSubmitting && styles.disabledBtn]}
                onPress={handleSend}
                disabled={isSubmitting}
              >
                <Text style={styles.btnText}>{isSubmitting ? t('SENDING...') : t('SEND')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <Text style={[styles.btnText, styles.resetText]}>{t('RESET')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG },
  gradient: { flex: 1 },
  keyboard: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 26,
  },
  heroCard: {
    width: CARD_WIDTH,
    backgroundColor: SURFACE_YELLOW,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hi: { color: TEXT_DARK, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  sub: { color: '#FFFFFF', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  card: {
    width: CARD_WIDTH,
    backgroundColor: SURFACE_YELLOW_DEEP,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: TEXT_DARK, fontWeight: '800', fontSize: 16, marginTop: 14, marginBottom: 10 },
  label: { color: TEXT_DARK, fontSize: 13, marginTop: 8, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  inputBox: { flex: 1 },
  fullInputBox: { width: '100%' },
  input: {
    backgroundColor: INPUT_BG,
    color: TEXT_DARK,
    borderRadius: 10,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 0,
    minHeight: 48,
    lineHeight: 20,
    textAlignVertical: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  picker: {
    height: 48,
    backgroundColor: INPUT_BG,
    color: TEXT_DARK,
    borderRadius: 10,
    marginTop: 6,
  },
  inputRow: {
    backgroundColor: INPUT_BG,
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  inputText: { color: TEXT_DARK, fontWeight: '600' },
  textArea: {
    backgroundColor: INPUT_BG,
    color: TEXT_DARK,
    borderRadius: 10,
    marginTop: 6,
    padding: 10,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  btnRow: { width: CARD_WIDTH, flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 16 },
  sendBtn: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    marginRight: 8,
  },
  disabledBtn: {
    opacity: 0.55,
  },
  resetBtn: {
    flex: 1,
    backgroundColor: '#55e6ee',
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  btnText: { color: TEXT_DARK, fontWeight: '800' },
  resetText: { color: TEXT_DARK },
  location: { width: CARD_WIDTH, color: '#FFFFFF', fontSize: 12, marginBottom: 20 },
});
