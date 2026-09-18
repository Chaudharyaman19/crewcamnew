import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme';
import CustomHeader from '../../components/CustomHeader';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '@env';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { formatMeetingDisplayDate, sortMeetingsAsc } from '../../utils/meetingHelpers';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 20;
const ACCENT = '#55e6ee';
const SCREEN_BG = '#132746';

const darkBlueBackground = colors.bg;

interface MeetingData {
    _id: string;
    clientName: string;
    meetingDate: string;
    meetingTime: string;
    contactPerson: string;
    status: string;
}

const MeetingItem = ({ meeting, onPress }: { meeting: MeetingData, onPress: (id: string) => void }) => {
    const { t } = useLanguage();
    const formattedDate = formatMeetingDisplayDate(meeting.meetingDate);

    return (
        <TouchableOpacity
            style={styles.meetingItemContainer}
            onPress={() => onPress(meeting._id)}
            activeOpacity={0.82}
        >
            <View style={styles.meetingTopRow}>
                <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeText}>{formattedDate}</Text>
                </View>
                <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>{meeting.meetingTime || 'N/A'}</Text>
                </View>
            </View>

            <Text style={styles.clientName} numberOfLines={2}>
                {meeting.clientName || t('Unnamed Client')}
            </Text>

            <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('Contact')}</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                    {meeting.contactPerson || 'N/A'}
                </Text>
            </View>

            <View style={styles.footerRow}>
                <Text style={styles.tapHint}>{t('Tap to view details')}</Text>
                {meeting.status ? (
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{meeting.status}</Text>
                    </View>
                ) : null}
            </View>
        </TouchableOpacity>
    );
};

const MeetingSeparator = () => <View style={styles.itemSeparator} />;


export default function ScheduledMeeting({ navigation }: any) {
    const { t, formatName } = useLanguage();
    const { userData } = useContext(AuthContext);
    const [meetings, setMeetings] = useState<MeetingData[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchMeetings = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMessage('');
            const token = await AsyncStorage.getItem('auth_token');
            const userId = await AsyncStorage.getItem('user_id');
            const empCode = await AsyncStorage.getItem('user_emp_code');
            const response = await fetch(`${API_BASE_URL}/app-api/meeting/history?token=${encodeURIComponent(token || '')}&id=${encodeURIComponent(userId || '')}&empCode=${encodeURIComponent(empCode || '')}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.message || data?.error || t('Failed to fetch scheduled meetings.'));
            }
            if (data.status === 'success') {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const upcoming = (data.meetings || []).filter((meeting: MeetingData) => {
                    const meetingDate = new Date(meeting.meetingDate);
                    return !Number.isNaN(meetingDate.getTime()) && meetingDate >= todayStart && meeting.status !== 'Cancelled';
                });
                setMeetings(sortMeetingsAsc(upcoming));
            } else {
                throw new Error(data?.message || t('Failed to fetch scheduled meetings.'));
            }
        } catch (error: any) {
            console.error('Fetch Meetings Error:', error);
            setMeetings([]);
            setErrorMessage(error?.message || t('Failed to fetch scheduled meetings.'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useFocusEffect(
        useCallback(() => {
            fetchMeetings();
        }, [fetchMeetings])
    );

    const handleMeetingPress = (meetingId: string) => {
        navigation.navigate('MeetingDetailScreen', { meetingId });
    };

    const handleMenuPress = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };

    const handleNotifPress = () => {
        navigation.navigate('Notification');
    };

    return (
        <SafeAreaView style={styles.safeArea}>

            <CustomHeader onMenuPress={handleMenuPress} onNotifPress={handleNotifPress} onUpdatePress={() => {
        navigation.navigate('PreHome', { screen: 'PaymentLeave' });
      }} />

            <LinearGradient colors={[SCREEN_BG, '#1f456f']} style={styles.gradient}>
                <View style={styles.container}>
                    <View style={styles.heroCard}>
                    <Text style={styles.greeting}>{t('Hi')}, {formatName(userData.firstname, 1)}</Text>
                    <Text style={styles.instructionSub}>
                        {t('You can reset the meeting time and date details by clicking the edit icon')}
                    </Text>
                    </View>

                    <View style={styles.meetingListArea}>
                        <Text style={styles.listHeading}>{t('Scheduled Meeting List')}</Text>
                        {loading ? (
                            <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
                        ) : meetings.length > 0 ? (
                            <FlatList
                                data={meetings}
                                renderItem={({ item }) => (
                                <MeetingItem
                                    meeting={item}
                                    onPress={handleMeetingPress}
                                />
                                )}
                                keyExtractor={(item) => item._id}
                                contentContainerStyle={styles.listContent}
                                ItemSeparatorComponent={MeetingSeparator}
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>
                                    {errorMessage || t('No upcoming meetings scheduled.')}
                                </Text>
                                <Text style={styles.emptySubText}>
                                    {errorMessage ? t('Please check server/database connection and try again.') : t('Your schedule is clear right now.')}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: darkBlueBackground },
    gradient: { flex: 1 },
    container: {
        flex: 1,
        width: CARD_WIDTH,
        alignSelf: 'center',
        paddingTop: 6,
        paddingBottom: 16,
    },
    heroCard: {
        backgroundColor: 'rgba(19,39,70,0.72)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(85,230,238,0.24)',
    },

    greeting: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 3,
    },
    instructionSub: {
        color: colors.text,
        opacity: 0.9,
        fontSize: 12,
        lineHeight: 16,
    },
    listHeading: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 10,
    },

    meetingListArea: {
        flex: 1,
        backgroundColor: 'rgba(19,39,70,0.95)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(85,230,238,0.22)',
    },
    listContent: {
        paddingBottom: 8,
    },
    itemSeparator: {
        height: 8,
    },
    meetingItemContainer: {
        backgroundColor: 'rgba(9,27,51,0.78)',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(85,230,238,0.16)',
    },
    meetingTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    dateBadge: {
        backgroundColor: 'rgba(85,230,238,0.16)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 6,
    },
    dateBadgeText: {
        color: ACCENT,
        fontSize: 11,
        fontWeight: '800',
    },
    timeBadge: {
        backgroundColor: 'rgba(231,169,61,0.08)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    timeBadgeText: {
        color: colors.text,
        fontSize: 11,
        fontWeight: '700',
    },
    clientName: {
        color: colors.text,
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '800',
        marginBottom: 7,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 9,
    },
    detailLabel: {
        color: colors.muted,
        fontSize: 12,
        width: 54,
    },
    detailValue: {
        color: colors.text,
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tapHint: {
        color: colors.muted,
        fontSize: 11,
    },
    statusBadge: {
        backgroundColor: 'rgba(85,230,238,0.12)',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(85,230,238,0.18)',
    },
    statusText: {
        color: ACCENT,
        fontSize: 10,
        fontWeight: '800',
    },
    loader: { marginTop: 36 },
    emptyCard: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(9,27,51,0.56)',
        borderRadius: 8,
        minHeight: 120,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(231,169,61,0.08)',
    },
    emptyText: { color: '#FFFFFF', textAlign: 'center', fontSize: 14, fontWeight: '800' },
    emptySubText: { color: colors.muted, textAlign: 'center', marginTop: 5, fontSize: 12 },
});
