import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
//import Geocoder from "react-native-geocoding";

import { formattedDateTime } from "../../utils/dateTime";
import CustomHeader from "../../components/CustomHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from "../../context/LanguageContext";
import { isPhpSuccess, requestPhpPaidLeave } from "../../services/phpApi";
import { colors } from "../../theme";

const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const INPUT_BG = '#132746';
const TEXT_DARK = colors.black;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;

const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Initialize Google Maps Geocoder with API key
//Geocoder.init("YOUR_GOOGLE_MAPS_API_KEY"); // replace with your API key

type RootStackParamList = {
  DailyAttendance: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
};
type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function PaidLeaveScreen() {
  const { t, formatName } = useLanguage();
  const [UserName, setUserName] = useState("John Doe"); // Replace with API value
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leaveDate, setLeaveDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [currentAddress] = useState("Ghaziabad, India");
  const [currentTime] = useState(() => formattedDateTime());
  const navigation = useNavigation<NavigationProp>();

  const fetchUserName = async () => {
    const user = await AsyncStorage.getItem("user_firstname");
    if (user) setUserName(user);
  };

  // const fetchCurrentAddress = async () => {
  //   const hasPermission = await requestLocationPermission();
  //   if (!hasPermission) {
  //     setCurrentAddress("Permission denied");
  //     return;
  //   }

  //   Geolocation.getCurrentPosition(
  //     async (position) => {
  //       const { latitude, longitude } = position.coords;
  //       try {
  //         const geoRes = await Geocoder.from(latitude, longitude);
  //         const address = geoRes.results[0].formatted_address;
  //         setCurrentAddress(address);
  //       } catch (err) {
  //         console.warn(err);
  //         setCurrentAddress("Unable to fetch address");
  //       }
  //     },
  //     (error) => {
  //       console.warn(error);
  //       setCurrentAddress("Unable to fetch address");
  //     },
  //     { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  //   );
  // };

  useEffect(() => {
    fetchUserName();
    // fetchCurrentAddress();
  }, []);

  const sendLeave = async () => {
    if (!reason.trim()) {
      Alert.alert(t("Please enter your leave reason"));
      return;
    }

    // Block today and past dates — PL must be applied in advance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDay = new Date(leaveDate);
    selectedDay.setHours(0, 0, 0, 0);
    if (selectedDay.getTime() <= today.getTime()) {
      Alert.alert(t("Invalid Date"), t("You cannot apply Paid Leave for today or a previous date. Please select tomorrow or a future date."));
      return;
    }

    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem("auth_token");
      const userId = await AsyncStorage.getItem("user_id");
      const empCode = await AsyncStorage.getItem("user_emp_code");
      if (!token) {
        Alert.alert(t("User not authenticated"));
        setIsLoading(false);
        return;
      }

      const result = await requestPhpPaidLeave({
        token,
        userId,
        empCode,
        leaveDate: formatLocalDateKey(leaveDate),
        reason,
        address: currentAddress,
      });
      setIsLoading(false);

      if (isPhpSuccess(result) || result.status === 200 || result.status === 'SUCCESS' || !result.error) {
        navigation.goBack();
        // Optional: show alert after a short delay
        setReason(""); // clear input
        setTimeout(() => {
          Alert.alert(t("Success"), result.message || t("Leave submitted successfully."));
        }, 300);

      } else {
        Alert.alert(t("Error"), result.message || t("Failed to submit leave"));
      }
    } catch (err) {
      console.warn(err);
      setIsLoading(false);
      Alert.alert(t("Error"), t("Failed to send leave request"));
    }
  };

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate("Notification");

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => navigation.navigate("PreHome", { screen: "PaymentLeave" })}
      />

      <LinearGradient
        colors={[SCREEN_BG, SCREEN_BG]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <LinearGradient
          colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.greeting}>{t('Hi')}, {formatName(UserName, 1)}</Text>

          <Text style={[styles.label, styles.heroLabel]}>
            {t('Please write your reason below as to why you are requesting Paid Leave.')}
          </Text>
        </LinearGradient>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>{t('PAID LEAVE REQUEST')}</Text>

        {/* Leave Date Picker */}
        <Text style={styles.label}>{t('Select Leave Date *')}</Text>
        <TouchableOpacity
          style={[styles.reasonBox, styles.dateButton]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: TEXT_DARK, fontSize: 16, fontWeight: '600' }}>{leaveDate.toDateString()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={leaveDate}
            mode="date"
            display="default"
            minimumDate={(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d; })()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setLeaveDate(selectedDate);
            }}
          />
        )}

        {/* Reason Input */}
        <LinearGradient
          colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.reasonBox}
        >
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={t('Please write your reason...')}
            placeholderTextColor="#FFFFFF"
            style={styles.input}
            multiline
          />
        </LinearGradient>

        {/* Current Info */}
        <Text style={styles.info}>{currentTime}</Text>
        <Text style={styles.info}>{currentAddress}</Text>

        {/* Send Button */}
        {isLoading ? (
          <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity style={styles.sendBtn} onPress={sendLeave}>
            <Text style={styles.sendBtnText}>{t('Send')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  background: { flex: 1 },
  content: { alignItems: 'center', paddingTop: 14, paddingBottom: 140 },
  heroCard: {
    width: CARD_WIDTH,
    minHeight: 92,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: colors.border,
  },
  greeting: { fontSize: 17, lineHeight: 22, fontWeight: "900", color: TEXT_DARK },
  label: { width: CARD_WIDTH, fontSize: 15, lineHeight: 20, fontWeight: "700", color: TEXT_DARK, marginTop: 10 },
  heroLabel: { width: 'auto' },
  sectionTitle: { width: CARD_WIDTH, fontSize: 18, fontWeight: "900", color: TEXT_DARK, marginTop: 20, marginBottom: 10 },
  reasonBox: {
    width: CARD_WIDTH,
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: colors.border,
  },
  dateButton: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 10,
    backgroundColor: INPUT_BG,
  },
  input: { color: TEXT_DARK, fontSize: 15, padding: 12, minHeight: 80, textAlignVertical: "top", backgroundColor: INPUT_BG, borderRadius: 16 },
  info: { width: CARD_WIDTH, marginTop: 10, color: '#FFFFFF', fontSize: 15, fontWeight: "600" },
  sendBtn: { alignSelf: "center", marginTop: 20, marginBottom: 40, backgroundColor: ACCENT, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, minWidth: 150 },
  sendBtnText: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
});
