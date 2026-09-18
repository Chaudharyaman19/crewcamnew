import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import LinearGradient from 'react-native-linear-gradient';
import ProfileAvatar from '../../components/ProfileAvatar';
import {
  fetchPhpUserAccountDetails,
  fetchPhpUserProfile,
  normalizePhpProfileForApp,
  normalizePhpSalaryForApp,
} from '../../services/phpApi';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faAward,
  faBriefcase,
  faBuilding,
  faCalendarCheck,
  faCalendarDays,
  faCreditCard,
  faEnvelope,
  faHouse,
  faIdCard,
  faLandmark,
  faLocationDot,
  faMoneyBill,
  faPassport,
  faPhone,
  faShieldHalved,
  faSitemap,
  faUser,
  faUserTie,
} from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

import { colors } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ACCENT = colors.accent;
const SCREEN_BG = colors.bg;
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const CARD_WIDTH = SCREEN_WIDTH - 64;
const TAB_GAP = 6;
const TAB_WIDTH = (CARD_WIDTH - TAB_GAP * 3) / 4;


const scaleSize = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  return size * Math.min(scale, 1.2);
};

const isTablet = () => {
  return SCREEN_WIDTH >= 768;
};

const mergeAccountDetails = (profileAccount: any, salaryAccount: any) => ({
  ...(profileAccount || {}),
  ...Object.fromEntries(
    Object.entries(salaryAccount || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ),
});

const accountValue = (source: any, keys: string[]) => {
  const normalizedSource = Object.entries(source || {}).reduce<Record<string, any>>((acc, [key, value]) => {
    acc[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = value;
    return acc;
  }, {});

  for (const key of keys) {
    const direct = source?.[key];
    if (direct !== undefined && direct !== null && direct !== '') {
      return direct;
    }
    const normalized = normalizedSource[key.toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (normalized !== undefined && normalized !== null && normalized !== '') {
      return normalized;
    }
  }

  return '';
};

type DetailItem = {
  icon: IconProp;
  label: string;
  value: string;
  compact?: boolean;
};

const tabIcons: Record<'Office' | 'Personal' | 'Account' | 'Score', IconProp> = {
  Office: faBuilding,
  Personal: faUser,
  Account: faShieldHalved,
  Score: faAward,
};

const DetailCard = ({ left, right }: { left: DetailItem; right?: DetailItem }) => (
  <LinearGradient
    colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.detailRow}
  >
    <DetailCell item={left} />
    {right && (
      <>
        <View style={styles.detailDivider} />
        <DetailCell item={right} right />
      </>
    )}
  </LinearGradient>
);

const DetailCell = ({ item, right = false }: { item: DetailItem; right?: boolean }) => (
  <View style={[styles.detailCell, right && styles.detailCellRight]}>
    <View style={styles.detailIconBox}>
      <FontAwesomeIcon icon={item.icon} size={15} color={item.icon === faUser ? ACCENT : TEXT_DARK} />
    </View>
    <View style={styles.detailTextBlock}>
      <Text style={styles.label}>{item.label}</Text>
      <Text
        style={[styles.value, item.compact && styles.compactValue]}
        numberOfLines={4}
      >
        {item.value || 'N/A'}
      </Text>
    </View>
  </View>
);

const ProfilesScreen = ({ navigation }: any) => {
  const { userData } = useContext(AuthContext);
  const { t, formatName } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    'Office' | 'Personal' | 'Account' | 'Score'
  >('Office');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);

  const EMP_TOKEN = userData.token;

  const handleTabPress = (tab: 'Office' | 'Personal' | 'Account' | 'Score') =>
    setActiveTab(tab);
  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('C.Updates');

  const fetchUserProfile = async () => {
    try {
      const token = EMP_TOKEN || (await AsyncStorage.getItem('auth_token'));
      if (!token) {
        return;
      }
      setLoading(true);

      const data = await fetchPhpUserProfile({
        token,
      });
      const normalized = normalizePhpProfileForApp(data);
      const [storedFirstname, storedLastname, storedMobile] = await Promise.all([
        AsyncStorage.getItem('user_firstname'),
        AsyncStorage.getItem('user_lastname'),
        AsyncStorage.getItem('user_mobile'),
      ]);

      normalized.employee = {
        ...(normalized.employee || {}),
        emp_firstName: normalized.employee?.emp_firstName || storedFirstname || '',
        emp_lastName: normalized.employee?.emp_lastName || storedLastname || '',
        emp_mobile: normalized.employee?.emp_mobile || storedMobile || '',
      };

      setProfile(normalized);
      try {
        const accountData = await fetchPhpUserAccountDetails({
          token,
          monthYear: moment().format('YYYY-MM'),
        });
        setSalaryData(mergeAccountDetails(normalized.account, normalizePhpSalaryForApp(accountData)));
      } catch (accountError) {
        console.warn('Error fetching account details:', accountError);
        setSalaryData(normalized.account || null);
      }
      if (normalized.profilePic) {
        setProfilePic(String(normalized.profilePic).replace(/\s/g, ''));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [EMP_TOKEN]);

  const renderTable = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="large"
          color={ACCENT}
          style={{ marginVertical: scaleSize(20) }}
        />
      );
    }

    if (!profile) {
      return null;
    }

    const emp = profile.employee || {};
    const addr = profile.address || {};
    const emerg = profile.emergency || {};
    const acc = salaryData || {};
    const salaryAccountNo = accountValue(acc, [
      'acc_no',
      'account_no',
      'account_number',
      'bank_account_no',
      'bank_account_number',
      'bank_ac_no',
      'bank_ac',
      'ac_no',
      'accountno',
      'salary_account_no',
      'salary_bank_account_no',
      'sal_acc_no',
      'emp_account_no',
      'emp_bank_ac_no',
    ]);
    const salaryIfsc = accountValue(acc, [
      'ifsc_code',
      'ifsc',
      'bank_ifsc',
      'bank_ifsc_code',
      'bankifsc',
      'salary_ifsc',
      'salary_ifsc_code',
      'sal_ifsc',
    ]);
    const personalAccountNo = accountValue(acc, [
      'pacno',
      'pac_no',
      'p_acc_no',
      'personal_account_no',
      'personal_account_number',
      'personal_bank_account_no',
      'personal_bank_account_number',
      'personal_ac_no',
    ]);
    const personalIfsc = accountValue(acc, [
      'pifsc',
      'p_ifsc',
      'personal_ifsc',
      'personal_bank_ifsc',
      'personal_ifsc_code',
    ]);
    const paytmNo = accountValue(acc, ['ppaytmno', 'paytm_no', 'paytm', 'paytm_number']);
    const aadharNo = accountValue(acc, ['aadhar_card', 'aadhaar_card', 'aadhaar', 'aadhar', 'aadhaar_no', 'aadhar_no']);
    const panNo = accountValue(acc, ['pan_card', 'pan', 'pan_no']);
    const esiNo = accountValue(acc, ['ESI_no', 'esi_no', 'esi', 'esic_no']);
    const epfNo = accountValue(acc, ['UAN_no', 'uan_no', 'uan', 'epf_no', 'pf_no']);

    const tc = (str: any) => {
      if (typeof str !== 'string' || !str) {
        return str;
      }
      return str.replace(/\b\w/g, (char) => char.toUpperCase());
    };
    const firstName = accountValue(emp, ['emp_firstName', 'emp_firstname', 'firstName', 'firstname', 'first_name', 'fname']);
    const lastName = accountValue(emp, ['emp_lastName', 'emp_lastname', 'lastName', 'lastname', 'last_name', 'lname']);
    const fullName = accountValue(emp, ['empName', 'emp_name', 'employee_name', 'name', 'full_name']) ||
      `${firstName || ''} ${lastName || ''}`.trim();
    const uniqueId = accountValue(emp, ['emp_uid', 'empUid', 'empCode', 'emp_code', 'employee_code', 'employeeId', 'employee_id', 'userId', 'user_id']);
    const designation = accountValue(emp, ['desg_name', 'designation', 'designation_name', 'desg', 'grade']);
    const department = accountValue(emp, ['dept_name', 'department', 'department_name', 'dept']);
    const officeMobile = accountValue(emp, ['emp_off_mob', 'emp_off_mobile', 'office_mobile', 'official_mobile', 'office_phone']);
    const officeEmail = accountValue(emp, ['emp_off_email', 'office_email', 'official_email', 'email']);
    const reportingPerson = emp.reporting_person || {};
    const reportingName = accountValue(emp, ['reporting_name', 'reporting_person_name', 'reportingBoss', 'reporting_boss']) ||
      `${accountValue(reportingPerson, ['title']) || ''} ${formatName(`${accountValue(reportingPerson, ['firstname', 'firstName', 'name']) || ''} ${accountValue(reportingPerson, ['lastname', 'lastName']) || ''}`.trim())}`.trim();
    const reportingContact = accountValue(emp, ['reporting_contact', 'reporting_mobile', 'reporting_contact_no']) ||
      accountValue(reportingPerson, ['contact_no', 'contactNo', 'mobile', 'phone']);
    const companyAddress = accountValue(emp, ['company_address', 'job_reporting_address', 'office_address', 'reporting_address']);
    const joiningDate = accountValue(emp, ['emp_dojoin', 'joining_date', 'date_of_joining', 'doj']);

    switch (activeTab) {
      case 'Office':
        return (
          <View style={styles.detailContainer}>
            <DetailCard
              left={{ icon: faUser, label: t('Full Name'), value: formatName(fullName) }}
              right={{ icon: faIdCard, label: t('Unique ID'), value: tc(uniqueId) }}
            />
            <DetailCard
              left={{ icon: faBriefcase, label: t('Designation & Grade'), value: tc(designation) }}
              right={{ icon: faSitemap, label: t('Department'), value: tc(department) }}
            />
            <DetailCard
              left={{ icon: faPhone, label: t('Office Cell No.'), value: tc(officeMobile) }}
              right={{ icon: faEnvelope, label: t('Official Email ID'), value: tc(officeEmail), compact: true }}
            />
            <DetailCard
              left={{
                icon: faUserTie,
                label: t('Reporting Boss'),
                value: tc(reportingName),
              }}
              right={{ icon: faPhone, label: t('Contact No.'), value: tc(reportingContact) }}
            />
            <DetailCard
              left={{ icon: faLocationDot, label: t('Job Reporting Address'), value: tc(companyAddress) }}
            />
            <DetailCard
              left={{ icon: faCalendarDays, label: t('Joining Date'), value: tc(joiningDate) }}
              right={{ icon: faCalendarCheck, label: t('Appraisal Month'), value: '-' }}
            />
          </View>
        );
      case 'Personal':
        return (
          <View style={styles.detailContainer}>

            <DetailCard
              left={{ icon: faPhone, label: t('Personal Cell No.'), value: tc(emp.emp_mobile) }}
              right={{ icon: faHouse, label: t('Residence No.'), value: tc(emp.emp_residenceno) }}
            />
            <DetailCard
              left={{ icon: faLocationDot, label: t('Residence Address'), value: `${tc(addr?.permanent_addr) || ''}, ${tc(addr?.permanent_city) || ''}, ${tc(addr?.state) || ''}, ${tc(addr?.country) || ''}` }}
            />

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionHeaderText}>{t('Emergency Details')}</Text>
                <View style={styles.sectionAccentLine} />
              </View>
              <View style={styles.sectionIconBox}>
                <FontAwesomeIcon icon={faShieldHalved} size={24} color={ACCENT} />
              </View>
            </View>
            <DetailCard
              left={{ icon: faUser, label: t('Name'), value: formatName(emerg.emperson_Name) }}
              right={{ icon: faUserTie, label: t('Relation'), value: tc(emerg.emrelation) }}
            />
            <DetailCard
              left={{ icon: faPhone, label: t('Cell No.'), value: tc(emerg.empm_no) }}
              right={{ icon: faPhone, label: t('Alternate No.'), value: tc(emerg.emalt_no) }}
            />
            <DetailCard
              left={{ icon: faEnvelope, label: t('Email'), value: tc(emerg.emEmailid), compact: true }}
            />
            <DetailCard
              left={{ icon: faLocationDot, label: t('Contact Address'), value: `${tc(emerg.empaddress) || ''}, ${tc(emerg.city) || ''}, ${tc(emerg.state) || ''} ${tc(emerg.country) || ''}` }}
            />
          </View>
        );
      case 'Account':
        return (
          <View style={styles.detailContainer}>

            <DetailCard
              left={{ icon: faLandmark, label: t('Salary Bank Account No.'), value: tc(salaryAccountNo), compact: true }}
              right={{ icon: faIdCard, label: t('IFSC Code'), value: tc(salaryIfsc) }}
            />
            <DetailCard
              left={{ icon: faCreditCard, label: t('Personal Bank Account No.'), value: tc(personalAccountNo), compact: true }}
              right={{ icon: faIdCard, label: t('IFSC Code'), value: tc(personalIfsc) }}
            />
            <DetailCard
              left={{ icon: faMoneyBill, label: t('Paytm No.'), value: tc(paytmNo) }}
              right={{ icon: faShieldHalved, label: t('Health Insurance'), value: '-' }}
            />
            <DetailCard
              left={{ icon: faIdCard, label: t('Aadhar Card No.'), value: tc(aadharNo), compact: true }}
              right={{ icon: faPassport, label: t('Passport No.'), value: '-' }}
            />
            <DetailCard
              left={{ icon: faIdCard, label: t('PAN Card No.'), value: tc(panNo) }}
              right={{ icon: faShieldHalved, label: t('ESIC No.'), value: tc(esiNo) || 'N/A' }}
            />
            <DetailCard
              left={{ icon: faIdCard, label: t('EPF No.'), value: tc(epfNo) || 'N/A' }}
            />
          </View>
        );
      case 'Score':
        const staticScores = [
          { left: 'Work Attendence', leftVal: '-/240', right: 'Ambition / Initiative', rightVal: '-/100' },
          { left: 'Productivity / Deadline', leftVal: '-/300', right: 'Quality of Work', rightVal: '-/100' },
          { left: 'Focus Towards Task', leftVal: '-/40', right: 'Stress Managmnt', rightVal: '-/40' },
          { left: 'Reliability / Dependability', leftVal: '-/100', right: 'Achievments', rightVal: '-/100' },
          { left: 'Level Of Work Knowledge', leftVal: '-/40', right: 'Company Oriented', rightVal: '-/150' },
          { left: 'Attitude / Co-operations', leftVal: '-/40', right: 'Communication Skills', rightVal: '-/100' },
          { left: 'Team Work / Piching - In', leftVal: '-/100', right: 'Integrity / Dedication', rightVal: '-/50' },
        ];
        return (
          <View style={styles.detailContainer}>
            <View style={styles.scoreTableContainer}>
              <View style={styles.scoreTableHeader}>
                <Text style={styles.scoreTableHeaderText}>{t('Score Parameters')}</Text>
              </View>
              {staticScores.map((row, idx) => (
                <View key={idx} style={styles.scoreTableRow}>
                  <View style={styles.scoreCell}>
                    <Text style={styles.scoreCellLabel} numberOfLines={2} adjustsFontSizeToFit>{t(row.left)}</Text>
                  </View>
                  <View style={styles.scoreValueCell}>
                    <Text style={styles.scoreCellValue}>{row.leftVal}</Text>
                  </View>
                  <View style={styles.scoreCell}>
                    <Text style={styles.scoreCellLabel} numberOfLines={2} adjustsFontSizeToFit>{t(row.right)}</Text>
                  </View>
                  <View style={styles.scoreValueCell}>
                    <Text style={styles.scoreCellValue}>{row.rightVal}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() =>
          navigation.navigate('C.Updates')
        }
      />

      <LinearGradient
        colors={[SCREEN_BG, SCREEN_BG]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mainContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.greetingsContainer}>
              <ProfileAvatar
                uri={profilePic}
                style={[
                  styles.profileImage,
                  isTablet() && styles.profileImageTablet,
                ]}
                iconSize={46}
              />

            </View>

            <View style={styles.buttonRow}>
              {['Office', 'Personal', 'Account', 'Score'].map((tab, index) => {
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.tabButton, isActive && styles.activeTabButton]}
                    onPress={() => handleTabPress(tab as any)}>
                    <FontAwesomeIcon
                      icon={tabIcons[tab as 'Office' | 'Personal' | 'Account' | 'Score']}
                      size={14}
                      color={isActive ? TEXT_DARK : ACCENT}
                    />
                    <Text style={styles.tabButtonText} numberOfLines={1} adjustsFontSizeToFit>
                      {t(tab)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {renderTable()}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 140,
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    width: CARD_WIDTH,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 15,
  },
  greetingsContainer: {
    width: CARD_WIDTH,
    marginBottom: 2,
    alignItems: 'center',
  },
  profileImage: {
    width: CARD_WIDTH,
    height: SCREEN_HEIGHT * 0.32,
    marginBottom: 2,
    backgroundColor: '#55e6ee',
    borderRadius: 12,
  },
  profileImageTablet: {
    width: Math.min(CARD_WIDTH, SCREEN_WIDTH * 0.6),
    height: SCREEN_HEIGHT * 0.36,
  },
  greetingCard: {
    width: CARD_WIDTH,
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: ACCENT,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  greetingIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
    marginRight: 10,
  },
  greetingText: {
    fontSize: 17,
    color: TEXT_DARK,
    fontWeight: '800',
    textAlign: 'center',
  },
  greetingName: {
    color: ACCENT,
    fontWeight: '900',
  },
  buttonRow: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 0,
    columnGap: TAB_GAP,
  },
  tabButton: {
    backgroundColor: '#55e6ee',
    paddingVertical: 6,
    paddingHorizontal: 4,
    width: isTablet() ? Math.min(TAB_WIDTH, 132) : TAB_WIDTH,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
  },
  activeTabButton: {
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  tabButtonText: {
    color: TEXT_DARK,
    fontWeight: '800',
    fontSize: SCREEN_WIDTH < 360 ? 10 : 11,
    lineHeight: 14,
    flexShrink: 1,
    minWidth: 0,
  },
  detailContainer: {
    width: CARD_WIDTH,
    marginTop: 6,
    marginBottom: 0,
  },
  sectionHeader: {
    width: '100%',
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderText: {
    color: TEXT_DARK,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  sectionAccentLine: {
    width: 32,
    height: 3,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: ACCENT,
  },
  sectionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: ACCENT,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
    marginBottom: 4,
  },
  detailRowFull: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: SURFACE_YELLOW,
    shadowColor: ACCENT,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
    marginBottom: 4,
  },
  detailCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  detailCellRight: {
    paddingLeft: 14,
  },
  detailDivider: {
    width: 1,
    minHeight: 30,
    marginHorizontal: 5,
    backgroundColor: colors.borderSubtle,
  },
  detailIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
    marginRight: 6,
  },
  detailTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: TEXT_DARK,
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 1,
    fontWeight: '700',
  },
  value: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    flexShrink: 1,
  },
  compactValue: {
    fontSize: 10.5,
    lineHeight: 13,
  },
  detailColumnLeft: {
    flex: 1,
    paddingRight: 10,
  },
  detailColumnRight: {
    flex: 1,
    alignItems: 'flex-end',
    paddingLeft: 10,
  },
  labelRight: {
    color: TEXT_DARK,
    fontSize: 15,
    lineHeight: 19,
    marginBottom: 6,
    textAlign: 'right',
    fontWeight: '700',
  },
  valueRight: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'right',
    flexShrink: 1,
  },
  fullWidthEmail: {
    minWidth: SCREEN_WIDTH * 0.25,
    textAlign: 'right',
  },
  scoreTableContainer: {
    width: CARD_WIDTH,
    marginTop: 0,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: colors.panel,
    borderWidth: 1.2,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  scoreTableHeader: {
    backgroundColor: '#55e6ee',
    padding: 7,
    alignItems: 'center',
  },
  scoreTableHeaderText: {
    color: TEXT_DARK,
    fontSize: 15,
    fontWeight: '800',
  },
  scoreTableRow: {
    flexDirection: 'row',
    minHeight: 34,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  scoreCell: {
    flex: 1.35,
    paddingHorizontal: 5,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  scoreValueCell: {
    flex: 0.62,
    paddingHorizontal: 3,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCellLabel: {
    color: '#FFFFFF',
    fontSize: SCREEN_WIDTH < 360 ? 10 : 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  scoreCellValue: {
    color: ACCENT,
    fontSize: SCREEN_WIDTH < 360 ? 10 : 11,
    lineHeight: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default ProfilesScreen;
