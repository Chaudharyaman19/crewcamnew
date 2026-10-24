import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import CustomHeader from '../../components/CustomHeader';
import { colors } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { authFetch } from '../../utils/authFetch';
import { fetchPhpAttendanceSummary } from '../../services/phpApi';

type RootStackParamList = {
  Notification: undefined;
  EmployeeHistory: undefined;
  PreHome: { screen?: string };
};

type EmployeeHistoryNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EmployeeHistory'
>;

type DailyRecord = {
  instatus: string;
  checkIn: string;
  checkOut: string;
  outstatus: string;
  hours: string;
  user: string;
};

// Attendance types for summary
const attendanceTypes = [
  { name: 'Present Days', code: 'P', rule: 2 },
  { name: 'Late Coming', code: 'LC', rule: 2 },
  { name: 'Week off-Present', code: 'WP', rule: 2 },
  { name: 'Week off Days', code: 'WO', rule: 2 },
  { name: 'Holiday Present', code: 'HP', rule: 2 },
  { name: 'Holiday Days', code: 'H', rule: 2 },
  { name: 'Absent Days', code: 'AB', rule: 0 },
  { name: 'Office Leave', code: 'L', rule: 2 },
  { name: 'Paid Leave', code: 'PL', rule: 2 },
];

// Salary table headers
const salaryDetails = [
  { left: 'Monthly CTC', right: 'Earn CTC' },
  { left: 'Gross Salary', right: 'ESI Contribution' },
  { left: 'PF Contribution', right: 'OT Salary' },
  { left: 'Incentive Amt.', right: 'Earned Salary' },
  { left: 'TDS Deduction', right: 'Loan Installment' },
  { left: 'Adv. for Expense', right: 'Expense Received' },
  { left: 'Adv. Sal. deduction', right: 'Penalty deduction' },
  { left: 'Net Payable Salary', right: 'Loan Balance' },
];

// Map salary API keys → Table labels
const salaryMapping: Record<string, string> = {
  'Monthly CTC': 'ctc_month',
  'Gross Salary': 'gross_salary',
  'PF Contribution': 'pf_employee',
  'Incentive Amt.': 'incentive',
  'TDS Deduction': 'tds_deduction',
  'Adv. for Expense': 'advance_less',
  'Adv. Sal. deduction': 'loan_installment',
  'Net Payable Salary': 'net_salary',
  'Earn CTC': 'earn_ctc',
  'ESI Contribution': 'esi_employee',
  'OT Salary': 'ot_salary',
  'Earned Salary': 'earned_salary',
  'Loan Installment': 'loan_installment',
  'Expense Received': 'expense_received',
  'Penalty deduction': 'penalty_deduction',
  'Loan Balance': 'loan_balance',
};

const EmployeeHistoryScreen = () => {
  const { t, formatName } = useLanguage();
  const [company, setCompany] = useState('DHIPL-Office');
  const [employee, setEmployee] = useState({ id: 'EMP12345', name: 'Aman Saxena' });
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ [key: string]: DailyRecord }>({});
  const [summary, setSummary] = useState<{ [key: string]: number }>({});
  const [salaryData, setSalaryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [empName, setEmpName] = useState('');

  const navigation = useNavigation<EmployeeHistoryNavigationProp>();

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notification');

  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowPicker(false);
    setDate(currentDate);
  };
  const showDatepicker = () => setShowPicker(true);

  // Fetch Attendance dynamically based on selected employee & month
  const fetchAttendance = async () => {
    try {
      if (!employee.id) return;
      setLoading(true);

      const monthYear = moment(date).format('YYYY-MM');
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      const json = await fetchPhpAttendanceSummary({
        token,
        getMonth: monthYear,
      });

      if (json.result && json.result !== 'false') {
        const transformed: { [key: string]: DailyRecord } = {};
        json.result.forEach((item: any) => {
          const dateKey = moment(item.atd_intime, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD');

          const checkIn = item.atd_intime
            ? moment(item.atd_intime, 'YYYY-MM-DD HH:mm:ss').format('HH:mm')
            : '00:00';
          const checkOut = item.atd_outtime
            ? moment(item.atd_outtime, 'YYYY-MM-DD HH:mm:ss').format('HH:mm')
            : '00:00';
          const hours =
            item.atd_intime && item.atd_outtime
              ? moment
                .utc(
                  moment(item.atd_outtime, 'YYYY-MM-DD HH:mm:ss').diff(
                    moment(item.atd_intime, 'YYYY-MM-DD HH:mm:ss')
                  )
                )
                .format('H:mm')
              : '0:00';

          transformed[dateKey] = {
            instatus: item.atd_in_status,
            checkIn,
            checkOut,
            outstatus: item.atd_out_status,
            hours,
            user: item.login_name || json.empName,
          };
        });
        setAttendanceData(transformed);
        setEmpName(json.empName || employee.name);
      } else {
        setAttendanceData({});
      }

      if (json.summary) setSummary(json.summary);
      else setSummary({});
    } catch (err) {
      console.error('Attendance API Error:', err);
      setAttendanceData({});
      setSummary({});
    } finally {
      setLoading(false);
    }
  };


  const fetchSalary = async () => {
    try {
      setLoading(true);
      const EMP_TOKEN = await AsyncStorage.getItem('auth_token');
      if (!EMP_TOKEN) return;

      const url = `https://arogyamantra.com/app-api/user-account-details.php?token=${EMP_TOKEN}`;
      const res = await authFetch(url);
      const json = await res.json();

      if (json.product && json.product.length > 0) {
        setSalaryData(json.product[0]);
        setEmpName(json.employee?.empName || employee.name);
      } else {
        setSalaryData(null);
      }
    } catch (err) {
      console.error('Salary API Error:', err);
      setSalaryData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchAttendance();
    fetchSalary();
  };

  // Filter attendance for selected month
  const filteredData = Object.keys(attendanceData)
    .filter((d) => moment(d, 'YYYY-MM-DD').isSame(date, 'month'))
    .sort((a, b) => moment(b).diff(moment(a)))
    .reduce<{ [key: string]: DailyRecord }>((obj, key) => {
      obj[key] = attendanceData[key];
      return obj;
    }, {});

  // Total hours calculation
  const totalMinutes = Object.values(filteredData).reduce((acc, rec) => {
    if (rec.hours && rec.hours !== '0:00') {
      const [h, m] = rec.hours.split(':').map(Number);
      return acc + h * 60 + m;
    }
    return acc;
  }, 0);
  const totalHoursFormatted = `${Math.floor(totalMinutes / 60)}:${(totalMinutes % 60)
    .toString()
    .padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CustomHeader onMenuPress={handleMenuPress} onNotifPress={handleNotifPress} onUpdatePress={() => {
        navigation.navigate('PreHome', { screen: 'PaymentLeave' });
      }} />

      <ScrollView style={{ flex: 1 }}>
        {/* Welcome */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            {t('Hi')}, <Text style={{ fontWeight: 'bold' }}>{formatName(empName, 1)}</Text>
          </Text>
          <Text style={styles.subText}>Here is monthly Employees details</Text>
        </View>

        {/* Company Picker Full Row */}
        <View style={{ marginLeft: 10, marginRight: 15, marginTop: 10 }}>
          <Text style={styles.label}>Select Company</Text>
          <View style={[styles.pickerWrapper, { width: '100%' }]}>
            <Picker
              selectedValue={company}
              onValueChange={setCompany}
              style={styles.picker}
              dropdownIconColor="#FFFFFF"
            >
              <Picker.Item label="DHIPL-Office" value="DHIPL-Office" />
              <Picker.Item label="XYZ Pvt Ltd" value="XYZ" />
            </Picker>
          </View>
        </View>

        {/* Employee Picker Row */}
        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Select Employee</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={employee.id}
                onValueChange={(val) =>
                  setEmployee({ id: val, name: employee.name })
                }
                style={styles.picker}
                dropdownIconColor="#FFFFFF"
              >
                <Picker.Item label="Aman Saxena" value="EMP12345" />
                <Picker.Item label="Vijay" value="EMP67890" />
              </Picker>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Select Month</Text>
            <TouchableOpacity onPress={showDatepicker} style={styles.pickerButton}>
              <Text style={styles.pickerText}>{moment(date).format('YYYY-MMM')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Month Picker */}
        <View style={styles.rowInputs}>

          <View style={{ flex: 1 }} />
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={date}
            mode="date"
            display="default"
            onChange={onChange}
          />
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* Attendance Table */}
            <View style={styles.tableContainer}>
              <View style={styles.tableTitle}>
                <Text style={styles.tableTitleText}>{company}</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>DATE</Text>
                <Text style={styles.tableHeaderText}>INTIME</Text>
                <Text style={styles.tableHeaderText}>OUTIME</Text>
                <Text style={styles.tableHeaderText}>HOURS</Text>
                <Text style={styles.tableHeaderText}>USER</Text>
              </View>
              {Object.keys(filteredData).length > 0 ? (
                Object.keys(filteredData).map((d, index) => (
                  <View
                    key={d}
                    style={[styles.tableRow, index % 2 === 1 && styles.tableRowOdd]}
                  >
                    <Text style={styles.tableCell}>
                      {moment(d, 'YYYY-MM-DD').format('DD MMM')}
                    </Text>
                    <Text style={styles.tableCell}>
                      {filteredData[d].checkIn} | {filteredData[d].instatus}
                    </Text>
                    <Text style={styles.tableCell}>
                      {filteredData[d].checkOut} | {filteredData[d].outstatus}
                    </Text>
                    <Text style={styles.tableCell}>{filteredData[d].hours}</Text>
                    <Text style={styles.tableCell}>{formatName(filteredData[d].user, 1)}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.noDataRow}>
                  <Text style={styles.noDataText}>No data available for this month.</Text>
                </View>
              )}
            </View>

            {/* Attendance Summary */}
            <View style={[styles.tableContainer, styles.marginTop]}>
              <View style={styles.attendanceHeader}>
                <Text style={styles.attendanceNameHeader}>Attendance Name</Text>
                <Text style={styles.smallHeader}>Code</Text>
                <Text style={styles.smallHeader}>Nos.</Text>
                <Text style={styles.smallHeader}>Rule</Text>
                <Text style={styles.smallHeader}>Days</Text>
              </View>
              {attendanceTypes.map((item, index) => {
                const nos = summary[item.code] || 0;
                const days = item.rule > 0 ? (nos / item.rule).toFixed(1) : 0;
                return (
                  <View
                    key={index}
                    style={[styles.tableRow, index % 2 === 1 && styles.tableRowOdd]}
                  >
                    <Text style={styles.attendanceNameCell}>{item.name}</Text>
                    <Text style={styles.smallCell}>{item.code}</Text>
                    <Text style={styles.smallCell}>{nos}</Text>
                    <Text style={styles.smallCell}>{nos}/{item.rule}</Text>
                    <Text style={styles.smallCell}>{days}</Text>
                  </View>
                );
              })}
            </View>

            {/* Hours Summary */}
            <View style={[styles.tableContainer, styles.marginTop]}>
              <View style={styles.attendanceHeader}>
                <Text style={styles.smallHeader}>Hrs.</Text>
                <Text style={styles.smallHeader}>P</Text>
                <Text style={styles.smallHeader}>WP | HP</Text>
                <Text style={styles.smallHeader}>OT Days</Text>
                <Text style={styles.smallHeader}>WO | HO</Text>
                <Text style={styles.smallHeader}>Sal. Days</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.smallCell}>{totalHoursFormatted}</Text>
                <Text style={styles.smallCell}>{summary.P / 2}</Text>
                <Text style={styles.smallCell}>
                  {summary.WP / 2} | {summary.HP / 2}
                </Text>
                <Text style={styles.smallCell}>{summary.WP / 2 + summary.HP / 2}</Text>
                <Text style={styles.smallCell}>{summary.WO / 2} | {summary.H / 2}</Text>
                <Text style={styles.smallCell}>
                  {summary.P / 2 + summary.LC / 2 + summary.WO / 2 + summary.H / 2 - summary.AB / 2}
                </Text>
              </View>
            </View>

            {/* Salary Table */}
            <View style={[styles.tableContainer, styles.marginTop]}>
              {salaryDetails.map((item, index) => (
                <View
                  key={index}
                  style={[styles.tableRow, index % 2 === 1 && styles.tableRowOdd]}
                >
                  <Text style={styles.attendanceNameCell}>{item.left}</Text>
                  <Text style={styles.smallCell}>
                    {salaryData?.[salaryMapping[item.left]] ?? '-'}
                  </Text>
                  <Text style={styles.attendanceNameCell}>{item.right}</Text>
                  <Text style={styles.smallCell}>
                    {salaryData?.[salaryMapping[item.right]] ?? '-'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default EmployeeHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  welcomeContainer: { paddingHorizontal: 15, paddingVertical: 6 },
  welcomeText: { color: '#FFFFFF', fontSize: 18 },
  subText: { color: '#FFFFFF', fontSize: 14, marginTop: 2 },
  label: { color: '#FFFFFF', marginHorizontal: 4, marginTop: 2 },
  pickerWrapper: { flex: 1, margin: 5, backgroundColor: colors.panel },
  picker: { color: '#FFFFFF', height: 55 },
  rowInputs: { flexDirection: 'row', marginHorizontal: 10 },
  pickerButton: { backgroundColor: '#55e6ee', padding: 10, alignItems: 'center', justifyContent: 'center', height: 55, margin: 5 },
  pickerText: { fontSize: 16, fontWeight: '400', color: '#FFFFFF' },
  searchButton: { backgroundColor: '#55e6ee', paddingHorizontal: 20, height: 40, justifyContent: 'center', borderRadius: 4, margin: 15 },
  searchButtonText: { color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center' },
  tableContainer: { marginHorizontal: 15, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#3A3A4E', marginTop: 15 },
  tableTitle: { backgroundColor: colors.panel, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#3A3A4E' },
  tableTitleText: { color: '#FFFFFF', fontSize: 16, fontWeight: '400' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#2A2A3E', borderBottomWidth: 1, borderBottomColor: '#3A3A4E' },
  tableHeaderText: { flex: 1, fontSize: 12, fontWeight: '400', textAlign: 'center', color: '#FFFFFF', paddingVertical: 12, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#3A3A4E' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#3A3A4E', alignItems: 'center', backgroundColor: colors.panel },
  tableRowOdd: { backgroundColor: colors.panel },
  tableCell: { flex: 1, fontSize: 12, textAlign: 'center', color: '#FFFFFF', paddingVertical: 12, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#3A3A4E' },
  noDataRow: { padding: 20, alignItems: 'center', backgroundColor: colors.panel },
  noDataText: { color: '#FFFFFF', fontStyle: 'italic' },
  marginTop: { marginTop: 20 },
  salaryContainer: { padding: 10, backgroundColor: colors.panel },
  salaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#3A3A4E' },
  salaryRowOdd: { backgroundColor: colors.panel },
  salaryCell: { flexDirection: 'row', justifyContent: 'space-between', flex: 1, paddingHorizontal: 5 },
  salaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '400' },
  salaryValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '400' },
  attendanceHeader: { flexDirection: 'row', backgroundColor: '#2A2A3E', borderBottomWidth: 1, borderBottomColor: '#3A3A4E' },
  attendanceNameHeader: { flex: 2.5, fontSize: 12, fontWeight: '400', textAlign: 'center', color: '#FFFFFF', paddingVertical: 12, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#3A3A4E' },
  smallHeader: { flex: 1, fontSize: 12, fontWeight: '400', textAlign: 'center', color: '#FFFFFF', paddingVertical: 12, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#3A3A4E' },
  attendanceNameCell: { flex: 2.5, fontSize: 12, textAlign: 'center', color: '#FFFFFF', paddingVertical: 12, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#3A3A4E' },
  smallCell: { flex: 1, fontSize: 12, textAlign: 'center', color: '#FFFFFF', paddingVertical: 12, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#3A3A4E' },
});
