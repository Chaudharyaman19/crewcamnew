import { API_BASE_URL } from '@env';
// CreateMoMMeetingScreen.js

import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import DropDownPicker from "react-native-dropdown-picker";
import { AuthContext } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

import { colors, spacing } from "../../theme";
import LinearGradient from "react-native-linear-gradient";
const logo = require("../../assets/dashboardmainscreen/crewcamlogoremovebgpreview.png");

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 20;
const ACCENT = "#55e6ee";
const SCREEN_BG = "#132746";

export default function CreateMoMMeetingScreen({ navigation }: any) {
  const { userData } = useContext(AuthContext);
  const { t, formatName } = useLanguage();
  const route = useRoute();

  const { meetingId } = route.params as { meetingId: string };
  const [loading, setLoading] = useState(true);

  const [titleOpen, setTitleOpen] = useState(false);
  const [titleValue, setTitleValue] = useState("Mr.");
  const [titleItems, setTitleItems] = useState([
    { label: "Mr.", value: "Mr." },
    { label: "Ms.", value: "Ms." },
    { label: "Dr.", value: "Dr." },
  ]);

  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyValue, setCompanyValue] = useState("");
  const [companyItems, setCompanyItems] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    designation: "",
    mobile: "",
    phone: "",
    email: "",
    address: "",
    country: "India",
    pincode: "",
    startTime: "",
    endTime: "",
    city: "",
    state: "",
    agenda: "",
  });

  useEffect(() => {
    fetchMeetingDetails();
    // Preserve the existing detail refresh behavior for the selected meeting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const fetchMeetingDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('user_id');
      const empCode = await AsyncStorage.getItem('user_emp_code');
      const response = await fetch(`${API_BASE_URL}/app-api/meeting/history?token=${encodeURIComponent(token || '')}&id=${encodeURIComponent(userId || '')}&empCode=${encodeURIComponent(empCode || '')}`);
      const data = await response.json();
      if (data.status === 'success') {
        const meeting = data.meetings.find((m: any) => m._id === meetingId);
        if (meeting) {
          setForm({
            name: meeting.contactPerson || "",
            designation: meeting.designation || "",
            mobile: meeting.mobileNo || "",
            phone: meeting.alternateNo || "",
            email: meeting.email || "",
            address: meeting.clientAddress || "",
            country: "India",
            pincode: meeting.pinCode || "",
            startTime: meeting.meetingTime || "",
            endTime: "",
            city: meeting.city || "",
            state: "",
            agenda: meeting.meetingAgenda || "",
          });
          setCompanyValue(meeting.clientName);
          setCompanyItems([{ label: meeting.clientName, value: meeting.clientName }]);
        }
      }
    } catch (error) {
      console.error("Fetch Meeting Details Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    const meetingDetails = {
      ...form,
      title: titleValue,
      company: companyValue,
    };
    console.log("Form data sent to next screen:", meetingDetails);


    navigation.navigate("MoMDetailsScreen", { details: meetingDetails, meetingId });
  };

  const handleReset = () => {
    setForm({
      name: "",
      designation: "",
      mobile: "",
      phone: "",
      email: "",
      address: "",
      country: "",
      pincode: "",
      startTime: "",
      endTime: "",
      city: "",
      state: "",
      agenda: "",
    });
    setTitleValue("Mr.");
    setCompanyValue("SHEELA FOAM Ltd.");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={[SCREEN_BG, "#1f456f"]} style={styles.loadingBg}>
          <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 50 }} />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.left}>
          <Image source={logo} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.right} />
      </View>
      <LinearGradient colors={[SCREEN_BG, "#1f456f"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.formCard}>
        <Text style={styles.greeting}>{t('Hi')} {formatName(userData.firstname, 1)}</Text>
        <Text style={styles.subText}>
          You can make the final changes to the details below before making the
          meeting minutes.
        </Text>

        <Text style={styles.titleText}>MoM - {companyValue}</Text>
        <Text style={styles.companyText}>{companyValue}</Text>
        <View style={styles.divider} />


        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8, zIndex: 1000 }}>
            <DropDownPicker
              open={titleOpen}
              value={titleValue}
              items={titleItems}
              setOpen={setTitleOpen}
              setValue={setTitleValue}
              setItems={setTitleItems}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={{ color: "#FFFFFF" }}
              listItemLabelStyle={{ color: "#666" }}
              listMode="MODAL"
            />
          </View>

          <View style={{ flex: 1, zIndex: 999 }}>
            <DropDownPicker
              open={companyOpen}
              value={companyValue}
              items={companyItems}
              setOpen={setCompanyOpen}
              setValue={setCompanyValue}
              setItems={setCompanyItems}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={{ color: "#FFFFFF" }}
              listItemLabelStyle={{ color: "#666" }}
              listMode="MODAL"
            />
          </View>
        </View>

        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(v) => handleChange("name", v)}
        />

        <TextInput
          style={styles.input}
          value={form.designation}
          onChangeText={(v) => handleChange("designation", v)}
        />


        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={form.mobile}
            keyboardType="phone-pad"
            onChangeText={(v) => handleChange("mobile", v)}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.phone}
            keyboardType="phone-pad"
            onChangeText={(v) => handleChange("phone", v)}
          />
        </View>


        <TextInput
          style={styles.input}
          value={form.email}
          keyboardType="email-address"
          onChangeText={(v) => handleChange("email", v)}
        />

        {/* Address */}
        <TextInput
          style={styles.input}
          value={form.address}
          onChangeText={(v) => handleChange("address", v)}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={form.country}
            onChangeText={(v) => handleChange("country", v)}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.pincode}
            keyboardType="numeric"
            onChangeText={(v) => handleChange("pincode", v)}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={form.state}
            onChangeText={(v) => handleChange("state", v)}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.city}
            onChangeText={(v) => handleChange("city", v)}
          />
        </View>


        <View style={[styles.row, styles.timeRow]}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={form.startTime}
            onChangeText={(v) => handleChange("startTime", v)}
          />
          <Text style={styles.toText}>to</Text>
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 8 }]}
            value={form.endTime}
            onChangeText={(v) => handleChange("endTime", v)}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.agenda}
            keyboardType="email-address"
            onChangeText={(v) => handleChange("agenda", v)}
          />
        </View>
        {/* Buttons Row */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.smallBtn} onPress={handleSave}>
            <Text style={styles.smallBtnText}>Next</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleReset}
          >
            <Text style={[styles.smallBtnText, styles.resetBtnText]}>Reset</Text>
          </TouchableOpacity>
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
  loadingBg: { flex: 1 },
  container: { alignItems: "center", paddingTop: 5, paddingBottom: 20 },
  formCard: {
    width: CARD_WIDTH,
    backgroundColor: "rgba(19,39,70,0.95)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 5,
    borderWidth: 1,
    borderColor: "rgba(85,230,238,0.24)",
  },
  greeting: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  subText: { color: "#FFFFFF", fontSize: 12, lineHeight: 15, marginBottom: 5 },
  titleText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", marginBottom: 2 },
  companyText: { color: "#FFFFFF", fontSize: 12, marginBottom: 6 },
  divider: {
    height: 1,
    backgroundColor: "rgba(231,169,61,0.3)",
    marginBottom: 5,
  },
  header: {
    height: 46,
    backgroundColor: colors.headerBg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  right: { flexDirection: "row", alignItems: "center" },
  logoImage: {
    width: 132,
    height: 34,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(85,230,238,0.24)",
    color: "#FFFFFF",
    fontSize: 13,
    paddingVertical: 4,
    marginBottom: 4,
  },
  timeRow: { alignItems: "center" },
  toText: { color: "#FFFFFF", marginHorizontal: 8, fontWeight: "400" },
  dropdown: {
    borderColor: "rgba(85,230,238,0.24)",
    borderWidth: 0,
    borderBottomWidth: 1,
    backgroundColor: "transparent",
    minHeight: 34,
    paddingHorizontal: 0,
  },
  dropdownContainer: {
    borderColor: "rgba(85,230,238,0.24)",
    backgroundColor: colors.panel,
    zIndex: 1000,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  smallBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 18,
    minWidth: 96,
    alignItems: "center",
    borderWidth: 1,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
  },
  resetBtn: {
    backgroundColor: 'rgba(19,39,70,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 18,
    minWidth: 96,
    alignItems: "center",
    borderWidth: 1,
    borderColor: ACCENT,
  },
  smallBtnText: {
    color: SCREEN_BG,
    fontSize: 13,
    fontWeight: "800",
  },
  resetBtnText: {
    color: ACCENT,
  },
});
