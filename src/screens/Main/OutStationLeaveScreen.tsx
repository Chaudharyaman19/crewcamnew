import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { StackNavigationProp } from "@react-navigation/stack";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { colors } from "../../theme";
import CustomHeader from "../../components/CustomHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from '@env';
import LinearGradient from "react-native-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";
import { fetchPhpEmployeeList, normalizePhpEmployeeList } from "../../services/phpApi";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 64;
const ACCENT = colors.accent;
const SCREEN_BG = "#132746";
const SURFACE_YELLOW = "#132746";
const SURFACE_YELLOW_DEEP = "#132746";
const INPUT_BG = "#132746";
const TEXT_DARK = colors.black;

type RootStackParamList = {
  OutstationLeave: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
};

type OutStationLeaveScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "OutstationLeave"
>;

const OutStationLeaveScreen = () => {
  const { t, formatName } = useLanguage();
  const navigation = useNavigation<OutStationLeaveScreenNavigationProp>();
  const [userName, setUserName] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchName = async () => {
      const name = await AsyncStorage.getItem("user_firstname");
      if (name) setUserName(name);
    };
    fetchName();
  }, []);

  // form states
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [reason, setReason] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [relation, setRelation] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [designation, setDesignation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  const [employees, setEmployees] = useState<any[]>([]);


  const countries = [
    { id: "India", name: "India" },
    { id: "USA", name: "USA" },
  ];

  const statesData: Record<string, { id: string; name: string }[]> = {
    India: [
      { id: "Uttar Pradesh", name: "Uttar Pradesh" },
      { id: "Delhi", name: "Delhi" },
      { id: "Maharashtra", name: "Maharashtra" },
      { id: "Karnataka", name: "Karnataka" },
      { id: "Rajasthan", name: "Rajasthan" },
      { id: "Gujarat", name: "Gujarat" },
      { id: "Haryana", name: "Haryana" },
      { id: "Punjab", name: "Punjab" },
      { id: "Bihar", name: "Bihar" },
      { id: "West Bengal", name: "West Bengal" },
      { id: "Madhya Pradesh", name: "Madhya Pradesh" },
      { id: "Tamil Nadu", name: "Tamil Nadu" },
    ],
    USA: [
      { id: "California", name: "California" },
      { id: "New York", name: "New York" },
    ],
  };

  const citiesData: Record<string, { id: string; name: string }[]> = {
    "Uttar Pradesh": [
      { id: "Ghaziabad", name: "Ghaziabad" },
      { id: "Lucknow", name: "Lucknow" },
      { id: "Noida", name: "Noida" },
      { id: "Agra", name: "Agra" },
      { id: "Kanpur", name: "Kanpur" },
      { id: "Varanasi", name: "Varanasi" },
      { id: "Meerut", name: "Meerut" },
      { id: "Allahabad", name: "Allahabad" },
    ],
    Delhi: [
      { id: "New Delhi", name: "New Delhi" },
      { id: "South Delhi", name: "South Delhi" },
      { id: "East Delhi", name: "East Delhi" },
      { id: "North Delhi", name: "North Delhi" },
    ],
    Maharashtra: [
      { id: "Mumbai", name: "Mumbai" },
      { id: "Pune", name: "Pune" },
      { id: "Nagpur", name: "Nagpur" },
      { id: "Nashik", name: "Nashik" },
    ],
    Karnataka: [
      { id: "Bengaluru", name: "Bengaluru" },
      { id: "Mysore", name: "Mysore" },
      { id: "Mangaluru", name: "Mangaluru" },
    ],
    Rajasthan: [
      { id: "Jaipur", name: "Jaipur" },
      { id: "Jodhpur", name: "Jodhpur" },
      { id: "Udaipur", name: "Udaipur" },
      { id: "Kota", name: "Kota" },
    ],
    Gujarat: [
      { id: "Ahmedabad", name: "Ahmedabad" },
      { id: "Surat", name: "Surat" },
      { id: "Vadodara", name: "Vadodara" },
      { id: "Rajkot", name: "Rajkot" },
    ],
    Haryana: [
      { id: "Gurugram", name: "Gurugram" },
      { id: "Faridabad", name: "Faridabad" },
      { id: "Ambala", name: "Ambala" },
    ],
    Punjab: [
      { id: "Amritsar", name: "Amritsar" },
      { id: "Ludhiana", name: "Ludhiana" },
      { id: "Chandigarh", name: "Chandigarh" },
    ],
    Bihar: [
      { id: "Patna", name: "Patna" },
      { id: "Gaya", name: "Gaya" },
      { id: "Muzaffarpur", name: "Muzaffarpur" },
    ],
    "West Bengal": [
      { id: "Kolkata", name: "Kolkata" },
      { id: "Howrah", name: "Howrah" },
      { id: "Siliguri", name: "Siliguri" },
    ],
    "Madhya Pradesh": [
      { id: "Bhopal", name: "Bhopal" },
      { id: "Indore", name: "Indore" },
      { id: "Jabalpur", name: "Jabalpur" },
    ],
    "Tamil Nadu": [
      { id: "Chennai", name: "Chennai" },
      { id: "Coimbatore", name: "Coimbatore" },
      { id: "Madurai", name: "Madurai" },
    ],
    California: [
      { id: "Los Angeles", name: "Los Angeles" },
      { id: "San Francisco", name: "San Francisco" },
    ],
    "New York": [
      { id: "New York City", name: "New York City" },
      { id: "Buffalo", name: "Buffalo" },
    ],
  };

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notifications');


  const fetchEmployees = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const data = await fetchPhpEmployeeList({token});
      setEmployees(normalizePhpEmployeeList(data));
    } catch (err) {
      console.log('Error fetching employees:', err);
    }
  };

  React.useEffect(() => {
    fetchEmployees();
  }, []);

  const handleReset = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setReason("");
    setAddress("");
    setCountry("");
    setState("");
    setCity("");
    setPincode("");
    setContactNo("");
    setRelation("");
    setEmployeeName("");
    setDesignation("");
  };

  const handleSend = async () => {
    if (isSubmitting) return;

    if (!startDate || !reason || !address) {
      Alert.alert(t("Error"), t("Please fill all required (*) fields."));
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem("auth_token");
      const userId = await AsyncStorage.getItem("user_id");
      const empCode = await AsyncStorage.getItem("user_emp_code");
      const responsibleEmp = employees.find((emp) => emp.name === employeeName);

      const payload = {
        token,
        id: userId,
        empCode,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        reason,
        address,
        country,
        state,
        city,
        pincode,
        contactNo,
        relation,
        employeeName,
        responsibleEmployee: employeeName,
        responsibleEmpId: responsibleEmp?.id || "",
        designation
      };

      const res = await fetch(`${API_BASE_URL}/app-api/leave/outstation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === "SUCCESS") {
        Alert.alert(t("Success"), t("Outstation Leave request submitted successfully!"));
        handleReset();
        navigation.goBack();
      } else {
        Alert.alert(t("Error"), data.message || t("Failed to submit request."));
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert(t("Error"), error.message || t("An error occurred while submitting."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => {
          navigation.navigate('PreHome', { screen: 'PaymentLeave' });
        }}
      />
      <LinearGradient colors={[SCREEN_BG, SCREEN_BG]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={styles.header}>{t('Hi')}, {formatName(userName)}</Text>
          <Text style={styles.subHeader}>
            {t('Please write your reason below as to why you are requesting Outstation Leave.')}
          </Text>
        </View>

        <View style={styles.formCard}>
        <Text style={styles.title}>{t('OUTSTATION LEAVE REQUEST')}</Text>

        <View style={styles.row}>
          <View style={styles.inputBox}>
            <Text style={styles.label}>{t('Leave start date *')}</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={{ color: TEXT_DARK, fontWeight: '600' }}>
                {startDate.toDateString()}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartPicker(false);
                  if (selectedDate) setStartDate(selectedDate);
                }}
              />
            )}
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.label}>{t('Leave end date *')}</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={{ color: TEXT_DARK, fontWeight: '600' }}>
                {endDate.toDateString()}
              </Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndPicker(false);
                  if (selectedDate) setEndDate(selectedDate);
                }}
              />
            )}
          </View>
        </View>

        <Text style={styles.label}>
          {t('Please Provide a Reason For Your Outstation Leave *')}
        </Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder={t('Enter reason')}
          value={reason}
          placeholderTextColor="#FFFFFF"
          onChangeText={setReason}
          multiline
        />

        <Text style={styles.sectionTitle}>
          {t('Your Address And Contact Details During Leaves ?*')}
        </Text>
        <Text style={styles.label}>{t('Address during your leave *')}</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder={t('Enter address')}
          placeholderTextColor="#FFFFFF"
          value={address}
          onChangeText={setAddress}
          multiline
        />

        <View style={styles.row}>
          <View style={styles.inputBox}>
            <Text style={styles.label}>{t('Country *')}</Text>
            <Picker
              selectedValue={country}
              onValueChange={(val) => {
                setCountry(val);
                setState("");
                setCity("");
              }}
              style={styles.picker}
              dropdownIconColor={TEXT_DARK}
            >
              <Picker.Item label={t('Select Country')} value="" color="#FFFFFF" />
              {countries.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.name} />
              ))}
            </Picker>
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.label}>{t('State *')}</Text>
            <Picker
              selectedValue={state}
              onValueChange={(val) => {
                setState(val);
                setCity("");
              }}
              style={styles.picker}
              dropdownIconColor={TEXT_DARK}
              enabled={country !== ""}
            >
              <Picker.Item label={t('Select State')} value="" color="#FFFFFF" />
              {statesData[country]?.map((s) => (
                <Picker.Item key={s.id} label={s.name} value={s.name} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.inputBox}>
            <Text style={styles.label}>{t('City *')}</Text>
            <Picker
              selectedValue={city}
              onValueChange={(val) => setCity(val)}
              style={styles.picker}
              dropdownIconColor={TEXT_DARK}
              enabled={state !== ""}
            >
              <Picker.Item label={t('Select City')} value="" color="#FFFFFF" />
              {citiesData[state]?.map((ct) => (
                <Picker.Item key={ct.id} label={ct.name} value={ct.name} />
              ))}
            </Picker>
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.label}>{t('Pincode *')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Pincode')}
              value={pincode}
              placeholderTextColor="#FFFFFF"
              onChangeText={setPincode}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.inputBox}>
            <Text style={styles.label}>{t('Contact No. *')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Enter contact number')}
              value={contactNo}
              onChangeText={setContactNo}
              keyboardType="phone-pad"
              placeholderTextColor="#FFFFFF"
            />
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.label}>{t('Relation with contact no. *')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Relation')}
              value={relation}
              onChangeText={setRelation}
              placeholderTextColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {t('Who Has Taken Responsibility For Work During Your Leaves ?')}
        </Text>
        <View style={styles.row}>
          <View style={styles.inputBox}>
            <Text style={styles.label}>{t('Employee Name')}</Text>
            <Picker
              selectedValue={employeeName}
              onValueChange={(value, index) => {
                setEmployeeName(value);
                setDesignation(employees[index - 1]?.designation || "");
              }}
              style={[
                styles.picker,
                { color: employeeName === "" ? "#FFFFFF" : TEXT_DARK },
              ]}
              dropdownIconColor={TEXT_DARK}
            >
              <Picker.Item
                label={t('Select Employee')}
                value=""
                style={{ color: TEXT_DARK }}
              />
	              {employees.map((emp) => (
	                <Picker.Item key={emp.id} label={formatName(emp.name)} value={emp.name} />
	              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.fullInputBox}>
          <Text style={styles.label}>{t('Designation')}</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#FFFFFF"
            value={designation}
            editable={false}
          />
        </View>

	        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.sendBtn, isSubmitting && styles.disabledBtn]}
            onPress={handleSend}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>{isSubmitting ? t("SENDING...") : t("SEND")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={[styles.btnText, styles.resetText]}>{t('RESET')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  gradient: { flex: 1 },
  scrollContent: {
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 26,
  },
  heroCard: {
    width: CARD_WIDTH,
    backgroundColor: SURFACE_YELLOW,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formCard: {
    width: CARD_WIDTH,
    backgroundColor: SURFACE_YELLOW_DEEP,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { fontSize: 18, fontWeight: "bold", color: TEXT_DARK, marginBottom: 5 },
  subHeader: { fontSize: 13, color: "#FFFFFF", lineHeight: 19, fontWeight: "600" },
  title: { fontSize: 16, fontWeight: "bold", color: TEXT_DARK, marginBottom: 10 },
  sectionTitle: {
    marginTop: 15,
    marginBottom: 5,
    fontWeight: "bold",
    color: TEXT_DARK,
    borderBottomWidth: 1,
    borderColor: "#FFFFFF",
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  inputBox: { flex: 1, marginBottom: 10 },
  fullInputBox: { width: "100%", marginBottom: 10 },
  label: { color: TEXT_DARK, fontSize: 13, paddingBottom: 5, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 0,
    minHeight: 48,
    lineHeight: 20,
    textAlignVertical: "center",
    backgroundColor: INPUT_BG,
    color: TEXT_DARK,
  },
  picker: {
    height: 48,
    backgroundColor: INPUT_BG,
    color: TEXT_DARK,
    borderRadius: 10,
  },
  btnRow: {
    width: CARD_WIDTH,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 16,
  },
  sendBtn: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: "center",
    marginRight: 8,
  },
  disabledBtn: {
    opacity: 0.55,
  },
  resetBtn: {
    flex: 1,
    backgroundColor: '#55e6ee',
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  btnText: { color: TEXT_DARK, fontWeight: "800" },
  resetText: { color: TEXT_DARK },
});

export default OutStationLeaveScreen;
