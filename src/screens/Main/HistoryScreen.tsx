import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Dimensions,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import moment from 'moment';
import { colors } from '../../theme';
import { DrawerActions } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchPhpAttendanceSummary,
  fetchPhpUserAccountDetails,
  normalizePhpSalaryForApp,
} from '../../services/phpApi';

const ACCENT = colors.accent;
const SCREEN_BG = colors.bg;
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;
const IST_OFFSET_MINUTES = 330;

type DailyRecord = {
  instatus: string;
  checkIn: string;
  checkOut: string;
  outstatus: string;
  user: string;
  checkInSort: number;
};

const attendanceTypes = [
  { name: 'Present Days', code: 'P', rule: 2 },
  { name: 'Late Coming', code: 'LC', rule: 2 },
  { name: 'Week Off-Present', code: 'WP', rule: 2 },
  { name: 'Week Off Days', code: 'WO', rule: 2 },
  { name: 'Holiday Present', code: 'HP', rule: 2 },
  { name: 'Holiday Days', code: 'H', rule: 2 },
  { name: 'Absent Days', code: 'AB', rule: 0 },
  { name: 'Office Leave', code: 'L', rule: 2 },
  { name: 'Paid Leave', code: 'PL', rule: 2 },
];

const salaryDetails = [
  { left: 'Monthly Ctc', right: 'Earn Ctc' },
  { left: 'Gross Salary', right: 'Esi Contribution' },
  { left: 'Pf Contribution', right: 'Ot Salary' },
  { left: 'Incentive Amt.', right: 'Earned Salary' },
  { left: 'Tds Deduction', right: 'Loan Installment' },
  { left: 'Adv. For Expense', right: 'Expense Received' },
  { left: 'Adv. Sal. Deduction', right: 'Penalty Deduction' },
  { left: 'Net Payable Salary', right: 'Loan Balance' },
];

const salaryMapping: Record<string, string> = {
  'Monthly Ctc': 'ctc_month',
  'Gross Salary': 'gross_salary',
  'Pf Contribution': 'pfcontribute',
  'Incentive Amt.': 'incentive',
  'Tds Deduction': 'tds_deduction',
  'Adv. For Expense': 'advance_less',
  'Adv. Sal. Deduction': 'advance_less',
  'Net Payable Salary': 'net_salary',
  'Earn Ctc': 'earnedCTC',
  'Esi Contribution': 'esicontribution',
  'Ot Salary': 'otsalary',
  'Earned Salary': 'EarnedSalary',
  'Loan Installment': 'loan_installment',
  'Expense Received': 'expense_received',
  'Penalty Deduction': 'penalty_deduction',
  'Loan Balance': 'next_month_loan_balance',
};

const parseAttendanceDateTime = (value?: string | Date | null) => {
  if (!value) return null;

  const raw = String(value).trim();
  const hasExplicitTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const knownFormats = [
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DDTHH:mm:ss.SSSZ',
    'YYYY-MM-DDTHH:mm:ss.SSS[Z]',
    'YYYY-MM-DDTHH:mm:ssZ',
    'DD/MM/YYYY, HH:mm:ss',
    'DD/MM/YYYY HH:mm:ss',
    'MM/DD/YYYY, h:mm:ss A',
    'MM/DD/YYYY h:mm:ss A',
  ];

  const strictMoment = moment(raw, knownFormats, true);
  if (strictMoment.isValid()) {
    return hasExplicitTimezone
      ? strictMoment.utcOffset(IST_OFFSET_MINUTES)
      : strictMoment.utcOffset(IST_OFFSET_MINUTES, true);
  }

  const looseMoment = moment(raw);
  if (!looseMoment.isValid()) return null;

  return hasExplicitTimezone
    ? looseMoment.utcOffset(IST_OFFSET_MINUTES)
    : looseMoment.utcOffset(IST_OFFSET_MINUTES, true);
};

const HistoryScreen = ({ navigation }: any) => {
  const { userData } = useContext(AuthContext);
  const { t, formatName } = useLanguage();
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{
    [key: string]: DailyRecord[];
  }>({});
  const [summary, setSummary] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [empName, setEmpName] = useState('');
  const [salaryData, setSalaryData] = useState<any>(null);
  const [empCompany, setCompany] = useState('');

  const EMP_TOKEN = userData.token;

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('C.Updates');
  const onPickerValueChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    const currentDate = selectedDate || date;
    setShowPicker(false);
    setDate(currentDate);
  };
  const onPickerDismiss = () => setShowPicker(false);
  const showDatepicker = () => setShowPicker(true);

  const fetchAttendance = async () => {
    try {
      if (!EMP_TOKEN) return;
      setLoading(true);
      const monthYear = moment(date).utcOffset(IST_OFFSET_MINUTES, true).format('YYYY-MM');
      const json = await fetchPhpAttendanceSummary({
        token: EMP_TOKEN,
        getMonth: monthYear,
      });

      if (json.result && json.result !== 'false') {
        const transformed: { [key: string]: DailyRecord[] } = {};
        json.result.forEach((item: any) => {
          const inMoment = parseAttendanceDateTime(item.atd_intime_iso || item.atd_intime);
          const outMoment = parseAttendanceDateTime(item.atd_outtime_iso || item.atd_outtime);

          const dateKey = item.atd_in_date || (inMoment?.isValid() ? inMoment.format('YYYY-MM-DD') : null);
          if (!dateKey) {
            return;
          }

          const checkIn = item.atd_in_time || inMoment?.format('hh:mm A') || '--:--';
          const checkOut = item.atd_out_time || (outMoment?.isValid()
            ? outMoment.format('hh:mm A')
            : '--:--');

          const record: DailyRecord = {
            instatus: item.atd_in_status,
            checkIn,
            checkOut,
            outstatus: item.atd_out_status,
            user: item.login_name || json.empName,
            checkInSort: Number(item.atd_sort_time) || inMoment?.valueOf() || 0,
          };

          if (!transformed[dateKey]) transformed[dateKey] = [];
          transformed[dateKey].push(record);
        });

        setAttendanceData(transformed);
        setEmpName(json.empName || '');
        setCompany(json.company);
      } else {
        setAttendanceData({});
      }

      setSummary(json.summary || {});
    } catch (err) {
      console.error('Attendance Api Error:', err);
      setAttendanceData({});
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  const fetchSalary = async () => {
    try {
      if (!EMP_TOKEN) return;
      setLoading(true);
      const monthYear = moment(date).utcOffset(IST_OFFSET_MINUTES, true).format('YYYY-MM');
      const json = await fetchPhpUserAccountDetails({
        token: EMP_TOKEN,
        monthYear,
      });
      const salary = normalizePhpSalaryForApp(json);

      if (salary) {
        setSalaryData(salary);
        setEmpName(json.employee?.empName || json.empName || '');
      } else {
        setSalaryData(null);
      }
    } catch (err) {
      console.error('Salary Api Error:', err);
      setSalaryData(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAttendance();
      fetchSalary();
      // Preserve the existing focus refresh behavior for the selected month.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]),
  );

  const filteredData = Object.keys(attendanceData)
    .filter(d => {
      const recordDate = moment(d, 'YYYY-MM-DD', true);
      return recordDate.isValid() && recordDate.isSame(date, 'month');
    })
    .sort((a, b) => moment(b).diff(moment(a)))
    .reduce<{ [key: string]: DailyRecord[] }>((obj, key) => {
      obj[key] = [...attendanceData[key]].sort((a, b) => {
        return b.checkInSort - a.checkInSort;
      });
      return obj;
    }, {});

  const salaryDays =
    (summary.P / 2 || 0) +
    (summary.LC / 2 || 0) +
    (summary.WO / 2 || 0) +
    (summary.PL / 2 || 0) +
    (summary.H / 2 || 0) -
    (summary.AB / 2 || 0);

  const otDays = Math.round((summary.HP / 2 || 0) + (summary.WP / 2 || 0));
  const monthlyCTC = parseFloat(salaryData?.ctc_month || 0);
  const monthlypf = parseFloat(salaryData?.pf_contribution || 0);
  const monthlyesi = parseFloat(salaryData?.esi_contribution || 0);
  const advance_less = parseFloat(salaryData?.advance_less || 0);
  const loan_installment = parseFloat(salaryData?.loan_installment || 0);
  const tds_deduction = parseFloat(salaryData?.tds_deduction || 0);
  const totalDaysInMonth = moment(date).daysInMonth();

  const earnedCTC = Math.round((monthlyCTC / totalDaysInMonth) * salaryDays);
  const pfcontribute = Math.round((monthlypf / totalDaysInMonth) * salaryDays);
  const esicontribution = Math.round(
    (monthlyesi / totalDaysInMonth) * salaryDays + otDays,
  );
  const otsalary = Math.round((monthlyCTC / totalDaysInMonth) * otDays);
  const gross_salary = Math.round(earnedCTC - (pfcontribute + esicontribution));
  const EarnedSalary = Math.round(gross_salary + otsalary);
  const net_salary = Math.round(
    EarnedSalary - (advance_less + tds_deduction + loan_installment),
  );

  const computedSalaryData: Record<string, number> = {
    earnedCTC,
    pfcontribute,
    esicontribution,
    otsalary,
    gross_salary,
    EarnedSalary,
    net_salary,
  };

  const isLeaveRecord = (rec: DailyRecord) =>
    rec.instatus === 'L' || rec.outstatus === 'L' || rec.instatus === 'PL' || rec.outstatus === 'PL';

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => {
          navigation.navigate('PreHome', { screen: 'PaymentLeave' });
        }}
      />
      <LinearGradient
        colors={[SCREEN_BG, SCREEN_BG]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <LinearGradient
            colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View>
              <Text style={styles.headerTitle}>
                {t('Hi')}, {formatName(empName, 1)}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('Here Is Your Monthly Presence Details. If You Have Any Discrepancy Regarding Details, Please Contact The Hr Department For Amendment.')}
              </Text>
            </View>
            {/* <Image
            source={{ uri: 'https://i.imgur.com/GzQ58oN.png' }}
            style={styles.headerImage}
          /> */}
          </LinearGradient>

          {/* Month + Score */}
          <View style={styles.infoContainer}>
            <View style={styles.monthSelector}>
              <Text style={styles.infoLabel}>{t('Select Month')}</Text>
              <TouchableOpacity
                onPress={showDatepicker}
                style={styles.pickerButton}>
                <Text style={styles.pickerText}>
                  {moment(date).format('YYYY-MMM')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.infoLabel}>{t('Attendance Score')}</Text>
              <Text style={styles.scoreText}>
                {((summary.P / 2) * 0.77).toFixed(2)}/20
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={ACCENT}
              style={{ marginTop: 20 }}
            />
          ) : (
            <View style={styles.tableContainer}>
              <View style={styles.tableTitle}>
                <Text style={styles.tableTitleText}>
                  {empCompany || 'Design House India Pvt. Ltd.'}
                </Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.dateColumn]}>{t('Date')}</Text>
                <Text style={[styles.tableHeaderText, styles.timeColumn]}>{t('Intime')}</Text>
                <Text style={[styles.tableHeaderText, styles.timeColumn]}>{t('Outime')}</Text>
                <Text style={[styles.tableHeaderText, styles.userColumn]}>{t('User')}</Text>
              </View>
              {Object.keys(filteredData).length > 0 ? (
                Object.entries(filteredData).map(([d, records]) => (
                  <View key={d}>
                    {records.map((rec, i) => (
                      <View
                        key={`${d}-${i}`}
                        style={[
                          styles.tableRow,
                          i % 2 === 1 && styles.tableRowOdd,
                        ]}>
                        <Text style={[styles.tableCell, styles.dateColumn]} numberOfLines={1}>
                          {moment(d, 'YYYY-MM-DD').format('DD MMM')}
                        </Text>
                        <Text style={[styles.tableCell, styles.timeColumn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                          {isLeaveRecord(rec) ? t('Leave') : rec.checkIn} | {rec.instatus}
                        </Text>
                        <Text style={[styles.tableCell, styles.timeColumn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                          {isLeaveRecord(rec) ? t('Leave') : rec.checkOut} | {rec.outstatus}
                        </Text>
                        <Text style={[styles.tableCell, styles.userColumn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                          {formatName(rec.user, 1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <View style={styles.noDataRow}>
                  <Text style={styles.noDataText}>
                    {t('No Data Available For This Month.')}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={[styles.tableContainer, styles.marginTop, styles.summaryContainer]}>
            <View style={[styles.attendanceHeader, styles.summaryHeader]}>
              <Text style={styles.attendanceNameHeader}>{t('Attendance Name')}</Text>
              <Text style={styles.smallHeader}>{t('Code')}</Text>
              <Text style={styles.smallHeader}>{t('Nos.')}</Text>
              <Text style={styles.smallHeader}>{t('Rule')}</Text>
              <Text style={styles.smallHeader}>{t('Days')}</Text>
            </View>
            {attendanceTypes.map((item, index) => {
              const nos = summary[item.code] || 0;
              const days = item.rule > 0 ? (nos / item.rule).toFixed(1) : 0;
              return (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && styles.tableRowOdd,
                  ]}>
                  <Text style={styles.attendanceNameCell}>{t(item.name)}</Text>
                  <Text style={styles.smallCell}>{item.code}</Text>
                  <Text style={styles.smallCell}>{nos}</Text>
                  <Text style={styles.smallCell}>
                    {nos}/{item.rule}
                  </Text>
                  <Text style={styles.smallCell}>{days}</Text>
                </View>
              );
            })}
          </View>

          <View style={[styles.tableContainer, styles.marginTop]}>
            {salaryDetails.map((item, index) => (
              <View
                key={index}
                style={[styles.tableRow, index % 2 === 1 && styles.tableRowOdd]}>
                <Text style={styles.attendanceNameCell}>{t(item.left)}</Text>
                <Text style={styles.smallCell}>
                  {computedSalaryData[salaryMapping[item.left]] ??
                    salaryData?.[salaryMapping[item.left]] ??
                    '-'}
                </Text>
                <Text style={styles.attendanceNameCell}>{t(item.right)}</Text>
                <Text style={styles.smallCell}>
                  {computedSalaryData[salaryMapping[item.right]] ??
                    salaryData?.[salaryMapping[item.right]] ??
                    '-'}
                </Text>
              </View>
            ))}
          </View>

          {showPicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode="date"
              display="default"
              onValueChange={onPickerValueChange}
              onDismiss={onPickerDismiss}
            />
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SCREEN_BG },
  background: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingTop: 14, paddingBottom: 24 },
  header: {
    width: CARD_WIDTH,
    minHeight: 72,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  headerTitle: { fontSize: 14, lineHeight: 18, color: TEXT_DARK, fontWeight: '900' },
  headerSubtitle: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 3,
    lineHeight: 13,
    flexShrink: 1,
  },
  headerImage: { width: 50, height: 50, borderRadius: 25, marginLeft: 15 },
  infoContainer: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  monthSelector: { flex: 1, marginRight: 6 },
  scoreBox: { flex: 1, marginLeft: 6 },
  infoLabel: { fontSize: 10, color: TEXT_DARK, marginBottom: 3, fontWeight: '800' },
  pickerButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    borderRadius: 8,
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  pickerText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  scoreText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 6,
    height: 30,
    borderRadius: 8,
    borderWidth: 0,
    overflow: 'hidden',
  },
  tableContainer: {
    width: CARD_WIDTH,
    backgroundColor: colors.panel,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: colors.border,
    marginTop: 14,
    shadowColor: ACCENT,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  tableTitle: {
    backgroundColor: colors.panel,
    paddingVertical: 7,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tableTitleText: { color: TEXT_DARK, fontSize: 13, fontWeight: '900' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#55e6ee',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    color: TEXT_DARK,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dateColumn: { flex: 0.86 },
  timeColumn: { flex: 1.35 },
  userColumn: { flex: 0.92 },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    alignItems: 'center',
    backgroundColor: colors.panel,
  },
  tableRowOdd: { backgroundColor: SURFACE_YELLOW_DEEP },
  tableCell: {
    flex: 1,
    fontSize: 10,
    textAlign: 'center',
    color: TEXT_DARK,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSubtle,
  },
  noDataRow: { padding: 20, alignItems: 'center', backgroundColor: colors.panel },
  noDataText: { color: TEXT_DARK, fontStyle: 'italic' },
  marginTop: { marginTop: 20 },
  salaryContainer: { padding: 10, backgroundColor: colors.panel },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  salaryRowOdd: { backgroundColor: colors.panel },
  salaryCell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
    paddingHorizontal: 5,
  },
  salaryText: { color: TEXT_DARK, fontSize: 14, fontWeight: '400' },
  salaryValue: { color: TEXT_DARK, fontSize: 14, fontWeight: '400' },
  attendanceHeader: {
    flexDirection: 'row',
    backgroundColor: '#55e6ee',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  summaryContainer: {
    backgroundColor: colors.panel,
  },
  summaryHeader: {
    backgroundColor: '#55e6ee',
  },
  summaryRow: {
    backgroundColor: SURFACE_YELLOW_DEEP,
  },
  attendanceNameHeader: {
    flex: 2.5,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    color: TEXT_DARK,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSubtle,
  },
  smallHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    color: TEXT_DARK,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSubtle,
  },
  attendanceNameCell: {
    flex: 2.5,
    fontSize: 10,
    textAlign: 'center',
    color: TEXT_DARK,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSubtle,
  },
  smallCell: {
    flex: 1,
    fontSize: 10,
    textAlign: 'center',
    color: TEXT_DARK,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSubtle,
  },
});

export default HistoryScreen;
