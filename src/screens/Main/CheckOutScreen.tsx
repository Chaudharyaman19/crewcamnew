import React, { useEffect, useState, useRef } from 'react';
import {
  Dimensions,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  PermissionsAndroid,
  ScrollView,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import CustomHeader from '../../components/CustomHeader';
import LocationMap from '../../components/LocationMap';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { DrawerActions, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import LinearGradient from 'react-native-linear-gradient';
import { API_BASE_URL } from '@env';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchPhpAttendanceSummary,
  fetchPhpTodoList,
  isPhpSuccess,
  markPhpAttendanceOut,
} from '../../services/phpApi';

import { colors } from '../../theme';

const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const CHECKED_IN_DETAILS_CACHE_KEY = 'crewcam_checked_in_details_today';
const ATTENDANCE_STATE_CACHE_KEY = 'crewcam_attendance_state_today';
const CREATED_TODO_CACHE_KEY = 'crewcam_created_todos';
const TODO_STATUS_CACHE_KEY = 'crewcam_todo_status';
const MAX_ATTENDANCE_DISTANCE = 100;
const OFFICE_LAT = 28.542346;
const OFFICE_LNG = 77.253519;
const OFFICE_ADDRESS = 'Hansraj Sethi Marg, Govindpuri, Delhi, Delhi, India';
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;

const getTodoCacheKey = (token: string) => `${CREATED_TODO_CACHE_KEY}:${token.trim()}`;
const getTodoCacheKeys = (token: string) => [
  getTodoCacheKey(token),
  CREATED_TODO_CACHE_KEY,
];
const getTodoStatusCacheKey = (token: string) => `${TODO_STATUS_CACHE_KEY}:${token.trim()}`;

const getRecordValue = (record: any, keys: string[]) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== '') {
      return String(record[key]);
    }
  }
  return '';
};

const getTodoListItems = (data: any) => {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.result)) {
    return data.result;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  if (Array.isArray(data?.todos)) {
    return data.todos;
  }
  if (Array.isArray(data?.todoList)) {
    return data.todoList;
  }
  if (Array.isArray(data?.todo_list)) {
    return data.todo_list;
  }
  if (Array.isArray(data?.tasks)) {
    return data.tasks;
  }
  if (data?.result && typeof data.result === 'object') {
    return getTodoListItems(data.result);
  }
  if (data?.data && typeof data.data === 'object') {
    return getTodoListItems(data.data);
  }
  if (data && typeof data === 'object') {
    const hasTodoFields =
      data.description ||
      data.todo_description ||
      data.task ||
      data.title ||
      data.deadline ||
      data.todo_deadline;
    if (hasTodoFields) {
      return [data];
    }
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

const checkHasPendingTodo = async (token: string) => {
  const cachedTodos = await getCachedTodos(token);
  const todoListData = await fetchPhpTodoList({token}).catch(() => null);
  const fetchedTodos = getTodoListItems(todoListData);
  const allRawTodos = [...cachedTodos, ...fetchedTodos];
  if (allRawTodos.length === 0) {
    return false;
  }
  const statusRaw = await AsyncStorage.getItem(getTodoStatusCacheKey(token));
  let statusMap: Record<string, string> = {};
  try {
    statusMap = statusRaw ? JSON.parse(statusRaw) : {};
  } catch {
    statusMap = {};
  }
  const allTodos = applyTodoStatusOverrides(allRawTodos, statusMap);
  return allTodos.some(isPendingTodoStatus);
};

const getUsableAddress = (value?: string | null) => {
  if (
    !value ||
    value === 'Fetching address...' ||
    value === 'Address not available' ||
    value === 'Address found but fields empty'
  ) {
    return '';
  }

  return value;
};

const formatAddressFromGeoData = (geoData: any) => {
  const addr = geoData?.address;
  if (!addr) {
    return '';
  }

  return [
    addr.house_number,
    addr.road,
    addr.suburb,
    addr.city || addr.town || addr.village,
    addr.state,
    addr.country,
  ]
    .filter(Boolean)
    .join(', ');
};

const getFallbackLocationLabel = async (latitude: number, longitude: number) => {
  try {
    const geoResp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`,
      { headers: { 'User-Agent': 'ArogyaMantraApp/1.0' } },
    );

    if (geoResp.ok) {
      const geoData = await geoResp.json();
      return (
        formatAddressFromGeoData(geoData) ||
        geoData?.display_name ||
        `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      );
    }
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
  }

  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};

type RootStackParamList = {
  Notification: undefined;
  DailyAttendance: undefined;
  PreHome: { screen?: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function CheckOutScreen() {
  const { t } = useLanguage();
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState<string>('Fetching address...');
  const [isInside, setIsInside] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobLocations, setJobLocations] = useState<any[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const [apiJobTarget, setApiJobTarget] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    distance: number;
  } | null>(null);
  const [attendance, setAttendance] = useState<{
    intime: string | null;
    address: string | null;
    atd_id: string | null;
  }>({
    intime: null,
    address: null,
    atd_id: null,
  });

  const navigation = useNavigation<NavigationProp>();
  const watchIdRef = useRef<number | null>(null);
  const route = useRoute<any>();

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notification');

  useEffect(() => {
    requestPermission();

    const fetchAttendance = async () => {
      const loadCachedAttendance = async () => {
        const cached = await AsyncStorage.getItem(CHECKED_IN_DETAILS_CACHE_KEY);
        if (!cached) {
          return null;
        }

        const parsed = JSON.parse(cached);
        if (parsed?.date !== moment().format('YYYY-MM-DD')) {
          return null;
        }

        return parsed;
      };

      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
          return;
        }

        const monthYear = moment().format('YYYY-MM');
        const data = await fetchPhpAttendanceSummary({
          token,
          getMonth: monthYear,
        });
        const list = Array.isArray(data?.result)
          ? data.result
          : Array.isArray(data?.data)
            ? data.data
            : [];
        const today = moment().format('YYYY-MM-DD');
        const todayRecords = list.filter((item: any) => {
          const dateKey =
            getRecordValue(item, [
              'atd_in_date',
              'atd_date',
              'attendance_date',
              'date',
            ]) ||
            (getRecordValue(item, ['atd_intime', 'atd_in_time', 'atdIntime', 'intime'])
              ? moment(
                  getRecordValue(item, ['atd_intime', 'atd_in_time', 'atdIntime', 'intime']),
                  'YYYY-MM-DD HH:mm:ss',
                ).format('YYYY-MM-DD')
              : '');
          return dateKey === today;
        });
        const activeRecord =
          todayRecords.find((item: any) => {
            const inTime = getRecordValue(item, [
              'atd_intime',
              'atd_in_time',
              'atdIntime',
              'intime',
              'in_time',
            ]);
            const outTime = getRecordValue(item, [
              'atd_outtime',
              'atd_out_time',
              'atdOuttime',
              'atdOutTime',
              'outtime',
              'out_time',
            ]);
            return inTime && !outTime;
          }) ||
          todayRecords[todayRecords.length - 1];
        const cachedRecord = await loadCachedAttendance();

        if (activeRecord || cachedRecord) {
          const checkInAddress =
            getRecordValue(activeRecord, [
              'atd_address',
              'atd_in_image',
              'atd_intime_image',
              'atd_in_address',
              'atdInTi_Image',
              'atdInTiimage',
              'atdInTiImage',
              'atdInImage',
              'atdInLocation',
              'atd_in_location',
              'atd_location',
              'atd_location_in',
              'intime_image',
              'in_image',
              'in_address',
              'in_location',
              'checkin_location',
              'check_in_location',
              'checkInLocation',
              'checkin_address',
              'check_in_address',
              'company_address',
              'image',
              'location',
              'address',
            ]) ||
            cachedRecord?.address ||
            getUsableAddress(address) ||
            '';
          const checkInId =
            getRecordValue(activeRecord, [
              'atdrId',
              'atdrid',
              'atdId',
              'atdID',
              'atdr_id',
              'atd_id',
              'atd_id_pk',
              'attendance_id',
              'attendanceId',
              'record_id',
              'atd_auto_id',
              'atd_slno',
              'atd_sno',
              'slno',
              'sno',
              'id',
            ]) ||
            cachedRecord?.atd_id ||
            '';

          setAttendance({
            intime:
              getRecordValue(activeRecord, [
                'atd_intime',
                'atd_in_time',
                'atdIntime',
                'intime',
                'in_time',
              ]) ||
              cachedRecord?.intime ||
              null,
            address: checkInAddress || null,
            atd_id: checkInId || null,
          });
        } else {
          console.log('Today Attendance fetch failed:', data?.message);
        }
      } catch (error) {
        console.error('Error fetching Today Attendance:', error);
        const cachedRecord = await loadCachedAttendance();
        if (cachedRecord) {
          setAttendance({
            intime: cachedRecord.intime || null,
            address: cachedRecord.address || null,
            atd_id: cachedRecord.atd_id || null,
          });
        }
      }
    };

    fetchAttendance();

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        Geolocation.stopObserving();
      }
    };
    // Keep the existing location-watch behavior: start once when this screen mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const usableAddress = getUsableAddress(address);
    if (!attendance.address && usableAddress) {
      setAttendance(current => ({
        ...current,
        address: current.address || usableAddress,
      }));
    }
  }, [address, attendance.address]);

  const requestPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        if (
          granted['android.permission.ACCESS_FINE_LOCATION'] ===
          PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.ACCESS_COARSE_LOCATION'] ===
          PermissionsAndroid.RESULTS.GRANTED
        ) {
          startWatchingLocation();
        } else {
          setLoading(false);
          Alert.alert(
            t('Permission Denied'),
            t('Location access is required to check out.'),
          );
        }
      } else {
        startWatchingLocation();
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      setLoading(false);
    }
  };

  const getDistanceMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const checkIfNamoGangeTrust = (latitude: number, longitude: number) => {
    const targetLat = 28.675;
    const targetLon = 77.382;

    const distance = getDistanceMeters(latitude, longitude, targetLat, targetLon);

    console.log(`📍 DEBUG - Current: ${latitude}, ${longitude}`);
    console.log(`📍 DEBUG - Target: ${targetLat}, ${targetLon}`);
    console.log(`📍 DEBUG - Distance: ${distance} meters`);

    if (distance <= MAX_ATTENDANCE_DISTANCE) {
      console.log('✅✅✅ NAMO GANGE TRUST DETECTED - INSIDE = TRUE');
      return true;
    }

    return false;
  };

  const startWatchingLocation = () => {
    setLoading(true);
    watchIdRef.current = Geolocation.watchPosition(
      async pos => {
        if (!pos?.coords) {
          setAddress('Address not available');
          setLoading(false);
          return;
        }

        let { latitude, longitude } = pos.coords;

        if (
          latitude > 37 &&
          latitude < 38 &&
          longitude < -122 &&
          longitude > -123
        ) {
          console.log('📍 Emulator detected. Setting to Namo Gange Trust location');
          latitude = 28.675;
          longitude = 77.382;
          setIsSimulated(true);
        }

        setLocation({ latitude, longitude });

        // Fetch job locations from API — failure must NOT skip the
        // offline/office fallback checks below.
        let locations: any[] = [];
        try {
          const token = await AsyncStorage.getItem('auth_token');
          const userId = await AsyncStorage.getItem('user_id');
          const empCode = await AsyncStorage.getItem('user_emp_code');
          if (token) {
            const response = await fetch(
              `${API_BASE_URL}/api/attendance/location-premises?token=${encodeURIComponent(token)}&id=${encodeURIComponent(userId || '')}&empCode=${encodeURIComponent(empCode || '')}`,
            );
            const data: any = await response.json();
            locations =
              data.employee_job_locations ||
              data.job_locations ||
              data.locations ||
              (Array.isArray(data.data) ? data.data : []) ||
              [];
            setJobLocations(locations);
          }
        } catch (apiErr) {
          console.warn('Job locations API error (continuing with fallbacks):', apiErr);
        }

        try {
          let inside = false;
          let currentJobAddress = '';
          let currentPostcode = '';
          let geoData: any = null;
          let nearest = Infinity;
          let nearestApiTarget: {
            latitude: number;
            longitude: number;
            address: string;
            distance: number;
          } | null = null;
          let nearestApiDistance = Infinity;

          // 1. Check employee's assigned job locations from API
          for (const loc of locations) {
            const locLat = loc?.lat !== undefined && loc?.lat !== null ? parseFloat(loc.lat) : parseFloat(loc.latitude);
            const locLng = loc?.longt !== undefined && loc?.longt !== null ? parseFloat(loc.longt) : (loc?.longitude !== undefined ? parseFloat(loc.longitude) : parseFloat(loc.lng));
            if (isNaN(locLat) || isNaN(locLng)) {
              continue;
            }

            const dist = getDistanceMeters(
              latitude,
              longitude,
              locLat,
              locLng,
            );

            if (dist < nearest) {
              nearest = dist;
            }

            if (dist < nearestApiDistance) {
              nearestApiDistance = dist;
              nearestApiTarget = {
                latitude: locLat,
                longitude: locLng,
                address: loc.company_address || loc.address || loc.location || '',
                distance: Math.round(dist),
              };
            }

            const allowedRadius = Math.min(
              parseFloat(loc.distance) || MAX_ATTENDANCE_DISTANCE,
              MAX_ATTENDANCE_DISTANCE,
            );

            console.log(`Distance to employee job location (${loc.company_name || 'Job Location'}): ${dist} meters, Allowed Max: ${allowedRadius} meters`);

            if (dist <= allowedRadius) {
              inside = true;
              currentJobAddress = loc.company_address || loc.address || loc.location;
              console.log(`✅ Inside employee job location ${loc.company_name || ''} (${dist}m <= ${allowedRadius}m)`);
              break;
            }
          }

          setApiJobTarget(nearestApiTarget);

          // 2. Namo Gange Trust fallback check (strictly 100m)
          if (!inside) {
            const distanceToNamo = getDistanceMeters(latitude, longitude, 28.675, 77.382);
            if (distanceToNamo < nearest) {
              nearest = distanceToNamo;
            }
            if (distanceToNamo <= MAX_ATTENDANCE_DISTANCE) {
              inside = true;
              currentJobAddress = 'Namo Gange Trust, 12/52, Sunrise Industrial Area, Site - 2, Mohan Nagar, Ghaziabad, Uttar Pradesh';
              console.log(`✅ Inside Namo Gange Trust by distance (${distanceToNamo}m <= 100m)`);
            }
          }

          // 2b. Govindpuri office fallback (temporary allowed location)
          if (!inside) {
            const distanceToOffice = getDistanceMeters(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
            if (distanceToOffice < nearest) {
              nearest = distanceToOffice;
            }
            if (distanceToOffice <= MAX_ATTENDANCE_DISTANCE) {
              inside = true;
              currentJobAddress = OFFICE_ADDRESS;
              console.log(`✅ Inside Govindpuri office by distance (${distanceToOffice}m <= 100m)`);
            }
          }

          // 3. Meeting pincode check (strictly 100m)
          if (!inside) {
            try {
              const geoResp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`,
                { headers: { 'User-Agent': 'ArogyaMantraApp/1.0' } },
              );

              if (geoResp.ok) {
                geoData = await geoResp.json();
                currentPostcode = geoData?.address?.postcode || '';
                console.log(`Current Postcode: ${currentPostcode}`);
              }
            } catch (geoErr) {
              console.warn('Reverse geocode failed (continuing):', geoErr);
            }

            for (const loc of locations) {
              if (
                loc.isMeeting &&
                loc.pinCode &&
                currentPostcode &&
                loc.pinCode === currentPostcode
              ) {
                const locLat = loc?.lat !== undefined && loc?.lat !== null ? parseFloat(loc.lat) : parseFloat(loc.latitude);
                const locLng = loc?.longt !== undefined && loc?.longt !== null ? parseFloat(loc.longt) : (loc?.longitude !== undefined ? parseFloat(loc.longitude) : parseFloat(loc.lng));
                if (!isNaN(locLat) && !isNaN(locLng)) {
                  const dist = getDistanceMeters(latitude, longitude, locLat, locLng);
                  if (dist < nearest) {
                    nearest = dist;
                  }
                  if (dist <= MAX_ATTENDANCE_DISTANCE) {
                    inside = true;
                    currentJobAddress = loc.company_address || loc.address || loc.location;
                    console.log(`✅ Inside ${loc.company_name} by pincode & distance (${dist}m)`);
                    break;
                  }
                }
              }
            }
          }

          setIsInside(inside);
          setNearestDistance(isFinite(nearest) ? Math.round(nearest) : null);

          if (inside) {
            if (currentJobAddress && currentJobAddress.toLowerCase().includes('namo')) {
              setAddress('Namo Gange Trust, 12/52, Sunrise Industrial Area, Site - 2, Mohan Nagar, Ghaziabad, Uttar Pradesh');
            } else {
              setAddress(currentJobAddress || 'Company premises address not set');
            }
          } else {
            if (geoData && geoData.address) {
              setAddress(formatAddressFromGeoData(geoData) || geoData.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            } else {
              setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          }
        } catch (err) {
          console.warn('API or geocoding error:', err);
          setAddress(await getFallbackLocationLabel(latitude, longitude));
        }
        setLoading(false);
      },
      err => {
        console.warn('Location error:', err);
        setAddress('Address not available');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000,
        showsBackgroundLocationIndicator: true,
      },
    );
  };

  const [isRequesting, setIsRequesting] = useState(false);

  const handleCheckOut = async () => {
    try {
      if (isRequesting) {return;}
      setIsRequesting(true);

      const token = await AsyncStorage.getItem('auth_token');
      if (!token || !location) {
        Alert.alert(t('Error'), t('Missing token or location'));
        setIsRequesting(false);
        return;
      }

      // Strict 100-meter final validation against employee job location coordinates
      let doubleCheckInside = false;
      for (const loc of jobLocations) {
        const locLat = loc?.lat !== undefined && loc?.lat !== null ? parseFloat(loc.lat) : parseFloat(loc.latitude);
        const locLng = loc?.longt !== undefined && loc?.longt !== null ? parseFloat(loc.longt) : (loc?.longitude !== undefined ? parseFloat(loc.longitude) : parseFloat(loc.lng));
        if (!isNaN(locLat) && !isNaN(locLng)) {
          const dist = getDistanceMeters(location.latitude, location.longitude, locLat, locLng);
          const allowedRadius = Math.min(parseFloat(loc.distance) || MAX_ATTENDANCE_DISTANCE, MAX_ATTENDANCE_DISTANCE);
          if (dist <= allowedRadius) {
            doubleCheckInside = true;
            break;
          }
        }
      }

      if (!doubleCheckInside) {
        const distanceToNamo = getDistanceMeters(location.latitude, location.longitude, 28.675, 77.382);
        if (distanceToNamo <= MAX_ATTENDANCE_DISTANCE) {
          doubleCheckInside = true;
        }
      }

      if (!doubleCheckInside) {
        const distanceToOffice = getDistanceMeters(location.latitude, location.longitude, OFFICE_LAT, OFFICE_LNG);
        if (distanceToOffice <= MAX_ATTENDANCE_DISTANCE) {
          doubleCheckInside = true;
        }
      }

      if (!isInside || !doubleCheckInside) {
        Alert.alert(
          t('Location Out of Range'),
          t('You are outside the allowed 100-meter range of your assigned job location.'),
        );
        setIsRequesting(false);
        return;
      }

      const hasPendingTodo = await checkHasPendingTodo(token);
      if (hasPendingTodo) {
        Alert.alert(t('Pending Task'), t('Complete pending todo first'));
        setIsRequesting(false);
        return;
      }

      const result = await markPhpAttendanceOut({
        token,
        atdrId: attendance.atd_id || token,
        address: getUsableAddress(address) || attendance.address || '',
        latitude: location.latitude?.toString() ?? '',
        longitude: location.longitude?.toString() ?? '',
      });
      console.log('Check Out Response:', result);

      if (
        isPhpSuccess(result) ||
        String(result?.result || result?.status || '').toUpperCase() ===
          'ALREADY_CHECKED_OUT'
      ) {
        setAttendance({
          intime: null,
          address: null,
          atd_id: null,
        });
        await AsyncStorage.removeItem(CHECKED_IN_DETAILS_CACHE_KEY);
        await AsyncStorage.setItem(
          ATTENDANCE_STATE_CACHE_KEY,
          JSON.stringify({
            date: moment().format('YYYY-MM-DD'),
            checkedIn: false,
            checkedOutAt: moment().format('YYYY-MM-DD HH:mm:ss'),
          }),
        );
        route.params?.onCheckOutSuccess?.();
        navigation.goBack();
        setTimeout(() => {
          Alert.alert(t('Success'), t('You have checked out successfully!'));
        }, 300);
      } else {
        Alert.alert(
          t('Failed'),
          result?.message || result?.msg || result?.error || t('Check-Out failed'),
        );
      }
    } catch (error) {
      console.warn('CheckOut error:', error);
      const message =
        error instanceof Error
          ? error.message
          : t('Something went wrong while checking out.');
      Alert.alert(t('Error'), message);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <LinearGradient
            colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroText}>
              <Text style={styles.title}>{t('Check Out')}</Text>
              <Text style={styles.subtitle}>{t('Confirm your time and location')}</Text>
            </View>
            <Image
              source={require('../../assets/attendance_new.png')}
              style={styles.icon}
            />
          </LinearGradient>

          <LinearGradient
            colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.labelText}>{t('Check In Time')}</Text>
            <Text style={styles.infoText}>{attendance.intime || t('Not available')}</Text>

            <View style={styles.divider} />

            <Text style={styles.labelText}>{t('Check In Location')}</Text>
            <Text style={styles.infoText}>{attendance.address || t('Not available')}</Text>
          </LinearGradient>

          <LinearGradient
            colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.labelText}>{t('Current Time')}</Text>
            <Text style={styles.infoText}>
              {moment().format('DD MMM YYYY, h:mm a')}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.labelText}>{t('Current Location')}</Text>
            <Text style={styles.infoText}>
              {address || t('Fetching location...')}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.labelText}>{t('Latitude & Longitude')}</Text>
            <Text style={styles.infoText}>
              {location
                ? `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`
                : t('Fetching location...')}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.labelText}>{t('Job Location Latitude & Longitude')}</Text>
            <Text style={styles.infoText}>
              {apiJobTarget
                ? `Lat: ${apiJobTarget.latitude.toFixed(6)}, Lng: ${apiJobTarget.longitude.toFixed(6)}`
                : t('Job location not available from API')}
            </Text>

            <Text style={styles.labelText}>{t('Distance from Job Location')}</Text>
            <Text style={styles.infoText}>
              {apiJobTarget ? `${apiJobTarget.distance} m` : '-'}
            </Text>

            {isSimulated && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  Emulator Mode: Using Namo Gange Trust Location
                </Text>
              </View>
            )}
          </LinearGradient>

          {!loading && (
            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                (isRequesting || !isInside) && styles.buttonDisabled,
              ]}
              onPress={handleCheckOut}
              disabled={isRequesting || !isInside}>
              <Text style={styles.checkoutText}>
                {isRequesting
                  ? t('PROCESSING...')
                  : t('CHECK OUT')}
              </Text>
            </TouchableOpacity>
          )}

          {!loading && !isInside && (
            <View style={styles.outsideBox}>
              <Text style={styles.warningText}>
                {nearestDistance !== null
                  ? `You are ${nearestDistance}m away from the allowed location (max ${MAX_ATTENDANCE_DISTANCE}m). Move closer to enable Check Out.`
                  : `You are outside the allowed location area (max ${MAX_ATTENDANCE_DISTANCE}m). Move closer to enable Check Out.`}
              </Text>
            </View>
          )}

          {location && (
            <View style={styles.mapCard}>
              <LocationMap
                latitude={location.latitude}
                longitude={location.longitude}
              />
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  background: {
    flex: 1,
  },
  content: {
    paddingVertical: 12,
    alignItems: 'center',
    paddingBottom: 140,
  },
  hero: {
    width: CARD_WIDTH,
    minHeight: 76,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    marginBottom: 10,
  },
  heroText: {
    flex: 1,
    paddingRight: 12,
  },
  icon: { width: 42, height: 42, resizeMode: 'contain' },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 18,
    marginTop: 3,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.62,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    marginBottom: 10,
  },
  labelText: {
    color: TEXT_DARK,
    fontSize: 14,
    fontWeight: '800',
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 17,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#55e6ee',
    marginVertical: 7,
  },
  checkoutBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 9,
    paddingHorizontal: 20,
    marginTop: 4,
    borderRadius: 25,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 118,
    shadowColor: ACCENT,
    shadowOpacity: 0.65,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  checkoutText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  mapCard: {
    width: CARD_WIDTH,
    height: 280,
    marginTop: 14,
  },
  warningContainer: {
    backgroundColor: '#55e6ee',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 6,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  outsideBox: {
    backgroundColor: '#c0392b',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 8,
    width: CARD_WIDTH,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
