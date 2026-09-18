import React, { useState, useCallback } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CustomHeader from '../../components/CustomHeader';
import {
  DrawerActions,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGreeting } from '../../utils/getGreeting';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ProfileAvatar from '../../components/ProfileAvatar';
import {
  faArrowRightFromBracket,
  faCalendarDays,
  faCalendarPlus,
  faChevronRight,
  faBuildingCircleCheck,
  faFingerprint,
  faPersonWalkingArrowRight,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchPhpAttendanceSummary,
  fetchPhpOfficeStatus,
  fetchPhpPaidLeaveCount,
  fetchPhpTodoList,
  fetchPhpUserProfile,
  normalizePhpProfileForApp,
  normalizePhpOfficeStatus,
} from '../../services/phpApi';

import { colors } from '../../theme';

type RootStackParamList = {
  DailyAttendance: undefined;
  CheckIn: { onCheckInSuccess?: () => void } | undefined;
  CheckOut: { onCheckOutSuccess?: () => void } | undefined;
  OfficeOut: undefined;
  OfficeIn: undefined;
  PaidLeave: undefined;
  UrgentLeave: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
  MeetingVisit: any;
};

type DailyAttendanceScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DailyAttendance'
>;

const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const ATTENDANCE_STATE_CACHE_KEY = 'crewcam_attendance_state_today';
const OFFICE_OUT_STATE_CACHE_KEY = 'crewcam_office_out_state_today';
const OFFICE_OUT_STATE_CACHE_VERSION = 2;
const CREATED_TODO_CACHE_KEY = 'crewcam_created_todos';
const TODO_STATUS_CACHE_KEY = 'crewcam_todo_status';
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;

const getTodoCacheKey = (token: string) => `${CREATED_TODO_CACHE_KEY}:${token.trim()}`;
const getTodoCacheKeys = (token: string) => [
  getTodoCacheKey(token),
  CREATED_TODO_CACHE_KEY,
];
const getTodoStatusCacheKey = (token: string) => `${TODO_STATUS_CACHE_KEY}:${token.trim()}`;

const getTodoListItems = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.todos)) return data.todos;
  if (Array.isArray(data?.todoList)) return data.todoList;
  if (Array.isArray(data?.todo_list)) return data.todo_list;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (data?.result && typeof data.result === 'object') return getTodoListItems(data.result);
  if (data?.data && typeof data.data === 'object') return getTodoListItems(data.data);
  if (data && typeof data === 'object') {
    const hasTodoFields =
      data.description ||
      data.todo_description ||
      data.task ||
      data.title ||
      data.deadline ||
      data.todo_deadline;
    if (hasTodoFields) return [data];
  }
  return [];
};

const isPendingTodoStatus = (item: any) => {
  const status = String(item?.status || item?.currentStatus || item?.current_status || 'Pending')
    .trim()
    .toLowerCase();
  return status !== 'completed' && status !== 'complete' && status !== 'done';
};

const getTodoId = (item: any) =>
  String(item?._id || item?.id || item?.todo_id || item?.todoId || item?.tid || item?.td_id || '');

const applyTodoStatusOverrides = (items: any[], statusMap: Record<string, string>) =>
  items.map((item) => {
    const id = getTodoId(item);
    return id && statusMap[id] ? {...item, status: statusMap[id]} : item;
  });

const getCachedTodos = async (token: string) => {
  const cachedLists = await Promise.all(
    getTodoCacheKeys(token).map(async (cacheKey) => {
      const cachedRaw = await AsyncStorage.getItem(cacheKey);
      try {
        const parsed = cachedRaw ? JSON.parse(cachedRaw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }),
  );
  return cachedLists.flat();
};

const getTodayLabel = () => {
  const today = new Date();
  const todayDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(today);
  const todayWeekday = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(today);
  return `${todayDate}, ${todayWeekday}`;
};

const getAttendanceValue = (record: any, keys: string[]) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== '') {
      return String(record[key]);
    }
  }
  return '';
};

const hasValidAttendanceTime = (value: string) => {
  const normalized = String(value || '').trim();
  return Boolean(
    normalized &&
    normalized !== '0000-00-00 00:00:00' &&
    normalized !== '00:00:00' &&
    normalized.toLowerCase() !== 'null' &&
    normalized.toLowerCase() !== 'undefined',
  );
};

const DailyAttendanceScreen = () => {
  const navigation = useNavigation<DailyAttendanceScreenNavigationProp>();
  const { t, formatName } = useLanguage();
  const [userName, setUserName] = useState<string | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [, setIsTodo] = useState<boolean>(true);
  const [, setIsReminder] = useState<boolean>(true);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [hasPendingTodo, setHasPendingTodo] = useState(false);
  const [todoStatusChecking, setTodoStatusChecking] = useState(true);


  const [officeOutApplied, setOfficeOutApplied] = useState(false);
  const [officeOutApproved, setOfficeOutApproved] = useState(false);
  const [officeInDone, setOfficeInDone] = useState(false);
  const [, setUserAtPremises] = useState(false);

  const [plBalance, setPlBalance] = useState<number>(0);

  const plstatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      const result = await fetchPhpPaidLeaveCount({token});

      if (result?.status) {
        setPlBalance(result.pl_balance ?? result.count ?? result.paidLeaveCount ?? 0);
      }
    } catch (err) {
      console.warn('Failed to fetch PL status:', err);
    }
  };


  const isPaidLeaveDisabled = plBalance < 1;


  const fetchUserName = async () => {
    const user = await AsyncStorage.getItem('user_firstname');
    if (user) {
      setUserName(user);
    }
  };

  const fetchProfilePic = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      const data = await fetchPhpUserProfile({token});
      const normalized = normalizePhpProfileForApp(data);

      if (normalized.profilePic) {
        setProfilePic(String(normalized.profilePic).replace(/\s/g, ''));
      }
    } catch (error) {
      console.warn('Failed to fetch profile image:', error);
    }
  };


  const fetchtodo = async () => {
    try {
      setTodoStatusChecking(true);
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        setHasPendingTodo(false);
        return;
      }
      const cachedTodos = await getCachedTodos(token);
      const todoListData = await fetchPhpTodoList({token}).catch(() => null);
      const fetchedTodos = getTodoListItems(todoListData);
      const allRawTodos = [...cachedTodos, ...fetchedTodos];
      if (allRawTodos.length === 0) {
        setIsTodo(false);
        setHasPendingTodo(false);
        return;
      }
      const statusRaw = await AsyncStorage.getItem(getTodoStatusCacheKey(token));
      let statusMap: Record<string, string> = {};
      try {
        statusMap = statusRaw ? JSON.parse(statusRaw) : {};
      } catch {
        statusMap = {};
      }
      const allTodos = applyTodoStatusOverrides(allRawTodos, statusMap);
      const hasPending = allTodos.some(isPendingTodoStatus);
      setIsTodo(hasPending);
      setHasPendingTodo(hasPending);
    } catch (err) {
      console.warn('Failed to fetch ToDo status:', err);
      setHasPendingTodo(false);
    } finally {
      setTodoStatusChecking(false);
    }
  };


  const fetchReminder = async () => {
    try {
      setIsReminder(false);
    } catch (err) {
      console.warn('Failed to fetch Reminder status:', err);
    }
  };


  const fetchStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        return;
      }
      const cachedStateRaw = await AsyncStorage.getItem(ATTENDANCE_STATE_CACHE_KEY);
      const cachedState = cachedStateRaw ? JSON.parse(cachedStateRaw) : null;
      const hasLocalCheckoutToday =
        cachedState?.date === moment().format('YYYY-MM-DD') &&
        cachedState?.checkedIn === false &&
        Boolean(cachedState?.checkedOutAt);
      const hasLocalCheckinToday =
        cachedState?.date === moment().format('YYYY-MM-DD') &&
        cachedState?.checkedIn === true &&
        Boolean(cachedState?.checkedInAt);

      if (hasLocalCheckoutToday) {
        setIsCheckedIn(false);
      } else if (hasLocalCheckinToday) {
        setIsCheckedIn(true);
      }

      const monthYear = moment().format('YYYY-MM');
      const result = await fetchPhpAttendanceSummary({
        token,
        getMonth: monthYear,
      });
      const list = Array.isArray(result?.result)
        ? result.result
        : Array.isArray(result?.data)
          ? result.data
          : [];
      const today = moment().format('YYYY-MM-DD');
      const todayRecords = list.filter((item: any) => {
        const dateKey =
          getAttendanceValue(item, [
            'atd_in_date',
            'atd_date',
            'attendance_date',
            'date',
          ]) ||
          (getAttendanceValue(item, ['atd_intime', 'atd_in_time', 'atdIntime', 'intime'])
            ? moment(
                getAttendanceValue(item, ['atd_intime', 'atd_in_time', 'atdIntime', 'intime']),
                'YYYY-MM-DD HH:mm:ss',
              ).format('YYYY-MM-DD')
            : '');
        return dateKey === today;
      });
      const latest = todayRecords[todayRecords.length - 1];
      const latestInTime = getAttendanceValue(latest, [
        'atd_intime',
        'atd_in_time',
        'atdIntime',
        'intime',
        'in_time',
      ]);
      const latestOutTime = getAttendanceValue(latest, [
        'atd_outtime',
        'atd_out_time',
        'atdOuttime',
        'atdOutTime',
        'outtime',
        'out_time',
      ]);

      const serverCheckedIn =
        result?.isCheckedIn === true ||
        String(result?.isCheckedIn).toLowerCase() === 'true' ||
        Boolean(hasValidAttendanceTime(latestInTime) && !hasValidAttendanceTime(latestOutTime));

      setIsCheckedIn(
        hasLocalCheckoutToday ? false : hasLocalCheckinToday || serverCheckedIn,
      );
    } catch (err) {
      console.warn('Failed to fetch check-in status:', err);
      const cachedStateRaw = await AsyncStorage.getItem(ATTENDANCE_STATE_CACHE_KEY);
      const cachedState = cachedStateRaw ? JSON.parse(cachedStateRaw) : null;
      if (cachedState?.date === moment().format('YYYY-MM-DD')) {
        setIsCheckedIn(cachedState.checkedIn === true);
      }
    }
  };


  const fetchOfficeStatus = async () => {
    const today = moment().format('YYYY-MM-DD');
    let localOfficeOut: any = null;
    let hasLocalOfficeOutToday = false;
    let hasTrustedLocalOfficeOutToday = false;
    try {
      const localOfficeOutRaw = await AsyncStorage.getItem(OFFICE_OUT_STATE_CACHE_KEY);
      localOfficeOut = localOfficeOutRaw ? JSON.parse(localOfficeOutRaw) : null;
      hasLocalOfficeOutToday = localOfficeOut?.date === today;
      hasTrustedLocalOfficeOutToday =
        hasLocalOfficeOutToday &&
        localOfficeOut?.cacheVersion === OFFICE_OUT_STATE_CACHE_VERSION;
      console.log('[OFFICE STATUS][LOCAL CACHE]', JSON.stringify({
        today,
        hasLocalOfficeOutToday,
        hasTrustedLocalOfficeOutToday,
        localOfficeOut,
      }, null, 2));

      if (hasLocalOfficeOutToday && !hasTrustedLocalOfficeOutToday) {
        await AsyncStorage.removeItem(OFFICE_OUT_STATE_CACHE_KEY);
        localOfficeOut = null;
        hasLocalOfficeOutToday = false;
      }

      if (hasTrustedLocalOfficeOutToday) {
        setOfficeOutApplied(localOfficeOut.officeOutApplied === true);
        setOfficeOutApproved(localOfficeOut.officeOutApproved === true);
        setOfficeInDone(localOfficeOut.officeInDone === true);
      }

      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      let result: any = null;
      try {
        result = await fetchPhpOfficeStatus({token});
        console.log('[OFFICE STATUS][PHP]', JSON.stringify(result, null, 2));
      } catch (phpStatusError) {
        console.warn('PHP office status check failed:', phpStatusError);
      }

      const phpOfficeStatus = normalizePhpOfficeStatus(result);
      const localOfficeOutApplied =
        hasTrustedLocalOfficeOutToday && localOfficeOut.officeOutApplied === true;
      const localOfficeInDone =
        hasTrustedLocalOfficeOutToday && localOfficeOut.officeInDone === true;
      const hasPhpOfficeStatus =
        phpOfficeStatus.officeOutApplied ||
        phpOfficeStatus.officeOutApproved ||
        phpOfficeStatus.officeInDone ||
        Boolean(phpOfficeStatus.rawStatus);
      const serverOfficeInDone = phpOfficeStatus.officeInDone;
      const nextOfficeOutApplied = hasPhpOfficeStatus
        ? phpOfficeStatus.officeOutApplied
        : localOfficeOutApplied && !serverOfficeInDone;
      const nextOfficeOutApproved =
        phpOfficeStatus.officeOutApproved && nextOfficeOutApplied && !serverOfficeInDone && !localOfficeInDone;
      const nextOfficeInDone = serverOfficeInDone || localOfficeInDone;

      console.log('[OFFICE STATUS][COMPUTED]', JSON.stringify({
        phpOfficeStatus,
        hasPhpOfficeStatus,
        localOfficeOutApplied,
        localOfficeInDone,
        nextOfficeOutApplied,
        nextOfficeOutApproved,
        nextOfficeInDone,
      }, null, 2));

      setOfficeOutApplied(nextOfficeOutApplied);
      setOfficeOutApproved(nextOfficeOutApproved);
      setOfficeInDone(nextOfficeInDone);
      setUserAtPremises(nextOfficeInDone || !nextOfficeOutApplied);

      if (!nextOfficeOutApplied && !nextOfficeInDone) {
        await AsyncStorage.removeItem(OFFICE_OUT_STATE_CACHE_KEY);
      } else if (hasTrustedLocalOfficeOutToday || nextOfficeOutApplied || nextOfficeInDone) {
        await AsyncStorage.setItem(
          OFFICE_OUT_STATE_CACHE_KEY,
          JSON.stringify({
            cacheVersion: OFFICE_OUT_STATE_CACHE_VERSION,
            date: today,
            officeOutApplied: nextOfficeOutApplied,
            officeOutApproved: nextOfficeOutApproved,
            officeInDone: nextOfficeInDone,
          }),
        );
      }
    } catch (err) {
      console.warn('Failed to fetch office status:', err);
      try {
        if (hasTrustedLocalOfficeOutToday) {
          setOfficeOutApplied(localOfficeOut.officeOutApplied === true);
          setOfficeOutApproved(localOfficeOut.officeOutApproved === true);
          setOfficeInDone(localOfficeOut.officeInDone === true);
        } else {
          setOfficeOutApplied(false);
          setOfficeOutApproved(false);
          setOfficeInDone(false);
          await AsyncStorage.removeItem(OFFICE_OUT_STATE_CACHE_KEY);
        }
      } catch (cacheError) {
        console.warn('Failed to restore office status cache:', cacheError);
      }
    }
  };

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      fetchUserName();
      fetchProfilePic();
      fetchStatus();
      fetchtodo();
      fetchReminder();
      fetchOfficeStatus();
      plstatus();
    }, []),
  );

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notification');

  // Button states
  const isOfficeOutDisabled = officeOutApplied && !officeInDone;
  const hasOpenOfficeOut = officeOutApplied && !officeInDone;
  const canOfficeIn = hasOpenOfficeOut && officeOutApproved;
  const checkOutBlocked =
    isCheckedIn &&
    (hasOpenOfficeOut || hasPendingTodo || todoStatusChecking);
  const mainAction = !isCheckedIn
    ? {
      title: t('CHECK IN'),
      subtitle: t('Mark your check in'),
      icon: faFingerprint,
      colors: ['#132746', '#132746'],
      disabled: false,
      onPress: () =>
        navigation.navigate('CheckIn', {
          onCheckInSuccess: () => setIsCheckedIn(true),
        }),
    }
    : {
      title: t('CHECK OUT'),
      subtitle: hasOpenOfficeOut
        ? t('Office In required')
        : todoStatusChecking
          ? t('Checking pending todo')
        : hasPendingTodo
          ? t('Complete pending todo first')
          : t('Mark your check out'),
      icon: faArrowRightFromBracket,
      colors: ['#132746', '#132746'],
      disabled: checkOutBlocked,
      onPress: () =>
        navigation.navigate('CheckOut', {
          onCheckOutSuccess: () => setIsCheckedIn(false),
        }),
    };

  const officeCards = [
    {
      title: t('OFFICE OUT'),
      subtitle: t('Leaving from office'),
      icon: faPersonWalkingArrowRight,
      colors: ['#132746', '#132746'],
      gradientColors: ['#132746', '#132746'],
      disabled: isOfficeOutDisabled,
      onPress: () => navigation.navigate('OfficeOut' as never),
    },
    ...(canOfficeIn
      ? [{
          title: t('OFFICE IN'),
          subtitle: t('Arrived at office'),
          icon: faBuildingCircleCheck,
          colors: ['#132746', '#132746'],
          gradientColors: ['#132746', '#132746'],
          disabled: false,
          onPress: () => navigation.navigate('OfficeIn' as never),
        }]
      : []),
    {
      title: t('PAID LEAVE'),
      subtitle: t('Apply for paid leave'),
      icon: faCalendarPlus,
      colors: ['#132746', '#132746'],
      gradientColors: ['#132746', '#132746'],
      disabled: isPaidLeaveDisabled,
      rightText: String(plBalance),
      onPress: () => navigation.navigate('PaidLeave'),
    },
    {
      title: t('URGENT LEAVE'),
      subtitle: t('Apply for urgent leave'),
      icon: faTriangleExclamation,
      colors: ['#132746', '#132746'],
      gradientColors: ['#132746', '#132746'],
      disabled: false,
      onPress: () => navigation.navigate('UrgentLeave' as never),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() =>
          navigation.navigate('PreHome', { screen: 'PaymentLeave' })
        }
      />

      <LinearGradient
        colors={[SCREEN_BG, SCREEN_BG]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <LinearGradient
            colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroText}>
              <Text style={styles.heroGreeting}>{getGreeting()},</Text>
              <Text style={styles.heroName}>{formatName(userName)}</Text>
            </View>
            <ProfileAvatar uri={profilePic} style={styles.heroProfileImage} iconSize={22} />
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('Daily Attendance')}</Text>
            <View style={styles.underline} />
          </View>

          <DailyActionCard
            title={mainAction.title}
            subtitle={mainAction.subtitle}
            icon={mainAction.icon}
            colors={mainAction.colors}
            disabled={mainAction.disabled}
            onPress={mainAction.onPress}
            wide
          />

          <View style={styles.grid}>
            {officeCards.map((item) => (
              <DailyActionCard
                key={item.title}
                title={item.title}
                subtitle={item.subtitle}
                icon={item.icon}
                colors={item.gradientColors}
                disabled={item.disabled}
                rightText={item.rightText}
                onPress={item.onPress}
              />
            ))}
          </View>

          <TouchableOpacity activeOpacity={0.88} style={styles.dateCard}>
            <View style={styles.dateIconCircle}>
              <FontAwesomeIcon icon={faCalendarDays} size={24} color={TEXT_DARK} />
            </View>
            <View style={styles.dateText}>
              <Text style={styles.dateLabel}>{t("Today's Date")}</Text>
              <Text style={styles.dateValue}>{getTodayLabel()}</Text>
            </View>
            <FontAwesomeIcon icon={faChevronRight} size={17} color={TEXT_DARK} />
          </TouchableOpacity>

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default DailyAttendanceScreen;

type DailyActionCardProps = {
  title: string;
  subtitle: string;
  icon: IconProp;
  colors: string[];
  disabled?: boolean;
  wide?: boolean;
  rightText?: string;
  onPress: () => void;
};

const DailyActionCard = ({
  title,
  subtitle,
  icon,
  colors,
  disabled = false,
  wide = false,
  rightText,
  onPress,
}: DailyActionCardProps) => (
  <TouchableOpacity
    activeOpacity={0.88}
    disabled={disabled}
    onPress={onPress}
    style={[wide ? styles.wideCardButton : styles.gridCardButton, disabled && styles.disabledCard]}
  >
    <LinearGradient
      colors={
        disabled
          ? ['#132746', '#132746']
          : [SURFACE_YELLOW, SURFACE_YELLOW_DEEP]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.actionCard, wide && styles.wideCard, disabled && styles.disabledActionCard]}
    >
      <LinearGradient
        colors={disabled ? ['#132746', '#132746'] : colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.iconTile, wide && styles.wideIconTile, disabled && styles.disabledIconTile]}
      >
        <FontAwesomeIcon icon={icon} size={wide ? 23 : 20} color={TEXT_DARK} />
      </LinearGradient>

      <View style={[styles.cardText, wide && styles.wideCardText]}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>

      {rightText ? (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{rightText}</Text>
        </View>
      ) : (
        <View style={[styles.arrowCircle, wide && styles.wideArrowCircle, disabled && styles.disabledArrowCircle]}>
          <FontAwesomeIcon icon={faChevronRight} size={wide ? 14 : 13} color={TEXT_DARK} />
        </View>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  background: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 140,
  },
  heroCard: {
    width: CARD_WIDTH,
    minHeight: 62,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    overflow: 'hidden',
  },
  heroText: {
    flex: 1,
    zIndex: 1,
  },
  heroGreeting: {
    color: TEXT_DARK,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  heroName: {
    color: TEXT_DARK,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
    marginTop: 0,
  },
  heroSubtitle: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 4,
  },
  heroProfileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#55e6ee',
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
    width: CARD_WIDTH,
  },
  sectionTitle: {
    color: TEXT_DARK,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  underline: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginTop: 8,
  },
  wideCardButton: {
    width: CARD_WIDTH,
    marginBottom: 4,
  },
  grid: {
    width: CARD_WIDTH,
    gap: 4,
    marginTop: 0,
  },
  gridCardButton: {
    width: CARD_WIDTH,
  },
  disabledCard: {
    opacity: 0.5,
  },
  disabledActionCard: {
    borderColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledIconTile: {
    opacity: 0.45,
  },
  disabledArrowCircle: {
    opacity: 0.35,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    backgroundColor: '#55e6ee',
    borderWidth: 1,
    borderColor: colors.border,
  },
  countBadgeText: {
    color: TEXT_DARK,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  actionCard: {
    width: '100%',
    minHeight: 42,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.72,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    overflow: 'hidden',
  },
  wideCard: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: ACCENT,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  wideIconTile: {
    width: 30,
    height: 30,
    borderRadius: 12,
  },
  cardText: {
    flex: 1,
    marginTop: 0,
    paddingRight: 0,
  },
  wideCardText: {
    marginTop: 0,
  },
  cardTitle: {
    color: TEXT_DARK,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  arrowCircle: {
    position: 'relative',
    right: undefined,
    top: undefined,
    marginTop: 0,
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: ACCENT,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  wideArrowCircle: {
    position: 'relative',
    right: undefined,
    top: undefined,
    marginTop: 0,
    marginLeft: 8,
  },
  dateCard: {
    width: CARD_WIDTH,
    minHeight: 68,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: SURFACE_YELLOW,
    shadowColor: ACCENT,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  dateIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
    marginRight: 14,
  },
  dateText: {
    flex: 1,
  },
  dateLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  dateValue: {
    color: TEXT_DARK,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    marginTop: 4,
  },
  warningBox: {
    backgroundColor: '#132746',
    borderColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    width: CARD_WIDTH,
  },
  warningTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 5,
  },
  warningMsg: { color: '#FFFFFF', fontSize: 14 },
});
