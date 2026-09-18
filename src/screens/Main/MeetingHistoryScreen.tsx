import React, { useEffect, useState, useContext } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions } from "@react-navigation/native";
import CustomHeader from "../../components/CustomHeader";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE_URL } from '@env';
import LinearGradient from "react-native-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";
import { formatMeetingDisplayDate } from "../../utils/meetingHelpers";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 20;
const ACCENT = "#55e6ee";
const SCREEN_BG = "#132746";

export default function MeetingHistoryScreen({ navigation }: any) {
    const { t, formatName } = useLanguage();
    const { userData } = useContext(AuthContext);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const userId = await AsyncStorage.getItem('user_id');
            const empCode = await AsyncStorage.getItem('user_emp_code');
            const response = await fetch(`${API_BASE_URL}/app-api/meeting/history?token=${encodeURIComponent(token || '')}&id=${encodeURIComponent(userId || '')}&empCode=${encodeURIComponent(empCode || '')}`);
            const data = await response.json();
            if (data.status === 'success') {
                setMeetings(data.meetings);
            }
        } catch (error) {
            console.error("Fetch History Error:", error);
        } finally {
            setLoading(false);
        }
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
            <LinearGradient colors={[SCREEN_BG, "#1f456f"]} style={styles.gradient}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.container}>
                    <View style={styles.heroCard}>
                    <Text style={styles.heading}>{t('Hi')} {formatName(userData.firstname, 1)}</Text>
                    <Text style={styles.sub}>
                        {t('You can see the details of the meeting minutes (MOM) by clicking on the items below.')}
                    </Text>
                    </View>
                    
                    <View style={styles.meetingListArea}>
                        <Text style={styles.listHeading}>{t('Meeting History & MoM List')}</Text>
                        {loading ? (
                            <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
                        ) : meetings.length > 0 ? (
                            meetings.map((meeting) => (
                                <TouchableOpacity 
                                    key={meeting._id} 
                                    style={styles.meetingItemContainer}
                                    onPress={() => navigation.navigate("MeetingDetailScreen", { meetingId: meeting._id })}
                                >
                                    <Text style={styles.meetingItemText}>
                                        <Text style={{fontWeight: 'bold'}}>{formatMeetingDisplayDate(meeting.meetingDate)} | {meeting.clientName}</Text>
                                        {"\n"}{t('Status')}: {meeting.status} {meeting.mom ? `| ${t('MoM Added')}` : ""}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>{t('No meeting history found.')}</Text>
                        )}
                    </View>
                </View>
            </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    gradient: { flex: 1 },
    scrollContent: { flexGrow: 1, alignItems: 'center', paddingTop: 5, paddingBottom: 20 },
    container: {
        flex: 1,
        width: CARD_WIDTH,
    },
    heroCard: {
        backgroundColor: 'rgba(19,39,70,0.72)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginBottom: 5,
        borderWidth: 1,
        borderColor: 'rgba(85,230,238,0.24)',
    },
    heading: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 3,
    },
    sub: {
        color: colors.text,
        opacity: 0.9,
        fontSize: 12,
        lineHeight: 16,
    },
    meetingListArea: {
        marginTop: 0,
        backgroundColor: 'rgba(19,39,70,0.95)',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(85,230,238,0.22)',
    },
    listHeading: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 8,
    },
    meetingItemContainer: {
        backgroundColor: colors.panel,
        padding: 8,
        borderRadius: 8,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(85,230,238,0.16)',
    },
    meetingItemText: {
        color: colors.text,
        fontSize: 13,
        lineHeight: 18,
    },
    loader: { marginTop: 50 },
    emptyText: { color: '#FFFFFF', textAlign: 'center', marginTop: 20 },
});
