import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomHeader from '../../components/CustomHeader';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { fetchPhpHolidayList } from '../../services/phpApi';

import { colors } from '../../theme';

const ACCENT = colors.accent;
const SCREEN_BG = colors.bg;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const HolidayItem = ({ holiday }: any) => (
  <LinearGradient
    colors={['rgba(19, 39, 70, 0.98)', 'rgba(9, 27, 51, 0.98)']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.holidayItem}
  >
    <View style={styles.dateBadge}>
      <FontAwesomeIcon icon={faCalendarDays} size={16} color={ACCENT} />
      <Text style={styles.holidayDate}>
        {formatDate(holiday.holidayDate || holiday.holiday_date || holiday.date)}
      </Text>
    </View>
    <View style={styles.holidayNameContainer}>
      <Text style={styles.holidayName} numberOfLines={1}>
        {holiday.holidayName || holiday.holiday_name || holiday.name || holiday.title}
      </Text>
      {(holiday.note || holiday.description) && (
        <Text style={styles.holidayNote} numberOfLines={2}>
          {holiday.note || holiday.description}
        </Text>
      )}
    </View>
  </LinearGradient>
);

const HolidayListScreen = ({ navigation }: any) => {
  const { t, formatName } = useLanguage();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  const fetchUserName = async () => {
    const user = await AsyncStorage.getItem('user_firstname');
    if (user) {
      setUserName(user);
    }
  };

  useEffect(() => {
    fetchUserName();

    const fetchHolidays = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
          setLoading(false);
          return;
        }

        const data = await fetchPhpHolidayList({token});
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.result)
            ? data.result
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.holidays)
                ? data.holidays
                : [];
        console.log('Holiday API Response:', data);

        if (list.length > 0) {
          setHolidays(list);
        } else {
          setHolidays([]);
        }
      } catch (err) {
        console.log('Error fetching holidays:', err);
        Alert.alert('Error', 'Failed to fetch holiday list');
      } finally {
        setLoading(false);
      }
    };

    fetchHolidays();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomHeader
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        onNotifPress={() => navigation.navigate('HomeTabs', { screen: 'Notifications' })}
        onUpdatePress={() => navigation.navigate('PreHome', { screen: 'PaymentLeave' })}
      />

      <LinearGradient
        colors={[SCREEN_BG, '#1f456f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['rgba(19, 39, 70, 0.98)', 'rgba(14, 67, 92, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View>
              <Text style={styles.greetingText}>{t('Hi')}, {formatName(userName)}</Text>
              <Text style={styles.sub}>{t('Company holiday calendar and notes.')}</Text>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('Holiday List')}</Text>
            <View style={styles.underline} />
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={ACCENT}
              style={styles.loader}
            />
          ) : holidays.length === 0 ? (
            <Text style={styles.noDataText}>{t('No holidays found')}</Text>
          ) : (
            holidays.map((holiday, index) => (
              <HolidayItem key={index} holiday={holiday} />
            ))
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

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
    minHeight: 84,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  sectionHeader: {
    width: CARD_WIDTH,
    marginTop: 20,
    marginBottom: 12,
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  sub: {
    color: 'rgba(230,237,246,0.82)',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
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
  loader: {
    marginTop: 20,
  },
  holidayItem: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1.2,
    borderColor: colors.border,
  },
  dateBadge: {
    width: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holidayDate: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 0,
  },
  holidayNameContainer: {
    flex: 1,
    flexShrink: 1,
    alignItems: 'flex-end',
    paddingLeft: 10,
  },
  holidayName: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'right',
  },
  holidayNote: {
    color: 'rgba(230,237,246,0.72)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    textAlign: 'right',
  },
  noDataText: {
    color: 'rgba(230,237,246,0.72)',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
  },
});

export default HolidayListScreen;
