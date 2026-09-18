import React, { useState, useCallback, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from 'react-native-dropdown-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '../../components/CustomHeader';
import { DrawerActions } from '@react-navigation/native';
import { colors } from '../../theme';
import { formattedDateTime } from '../../utils/dateTime'
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE_URL } from '@env';
import { useLanguage } from '../../context/LanguageContext';

interface AttendanceItem {
  checkIn: string;
  checkOut: string;
  atd_in_status: string;
  atd_out_status: string;
  inlocation: string;
  outlocation: string;
}

const EmployeeAttendance = ({ navigation }: any) => {
  // --- MENU HANDLERS ---
  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('C.Updates');

  // --- STATE ---
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyValue, setCompanyValue] = useState<string | null>(null);
  const [companyItems, setCompanyItems] = useState<{ label: string; value: string }[]>([]);

  const [userOpen, setUserOpen] = useState(false);
  const [userValue, setUserValue] = useState<string | null>(null);
  const [userItems, setUserItems] = useState<{ label: string; value: string }[]>([]);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { userData } = useContext(AuthContext);
  const { t, formatName } = useLanguage();
  const [userName, setUserName] = useState<string | null>(userData.firstname);
  const [attendanceResult, setAttendanceResult] = useState<AttendanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userData.firstname) {
      setUserName(userData.firstname);
    }
  }, [userData.firstname]);

  // --- DROPDOWN HANDLERS ---
  const onCompanyOpen = useCallback(() => setUserOpen(false), []);
  const onUserOpen = useCallback(() => setCompanyOpen(false), []);

  // --- DATE PICKER ---
  const handleDateChange = (event: any, selectedDate: any) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === 'android') setShowDatePicker(false);
    setDate(currentDate);
  };
  const showDatepicker = () => setShowDatePicker(true);
  const formatDate = (dateObj: any) =>
    dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // --- FETCH COMPANIES ---
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/attendance/get-companies`)
      .then(res => res.json())
      .then(data => {
        const companies = data.map((c: any) => ({ label: c.company_name, value: c.company_short_name }));
        setCompanyItems(companies);
        if (companies.length > 0) setCompanyValue(companies[0].value);
      })
      .catch(err => console.error(err));
  }, []);


  // --- FETCH EMPLOYEES ---
  useEffect(() => {
    if (!companyValue) return;
    setUserItems([]);
    setUserValue(null);
    setEmployeeLoading(true);
    fetch(`${API_BASE_URL}/api/attendance/get-employees?company_id=${companyValue}`)
      .then(res => res.json())
      .then(data => {
        const employees = data.map((e: any) => ({
          label: formatName(e.employeeName), // Updated to match node API response
          value: e.emp_id,
        }));
        setUserItems(employees);
        if (employees.length > 0) setUserValue(employees[0].value);
      })
      .catch(err => console.error(err))
      .finally(() => setEmployeeLoading(false));
  }, [companyValue, formatName]);


  // --- SEARCH ATTENDANCE ---
  const handleSearch = () => {
    if (!companyValue || !userValue) {
      setError('Please select both company and employee');
      return;
    }
    setIsLoading(true);
    setAttendanceResult([]);
    setError(null);
    
    // Format date as YYYY-MM-DD for the backend
    const dateStr = date.getFullYear() + "-" + 
                    String(date.getMonth() + 1).padStart(2, '0') + "-" + 
                    String(date.getDate()).padStart(2, '0');

    fetch(
      `${API_BASE_URL}/api/attendance/track-attendance?company_id=${companyValue}&emp_id=${userValue}&date=${dateStr}`
    )
      .then(res => res.json())
      .then(data => {
        setAttendanceResult(data || []);
        if (!data || data.length === 0) setError('No records found');
      })
      .catch(err => {
        console.error(err);
        setError('Error fetching data');
      })
      .finally(() => setIsLoading(false));
  };


  // --- RENDER ATTENDANCE CARD ---
  const renderAttendanceItem = ({ item }: { item: AttendanceItem }) => (
    <View style={styles.card}>
      <Text style={styles.resultText}>
        Check In: {formattedDateTime(item.checkIn)} | {item.atd_in_status}{'\n'}
        Location In: {item.inlocation}{'\n'}
        Check Out: {item.checkOut} | {item.atd_out_status}{'\n'}
        Location Out: {item.outlocation}
      </Text>
    </View>
  );

  // --- LIST HEADER ---
  const ListHeader = () => (
    <View>
      <Text style={styles.greetingText}>{t('Hi')}, {formatName(userName)}</Text>
      <Text style={styles.titleText}>{t('All Employee Attendance List')}</Text>

      <View style={styles.controlsContainer}>
        <Text style={styles.inputLabel}>Select Company Name</Text>
        <DropDownPicker
          open={companyOpen}
          value={companyValue}
          items={companyItems}
          setOpen={setCompanyOpen}
          setValue={setCompanyValue}
          setItems={setCompanyItems}
          onOpen={onCompanyOpen}
          placeholder="Select Company"
          style={styles.dropdownStyle}
          dropDownContainerStyle={styles.dropdownContainerStyle}
          textStyle={styles.dropdownTextStyle}
          placeholderStyle={styles.dropdownTextStyle}
          zIndex={3000}
          zIndexInverse={1000}
        />

        <View style={styles.dateUserRow}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.inputLabel}>Select Date</Text>
            <TouchableOpacity onPress={showDatepicker} style={styles.dateInput}>
              <Text style={styles.dateText}>{formatDate(date)}</Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.userPickerContainer}>
            <Text style={styles.inputLabel}>{t('Select Username')}</Text>
            {employeeLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 10 }} />
            ) : (
              <DropDownPicker
                open={userOpen}
                value={userValue}
                items={userItems}
                setOpen={setUserOpen}
                setValue={setUserValue}
                setItems={setUserItems}
                onOpen={onUserOpen}
                placeholder={t('Select User')}
                style={styles.dropdownStyle}
                dropDownContainerStyle={styles.dropdownContainerStyle}
                textStyle={styles.dropdownTextStyle}
                placeholderStyle={styles.dropdownTextStyle}
                zIndex={2000}
                zIndexInverse={2000}
              />
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={isLoading}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => navigation.navigate('PreHome', { screen: 'PaymentLeave' })}
      />

      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode={'date'}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      <FlatList
        data={attendanceResult}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderAttendanceItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <View style={styles.card}>
              <Text style={styles.errorText}>{error || 'No records found'}</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  greetingText: { fontSize: 18, fontWeight: '500', color: colors.text, paddingTop: 10 },
  titleText: { fontSize: 16, color: colors.text, marginBottom: 0 },
  controlsContainer: { backgroundColor: colors.bg, paddingVertical: 6 },
  inputLabel: { fontSize: 14, color: colors.text, marginBottom: 8, marginTop: 10 },
  dropdownStyle: {
    backgroundColor: colors.panel,
    borderColor: 'transparent',
    minHeight: 45,
    borderRadius: 0,
    paddingHorizontal: 10,
  },
  dropdownContainerStyle: { backgroundColor: colors.bg, borderRadius: 0, borderWidth: 1 },
  dropdownTextStyle: { fontSize: 16, color: colors.text },
  dateUserRow: { flexDirection: 'row', justifyContent: 'space-between', zIndex: 5 },
  datePickerContainer: { flex: 1, marginRight: 10 },
  userPickerContainer: { flex: 1, marginLeft: 10 },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panel,
    padding: 10,
    minHeight: 45,
    borderRadius: 0,
  },
  dateText: { fontSize: 16, color: colors.text },
  calendarIcon: { fontSize: 20, color: colors.text },
  searchButton: { backgroundColor: '#55e6ee', padding: 10, alignItems: 'center', marginTop: 20 },
  searchButtonText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: colors.panel, padding: 15, borderRadius: 0, marginTop: 20 },
  resultText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  errorText: { paddingVertical: 10, color: 'red', textAlign: 'center', marginTop: 20 },
});

export default EmployeeAttendance;
