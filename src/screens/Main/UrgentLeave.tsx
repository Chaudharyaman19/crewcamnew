import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  Dimensions,
} from "react-native";
import Geolocation from "react-native-geolocation-service";
import { API_BASE_URL } from '@env';
import { formattedDateTime } from "../../utils/dateTime";
import CustomHeader from "../../components/CustomHeader";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import LinearGradient from "react-native-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";
import { isPhpSuccess, requestPhpUrgentLeave } from "../../services/phpApi";
import { colors } from "../../theme";

const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;
const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 64;

type RootStackParamList = {
  DailyAttendance: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function UrgentLeaveScreen() {
  const { t, formatName } = useLanguage();
  const { userData } = useContext(AuthContext);
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(formattedDateTime());
  const [UserName, setUserName] = useState<string | null>(userData.firstname);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState(t("Fetching address..."));
  const navigation = useNavigation<NavigationProp>();

  const [showFL, setShowFL] = useState(false);
  const [showML, setShowML] = useState(false);
  const [showEL, setShowEL] = useState(false);
  const [rulesReady, setRulesReady] = useState(false);
  const [shiftInTime, setShiftInTime] = useState("09:00:00");
  const [empTiming, setEmpTiming] = useState(0);
  const [multiTime, setMultiTime] = useState<any>(null);

  useEffect(() => {
    if (userData.firstname) {
      setUserName(userData.firstname);
    }
    updateTimeAndRules();
    fetchProfileAndRules();
    getCurrentLocation();
    const interval = setInterval(updateTimeAndRules, 60000);
    return () => clearInterval(interval);
    // Preserve the existing mount-time profile/location refresh behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.firstname]);

  const fetchProfileAndRules = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const userId = await AsyncStorage.getItem("user_id");
      const empCode = await AsyncStorage.getItem("user_emp_code");

      const res = await fetch(`${API_BASE_URL}/app-profile/me?token=${encodeURIComponent(token || "")}&id=${encodeURIComponent(userId || "")}&empCode=${encodeURIComponent(empCode || "")}`);
      const data = await res.json();

      if (!data.error && data.user) {
        setUserName(data.user.firstName || data.user.name);
        if (data.user.emp_intime) setShiftInTime(data.user.emp_intime);
        setEmpTiming(data.user.emp_timing);
        setMultiTime(data.user.multi_time);

        calculateRules(data.user.emp_intime, data.user.emp_timing, data.user.multi_time);
      }
    } catch (err) {
      console.log("Profile fetch error:", err);
      updateTimeAndRules();
    }
  };

  const updateTimeAndRules = () => {
    calculateRules(shiftInTime, empTiming, multiTime);
  };

  const calculateRules = (_inTime: string, _timing: number, _multiTab: any) => {
    const d = new Date();
    setCurrentTime(formattedDateTime());

    // Use absolute IST time calculation to avoid device timezone issues
    const currentHoursUTC = d.getUTCHours();
    const currentMinutesUTC = d.getUTCMinutes();
    
    // IST is UTC + 5:30
    let istMinutesTotal = (currentHoursUTC * 60) + currentMinutesUTC + 330;
    if (istMinutesTotal >= 1440) {
      istMinutesTotal -= 1440; // Handle next day overlap
    }

    const currentISTHour = Math.floor(istMinutesTotal / 60);
    const currentISTMinute = istMinutesTotal % 60;

    console.log(`[LeaveLogic] Current IST Time: ${currentISTHour}:${currentISTMinute} (${istMinutesTotal} mins)`);

    // Rule 1: FL and ML available only till 9:00 AM (9 * 60 = 540 mins)
    const nineAMInMinutes = 9 * 60;
    const isFLMLVisible = istMinutesTotal <= nineAMInMinutes;

    // Rule 2: EL available only till 1:00 PM (13 * 60 = 780 mins)
    const onePMInMinutes = 13 * 60;
    const isELVisible = istMinutesTotal <= onePMInMinutes;

    console.log(`[LeaveLogic] isFLMLVisible: ${isFLMLVisible}, isELVisible: ${isELVisible}`);

    setShowFL(isFLMLVisible);
    setShowML(isFLMLVisible);
    setShowEL(isELVisible);
    setRulesReady(true);

    if (
      (leaveType === "FL" && !isFLMLVisible) ||
      (leaveType === "ML" && !isFLMLVisible) ||
      (leaveType === "EL" && !isELVisible)
    ) {
      setLeaveType("");
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(t("Location permission denied"));
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        setCurrentAddress(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
      },
      (error) => {
        console.log("Location error:", error);
        setCurrentAddress(t("Unable to fetch location"));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const sendLeaveRequest = async () => {
    if (!leaveType || !reason) {
      Alert.alert(t("Please select leave type and enter reason."));
      return;
    }
    if (!currentLocation) {
      Alert.alert(t("Fetching location. Please wait..."));
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert(t("User not authenticated"));
        setIsLoading(false);
        return;
      }

      const result = await requestPhpUrgentLeave({
        token,
        leaveType,
        reason: reason.trim(),
        lat: currentLocation.lat.toString(),
        longt: currentLocation.lng.toString(),
      });
      setIsLoading(false);

      if (isPhpSuccess(result) || result.error === false) {
        navigation.goBack();
        setTimeout(() => {
          Alert.alert(t("Success"), result.message || t("Urgent leave submitted successfully."));
          setLeaveType("");
          setReason("");
        }, 300);
      } else {
        Alert.alert(t("Error"), result.message || t("Something went wrong"));
      }
    } catch (err) {
      setIsLoading(false);
      console.log(err);
      const message = err instanceof Error ? err.message : t("Something went wrong");
      Alert.alert(t("Error"), message);
    }
  };

  const RadioBtn = ({ label }: { label: string }) => (
    <TouchableOpacity
      style={styles.radioWrap}
      onPress={() => setLeaveType(leaveType === label ? "" : label)}
    >
      <View style={[styles.radioOuter, leaveType === label && styles.radioSelectedOuter]}>
        {leaveType === label && <View style={styles.radioInner} />}
      </View>
      <Text style={[styles.radioLabel, leaveType === label && styles.radioSelectedText]}>{label}</Text>
    </TouchableOpacity>
  );

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notification');

  const isFormValid = !!(leaveType && reason.trim().length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <LinearGradient
          colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.greeting}>{t('Hi')}, {formatName(UserName, 1)}</Text>
          <Text style={styles.label}>
            {t('Please write your reason below as to why you are requesting Urgent Leave.')}
          </Text>
        </LinearGradient>

        <View style={styles.radioRow}>
          {showFL && <RadioBtn label="FL" />}
          {showML && <RadioBtn label="ML" />}
          {showEL && <RadioBtn label="EL" />}
          {!rulesReady && (
            <Text style={styles.checkingText}>
              {t('Checking urgent leave options...')}
            </Text>
          )}
          {rulesReady && !showFL && !showML && !showEL && (
            <Text style={styles.unavailableText}>
              {t('Urgent leave options are not available at this time.')}
            </Text>
          )}
        </View>

        <LinearGradient
          colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.formBox}
        >
          <Text style={styles.sectionTitle}>{t('URGENT LEAVE REQUEST')}</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={t('Please write your reason...')}
            placeholderTextColor="#FFFFFF"
            style={styles.input}
            multiline
          />
        </LinearGradient>

        <LinearGradient
          colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.infoCard}
        >
          <Text style={styles.infoLabel}>{t('Time')}</Text>
          <Text style={styles.info}>{currentTime}</Text>
          {currentLocation && (
            <>
              <View style={styles.divider} />
              <Text style={styles.infoLabel}>{t('Coordinates')}</Text>
              <Text style={styles.info}>Lat: {currentLocation.lat}, Lng: {currentLocation.lng}</Text>
            </>
          )}
          <View style={styles.divider} />
          <Text style={styles.infoLabel}>{t('Address')}</Text>
          <Text style={styles.info}>{currentAddress}</Text>
        </LinearGradient>
      </ScrollView>

      {/* Fixed Send Button at bottom */}
      <View style={styles.sendBtnContainer}>
        <TouchableOpacity
          style={[styles.sendBtn, !isFormValid && styles.disabledBtn]}
          onPress={sendLeaveRequest}
          disabled={isLoading || !isFormValid}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.sendBtnText}>{t('Send')}</Text>
          )}
        </TouchableOpacity>
      </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  background: { flex: 1 },
  content: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 120,
  },
  hero: {
    width: CARD_WIDTH,
    minHeight: 88,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.62,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    marginBottom: 14,
    justifyContent: "center",
  },
  greeting: { fontSize: 15, fontWeight: "800", color: TEXT_DARK },
  label: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: "#FFFFFF", marginTop: 5 },
  radioRow: { flexDirection: "row", marginTop: 2, marginBottom: 14, gap: 18, alignItems: "center", flexWrap: "wrap" },
  radioWrap: { flexDirection: "row", alignItems: "center" },
  radioOuter: { height: 20, width: 20, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioSelectedOuter: { borderColor: ACCENT },
  radioInner: { height: 10, width: 10, borderRadius: 5, backgroundColor: ACCENT },
  radioLabel: { color: TEXT_DARK, marginLeft: 8, fontSize: 15 },
  radioSelectedText: { fontWeight: "bold" },
  checkingText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  unavailableText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  formBox: {
    width: CARD_WIDTH,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.62,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: TEXT_DARK, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: 10, fontSize: 15, color: TEXT_DARK, minHeight: 80, textAlignVertical: "top", backgroundColor: "#132746" },
  infoCard: {
    width: CARD_WIDTH,
    marginTop: 14,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: colors.border,
    shadowColor: ACCENT,
    shadowOpacity: 0.62,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  infoLabel: { color: TEXT_DARK, fontSize: 15, fontWeight: "800" },
  info: { marginTop: 5, color: "#FFFFFF", fontSize: 15, lineHeight: 21, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#55e6ee", marginVertical: 12 },
  sendBtnContainer: { position: "absolute", bottom: 0, width: "100%", padding: 12, backgroundColor: colors.headerBg },
  sendBtn: { backgroundColor: ACCENT, paddingVertical: 12, borderRadius: 25, alignItems: "center", alignSelf: "center", minWidth: 150, shadowColor: ACCENT, shadowOpacity: 0.65, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  disabledBtn: { opacity: 0.55 },
  sendBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
