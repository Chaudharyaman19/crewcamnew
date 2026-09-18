import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Carousel from 'react-native-reanimated-carousel';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faBars,
  faBell,
  faChevronRight,
  faEnvelope,
  faEye,
  faLocationDot,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import ProfileAvatar from '../../components/ProfileAvatar';
import { fetchPhpUserProfile, normalizePhpAuth, normalizePhpProfileForApp } from '../../services/phpApi';
import { isHodRole, isSuperAdminRole, normalizeRole } from '../../utils/roles';

import { colors } from '../../theme';
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;
const BANNER_WIDTH = CARD_WIDTH;
const BANNER_HEIGHT = 270;
const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const HEADER_ICON_COLOR = colors.white;

const logo = require('../../assets/dashboardmainscreen/newcrekamlogo.png');

const banners = [
  {
    image: require('../../assets/Banner1.jpg'),
    title: 'Organic Agri Expo 2025',
    subtitle: 'Delhi • 10th - 12th Dec',
  },
  {
    image: require('../../assets/banner2.jpg'),
    title: 'Health & Wellness Expo',
    subtitle: 'Mumbai • 15th - 17th Jan',
  },
  {
    image: require('../../assets/Banner3.jpg'),
    title: 'International Yoga Summit',
    subtitle: 'Rishikesh • 20th Feb',
  },
];

type ServiceItem = {
  title: string;
  subtitle: string;
  icon: any;
  accent: string;
  accentDark: string;
  route: string;
  visible?: boolean;
};

export default function DashboardScreen({ navigation }: any) {
  const { userData } = useContext(AuthContext);
  const { t } = useLanguage();
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [empRole, setEmpRole] = useState<string>(() => normalizeRole(userData.role));
  const [isConnected, setIsConnected] = useState(true);
  const [activeBanner, setActiveBanner] = useState(0);
  const [profilePic, setProfilePic] = useState<string | null>(null);

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notifications');

  const getBatteryLevel = async () => {
    try {
      const level = await DeviceInfo.getBatteryLevel();
      setBatteryLevel(Math.round(level * 100));
    } catch (err) {
      console.log('Battery error:', err);
    }
  };

  const sendLiveLocation = async () => {
    try {
      Geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const address = `Lat:${latitude}, Lng:${longitude}`;
          const token = userData.token;

          const params = {
            token,
            getLatitude: latitude,
            getLongitude: longitude,
            battryDetail: batteryLevel,
            signal: 'Good',
            address,
          };

          await axios.get('https://arogyamantra.com/app-api/insertLiveLocation.php', {
            params,
          });
        },
        (err) => console.log('Location error:', err),
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    } catch (e) {
      console.log('Live Location Error:', e);
    }
  };

  const fetchRole = useCallback(async () => {
    try {
      const storedRole = userData.role || await AsyncStorage.getItem('user_role');
      if (storedRole) {
        setEmpRole(normalizeRole(storedRole));
      }

      const token = userData.token || await AsyncStorage.getItem('auth_token');
      if (token) {
        const data = await fetchPhpUserProfile({ token });
        const phpUser = normalizePhpAuth(data, { role: storedRole });
        if (phpUser.role) {
          setEmpRole(normalizeRole(phpUser.role));
          return;
        }
      }

      if (storedRole) { setEmpRole(normalizeRole(storedRole)); }
    } catch (err) {
      console.log('Role fetch error:', err);

      const storedRole = userData.role || await AsyncStorage.getItem('user_role');
      if (storedRole) { setEmpRole(normalizeRole(storedRole)); }
    }
  }, [userData.role, userData.token]);

  const fetchProfilePic = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) { return; }

      const data = await fetchPhpUserProfile({ token });
      const normalized = normalizePhpProfileForApp(data);

      if (normalized.profilePic) {
        setProfilePic(String(normalized.profilePic).replace(/\s/g, ''));
      }
    } catch (error) {
      console.log('Profile fetch error:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable =
        state.isInternetReachable === null ? true : state.isInternetReachable;
      setIsConnected(Boolean(state.isConnected && reachable));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getBatteryLevel();
    sendLiveLocation();
    fetchProfilePic();

    const interval = setInterval(() => {
      getBatteryLevel();
      sendLiveLocation();
    }, 45000);

    return () => clearInterval(interval);
    // Keep the existing dashboard polling behavior: start once when this screen mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  useEffect(() => {
    if (userData.role) {
      setEmpRole(normalizeRole(userData.role));
    }
  }, [userData.role]);

  const handleRetry = useCallback(() => {
    NetInfo.fetch().then((state) => {
      const reachable =
        state.isInternetReachable === null ? true : state.isInternetReachable;
      setIsConnected(Boolean(state.isConnected && reachable));
    });
  }, []);

  const serviceItems: ServiceItem[] = [
    {
      title: t('Attendance Management'),
      subtitle: t('Mark, view, and manage team attendance effortlessly.'),
      icon: require('../../assets/dashboardmainscreen/clock.png'),
      accent: SURFACE_YELLOW,
      accentDark: colors.accentDark,
      route: 'AttendanceMgmt',
    },
    {
      title: t('Leave Management'),
      subtitle: t('Apply for leaves and track request status.'),
      icon: require('../../assets/dashboardmainscreen/calender.png'),
      accent: SURFACE_YELLOW,
      accentDark: colors.accentDark,
      route: 'LeaveMgmt',
    },
    {
      title: t('Meeting & Site Visit'),
      subtitle: t('Schedule meetings and log site visit details.'),
      icon: require('../../assets/dashboardmainscreen/metting.png'),
      accent: SURFACE_YELLOW,
      accentDark: colors.accentDark,
      route: 'MeetingVisit',
    },
    {
      title: t('Employee Live Tracking'),
      subtitle: t('Monitor employee live location'),
      icon: faLocationDot,
      accent: SURFACE_YELLOW,
      accentDark: colors.accentDark,
      route: 'Tracking',
      visible: isHodRole(empRole) || isSuperAdminRole(empRole),
    },
    {
      title: t('Master Eye'),
      subtitle: t('View master admin controls'),
      icon: faEye,
      accent: SURFACE_YELLOW,
      accentDark: colors.accentDark,
      route: 'MasterEye',
      visible: isSuperAdminRole(empRole),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[SCREEN_BG, SCREEN_BG]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.headerButton}>
            <FontAwesomeIcon icon={faBars} size={21} color={HEADER_ICON_COLOR} />
          </TouchableOpacity>

          <Image source={logo} style={styles.logo} resizeMode="contain" />

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('PreHome', { screen: 'PaymentLeave' })}
              style={styles.headerButton}
            >
              <FontAwesomeIcon icon={faEnvelope} size={19} color={HEADER_ICON_COLOR} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNotifPress} style={styles.bellButton}>
              <FontAwesomeIcon icon={faBell} size={19} color={HEADER_ICON_COLOR} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>5</Text>
              </View>
            </TouchableOpacity>
            <ProfileAvatar uri={profilePic} style={styles.avatar} />
          </View>
        </View>

        {!isConnected && (
          <View style={styles.offlineContainer}>
            <View style={styles.iconWrapper}>
              <FontAwesomeIcon icon={faWifi} size={80} color="#FFFFFF" />
              <View style={styles.crossLine} />
            </View>
            <Text style={styles.offlineTitle}>{t('No Internet Connection')}</Text>
            <Text style={styles.offlineSubtitle}>
              {t('Please check your Wi-Fi or Mobile Data connection.')}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryText}>{t('Retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.bannerWrap}>
            <Carousel
              loop
              autoPlay
              autoPlayInterval={3500}
              data={banners}
              width={BANNER_WIDTH}
              height={BANNER_HEIGHT}
              scrollAnimationDuration={900}
              onSnapToItem={setActiveBanner}
              renderItem={({ item }) => (
                <View style={styles.bannerCard}>
                  <Image source={item.image} style={styles.bannerImage} />
                  {/* <LinearGradient
                    colors={['transparent', '#132746']}
                    style={styles.bannerShade}
                  /> */}
                </View>
              )}
            />
          </View>

          <View style={styles.dots}>
            {banners.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, activeBanner === index && styles.activeDot]}
              />
            ))}
          </View>

          <View style={styles.menuHeader}>
            <View>
              <Text style={styles.menuTitle}>{t('Crewcam Service Menu')}</Text>
              <View style={styles.titleUnderline} />
            </View>

          </View>

          <View style={styles.cards}>
            {serviceItems
              .filter((item) => item.visible !== false)
              .map((item) => (
                <ServiceCard
                  key={item.title}
                  item={item}
                  onPress={() => navigation.navigate(item.route)}
                />
              ))}
          </View>


        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function ServiceCard({ item, onPress }: { item: ServiceItem; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <LinearGradient
        colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.serviceCard}
      >
        <View style={styles.serviceIconWrap}>
          {typeof item.icon === 'number' ? (
            <Image source={item.icon} style={styles.serviceAssetIcon} />
          ) : (
            <FontAwesomeIcon icon={item.icon} size={32} color={TEXT_DARK} />
          )}
        </View>
        <View style={styles.serviceText}>
          <Text style={styles.serviceTitle}>{item.title}</Text>
          <Text style={styles.serviceSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
        <View style={styles.arrowRing}>
          <LinearGradient
            colors={['transparent', 'transparent']}
            style={styles.arrowCircle}
          >
            <FontAwesomeIcon icon={faChevronRight} size={15} color={TEXT_DARK} />
          </LinearGradient>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  background: {
    flex: 1,
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 120,
    marginLeft: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellButton: {
    width: 30,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#55e6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#55e6ee',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 140,
  },
  bannerWrap: {
    width: CARD_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#55e6ee',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.shadowGlow,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  bannerCard: {
    width: CARD_WIDTH,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerShade: {
    ...StyleSheet.absoluteFillObject,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    height: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#55e6ee',
  },
  activeDot: {
    backgroundColor: ACCENT,
  },
  menuHeader: {
    width: CARD_WIDTH,
    marginTop: 2,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuTitle: {
    color: TEXT_DARK,
    fontSize: 20,
    fontWeight: '800',
  },
  titleUnderline: {
    width: 0,
    height: 0,
  },
  viewAllButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  cards: {
    gap: 5,
    alignItems: 'center',
  },
  serviceCard: {
    width: CARD_WIDTH,
    minHeight: 46,
    borderRadius: 16,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: colors.shadowGlow,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
    shadowColor: colors.shadowGlow,
    shadowOpacity: 0.8,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  serviceAssetIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  serviceText: {
    flex: 1,
    paddingRight: 4,
  },
  serviceTitle: {
    color: TEXT_DARK,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  serviceSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    marginTop: 1,
    fontWeight: '500',
  },
  arrowRing: {
    width: 20,
    height: 32,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircle: {
    width: 20,
    height: 32,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  centerActionOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignSelf: 'center',
    marginTop: 18,
    marginBottom: 2,
    borderWidth: 2,
    borderColor: '#55e6ee',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
  },
  centerAction: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.65,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  offlineContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#132746',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  crossLine: {
    position: 'absolute',
    width: 90,
    height: 5,
    backgroundColor: '#55e6ee',
    transform: [{ rotate: '45deg' }],
    top: 40,
    left: -5,
  },
  offlineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  offlineSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 30,
  },
  retryBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
