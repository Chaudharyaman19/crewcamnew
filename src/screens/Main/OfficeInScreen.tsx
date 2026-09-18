import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Dimensions,
} from 'react-native';
import { useRef } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { API_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formattedDateTime } from "../../utils/dateTime";
import CustomHeader from '../../components/CustomHeader';
import { DrawerActions } from '@react-navigation/native';
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import LinearGradient from 'react-native-linear-gradient';
import LocationMap from '../../components/LocationMap';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchPhpOfficeStatus,
  isPhpSuccess,
  normalizePhpOfficeStatus,
  requestPhpOfficeIn,
} from '../../services/phpApi';

const ACCENT = '#55e6ee';
const SCREEN_BG = '#001a2f';
const OFFICE_OUT_STATE_CACHE_KEY = 'crewcam_office_out_state_today';
const OFFICE_OUT_STATE_CACHE_VERSION = 2;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;

const canSubmitOfficeIn = async (token: string) => {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  });

  try {
    const localOfficeOutRaw = await AsyncStorage.getItem(OFFICE_OUT_STATE_CACHE_KEY);
    const localOfficeOut = localOfficeOutRaw ? JSON.parse(localOfficeOutRaw) : null;
    if (
      localOfficeOut?.cacheVersion === OFFICE_OUT_STATE_CACHE_VERSION &&
      localOfficeOut?.date === today &&
      localOfficeOut?.officeOutApplied === true &&
      localOfficeOut?.officeOutApproved === true &&
      localOfficeOut?.officeInDone !== true
    ) {
      return true;
    }
  } catch (localError) {
    console.warn('Office In local approval check failed:', localError);
  }

  const phpStatus = await fetchPhpOfficeStatus({token});
  console.log('[OFFICE IN][PHP STATUS CHECK]', JSON.stringify(phpStatus, null, 2));
  const {officeOutApplied, officeOutApproved, officeInDone} = normalizePhpOfficeStatus(phpStatus);
  return officeOutApplied && officeOutApproved && !officeInDone;
};

export default function OfficeInScreen({ navigation }: any) {
  const { userData } = useContext(AuthContext);
  const { t, formatName } = useLanguage();
  const [userName, setUserName] = useState<string | null>(userData.firstname);

  useEffect(() => {
    if (userData.firstname) {
      setUserName(userData.firstname);
    }
  }, [userData.firstname]);

  const [loading, setLoading] = useState(false);
  const [, setAddressLoading] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string>('Fetching address...');
  const [, setIsInside] = useState(false);
  const [, setJobLocations] = useState<any[]>([]);
  const [, setIsSimulated] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    requestPermission();
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const watchId = watchIdRef.current;
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
        Geolocation.stopObserving();
      }
    };
    // Keep the existing one-time location lookup behavior.
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
          setAddressLoading(false);
          Alert.alert(
            t('Permission Denied'),
            t('Location access is required.'),
          );
        }
      } else {
        startWatchingLocation();
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      setAddressLoading(false);
    }
  };

  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const checkIfNamoGangeTrust = (latitude: number, longitude: number) => {
    const targetLat = 28.675;
    const targetLon = 77.382;
    const latDiff = Math.abs(latitude - targetLat);
    const lonDiff = Math.abs(longitude - targetLon);
    const distance = getDistanceMeters(latitude, longitude, targetLat, targetLon);
    if (distance <= 500 || (latDiff < 0.01 && lonDiff < 0.01)) {
      return true;
    }
    return false;
  };

  const startWatchingLocation = () => {
    setAddressLoading(true);
    Geolocation.getCurrentPosition(
      async pos => {
        if (!pos?.coords) {
          setAddress('Address not available');
          setAddressLoading(false);
          return;
        }

        let { latitude, longitude } = pos.coords;

        if (latitude > 37 && latitude < 38 && longitude < -122 && longitude > -123) {
          latitude = 28.675;
          longitude = 77.382;
          setIsSimulated(true);
        }

        setLocation({ latitude, longitude });
        const isNamoGange = checkIfNamoGangeTrust(latitude, longitude);

        if (isNamoGange) {
          setAddress('Namo Gange Trust, 12/52, Sunrise Industrial Area, Site - 2, Mohan Nagar, Ghaziabad, Uttar Pradesh');
          setIsInside(true);
          setAddressLoading(false);
          return;
        }

        try {
          const token = await AsyncStorage.getItem('auth_token');
          const userId = await AsyncStorage.getItem('user_id');
          const empCode = await AsyncStorage.getItem('user_emp_code');
          if (!token) {
            setAddressLoading(false);
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

            if (dist <= parseFloat(loc.distance)) {
              inside = true;
              currentJobAddress = loc.company_address;
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
            }

            for (const loc of locations) {
              if (loc.isMeeting && loc.pinCode && currentPostcode && loc.pinCode === currentPostcode) {
                inside = true;
                currentJobAddress = loc.company_address;
                break;
              }
            }
          }

          setIsInside(inside);

          if (inside) {
            setAddress(currentJobAddress || 'Company premises address not set');
          } else {
            if (geoData && geoData.address) {
              const addr = geoData.address;
              const parts = [
                addr.house_number,
                addr.road,
                addr.suburb,
                addr.city || addr.town || addr.village,
                addr.state,
                addr.country,
              ].filter(Boolean);
              setAddress(parts.length > 0 ? parts.join(', ') : 'Address found but fields empty');
            } else {
              setAddress('Address not available');
            }
          }
        } catch (err) {
          console.warn('API or geocoding error:', err);
          setAddress('Address not available');
        }
        setAddressLoading(false);
      },
      err => {
        console.warn('Location error:', err);
        setAddress('Address not available');
        setAddressLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  };



  const handleOfficeIn = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert(t('Error'), t('Token missing. Please login again.'));
        return;
      }

      const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });
      const approved = await canSubmitOfficeIn(token);
      if (!approved) {
        Alert.alert(
          t('HOD Approval Required'),
          t('Office Out is pending HOD approval.'),
        );
        return;
      }

      const data = await requestPhpOfficeIn({
        token,
      });
      console.log('[OFFICE IN][SUBMIT RESPONSE]', JSON.stringify(data, null, 2));

      if (isPhpSuccess(data) || data.result === 'SUCCESS') {
        await AsyncStorage.setItem(
          OFFICE_OUT_STATE_CACHE_KEY,
          JSON.stringify({
            cacheVersion: OFFICE_OUT_STATE_CACHE_VERSION,
            date: today,
            officeOutApplied: false,
            officeOutApproved: false,
            officeInDone: true,
          }),
        );
        Alert.alert(t('Success'), t('Office In successfully recorded'));
        navigation.navigate('DailyAttendanceMain');
      } else {
        Alert.alert(t('Error'), data.message || t('Failed to record Office In'));
      }
    } catch (error) {
      console.error('Office In error:', error);
      const message = error instanceof Error ? error.message : t('Something went wrong');
      Alert.alert(t('Error'), message);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleNotifPress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => {
          navigation.navigate('PreHome', { screen: 'PaymentLeave' });
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={['#132746', '#1f456f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.background}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
          <LinearGradient
            colors={['rgba(19, 39, 70, 0.98)', 'rgba(9, 27, 51, 0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.hi}>{t('Hi')}, {formatName(userName)}</Text>
            <Text style={styles.sub}>{t('Please record your Office In status once you return to the premises.')}</Text>
          </LinearGradient>
          <LinearGradient
            colors={['rgba(19, 39, 70, 0.98)', 'rgba(9, 27, 51, 0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.sectionTitle}>{t('OFFICE IN REQUEST')}</Text>

            <View style={styles.locationRow}>
              <Text style={styles.dateText}>{formattedDateTime()}</Text>
              <Text style={styles.addressText}>{t('You are at')}: {address}</Text>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleOfficeIn} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#071523" />
              ) : (
                <Text style={styles.submitText}>{t('OFFICE IN')}</Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
          {location && (
            <View style={styles.mapWrap}>
              <LocationMap
                latitude={location.latitude}
                longitude={location.longitude}
              />
            </View>
          )}
        </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG },
  background: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 140,
  },
  hero: {
    width: CARD_WIDTH,
    minHeight: 88,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.4,
    borderColor: 'rgba(127,246,255,0.92)',
    shadowColor: ACCENT,
    shadowOpacity: 0.62,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    marginBottom: 14,
    justifyContent: 'center',
  },
  hi: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginBottom: 5 },
  sub: { color: 'rgba(230,237,246,0.84)', fontSize: 15, lineHeight: 20 },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.4,
    borderColor: 'rgba(127,246,255,0.92)',
    shadowColor: ACCENT,
    shadowOpacity: 0.62,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  sectionTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  locationRow: { marginTop: 12 },
  dateText: { color: ACCENT, fontWeight: '800', fontSize: 15 },
  addressText: { color: 'rgba(230,237,246,0.84)', marginTop: 8, fontSize: 15, lineHeight: 21 },
  submitBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    minWidth: 150,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.65,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  submitText: { color: '#071523', fontWeight: '800', fontSize: 15 },
  mapWrap: {
    width: CARD_WIDTH,
    height: 280,
    marginTop: 14,
  },
  map: { flex: 1 },
});
