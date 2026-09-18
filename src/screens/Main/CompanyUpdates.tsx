import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '../../components/CustomHeader';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { API_BASE_URL } from '@env';
import ProfileAvatar from '../../components/ProfileAvatar';
import Animated, { BounceIn, ZoomIn } from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCakeCandles, faGift, faChampagneGlasses, faStar } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme';

const ACCENT = colors.accent;
const SCREEN_BG = colors.bg;
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;
const USER_NOTIFICATIONS_API = `${API_BASE_URL}/app-api/user-notifications`;
const WISH_API = (id: string) => `${API_BASE_URL}/app-api/user-notifications/${encodeURIComponent(id)}/wish`;
const ACK_API = (id: string) => `${API_BASE_URL}/app-api/user-notifications/${encodeURIComponent(id)}/ack`;
const DISMISSED_MONTH_KEY = 'dismissed_user_month_notifications';

type UpdateItem = {
  id: string;
  type: 'BIRTHDAY' | 'ANNIVERSARY' | 'COMPANY_UPDATE' | 'WISH_RECEIVED' | 'WISH_SENT';
  title: string;
  body: string;
  date: string;
  time: string;
  sortTime: number;
  createdBy?: string;
  image?: string;
  targetUserId?: string;
  targetName?: string;
  isOwnOccasion?: boolean;
  wishCount?: number;
  wishSummary?: string;
  wishedBy?: string[];
  wishedByProfiles?: { name?: string; image?: string }[];
};

const parseJsonSafely = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const assertSuccessResponse = (text: string, fallbackMessage: string) => {
  const json = parseJsonSafely(text);
  if (json?.status === 'success' || json?.duplicate === true) return;
  throw new Error(json?.message || fallbackMessage);
};

const getMonthKey = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);

const formatDisplayDate = (timestamp: number) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

const formatDisplayTime = (timestamp: number) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
};

const getUserDismissKey = (monthKey: string, userKey: string) => {
  const safeUserKey = String(userKey || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${DISMISSED_MONTH_KEY}:${safeUserKey}:${monthKey}`;
};

const getDismissedIds = async (monthKey: string, userKey: string) => {
  const raw = await AsyncStorage.getItem(getUserDismissKey(monthKey, userKey));
  const parsed = raw ? parseJsonSafely(raw) : [];
  return Array.isArray(parsed) ? parsed.map(String) : [];
};

const saveDismissedId = async (monthKey: string, userKey: string, id: string) => {
  const key = getUserDismissKey(monthKey, userKey);
  const dismissedIds = await getDismissedIds(monthKey, userKey);
  await AsyncStorage.setItem(key, JSON.stringify([...new Set([...dismissedIds, id])]));
};

const getTypeLabel = (type: string | undefined, translate: (text: string) => string) => {
  if (type === 'BIRTHDAY') return translate('Birthday');
  if (type === 'ANNIVERSARY') return translate('Marriage Anniversary');
  if (type === 'WISH_RECEIVED') return translate('Wish Received');
  if (type === 'WISH_SENT') return translate('Wish Sent');
  return translate('Company Update');
};

const getCardColors = (type?: string): [string, string, string] => {
  if (type === 'BIRTHDAY') return ['#132746', '#132746', '#132746'];
  if (type === 'ANNIVERSARY') return ['#132746', '#132746', '#132746'];
  if (type === 'WISH_RECEIVED' || type === 'WISH_SENT') return ['#132746', '#132746', '#132746'];
  return ['#132746', '#132746', '#132746'];
};

const CompanyUpdatesScreen = ({ navigation }: any) => {
  const { t, formatName } = useLanguage();
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UpdateItem | null>(null);
  const [activeToken, setActiveToken] = useState('');
  const [notingId, setNotingId] = useState('');
  const monthKey = getMonthKey();

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notifications');

  const formatUpdateText = (text?: string, item?: UpdateItem | null) => {
    let nextText = String(text || '').trim();
    if (!nextText) return '';

    const nameCandidates = [
      item?.targetName,
      item?.createdBy,
      ...(item?.wishedBy || []),
      ...(item?.wishedByProfiles || []).map(person => person.name),
    ].filter(Boolean) as string[];

    nameCandidates.forEach(name => {
      nextText = nextText.replace(new RegExp(String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), formatName(name));
    });

    nextText = nextText.replace(
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})('s)?\s+(Birthday|Marriage Anniversary|Anniversary)\b/g,
      (match, rawName, possessive, occasion) => {
        if (String(rawName).toLowerCase() === 'happy') return match;
        const translatedOccasion = String(occasion).toLowerCase() === 'birthday'
          ? t('Birthday')
          : t('Marriage Anniversary');
        return `${formatName(rawName)}${possessive || ''} ${translatedOccasion}`;
      },
    );

    nextText = nextText
      .replace(/\bHappy Birthday\b/gi, t('Happy Birthday'))
      .replace(/\bBirthday Celebration\b/gi, t('Birthday Celebration'))
      .replace(/\bMarriage Anniversary\b/gi, t('Marriage Anniversary'))
      .replace(/\bAnniversary Celebration\b/gi, t('Anniversary Celebration'))
      .replace(/\bBirthday\b/gi, t('Birthday'))
      .replace(/\bAnniversary\b/gi, t('Marriage Anniversary'));

    return nextText;
  };

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('user_id');
      const empCode = await AsyncStorage.getItem('user_emp_code');
      setActiveToken(token || '');
      if (!token) {
        setUpdates([]);
        return;
      }

      const userDismissKey = userId || token || '';
      const dismissedIds = await getDismissedIds(monthKey, userDismissKey);
      const response = await fetch(
        `${USER_NOTIFICATIONS_API}?token=${encodeURIComponent(token)}&id=${encodeURIComponent(userId || '')}&empCode=${encodeURIComponent(empCode || '')}&scope=month&month=${monthKey}&_ts=${Date.now()}`,
      );
      const json = parseJsonSafely(await response.text());
      if (json?.user?.id) {
        await AsyncStorage.setItem('user_id', String(json.user.id));
      }
      const mappedUpdates = (json?.result || [])
        .map((item: any) => {
          const sortTime = Number(item.sortTime || 0);
          return {
            id: String(item.id || item._id),
            type: item.type || 'COMPANY_UPDATE',
            title: String(item.title || 'Company Update'),
            body: String(item.body || ''),
            date: String(item.date || formatDisplayDate(sortTime)),
            time: String(item.time || formatDisplayTime(sortTime)),
            sortTime,
            createdBy: item.createdBy || '',
            image: item.image || '',
            targetUserId: item.targetUserId || '',
            targetName: item.targetName || '',
            isOwnOccasion: Boolean(item.isOwnOccasion),
            wishCount: Number(item.wishCount || 0),
            wishSummary: item.wishSummary || '',
            wishedBy: Array.isArray(item.wishedBy) ? item.wishedBy : [],
            wishedByProfiles: Array.isArray(item.wishedByProfiles) ? item.wishedByProfiles : [],
          };
        })
        .filter((item: UpdateItem) => item.id && (item.type === 'WISH_RECEIVED' || !dismissedIds.includes(item.id)))
        .sort((a: UpdateItem, b: UpdateItem) => b.sortTime - a.sortTime);

      setUpdates(mappedUpdates);
    } catch (error) {
      console.log('Company updates error:', error);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUpdates();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const handleNoted = async () => {
    if (!selectedItem) return;
    const currentItem = selectedItem;
    if (notingId === currentItem.id) return;

    setNotingId(currentItem.id);
    try {
      if ((currentItem.type === 'BIRTHDAY' || currentItem.type === 'ANNIVERSARY') && !currentItem.isOwnOccasion) {
        const activeUserId = await AsyncStorage.getItem('user_id');
        const activeEmpCode = await AsyncStorage.getItem('user_emp_code');
        const response = await fetch(`${WISH_API(currentItem.id)}?token=${encodeURIComponent(activeToken)}&id=${encodeURIComponent(activeUserId || '')}&empCode=${encodeURIComponent(activeEmpCode || '')}`, {
          method: 'POST',
        });
        const responseText = await response.text();
        if (!response.ok) throw new Error(responseText || 'Wish save failed');
        assertSuccessResponse(responseText, 'Wish save failed');
      } else {
        const ackBody: { notificationType: string; targetUserId?: string } = {
          notificationType: currentItem.type,
        };
        if (currentItem.targetUserId) {
          ackBody.targetUserId = currentItem.targetUserId;
        }

        const activeUserId = await AsyncStorage.getItem('user_id');
        const activeEmpCode = await AsyncStorage.getItem('user_emp_code');
        const response = await fetch(`${ACK_API(currentItem.id)}?token=${encodeURIComponent(activeToken)}&id=${encodeURIComponent(activeUserId || '')}&empCode=${encodeURIComponent(activeEmpCode || '')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ackBody),
        });
        const responseText = await response.text();
        if (!response.ok) throw new Error(responseText || 'Notification ack failed');
        assertSuccessResponse(responseText, 'Notification ack failed');
      }

      setUpdates((prev) => prev.filter((item) => item.id !== currentItem.id));
      setSelectedItem(null);
      const activeUserId = await AsyncStorage.getItem('user_id');
      await saveDismissedId(monthKey, activeUserId || activeToken, currentItem.id);
    } catch (error) {
      console.log('Notification action error:', error);
    } finally {
      setNotingId('');
    }
  };

  const renderItem = ({ item }: { item: UpdateItem }) => (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={() => setSelectedItem(item)}
      style={styles.cardWrapper}
    >
      <LinearGradient
        colors={getCardColors(item.type)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.updateCard,
          (item.type === 'BIRTHDAY' || item.type === 'ANNIVERSARY') && styles.occasionCard,
          (item.type === 'WISH_RECEIVED' || item.type === 'WISH_SENT') && styles.wishCard,
        ]}
      >
        {(item.type === 'BIRTHDAY' || item.type === 'ANNIVERSARY' || item.type === 'WISH_RECEIVED' || item.type === 'WISH_SENT') ? (
          <View style={styles.cardAccentRail} pointerEvents="none">
            <View style={styles.cardAccentDot} />
            <View style={styles.cardAccentLine} />
          </View>
        ) : null}
        {item.image ? (
          <ProfileAvatar uri={item.image} style={styles.cardAvatar} iconSize={18} />
        ) : null}
        <View style={styles.cardTop}>
          <Text style={styles.typeText}>{getTypeLabel(item.type, t)}</Text>
          <Text style={styles.dateText}>
            {[item.date, item.time].filter(Boolean).join(' | ')}
          </Text>
        </View>
        <Text style={styles.titleText} numberOfLines={2}>{formatUpdateText(item.title, item)}</Text>
        {item.body ? <Text style={styles.bodyText} numberOfLines={2}>{formatUpdateText(item.body, item)}</Text> : null}
        {item.type === 'WISH_RECEIVED' && item.wishedBy?.length ? (
          <View style={styles.cardWishBox}>
            {item.wishedByProfiles?.length ? (
              <View style={styles.cardWishAvatars}>
                {item.wishedByProfiles.map((person, index) => (
                  person.image ? (
                    <ProfileAvatar
                      uri={person.image}
                      style={styles.cardWishAvatar}
                      iconSize={12}
                      key={`${person.name || 'wisher'}-${index}`}
                    />
                  ) : null
                ))}
              </View>
            ) : null}
            <Text style={styles.cardWishText} numberOfLines={2}>
              {item.wishedBy.map(name => formatName(name)).join(', ')}
            </Text>
          </View>
        ) : null}
      </LinearGradient>
    </TouchableOpacity>
  );

  const isCelebrationModal = selectedItem?.type === 'BIRTHDAY' || selectedItem?.type === 'ANNIVERSARY' || selectedItem?.type === 'WISH_RECEIVED';
  const isBirthdayModal =
    selectedItem?.type === 'BIRTHDAY' ||
    (selectedItem?.type === 'WISH_RECEIVED' && selectedItem?.body?.toLowerCase().includes('birthday'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => navigation.navigate('PreHome', { screen: 'PaymentLeave' })}
      />

      <LinearGradient colors={[SCREEN_BG, SCREEN_BG]} style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.pageTitle}>{t('Company Updates')}</Text>
          <Text style={styles.pageSubTitle}>{t('Current month notifications and personal occasions.')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
        ) : updates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t('No Updates')}</Text>
            <Text style={styles.emptyText}>{t('There are no notifications for this month.')}</Text>
          </View>
        ) : (
          <FlatList
            data={updates}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </LinearGradient>

      <Modal
        visible={Boolean(selectedItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={BounceIn.duration(800)} style={{ width: '100%', alignItems: 'center' }}>
            <LinearGradient
              colors={
                isCelebrationModal
                  ? [SURFACE_YELLOW, SURFACE_YELLOW_DEEP, '#132746']
                  : [SURFACE_YELLOW, SURFACE_YELLOW_DEEP]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.modalCard, isCelebrationModal && styles.celebrationModalCard]}
            >
              {isCelebrationModal ? (
                <View style={styles.celebrationLayer} pointerEvents="none">
                  <View style={styles.spotlightGlow} />
                  <View style={styles.spotlightGlowSmall} />
                  {isBirthdayModal ? (
                    <>
                      <View style={[styles.balloon, styles.balloonOne]} />
                      <View style={[styles.balloon, styles.balloonTwo]} />
                      <View style={[styles.balloonString, styles.balloonStringOne]} />
                      <View style={[styles.balloonString, styles.balloonStringTwo]} />
                    </>
                  ) : null}
                  <View style={[styles.ribbon, styles.ribbonLeft]} />
                  <View style={[styles.ribbon, styles.ribbonRight]} />
                  <View style={[styles.ribbonMini, styles.ribbonMiniLeft]} />
                  <View style={[styles.ribbonMini, styles.ribbonMiniRight]} />
                  <View style={[styles.confettiDot, styles.confettiOne]} />
                  <View style={[styles.confettiDot, styles.confettiTwo]} />
                  <View style={[styles.confettiDot, styles.confettiThree]} />
                  <View style={[styles.confettiDash, styles.confettiFour]} />
                  <View style={[styles.confettiDash, styles.confettiFive]} />
                  <FontAwesomeIcon icon={faCakeCandles} size={28} color="#FFFFFF" style={{ position: 'absolute', top: 20, left: 10, transform: [{rotate: '-15deg'}] }} />
                  <FontAwesomeIcon icon={faGift} size={24} color="#FFFFFF" style={{ position: 'absolute', bottom: 40, right: 10, transform: [{rotate: '20deg'}] }} />
                  <FontAwesomeIcon icon={faChampagneGlasses} size={26} color="#55e6ee" style={{ position: 'absolute', top: 120, right: 5, transform: [{rotate: '10deg'}] }} />
                  <FontAwesomeIcon icon={faStar} size={18} color="#FFFFFF" style={{ position: 'absolute', bottom: 60, left: 20 }} />
                </View>
              ) : null}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
              >
                {isCelebrationModal ? (
                  <Animated.View entering={ZoomIn.duration(1000).delay(200)} style={styles.celebrationHeader}>
                    <View style={styles.partyCap}>
                      <View style={styles.partyCapStripe} />
                      <View style={styles.partyCapDot} />
                    </View>
                  <View style={styles.celebrationBadge}>
                    <Text style={styles.celebrationBadgeText}>
                        {isBirthdayModal ? t('Birthday Celebration') : t('Anniversary Celebration')}
                    </Text>
                  </View>
                  </Animated.View>
                ) : (
                <Text style={styles.modalType}>{getTypeLabel(selectedItem?.type, t)}</Text>
              )}
              {isCelebrationModal ? (
                <View style={styles.celebrationHero}>
                  {isBirthdayModal ? (
                    <View style={styles.happyBirthdayHeader}>
                      <FontAwesomeIcon icon={faCakeCandles} size={22} color="#FFFFFF" />
                      <Text style={styles.happyBirthdayText}>{t('Happy Birthday')}</Text>
                    </View>
                  ) : null}
                  <View style={styles.celebrationSparkLine}>
                    <View style={styles.sparkChip} />
                    <View style={[styles.sparkChip, styles.sparkChipWide]} />
                    <View style={styles.sparkChip} />
                  </View>
                  <Text style={styles.celebrationTitle}>{formatUpdateText(selectedItem?.title, selectedItem)}</Text>
                  {selectedItem?.image ? (
                    <View style={styles.celebrationAvatarFrame}>
                      <ProfileAvatar uri={selectedItem.image} style={styles.celebrationAvatar} iconSize={34} />
                    </View>
                  ) : null}
                  {selectedItem?.date ? (
                    <Text style={styles.celebrationMeta}>
                      {[selectedItem.date, selectedItem.time].filter(Boolean).join(' | ')}
                    </Text>
                  ) : null}
                  {selectedItem?.body ? <Text style={styles.celebrationBody}>{formatUpdateText(selectedItem.body, selectedItem)}</Text> : null}
                </View>
              ) : (
                <>
                  <Text style={styles.modalTitle}>{formatUpdateText(selectedItem?.title, selectedItem)}</Text>
                  {selectedItem?.image ? (
                    <ProfileAvatar uri={selectedItem.image} style={styles.modalAvatar} iconSize={30} />
                  ) : null}
                  {selectedItem?.date ? (
                    <Text style={styles.modalMeta}>
                      {[selectedItem.date, selectedItem.time].filter(Boolean).join(' | ')}
                    </Text>
                  ) : null}
                  {selectedItem?.body ? <Text style={styles.modalBody}>{formatUpdateText(selectedItem.body, selectedItem)}</Text> : null}
                </>
              )}


              {selectedItem?.isOwnOccasion && selectedItem?.wishedBy?.length ? (
                <View style={styles.wishedByBox}>
                  <Text style={styles.wishedByTitle}>{t('Wished by')}</Text>
                  {selectedItem.wishedByProfiles?.length ? (
                    <View style={styles.wishedByChipRow}>
                      {selectedItem.wishedByProfiles.map((person, index) => (
                        <View style={styles.wishedByChip} key={`${person.name || 'wisher'}-${index}`}>
                          {person.image ? (
                            <ProfileAvatar uri={person.image} style={styles.wishedByAvatar} iconSize={12} />
                          ) : null}
                          <Text style={styles.wishedByNames} numberOfLines={1}>{formatName(person.name) || t('Someone')}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.wishedByNames}>{selectedItem.wishedBy.map(name => formatName(name)).join(', ')}</Text>
                  )}
                </View>
              ) : null}
              {selectedItem?.createdBy ? <Text style={styles.modalBy}>{t('By')} {formatName(selectedItem.createdBy)}</Text> : null}
            </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedItem(null)}>
                  <Text style={styles.closeButtonText}>{t('Close')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.notedButton, notingId === selectedItem?.id && styles.notedButtonDisabled]}
                  onPress={handleNoted}
                  disabled={notingId === selectedItem?.id}
                >
                  <Text style={styles.notedButtonText}>
                    {selectedItem?.type === 'BIRTHDAY' || selectedItem?.type === 'ANNIVERSARY'
                      ? selectedItem?.isOwnOccasion
                        ? t('Noted')
                        : t('Send Wish')
                      : t('Noted')}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SCREEN_BG },
  container: {
    flex: 1,
    alignItems: 'center',
  },
  heroCard: {
    width: CARD_WIDTH,
    backgroundColor: SURFACE_YELLOW,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  pageTitle: {
    color: TEXT_DARK,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  pageSubTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
    textAlign: 'center',
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 120,
    alignItems: 'center',
    width: '100%',
  },
  list: {
    width: '100%',
    alignSelf: 'stretch',
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateCard: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    alignItems: 'stretch',
    borderRadius: 12,
    paddingLeft: 68,
    paddingRight: 10,
    paddingVertical: 12,
    marginBottom: 10,
    minHeight: 104,
    borderWidth: 1.2,
    borderColor: colors.border,
  },
  occasionCard: {
    borderColor: '#FFFFFF',
    borderWidth: 1.4,
  },
  wishCard: {
    borderColor: '#55e6ee',
  },
  cardAccentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: '#55e6ee',
  },
  cardAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#55e6ee',
    marginBottom: 5,
  },
  cardAccentLine: {
    width: 2,
    flex: 1,
    borderRadius: 2,
    backgroundColor: '#55e6ee',
  },
  cardAvatar: {
    position: 'absolute',
    left: 10,
    top: 11,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardTop: {
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  typeText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'left',
  },
  titleText: {
    color: TEXT_DARK,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  bodyText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 5,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  cardWishBox: {
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#55e6ee',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'flex-start',
    width: '100%',
  },
  cardWishAvatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 5,
  },
  cardWishAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardWishText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'left',
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'stretch',
  },
  emptyTitle: {
    color: TEXT_DARK,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#132746',
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
  },
  celebrationModalCard: {
    minHeight: '86%',
    borderColor: '#FFFFFF',
    borderWidth: 1.4,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  celebrationLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  spotlightGlow: {
    position: 'absolute',
    top: -72,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#55e6ee',
  },
  spotlightGlowSmall: {
    position: 'absolute',
    bottom: -54,
    right: -28,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#55e6ee',
  },
  balloon: {
    position: 'absolute',
    width: 34,
    height: 42,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  balloonOne: {
    top: 64,
    left: 14,
    backgroundColor: '#55e6ee',
    transform: [{ rotate: '-9deg' }],
  },
  balloonTwo: {
    top: 86,
    right: 18,
    backgroundColor: '#55e6ee',
    transform: [{ rotate: '10deg' }],
  },
  balloonString: {
    position: 'absolute',
    width: 1,
    height: 34,
    backgroundColor: '#55e6ee',
  },
  balloonStringOne: {
    top: 104,
    left: 31,
    transform: [{ rotate: '-6deg' }],
  },
  balloonStringTwo: {
    top: 126,
    right: 34,
    transform: [{ rotate: '7deg' }],
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    width: 92,
    height: 16,
    backgroundColor: '#55e6ee',
  },
  ribbonLeft: {
    left: -26,
    transform: [{ rotate: '-28deg' }],
  },
  ribbonRight: {
    right: -26,
    backgroundColor: '#55e6ee',
    transform: [{ rotate: '28deg' }],
  },
  ribbonMini: {
    position: 'absolute',
    top: 54,
    width: 64,
    height: 9,
    borderRadius: 8,
  },
  ribbonMiniLeft: {
    left: 58,
    backgroundColor: '#55e6ee',
    transform: [{ rotate: '20deg' }],
  },
  ribbonMiniRight: {
    right: 72,
    backgroundColor: '#55e6ee',
    transform: [{ rotate: '-18deg' }],
  },
  confettiDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confettiDash: {
    position: 'absolute',
    width: 16,
    height: 5,
    borderRadius: 3,
  },
  confettiOne: {
    top: 34,
    left: 26,
    backgroundColor: '#55e6ee',
  },
  confettiTwo: {
    top: 70,
    right: 30,
    backgroundColor: ACCENT,
  },
  confettiThree: {
    top: 124,
    left: 38,
    backgroundColor: '#55e6ee',
  },
  confettiFour: {
    top: 96,
    right: 58,
    backgroundColor: '#55e6ee',
    transform: [{ rotate: '-20deg' }],
  },
  confettiFive: {
    top: 42,
    right: 98,
    backgroundColor: '#55e6ee',
    transform: [{ rotate: '24deg' }],
  },
  modalScroll: {
    width: '100%',
  },
  modalScrollContent: {
    alignItems: 'center',
  },
  celebrationHeader: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 6,
    marginBottom: 8,
  },
  partyCap: {
    width: 0,
    height: 0,
    borderLeftWidth: 26,
    borderRightWidth: 26,
    borderBottomWidth: 58,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    marginBottom: -4,
    transform: [{ rotate: '-8deg' }],
  },
  partyCapStripe: {
    position: 'absolute',
    left: -17,
    top: 32,
    width: 34,
    height: 7,
    borderRadius: 6,
    backgroundColor: ACCENT,
    transform: [{ rotate: '18deg' }],
  },
  partyCapDot: {
    position: 'absolute',
    left: -5,
    top: -7,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#55e6ee',
  },
  celebrationBadge: {
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#55e6ee',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  celebrationBadgeText: {
    color: TEXT_DARK,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  celebrationHero: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#55e6ee',
  },
  happyBirthdayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: '#55e6ee',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginBottom: 10,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  happyBirthdayText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  celebrationSparkLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sparkChip: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#55e6ee',
  },
  sparkChipWide: {
    width: 28,
    height: 5,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  celebrationTitle: {
    color: TEXT_DARK,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  celebrationAvatarFrame: {
    width: '86%',
    maxWidth: 280,
    marginTop: 14,
    padding: 5,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#55e6ee',
  },
  celebrationAvatar: {
    width: '100%',
    height: 190,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  celebrationMeta: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  celebrationBody: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  modalType: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 2,
    textAlign: 'left',
  },
  modalTitle: {
    color: TEXT_DARK,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
    textAlign: 'left',
  },
  modalAvatar: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginTop: 2,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
  },
  modalMeta: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
  },
  modalBody: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
    textAlign: 'left',
  },
  modalBy: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
  },
  wishSummaryText: {
    color: ACCENT,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'left',
  },
  wishCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
  },
  wishedByBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#55e6ee',
    width: '100%',
  },
  wishedByTitle: {
    color: TEXT_DARK,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'left',
  },
  wishedByChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
  },
  wishedByChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: 18,
    backgroundColor: '#55e6ee',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  wishedByAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 7,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  wishedByNames: {
    color: TEXT_DARK,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'left',
    maxWidth: 170,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  closeButtonText: {
    color: TEXT_DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  notedButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: ACCENT,
  },
  notedButtonDisabled: {
    opacity: 0.6,
  },
  notedButtonText: {
    color: TEXT_DARK,
    fontSize: 13,
    fontWeight: '900',
  },
});

export default CompanyUpdatesScreen;
