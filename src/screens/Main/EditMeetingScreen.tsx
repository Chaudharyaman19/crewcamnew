import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { colors } from '../../theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from '@env';
import { DrawerActions } from '@react-navigation/native';
import { formatMeetingDateForApi, formatMeetingTimeForApi } from '../../utils/meetingHelpers';

const logo = require("../../assets/dashboardmainscreen/crewcamlogoremovebgpreview.png");
const ACCENT = '#55e6ee';
const SCREEN_BG = '#132746';

// spacing helper
const spacing = (multiplier: number) => multiplier * 8;

// --- Custom Header ---
const CustomMeetingHeader = ({ onMenuPress }: { onMenuPress: () => void }) => (
  <View style={headerStyles.header}>
    <View style={headerStyles.leftContainer}>
      <TouchableOpacity onPress={onMenuPress} style={headerStyles.iconButton}>
        <Text style={headerStyles.iconPlaceholder}>☰</Text>
      </TouchableOpacity>
      <Image source={logo} style={styles.logoImage} resizeMode="contain" />
    </View>
    <View style={headerStyles.rightContainer}>
      <TouchableOpacity style={headerStyles.iconButton}>
        <Text style={headerStyles.iconPlaceholder}>🏠</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const headerStyles = StyleSheet.create({
  header: {
    height: 46,
    backgroundColor: colors.headerBg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 4,
  },
  iconPlaceholder: {
    color: colors.text,
    fontSize: 20,
  },
});

// Dummy Data
const DUMMY_MEETING_DATA : {
  [key: string]: {
    clientName: string;
    contactPerson: string;
    designation:string;
    mobile:string;
    alternate:string;
    venueDetails: string;
    date: string;
    time: string;
    agenda: string;
    status: string;
  };
} = {'m1': {
    clientName: 'SHEELA FOAM Ltd.',
    contactPerson: 'Vineet Mishra',
    designation: 'Team Manger – Retail',
    mobile: '9810994263',
    alternate: '0120-25692',
    venueDetails: 'PLOT NO 51 A, UDYOG VIHAR City Gre\n201306',
    date: '01 Jan',
    time: '05:30',
    agenda: 'Demo',
    status: 'Reschedule | Pending',
  },
};

const getInitialDateTime = (meeting?: any) => {
  const value = meeting?.meetingDate ? new Date(meeting.meetingDate) : new Date();
  const time = String(meeting?.meetingTime || '');
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isNaN(hours)) {
    value.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
  }
  return value;
};

export default function EditMeetingScreen({ navigation }: any) {
  const route = useRoute();
  const { meetingId, meetingData: routeMeetingData } = route.params as { meetingId: string; meetingData?: any };
  const meetingData = routeMeetingData
    ? {
      clientName: routeMeetingData.clientName || '',
      contactPerson: routeMeetingData.contactPerson || '',
      designation: routeMeetingData.designation || '',
      mobile: routeMeetingData.mobileNo || routeMeetingData.contactNo || '',
      alternate: routeMeetingData.alternateNo || '',
      venueDetails: [routeMeetingData.clientAddress, routeMeetingData.location, routeMeetingData.city, routeMeetingData.pinCode].filter(Boolean).join(', '),
      date: routeMeetingData.meetingDate ? new Date(routeMeetingData.meetingDate).toLocaleDateString() : '',
      time: routeMeetingData.meetingTime || '',
      agenda: routeMeetingData.meetingAgenda || '',
      status: routeMeetingData.status || '',
    }
    : DUMMY_MEETING_DATA[meetingId];

  const [selectedDate, setSelectedDate] = useState(() => getInitialDateTime(routeMeetingData));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        }
      } else {
        getCurrentLocation();
      }
    };
    requestLocationPermission();
  }, []);

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.log('Location error:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const onChangeDate = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const onChangeTime = (_: any, date?: Date) => {
    setShowTimePicker(false);
    if (date) setSelectedDate(date);
  };

  const handleUpdate = async () => {
    try {
      const payload: any = {
        meetingDate: formatMeetingDateForApi(selectedDate),
        meetingTime: formatMeetingTimeForApi(selectedDate),
      };

      if (currentLocation) {
        payload.lat = currentLocation.lat.toString();
        payload.longt = currentLocation.lng.toString();
      }

      const response = await fetch(`${API_BASE_URL}/app-api/meeting/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.error) {
        throw new Error(result?.message || 'Failed to update meeting');
      }
      Alert.alert('Updated', 'Meeting updated successfully.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update meeting');
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (!meetingData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CustomMeetingHeader onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())} />
        <View style={styles.container}>
          <Text style={[{ marginTop: spacing(4), textAlign: 'center' }]}>
            Meeting details not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomMeetingHeader onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Text style={styles.mainTitle}>Local Meeting Details</Text>

          {/* Company Name */}
          <View style={styles.horizontalSectionContainer}>
            <Text style={styles.horizontalSectionHeading}>Company Name :</Text>
            <Text style={styles.horizontalSectionText}>{meetingData.clientName}</Text>
          </View>

          {/* Contact Person */}
          <View style={styles.horizontalSectionContainer}>
            <Text style={styles.horizontalSectionHeading}>Contact Person :</Text>
            <Text style={styles.horizontalSectionText}>{meetingData.contactPerson}</Text>
          </View>

          {/* Designation */}
          <View style={styles.horizontalSectionContainer}>
            <Text style={styles.horizontalSectionHeading}>Designation :</Text>
            <Text style={styles.horizontalSectionText}>{meetingData.designation}</Text>
          </View>

          {/* Mobile and Alternate */}
          <View style={styles.horizontalSectionContainer}>
            <Text style={styles.horizontalSectionHeading}>Mobile :</Text>
            <Text style={styles.horizontalSectionText}>{meetingData.mobile}</Text>
          </View>
          <View style={styles.horizontalSectionContainer}>
            <Text style={styles.horizontalSectionHeading}>Alternate :</Text>
            <Text style={styles.horizontalSectionText}>{meetingData.alternate}</Text>
          </View>

          {/* Venue */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Meeting Venue</Text>
            <Text style={styles.sectionText}>{meetingData.venueDetails}</Text>
          </View>

          {/* Date & Time */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Meeting Date & Time</Text>
            <Text style={styles.sectionText}>
              {meetingData.date} | {meetingData.time}
            </Text>
          </View>

          {/* Agenda */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Meeting Agenda</Text>
            <Text style={styles.sectionText}>{meetingData.agenda}</Text>
          </View>

          {/* Status
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Status</Text>
            <Text style={styles.sectionText}>{meetingData.status}</Text>
          </View> */}

          {/* Update Section */}
          <Text style={styles.mainTitle}>Update Meeting Details</Text>

          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.buttonText}>
                🕒 {selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.buttonText}>
                📅 {selectedDate.toDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onChangeDate}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onChangeTime}
            />
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
              <Text style={styles.btnText}>UPDATE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={[styles.btnText, styles.cancelBtnText]}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 16,
  },
  logoImage: {
    width: 132,
    height: 34,
    marginLeft: 8,
  },
  mainTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  sectionContainer: {
    marginBottom: 6,
  },
  sectionHeading: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231,169,61,0.4)',
    paddingBottom: 3,
  },
  sectionText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  horizontalSectionContainer: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231,169,61,0.4)',
  },
  horizontalSectionHeading: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 88,
    marginRight: 6,
  },
  horizontalSectionText: {
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
    lineHeight: 18,
  },
  dateTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dateButton: {
    flex: 1,
    backgroundColor:  colors.panel,
    marginHorizontal: spacing(0.5),
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
    marginTop: 8,
  },
  updateBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 18,
    minWidth: 96,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelBtn: {
    backgroundColor: 'rgba(19,39,70,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 18,
    minWidth: 96,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ACCENT,
  },
  btnText: {
    color: SCREEN_BG,
    fontWeight: "800",
    fontSize: 13,
  },
  cancelBtnText: {
    color: ACCENT,
  },
});
