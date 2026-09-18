import { API_BASE_URL } from '@env';
// MoMDetailsScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { colors, spacing } from "../../theme";
import { Alert, ActivityIndicator } from "react-native";
import LinearGradient from "react-native-linear-gradient";

const logo = require("../../assets/dashboardmainscreen/crewcamlogoremovebgpreview.png");
const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 20;
const ACCENT = "#55e6ee";
const SCREEN_BG = "#132746";

// --- Initial Attendee Structure ---
const initialAttendee = {
  contactPerson: '',
  designation: '',
  mobileNo: '',
  alternateNo: '',
  emailId: '',
};

type Attendee = typeof initialAttendee;

export default function MoMDetailsScreen({ navigation, route }: any) {
  const { meetingId } = route.params || {};

  // --- State ---
  const [minutesList, setMinutesList] = useState<string[]>(['']);
  const [attendees, setAttendees] = useState<Attendee[]>([{ ...initialAttendee }]);
  const [saving, setSaving] = useState(false);

  // --- Minutes Handlers ---
  const handleMinuteChange = ({ text, index }: { text: string; index: number }) => {
    const newMinutesList = [...minutesList];
    newMinutesList[index] = text;
    setMinutesList(newMinutesList);
  };

  const handleAddMinute = () => {
    setMinutesList([...minutesList, '']);
  };

  const handleRemoveMinute = (index: number) => {
    setMinutesList(minutesList.filter((_, i) => i !== index));
  };

  // --- Attendee Handlers ---
  const handleAttendeeChange = ({
    key,
    text,
    index
  }: { key: keyof Attendee; text: string; index: number }) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], [key]: text };
    setAttendees(newAttendees);
  };

  const handleAddAttendee = () => {
    setAttendees([...attendees, { ...initialAttendee }]);
  };

  const handleRemoveAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  // --- Navigation Handlers ---
  const handleBack = () => navigation.goBack();
  const handleNext = async () => {
    const validMinutes = minutesList.filter(m => m.trim() !== '');
    if (validMinutes.length === 0) {
      Alert.alert("Required", "Please add at least one minute of meeting.");
      return;
    }

    try {
      setSaving(true);
      const momText = validMinutes.join("\n- ");

      const payload = {
        meetingId,
        status: "Completed",
        mom: "Meeting Minutes:\n- " + momText,
      };

      const response = await fetch(`${API_BASE_URL}/app-api/meeting/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.error) {
        Alert.alert('Success', 'MoM saved successfully.');
        navigation.navigate('MeetingHistory');
      } else {
        Alert.alert('Error', result.message || 'Failed to save MoM');
      }
    } catch (error) {
      console.error('Save MoM Error:', error);
      Alert.alert('Error', 'Connection failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // --- Render Items ---
  const renderMinuteItem = ({ minute, index }: { minute: string; index: number }) => (
    <View key={index} style={styles.minuteItemRow}>
      <TextInput
        style={styles.dynamicInput}
        placeholder="Please write here...."
        placeholderTextColor="rgba(231,169,61,0.7)"
        value={minute}
        multiline
        onChangeText={(text) => handleMinuteChange({ text, index })}
      />
      <View style={styles.minuteDeleteButtonContainer}>
        <TouchableOpacity onPress={() => handleRemoveMinute(index)}>
          <FontAwesomeIcon icon={faTrash} size={18} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAttendeeForm = ({ attendee, index }: { attendee: Attendee; index: number }) => (
    <View key={index} style={styles.attendeeForm}>
      <View style={styles.attendeeDeleteRow}>
        <View style={{ flex: 1 }} />
        {attendees.length > 1 && (
          <View style={styles.deleteButtonContainer}>
            <TouchableOpacity onPress={() => handleRemoveAttendee(index)}>
              <FontAwesomeIcon icon={faTrash} size={18} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TextInput
        style={[styles.input, styles.inputUnderline]}
        placeholder="Contact Person"
        placeholderTextColor="rgba(231,169,61,0.5)"
        value={attendee.contactPerson}
        onChangeText={(text) => handleAttendeeChange({ key: 'contactPerson', text, index })}
      />
      <TextInput
        style={[styles.input, styles.inputUnderline]}
        placeholder="Designation"
        placeholderTextColor="rgba(231,169,61,0.5)"
        value={attendee.designation}
        onChangeText={(text) => handleAttendeeChange({ key: 'designation', text, index })}
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputUnderline, { flex: 1, marginRight: 8 }]}
          placeholder="Mobile No."
          placeholderTextColor="rgba(231,169,61,0.5)"
          keyboardType="phone-pad"
          value={attendee.mobileNo}
          onChangeText={(text) => handleAttendeeChange({ key: 'mobileNo', text, index })}
        />
        <TextInput
          style={[styles.input, styles.inputUnderline, { flex: 1 }]}
          placeholder="Alternate No."
          placeholderTextColor="rgba(231,169,61,0.5)"
          keyboardType="phone-pad"
          value={attendee.alternateNo}
          onChangeText={(text) => handleAttendeeChange({ key: 'alternateNo', text, index })}
        />
      </View>
      <TextInput
        style={[styles.input, styles.inputUnderline]}
        placeholder="Email ID"
        placeholderTextColor="rgba(231,169,61,0.5)"
        keyboardType="email-address"
        value={attendee.emailId}
        onChangeText={(text) => handleAttendeeChange({ key: 'emailId', text, index })}
      />

      {index < attendees.length - 1 && <View style={styles.attendeeDivider} />}
    </View>
  );

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
        <Text style={styles.greeting}>Meeting Minutes</Text>
        <Text style={styles.subText}>
          Please write meeting minutes (MoM) & attendees contact details in the column below.
        </Text>

        {/* Minutes Section */}
        <View style={styles.minutesHeader}>
          <Text style={styles.minutesHeaderText}>Meeting Minutes (MoM)</Text>
          <TouchableOpacity onPress={handleAddMinute}>
            <View style={styles.addIconButton}>
              <FontAwesomeIcon icon={faPlus} size={14} color={SCREEN_BG} />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.horizontalLine} />
        {minutesList.map((minute, index) => renderMinuteItem({ minute, index }))}

        {/* Attendees Section */}
        <View style={styles.attendeesHeader}>
          <Text style={styles.attendeesText}>Meeting Attendees:</Text>
          <TouchableOpacity onPress={handleAddAttendee}>
            <Text style={styles.addMoreText}>Add more +</Text>
          </TouchableOpacity>
        </View>
        {attendees.map((attendee, index) => renderAttendeeForm({ attendee, index }))}

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, styles.nextBtn, saving && { opacity: 0.5 }]}
            onPress={handleNext}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={SCREEN_BG} /> : <Text style={styles.btnText}>SAVE & COMPLETE</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.backBtn]} onPress={handleBack} disabled={saving}>
            <Text style={[styles.btnText, styles.backBtnText]}>BACK</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  gradient: { flex: 1 },
  container: { alignItems: "center", paddingTop: 5, paddingBottom: 20, flexGrow: 1 },
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
  greeting: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginBottom: 3 },
  subText: { color: "#FFFFFF", fontSize: 12, lineHeight: 15, marginBottom: 7 },
  row: { flexDirection: "row", alignItems: "center" },
  header: { height: 46, backgroundColor: colors.headerBg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12 },
  left: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  right: { flexDirection: "row", alignItems: "center" },
  logoImage: { width: 132, height: 34 },
  minutesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  minutesHeaderText: { color: "#FFFFFF", fontSize: 14, fontWeight: '700' },
  addIconButton: { width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  horizontalLine: { height: 1, backgroundColor: 'rgba(85,230,238,0.3)', marginTop: 4, marginBottom: 6 },
  minuteItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, backgroundColor: colors.panel, borderRadius: 8, paddingRight: 7, borderWidth: 1, borderColor: 'rgba(85,230,238,0.16)' },
  dynamicInput: { flex: 1, color: "#FFFFFF", fontSize: 13, paddingVertical: 5, paddingHorizontal: 8, minHeight: 32 },
  minuteDeleteButtonContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingVertical: 4 },
  deleteText: { color: '#e74c3c', fontSize: 12, marginRight: 4 },
  attendeesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7, marginBottom: 4 },
  attendeesText: { color: "#FFFFFF", fontSize: 14, fontWeight: '700' },
  addMoreText: { color: ACCENT, fontSize: 13, fontWeight: '800' },
  attendeeForm: { paddingVertical: 4 },
  input: { color: "#FFFFFF", fontSize: 13, paddingVertical: 4, marginBottom: 6 },
  inputUnderline: { borderBottomWidth: 1, borderBottomColor: 'rgba(85,230,238,0.24)' },
  attendeeDivider: { height: 1, backgroundColor: 'rgba(231,169,61,0.2)', marginVertical: 5 },
  attendeeDeleteRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 },
  deleteButtonContainer: { flexDirection: 'row', alignItems: 'center' },
  buttonRow: { flexDirection: "row", marginTop: 'auto', paddingTop: 8, justifyContent: 'flex-start', gap: 10 },
  btn: { paddingVertical: 8, paddingHorizontal: 22, borderRadius: 18, alignItems: "center", justifyContent: 'center', minWidth: 104, borderWidth: 1 },
  nextBtn: { backgroundColor: ACCENT, borderColor: ACCENT, shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.24, shadowRadius: 8, elevation: 4 },
  backBtn: { backgroundColor: 'rgba(19,39,70,0.95)', borderColor: ACCENT },
  btnText: { color: SCREEN_BG, fontSize: 13, fontWeight: "800" },
  backBtnText: { color: ACCENT },
});
