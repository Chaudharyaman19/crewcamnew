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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGreeting } from '../../utils/getGreeting';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCalendarCheck,
  faChevronRight,
  faClock,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme';

type RootStackParamList = {
  LeaveMgmt: undefined;
  UrgentLeave: undefined;
  CasualLeave: undefined;
  OutstationLeave: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
};

type LeaveMgmtNavigationProp = StackNavigationProp<
  RootStackParamList,
  'LeaveMgmt'
>;

const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;

const leaveActions: {
  title: string;
  subtitle: string;
  icon: IconProp;
  route: 'UrgentLeave' | 'CasualLeave' | 'OutstationLeave';
  colors: string[];
}[] = [
  {
    title: 'Urgent Leave',
    subtitle: 'Submit a same-day emergency leave request.',
    icon: faClock,
    route: 'UrgentLeave',
    colors: ['#132746', '#132746'],
  },
  {
    title: 'Casual Leave',
    subtitle: 'Plan and track regular leave requests.',
    icon: faCalendarCheck,
    route: 'CasualLeave',
    colors: ['#132746', '#132746'],
  },
  {
    title: 'Outstation Leave',
    subtitle: 'Request leave while travelling outstation.',
    icon: faLocationDot,
    route: 'OutstationLeave',
    colors: ['#132746', '#132746'],
  },
];

const LeaveMgmt = () => {
  const navigation = useNavigation<LeaveMgmtNavigationProp>();
  const { t, formatName } = useLanguage();

  const [userName, setUserName] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchUserName();
  }, []);

  const fetchUserName = async () => {
    const name = await AsyncStorage.getItem('user_firstname');
    if (name) {
      setUserName(name);
    }
  };

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
              <Text style={styles.subTitle}>{t('Choose the leave workflow you want to start.')}</Text>
            </View>
            <View style={styles.heroIcon}>
              <FontAwesomeIcon icon={faCalendarCheck} size={26} color={TEXT_DARK} />
            </View>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('Leave Management')}</Text>
            <View style={styles.underline} />
          </View>

          <View style={styles.actionList}>
            {leaveActions.map((item) => (
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
    </SafeAreaView>
  );
};

export default LeaveMgmt;

const ActionCard = ({
  item,
  translate,
  onPress,
}: {
  item: typeof leaveActions[number];
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
    paddingTop: 14,
    paddingBottom: 140,
  },
  heroCard: {
    width: CARD_WIDTH,
    minHeight: 92,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    paddingRight: 12,
  },
  greeting: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    color: TEXT_DARK,
  },
  subTitle: {
    fontSize: 13,
    lineHeight: 17,
    color: '#FFFFFF',
    marginTop: 4,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
  },
  sectionHeader: {
    width: CARD_WIDTH,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    color: TEXT_DARK,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  underline: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginTop: 8,
  },
  actionList: {
    gap: 5,
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
    shadowOpacity: 0.58,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
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
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
  },
});
