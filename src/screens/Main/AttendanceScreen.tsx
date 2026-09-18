import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import CustomHeader from '../../components/CustomHeader';
import { getGreeting } from '../../utils/getGreeting';
import ProfileAvatar from '../../components/ProfileAvatar';
import { useLanguage } from '../../context/LanguageContext';
import { fetchPhpUserProfile, normalizePhpProfileForApp } from '../../services/phpApi';

import { colors } from '../../theme';

type RootStackParamList = {
  DailyAttendance: undefined;
  AttendanceStatus: undefined;
  LeaveRequest: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
};

type AttendanceMgmtScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DailyAttendance'
>;

const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;

const actions = [
  {
    title: 'Daily Attendance',
    subtitle: 'Check in, check out and mark atten...',
    icon: require('../../assets/attendance_new.png'),
    route: 'DailyAttendance',
  },
  {
    title: 'Attendance Status',
    subtitle: 'View current and past attendance s...',
    icon: require('../../assets/calendar.png'),
    route: 'AttendanceStatus',
  },
  {
    title: 'Leave Request',
    subtitle: 'Apply and track leave requests',
    icon: require('../../assets/request_list_icon.png'),
    route: 'LeaveRequest',
  },
];

const AttendanceMgmtScreen = () => {
  const navigation = useNavigation<AttendanceMgmtScreenNavigationProp>();
  const { t, formatName } = useLanguage();
  const [userName, setUserName] = useState<string>('');
  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const [name, token] = await Promise.all([
          AsyncStorage.getItem('user_firstname'),
          AsyncStorage.getItem('auth_token'),
        ]);

        if (name) { setUserName(name); }
        if (!token) { return; }

        const data = await fetchPhpUserProfile({token});
        const normalized = normalizePhpProfileForApp(data);

        if (normalized.profilePic) {
          setProfilePic(String(normalized.profilePic).replace(/\s/g, ''));
        }
      } catch (error) {
        console.log('Attendance profile fetch error:', error);
      }
    };

    fetchUserInfo();
  }, []);

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleNotifPress = () => {
    navigation.navigate('Notification');
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
            style={styles.heroCard}
          >
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>{t('Attendance Management')}</Text>
              <Text style={styles.heroSubtitle}>
                {getGreeting()}, {formatName(userName)}
              </Text>
            </View>
            <ProfileAvatar uri={profilePic} style={styles.heroProfileImage} iconSize={26} />
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('Choose Action')}</Text>
            <View style={styles.underline} />
          </View>

          <View style={styles.actionList}>
            {actions.map((item) => (
              <ActionCard
                key={item.route}
                title={t(item.title)}
                subtitle={t(item.subtitle)}
                icon={item.icon}
                onPress={() => navigation.navigate(item.route as never)}
              />
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default AttendanceMgmtScreen;

const ActionCard = ({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: number;
  onPress: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
    <LinearGradient
      colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.actionCard}
    >
      <Image source={icon} style={styles.actionIcon} />
      <View style={styles.divider} />
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={styles.arrowButton}>
        <FontAwesomeIcon icon={faChevronRight} size={14} color={TEXT_DARK} />
      </View>
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
    paddingVertical: 12,
    alignItems: 'center',
    paddingBottom: 90,
  },
  heroCard: {
    width: CARD_WIDTH,
    minHeight: 78,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  heroText: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    color: TEXT_DARK,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  heroSubtitle: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    marginTop: 3,
  },
  heroProfileImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#55e6ee',
    borderWidth: 2,
    borderColor: colors.border,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
    width: CARD_WIDTH,
  },
  sectionTitle: {
    color: TEXT_DARK,
    fontSize: 15,
    fontWeight: '800',
  },
  underline: {
    width: 58,
    height: 2,
    borderRadius: 1,
    backgroundColor: ACCENT,
    marginTop: 8,
  },
  actionList: {
    gap: 5,
    alignItems: 'center',
  },
  actionCard: {
    width: CARD_WIDTH,
    minHeight: 46,
    borderRadius: 12,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.3,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    overflow: 'hidden',
  },
  actionIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  divider: {
    width: 1,
    height: 32,
    marginLeft: 8,
    marginRight: 8,
    backgroundColor: '#55e6ee',
  },
  actionText: {
    flex: 1,
    paddingRight: 8,
  },
  actionTitle: {
    color: TEXT_DARK,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    marginTop: 1,
  },
  arrowButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.75,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
