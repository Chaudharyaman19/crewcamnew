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
import DeviceInfo from 'react-native-device-info';
import LinearGradient from 'react-native-linear-gradient';
import { API_BASE_URL } from '@env';
import { useLanguage } from '../../context/LanguageContext';
import { isPhpSuccess, markPhpAttendanceIn } from '../../services/phpApi';

import { colors } from '../../theme';

const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const CHECKED_IN_DETAILS_CACHE_KEY = 'crewcam_checked_in_details_today';
const ATTENDANCE_STATE_CACHE_KEY = 'crewcam_attendance_state_today';
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;

const getResponseValue = (data: any, keys: string[]) => {
  const sources = [data, data?.data, data?.result, data?.attendance].filter(Boolean);
  for (const source of sources) {
    for (const key of keys) {
      if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '') {
        return String(source[key]);
      }
    }
  }
  return '';
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
  DailyAttendance: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
};
type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function CheckinScreen() {
  const { t, formatName } = useLanguage();
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState<string>('Fetching address...');
  const [isInside, setIsInside] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [, setJobLocations] = useState<any[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const watchIdRef = useRef<number | null>(null);

  const now = new Date();
  const hours = now.getHours();
  const greeting =
    hours < 12
      ? t('Good Morning')
      : hours < 17
        ? t('Good Afternoon')
        : t('Good Evening');

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notification');

  const fetchUserName = async () => {
    const user = await AsyncStorage.getItem('user_firstname');
    if (user) {setUserName(user);}
  };

  useEffect(() => {
    requestPermission();
    fetchUserName();
    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        Geolocation.stopObserving();
      }
    };
    // Keep the existing location-watch behavior: start once when this screen mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            t('Location access is required to check in.'),
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

    const latDiff = Math.abs(latitude - targetLat);
    const lonDiff = Math.abs(longitude - targetLon);
    const distance = getDistanceMeters(latitude, longitude, targetLat, targetLon);

    console.log(`📍 DEBUG - Current: ${latitude}, ${longitude}`);
    console.log(`📍 DEBUG - Target: ${targetLat}, ${targetLon}`);
    console.log(`📍 DEBUG - Distance: ${distance} meters`);

    if (distance <= 500 || (latDiff < 0.01 && lonDiff < 0.01)) {
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

        const isNamoGange = checkIfNamoGangeTrust(latitude, longitude);

        if (isNamoGange) {
          console.log('✅✅✅ NAMO GANGE TRUST DETECTED - SETTING INSIDE = TRUE');
          setAddress('Namo Gange Trust, 12/52, Sunrise Industrial Area, Site - 2, Mohan Nagar, Ghaziabad, Uttar Pradesh');
          setIsInside(true);
          setLoading(false);
          return;
        }

        try {
          const token = await AsyncStorage.getItem('auth_token');
          const userId = await AsyncStorage.getItem('user_id');
          const empCode = await AsyncStorage.getItem('user_emp_code');
          if (!token) {
            setAddress(await getFallbackLocationLabel(latitude, longitude));
            setLoading(false);
            return;
          }

          const response = await fetch(
            `${API_BASE_URL}/api/attendance/location-premises?token=${encodeURIComponent(token)}&id=${encodeURIComponent(userId || '')}&empCode=${encodeURIComponent(empCode || '')}`,
          );

          const data: any = await response.json();
          const locations: any[] = data.employee_job_locations || [];
          setJobLocations(locations);

          let inside = false;
          let currentJobAddress = '';
          let currentPostcode = '';
          let geoData: any = null;

          for (const loc of locations) {
            const dist = getDistanceMeters(
              latitude,
              longitude,
              parseFloat(loc.lat),
              parseFloat(loc.longt),
            );

            console.log(`Distance to ${loc.company_name || 'location'}: ${dist} meters, Required: ${loc.distance} meters`);

            if (dist <= parseFloat(loc.distance)) {
              inside = true;
              currentJobAddress = loc.company_address;
              console.log(`✅ Inside ${loc.company_name} by distance`);
              break;
            }
          }

          if (!inside) {
            const geoResp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`,
              { headers: { 'User-Agent': 'ArogyaMantraApp/1.0' } },
            );

            if (geoResp.ok) {
              geoData = await geoResp.json();
              currentPostcode = geoData?.address?.postcode || '';
              console.log(`Current Postcode: ${currentPostcode}`);
            }

            for (const loc of locations) {
              if (
                loc.isMeeting &&
                loc.pinCode &&
                currentPostcode &&
                loc.pinCode === currentPostcode
              ) {
                inside = true;
                currentJobAddress = loc.company_address;
                console.log(`✅ Inside ${loc.company_name} by pincode`);
                break;
              }
            }
          }

          setIsInside(inside);

          if (inside) {
            setAddress(currentJobAddress || 'Company premises address not set');
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
        distanceFilter: 100,
        interval: 10000,
        fastestInterval: 5000,
        showsBackgroundLocationIndicator: true,
      },
    );
  };

  const handleCheckIn = async () => {
    try {
      if (isRequesting) {return;}
      setIsRequesting(true);

      const token = await AsyncStorage.getItem('auth_token');
      const mobile = await AsyncStorage.getItem('user_mobile');
      const userId = await AsyncStorage.getItem('user_id');
      const empCode = await AsyncStorage.getItem('user_emp_code');

      if (!token || !location) {
        Alert.alert(t('Error'), t('Missing token or location'));
        setIsRequesting(false);
        return;
      }

      const deviceId = await DeviceInfo.getUniqueId();

      const atdIntime = moment().format('YYYY-MM-DD HH:mm:ss');
      const result = await markPhpAttendanceIn({
        token,
        mobile,
        userId,
        empCode,
        deviceId,
        address,
        atdIntime,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      });
      console.log('Check In Response:', result);

      if (isPhpSuccess(result)) {
        await AsyncStorage.setItem(
          ATTENDANCE_STATE_CACHE_KEY,
          JSON.stringify({
            date: moment().format('YYYY-MM-DD'),
            checkedIn: true,
            checkedInAt: atdIntime,
          }),
        );
        await AsyncStorage.setItem(
          CHECKED_IN_DETAILS_CACHE_KEY,
          JSON.stringify({
            date: moment().format('YYYY-MM-DD'),
            intime: getResponseValue(result, ['atd_intime', 'atdIntime', 'intime']) || atdIntime,
            address:
              getResponseValue(result, [
                'atdInTiImage',
                'atdInTiimage',
                'atdInTi_Image',
                'atdInImage',
                'atdInLocation',
                'atd_in_image',
                'atd_intime_image',
                'atd_in_address',
                'atd_in_location',
                'atd_address',
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
                'address',
                'location',
              ]) ||
              getUsableAddress(address) ||
              '',
            atd_id: getResponseValue(result, [
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
            ]),
          }),
        );
        route.params?.onCheckInSuccess?.();
        Alert.alert(t('Success'), t('Check-In successful!'));
        navigation.goBack();
      } else {
        Alert.alert(t('Failed'), result.message || t('Check-In failed'));
      }
    } catch (error) {
      console.error('CheckIn error:', error);
      const message =
        error instanceof Error
          ? error.message
          : t('Network request failed. Please check your connection.');
      Alert.alert(
        t('Error'),
        message || t('Network request failed. Please check your connection.'),
      );
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
              <Text style={styles.headerTitle}>{t('Check In')}</Text>
              <Text style={styles.greeting}>
                {greeting} {formatName(userName)}
              </Text>
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
            style={styles.locationCard}
          >
            <Text style={styles.labelText}>{t('Current Time')}</Text>
            <Text style={styles.dateText}>
              {moment(now).format('DD MMM YYYY, h:mm A')}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.labelText}>{t('Current Location')}</Text>
            <Text style={styles.addressText}>
              {loading ? t('Loading location...') : address}
            </Text>

            {isSimulated && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  Emulator Mode: Using Namo Gange Trust Location
                </Text>
              </View>
            )}
          </LinearGradient>

          {!loading && isInside && (
            <TouchableOpacity
              style={[
                styles.button,
                isRequesting && styles.buttonDisabled,
              ]}
              onPress={handleCheckIn}
              disabled={isRequesting}>
              <Text style={styles.buttonText}>
                {isRequesting
                  ? t('PROCESSING...')
                  : t('CHECK IN')}
              </Text>
            </TouchableOpacity>
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
    paddingVertical: 16,
    alignItems: 'center',
    paddingBottom: 140,
  },
  hero: {
    width: CARD_WIDTH,
    minHeight: 88,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    marginBottom: 14,
  },
  heroText: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: { color: TEXT_DARK, fontSize: 15, fontWeight: '800' },
  icon: { width: 48, height: 48, resizeMode: 'contain' },
  greeting: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 5,
  },
  locationCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    marginBottom: 14,
  },
  labelText: {
    color: TEXT_DARK,
    fontSize: 14,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 17,
    marginTop: 2,
  },
  addressText: {
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
  button: {
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
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
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
});
