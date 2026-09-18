import React, { useEffect, useState, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../context/AuthContext";
import { colors } from "../../theme";
import CustomHeader from "../../components/CustomHeader";

import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { API_BASE_URL } from '@env';
import LinearGradient from "react-native-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";
import { formatMeetingDisplayDate } from "../../utils/meetingHelpers";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 20;
const ACCENT = "#55e6ee";
const SCREEN_BG = "#132746";

const MeetingItem = ({
  meeting,
  onPress,
  onEdit,
}: {
  meeting: any;
  onPress: (id: string) => void;
  onEdit: (id: string) => void;
}) => (
  <View style={styles.meetingItemContainer}>
    <TouchableOpacity style={{ flex: 1 }} onPress={() => onPress(meeting._id)} activeOpacity={0.8}>
      <Text style={styles.meetingItemText}>
        Meeting schedule on {formatMeetingDisplayDate(meeting.meetingDate)} | {meeting.meetingTime || 'N/A'} | {meeting.clientName} | Status: {meeting.status}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.editIconBtn}
      onPress={() => onEdit(meeting._id)}
      accessibilityLabel={`Edit ${meeting.clientName}`}
    >
      <FontAwesomeIcon icon={faPen} size={20} color="black" />
    </TouchableOpacity>
  </View>
);

export default function CreateMomScreen({ navigation }: any) {
  const { userData } = useContext(AuthContext);
  const { t, formatName } = useLanguage();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
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
        console.error("Fetch Meetings Error:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleMeetingPress = (meetingId: string) => {
    navigation.navigate("CreateEditMomMeetingScreen", { meetingId });
  };

  const handleEditPress = (meetingId: string) => {
    navigation.navigate("CreateEditMomMeetingScreen", { meetingId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        onNotifPress={() => navigation.navigate('Notification')}
        onUpdatePress={() => {
        navigation.navigate('PreHome', { screen: 'PaymentLeave' });
      }} 
      />
      <LinearGradient colors={[SCREEN_BG, "#1f456f"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.heroCard}>
          <Text style={styles.greeting}>{t('Hi')}, {formatName(userData.firstname, 1)}</Text>
          <Text style={styles.instructionSub}>
            Select a meeting below to create or edit its Minutes of Meeting (MoM).
          </Text>
          </View>

          <View style={styles.meetingListArea}>
            <Text style={styles.listHeading}>Scheduled Meeting List</Text>
            {loading ? (
                <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
            ) : meetings.length > 0 ? (
                meetings.map((meeting) => (
                  <MeetingItem
                    key={meeting._id}
                    meeting={meeting}
                    onPress={handleMeetingPress}
                    onEdit={handleEditPress}
                  />
                ))
            ) : (
                <Text style={styles.emptyText}>No meetings found.</Text>
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
  scrollContent: { flexGrow: 1, alignItems: "center", paddingTop: 5, paddingBottom: 20 },
  container: {
    flex: 1,
    width: CARD_WIDTH,
  },
  heroCard: {
    backgroundColor: "rgba(19,39,70,0.72)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "rgba(85,230,238,0.24)",
  },
  greeting: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: 3 },
  instructionSub: { color: colors.text, opacity: 0.9, fontSize: 12, lineHeight: 16 },
  listHeading: { color: colors.text, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  meetingListArea: {
    flex: 1,
    backgroundColor: "rgba(19,39,70,0.95)",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(85,230,238,0.22)",
  },
  meetingItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.panel,
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(85,230,238,0.16)",
  },
  meetingItemText: { color: colors.text, fontSize: 13, lineHeight: 18, flex: 1 },
  editIconBtn: { marginLeft: 8, padding: 7, backgroundColor: ACCENT, borderRadius: 16 },
  loader: { marginTop: 50 },
  emptyText: { color: "#FFFFFF", textAlign: "center", marginTop: 20 },
});
