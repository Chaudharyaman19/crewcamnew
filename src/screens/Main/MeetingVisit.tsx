import React from 'react';
import {
  Dimensions,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import CustomHeader from '../../components/CustomHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getGreeting } from '../../utils/getGreeting';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCalendarDays,
  faChevronRight,
  faClockRotateLeft,
  faFileCircleCheck,
  faLocationDot,
  faPlus,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { colors } from '../../theme';


type RootStackParamList = {
  AddMeeting: undefined;
  ScheduledMeeting: undefined;
  CreateMon: undefined;
  MeetingHistory: undefined;
  AddSiteVisit: undefined;
  RecceHistory: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
};

type MeetingVisitNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AddMeeting'
>;

const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 20;

const meetingActions: {
  title: string;
  subtitle: string;
  icon: IconProp;
  route: 'AddMeeting' | 'ScheduledMeeting' | 'CreateMon' | 'MeetingHistory' | 'AddSiteVisit';
  colors: string[];
}[] = [
  {
    title: 'Add New Meeting',
    subtitle: 'Create a meeting with client and agenda details.',
    icon: faPlus,
    route: 'AddMeeting',
    colors: ['#132746', '#132746'],
  },
  {
    title: 'Scheduled Meeting',
    subtitle: 'Review upcoming meetings and planned visits.',
    icon: faCalendarDays,
    route: 'ScheduledMeeting',
    colors: ['#132746', '#132746'],
  },
  {
    title: "Create MoM's",
    subtitle: 'Capture discussion notes and action points.',
    icon: faFileCircleCheck,
    route: 'CreateMon',
    colors: ['#132746', '#132746'],
  },
  {
    title: 'Meeting History',
    subtitle: 'View previous meetings and MoM records.',
    icon: faClockRotateLeft,
    route: 'MeetingHistory',
    colors: ['#132746', '#132746'],
  },
  {
    title: 'Add Site Visit',
    subtitle: 'Log a site visit with location and purpose.',
    icon: faLocationDot,
    route: 'AddSiteVisit',
    colors: ['#132746', '#132746'],
  },
];

const MeetingVisit = () => {
  const { userData } = useContext(AuthContext);
  const { t, formatName } = useLanguage();
  const [userName, setUserName] = useState<string | null>(userData.firstname);

  useEffect(() => {
    if (userData.firstname) {
      setUserName(userData.firstname);
    }
  }, [userData.firstname]);

  const navigation = useNavigation<MeetingVisitNavigationProp>();

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleNotifPress = () => {
    navigation.navigate('Notification');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomHeader onMenuPress={handleMenuPress} onNotifPress={handleNotifPress} onUpdatePress={() => {
        navigation.navigate('PreHome', { screen: 'PaymentLeave' });
      }} />
      <LinearGradient
        colors={[SCREEN_BG, SCREEN_BG]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroText}>
              <Text style={styles.greeting}>{getGreeting()}, {formatName(userName)}</Text>
              <Text style={styles.subTitle}>{t('Manage meetings, MoMs and site visits from one place.')}</Text>
            </View>
            <View style={styles.heroIcon}>
              <FontAwesomeIcon icon={faUsers} size={26} color={TEXT_DARK} />
            </View>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('Meeting & Site Visit')}</Text>
            <View style={styles.underline} />
          </View>

          <View style={styles.actionList}>
            {meetingActions.map((item) => (
              <ActionCard
                key={item.route}
                item={item}
                translate={t}
                onPress={() => navigation.navigate(item.route)}
              />
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView >
  );
};

export default MeetingVisit;

const ActionCard = ({
  item,
  translate,
  onPress,
}: {
  item: typeof meetingActions[number];
  translate: (text: string) => string;
  onPress: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
    <LinearGradient
      colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.actionCard}
    >
      <LinearGradient
        colors={item.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.actionIcon}
      >
        <FontAwesomeIcon icon={item.icon} size={20} color={TEXT_DARK} />
      </LinearGradient>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{translate(item.title)}</Text>
        <Text style={styles.actionSubtitle} numberOfLines={1}>{translate(item.subtitle)}</Text>
      </View>
      <View style={styles.arrowCircle}>
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
  scrollContent: {
    alignItems: 'center',
    paddingTop: 5,
    paddingBottom: 80,
  },
  heroCard: {
    width: CARD_WIDTH,
    minHeight: 62,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  heroText: {
    flex: 1,
    paddingRight: 8,
  },
  greeting: {
    color: TEXT_DARK,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  subTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
  },
  sectionHeader: {
    width: CARD_WIDTH,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    color: TEXT_DARK,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  underline: {
    width: 44,
    height: 2,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginTop: 4,
  },
  actionList: {
    gap: 5,
  },
  actionCard: {
    width: CARD_WIDTH,
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.3,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.58,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionText: {
    flex: 1,
    paddingRight: 8,
  },
  actionTitle: {
    color: TEXT_DARK,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    marginTop: 1,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
  },
});
