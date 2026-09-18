import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  FlatList,
  Keyboard,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from 'react-native-dropdown-picker';
import CustomHeader from '../../components/CustomHeader';
import { DrawerActions } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid } from 'react-native';
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE_URL } from '@env';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { formatMeetingDateForApi, formatMeetingTimeForApi } from '../../utils/meetingHelpers';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 14;
const SCREEN_BG = '#132746';

// Mock data for existing clients
const mockClients = [
  { id: '1', name: 'Tech Solutions Inc.', mobileNo: '9876543210', email: 'tech@example.com', clientAddress: '123 Main St, Andheri' },
  { id: '2', name: 'Global Innovations', mobileNo: '9988776655', email: 'global@example.com', clientAddress: '456 Business Park, Powai' },
  { id: '3', name: 'Creative Designs Co.', mobileNo: '9123456789', email: 'creative@example.com', clientAddress: '789 Art Avenue, Bandra' },
  { id: '4', name: 'Future Enterprises', mobileNo: '9567890123', email: 'future@example.com', clientAddress: '321 Tech Center, Whitefield' },
  { id: '5', name: 'Digital Dynamics', mobileNo: '9012345678', email: 'digital@example.com', clientAddress: '654 New Road, Koramangala' },
];

const LocalMeetingScreen = ({ navigation }: any) => {
  const { t, formatName } = useLanguage();
  const { userData } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('new');

  const initialForm = {
    clientName: '',
    contactPerson: '',
    designation: '',
    mobileNo: '',
    alternateNo: '',
    clientAddress: '',
    city: null,
    state: '',
    location: null,
    pinCode: '',
    email: '',
    meetingDate: new Date(),
    meetingTime: new Date(),
    meetingAgenda: '',
  };

  const cityToState: Record<string, string> = {
    mumbai: 'Maharashtra',
    delhi: 'Delhi',
    bangalore: 'Karnataka',
    kolkata: 'West Bengal',
    chennai: 'Tamil Nadu',
    pune: 'Maharashtra',
    hyderabad: 'Telangana',
    ahmedabad: 'Gujarat',
    jaipur: 'Rajasthan',
    lucknow: 'Uttar Pradesh',
    nagpur: 'Maharashtra',
  };

  const [formData, setFormData] = useState(initialForm);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    requestLocationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Date/time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // City dropdown state
  const [cityOpen, setCityOpen] = useState(false);
  const [cityItems, setCityItems] = useState([
    { label: 'Mumbai', value: 'mumbai' },
    { label: 'Delhi', value: 'delhi' },
    { label: 'Bangalore', value: 'bangalore' },
    { label: 'Kolkata', value: 'kolkata' },
    { label: 'Chennai', value: 'chennai' },
    { label: 'Pune', value: 'pune' },
    { label: 'Hyderabad', value: 'hyderabad' },
    { label: 'Ahmedabad', value: 'ahmedabad' },
    { label: 'Jaipur', value: 'jaipur' },
    { label: 'Lucknow', value: 'lucknow' },
    { label: 'Nagpur', value: 'nagpur' },
  ]);
  const [cityValue, setCityValue] = useState(null);

  // Location dropdown state
  const [locationOpen, setLocationOpen] = useState(false);
  type LocationItem = { label: string; value: string };

const [locationItems, setLocationItems] = useState<LocationItem[]>([]);
  const [locationValue, setLocationValue] = useState(null);

  // All locations mapping (from your original)
  const allLocations = {
    mumbai: [
      { label: 'Andheri', value: 'andheri' },
      { label: 'Bandra', value: 'bandra' },
      { label: 'Powai', value: 'powai' },
      { label: 'Worli', value: 'worli' },
      { label: 'Dadar', value: 'dadar' },
      { label: 'Colaba', value: 'colaba' },
      { label: 'Goregaon', value: 'goregaon' },
    ],
    delhi: [
      { label: 'Connaught Place', value: 'connaught_place' },
      { label: 'Dwarka', value: 'dwarka' },
      { label: 'Rohini', value: 'rohini' },
      { label: 'Saket', value: 'saket' },
      { label: 'Karol Bagh', value: 'karol_bagh' },
      { label: 'Laxmi Nagar', value: 'laxmi_nagar' },
    ],
    bangalore: [
      { label: 'Indiranagar', value: 'indiranagar' },
      { label: 'Koramangala', value: 'koramangala' },
      { label: 'Whitefield', value: 'whitefield' },
      { label: 'Jayanagar', value: 'jayanagar' },
      { label: 'Marathahalli', value: 'marathahalli' },
    ],
    kolkata: [
      { label: 'Salt Lake', value: 'salt_lake' },
      { label: 'New Town', value: 'new_town' },
      { label: 'Park Street', value: 'park_street' },
      { label: 'Garia', value: 'garia' },
    ],
    chennai: [
      { label: 'Adyar', value: 'adyar' },
      { label: 'T. Nagar', value: 't_nagar' },
      { label: 'Velachery', value: 'velachery' },
    ],
    pune: [
      { label: 'Hadapsar', value: 'hadapsar' },
      { label: 'Hinjewadi', value: 'hinjewadi' },
      { label: 'Kothrud', value: 'kothrud' },
    ],
    hyderabad: [
      { label: 'Gachibowli', value: 'gachibowli' },
      { label: 'Jubilee Hills', value: 'jubilee_hills' },
      { label: 'Madhapur', value: 'madhapur' },
      { label: 'Kondapur', value: 'kondapur' },
    ],
    ahmedabad: [
      { label: 'Navrangpura', value: 'navrangpura' },
      { label: 'Vastrapur', value: 'vastrapur' },
    ],
    jaipur: [
      { label: 'Vaishali Nagar', value: 'vaishali_nagar' },
      { label: 'Malviya Nagar', value: 'malviya_nagar' },
    ],
    lucknow: [
      { label: 'Gomti Nagar', value: 'gomti_nagar' },
      { label: 'Hazratganj', value: 'hazratganj' },
    ],
    nagpur: [
      { label: 'Dharampeth', value: 'dharampeth' },
      { label: 'Sitabuldi', value: 'sitabuldi' },
    ],
  };

  // Sync cityValue -> formData + load location items + auto-set state
  useEffect(() => {
    if(cityValue){
    setFormData((p) => ({ ...p, city: cityValue, state: cityToState[cityValue] || '', location: null }));
    setLocationItems(allLocations[cityValue] || []);
    setLocationValue(null);
    }else {
    setFormData((p) => ({ ...p, city: null, state: '', location: null }));
    setLocationItems([]);
    setLocationValue(null);
  }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityValue]);

  // Sync locationValue -> formData
  useEffect(() => {
    setFormData((p) => ({ ...p, location: locationValue }));
  }, [locationValue]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }));
  };

  const handleNewClientPress = () => {
    setActiveTab('new');
    setFormData(initialForm);
    setCityValue(null);
    setLocationValue(null);
    setLocationItems([]);
    setFocusedInput(null);
    setSearchQuery('');
  };

  const handleExistingClientPress = () => {
    setActiveTab('existing');
    setFormData(initialForm);
    setCityValue(null);
    setLocationValue(null);
    setLocationItems([]);
    setFocusedInput(null);
    setSearchQuery('');
  };

  const onDateChange = (event:any, selectedDate:any) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setFormData((p) => ({ ...p, meetingDate: selectedDate }));
    }
    setFocusedInput(null);
  };

  const onTimeChange = (event: any, selectedTime: any) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) {
      setFormData((p) => ({ ...p, meetingTime: selectedTime }));
    }
    setFocusedInput(null);
  };

  const handleReset = () => {
    handleNewClientPress();
  };

  const handleSave = async () => {
    const required = [
      { key: 'clientName', label: t('Client Name') },
      { key: 'contactPerson', label: t('Contact Person') },
      { key: 'mobileNo', label: t('Mobile No.') },
      { key: 'clientAddress', label: t('Client Address') },
      { key: 'city', label: t('City') },
      { key: 'location', label: t('Location') },
      { key: 'pinCode', label: t('Pin Code') },
      { key: 'meetingAgenda', label: t('Meeting Agenda') },
    ] as const;
    const missing = required.filter((r) => !formData[r.key]);
    if (missing.length) {
      Alert.alert(t('Missing fields'), `${t('Please fill')}: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('user_id');
      const empCode = await AsyncStorage.getItem('user_emp_code');
      
      const payload = {
        ...formData,
        meetingType: 'Local',
        meetingDate: formatMeetingDateForApi(formData.meetingDate),
        meetingTime: formatMeetingTimeForApi(formData.meetingTime),
        token,
        id: userId,
        empCode,
        lat: currentLocation?.lat?.toString() || "",
        longt: currentLocation?.lng?.toString() || "",
      };

      const response = await fetch(`${API_BASE_URL}/app-api/meeting/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.error) {
        Alert.alert(t('Saved'), t('Meeting saved successfully.'));
        navigation.navigate('ScheduledMeeting');
      } else {
        Alert.alert(t('Error'), result.message || t('Failed to save meeting'));
      }
    } catch (error) {
      console.error('Save Meeting Error:', error);
      Alert.alert(t('Error'), t('Connection failed. Please try again.'));
    }
  };

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleNotifPress = () => {
    navigation.navigate('Notification');
  };

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectClient = (client:any) => {
    setFormData(p => ({
      ...p,
      clientName: client.name,
      mobileNo: client.mobileNo,
      email: client.email,
      clientAddress: client.clientAddress,
    }));
    setSearchQuery(client.name);
    setIsSearchFocused(false);
    Keyboard.dismiss();
  };

  const handleAddNewClient = () => {
    setActiveTab('new');
    setFormData(() => ({ ...initialForm, clientName: searchQuery }));
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader onMenuPress={handleMenuPress} onNotifPress={handleNotifPress} onUpdatePress={() => {
        navigation.navigate('PreHome', { screen: 'PaymentLeave' });
      }} />
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[
              styles.button,
              activeTab === 'new' ? styles.buttonActive : styles.buttonInactive
            ]}
            onPress={handleNewClientPress}
          >
            <Text style={styles.buttonText}>{t('NEW CLIENT')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              activeTab === 'existing' ? styles.buttonActive : styles.buttonInactive
            ]}
            onPress={handleExistingClientPress}
          >
            <Text style={styles.buttonText}>{t('EXISTING CLIENT')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
      <LinearGradient colors={[SCREEN_BG, '#1f456f']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.introContainer}>
          <Text style={styles.greetingText}>{t('Hi')}, {formatName(userData.firstname, 1)}</Text>
          <Text style={styles.instructionsText}>
            {t('Before going out for the Local meeting, please write full details of the questions below:')}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('Add Client Details')}</Text>
        <View style={styles.formSection}>
          {activeTab === 'existing' ? (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('Search Client')} <Text style={styles.asterisk}>*</Text></Text>
                <TextInput
                  style={[styles.input, isSearchFocused && styles.inputFocused]}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setFormData(p => ({ ...p, clientName: text }));
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    // Timeout to allow button press
                    setTimeout(() => setIsSearchFocused(false), 200);
                  }}
                  placeholder={t('Search for an existing client...')}
                  placeholderTextColor="rgba(231,169,61,0.6)"
                />
              </View>
              {isSearchFocused && (
                <View style={styles.searchDropdown}>
                  {filteredClients.length > 0 ? (
                    <FlatList
                      data={filteredClients}
                      keyExtractor={item => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity style={styles.clientItem} onPress={() => handleSelectClient(item)}>
                          <Text style={styles.clientItemText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                      keyboardShouldPersistTaps="handled"
                    />
                  ) : (
                    searchQuery.length > 0 && (
                      <TouchableOpacity style={styles.addNewButton} onPress={handleAddNewClient}>
                        <Text style={styles.addNewButtonText}>{t('Add New Client')}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('Client Name')} <Text style={styles.asterisk}>*</Text></Text>
              <TextInput
                style={[styles.input, focusedInput === 'clientName' && styles.inputFocused]}
                value={formData.clientName}
                onChangeText={(text) => handleInputChange('clientName', text)}
                onFocus={() => setFocusedInput('clientName')}
                onBlur={() => setFocusedInput(null)}
                placeholder={t('Enter client name')}
                placeholderTextColor="rgba(231,169,61,0.6)"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('Contact Person Name')} <Text style={styles.asterisk}>*</Text></Text>
            <TextInput
              style={[styles.input, focusedInput === 'contactPerson' && styles.inputFocused]}
              value={formData.contactPerson}
              onChangeText={(text) => handleInputChange('contactPerson', text)}
              onFocus={() => setFocusedInput('contactPerson')}
              onBlur={() => setFocusedInput(null)}
              placeholder={t('Enter contact person name')}
              placeholderTextColor="rgba(231,169,61,0.6)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('Designation')}</Text>
            <TextInput
              style={[styles.input, focusedInput === 'designation' && styles.inputFocused]}
              value={formData.designation}
              onChangeText={(text) => handleInputChange('designation', text)}
              onFocus={() => setFocusedInput('designation')}
              onBlur={() => setFocusedInput(null)}
              placeholder={t('Enter designation')}
              placeholderTextColor="rgba(231,169,61,0.6)"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>{t('Mobile No.')} <Text style={styles.asterisk}>*</Text></Text>
              <TextInput
                style={[styles.input, focusedInput === 'mobileNo' && styles.inputFocused]}
                keyboardType="phone-pad"
                value={formData.mobileNo}
                onChangeText={(text) => handleInputChange('mobileNo', text)}
                onFocus={() => setFocusedInput('mobileNo')}
                onBlur={() => setFocusedInput(null)}
                placeholder={t('Enter mobile number')}
                placeholderTextColor="rgba(231,169,61,0.6)"
              />
            </View>

            <View style={styles.inputHalf}>
              <Text style={styles.label}>{t('Alternate No.')}</Text>
              <TextInput
                style={[styles.input, focusedInput === 'alternateNo' && styles.inputFocused]}
                keyboardType="phone-pad"
                value={formData.alternateNo}
                onChangeText={(text) => handleInputChange('alternateNo', text)}
                onFocus={() => setFocusedInput('alternateNo')}
                onBlur={() => setFocusedInput(null)}
                placeholder={t('Enter alternate number')}
                placeholderTextColor="rgba(231,169,61,0.6)"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('Client Address')} <Text style={styles.asterisk}>*</Text></Text>
            <TextInput
              style={[styles.input, focusedInput === 'clientAddress' && styles.inputFocused]}
              value={formData.clientAddress}
              onChangeText={(text) => handleInputChange('clientAddress', text)}
              onFocus={() => setFocusedInput('clientAddress')}
              onBlur={() => setFocusedInput(null)}
              placeholder={t('Enter client address')}
              placeholderTextColor="rgba(231,169,61,0.6)"
            />
          </View>

          <View style={[styles.inputRow, ]}>
            <View style={[styles.inputHalf]}>
              <Text style={styles.label}>{t('Select City')} <Text style={styles.asterisk}>*</Text></Text>
              <DropDownPicker
                open={cityOpen}
                value={cityValue}
                items={cityItems}
                setOpen={(open) => {
                  setLocationOpen(false);
                  setCityOpen(open);
                }}
                setValue={setCityValue}
                setItems={setCityItems}
                style={[styles.dropdown, cityOpen && styles.dropdownFocused]}
                containerStyle={styles.dropdownContainer}
                dropDownContainerStyle={styles.dropdownMenu}
                textStyle={{ color: "white" }}
                listItemLabelStyle={styles.dropdownListItemLabel}
                arrowIconStyle={styles.dropdownArrowIcon as any}
                tickIconStyle={styles.dropdownIcon as any}
                closeIconStyle={styles.dropdownIcon as any}
                placeholderStyle={styles.dropdownPlaceholder}
                placeholder={t('Select City')}
                searchable={true}
                searchPlaceholder={t('Search for a city...')}
                searchPlaceholderTextColor="#FFFFFF"
                listMode="MODAL"
                modalTitle={t('Select City')}
                modalAnimationType="slide"
                modalContentContainerStyle={styles.dropdownModal}
                modalTitleStyle={styles.dropdownModalTitle}
                closeAfterSelecting={true}
              />
            </View>

            <View style={[styles.inputHalf]}>
              <Text style={styles.label}>{t('Select Location')} <Text style={styles.asterisk}>*</Text></Text>
              <DropDownPicker
                open={locationOpen}
                value={locationValue}
                items={locationItems}
                setOpen={(open) => {
                  setCityOpen(false);
                  setLocationOpen(open);
                }}
                setValue={setLocationValue}
                setItems={setLocationItems}
                style={[styles.dropdown, locationOpen && styles.dropdownFocused]}
                containerStyle={styles.dropdownContainer}
                dropDownContainerStyle={styles.dropdownMenu}
                placeholderStyle={styles.dropdownPlaceholder}
                placeholder={t('Select Location')}
                searchable={true}
                searchPlaceholder={t('Search for a location...')}
                listMode="MODAL"
                modalTitle={t('Select Location')}
                modalAnimationType="slide"
                modalContentContainerStyle={styles.dropdownModal}
                modalTitleStyle={styles.dropdownModalTitle}
                closeAfterSelecting={true}
                disabled={!cityValue}
                textStyle={{ color: "white" }}
                listItemLabelStyle={styles.dropdownListItemLabel}
                arrowIconStyle={styles.dropdownArrowIcon as any}
                tickIconStyle={styles.dropdownIcon as any}
                closeIconStyle={styles.dropdownIcon as any}
                searchPlaceholderTextColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>{t('Pin Code No.')} <Text style={styles.asterisk}>*</Text></Text>
              <TextInput
                style={[styles.input, focusedInput === 'pinCode' && styles.inputFocused]}
                keyboardType="number-pad"
                value={formData.pinCode}
                onChangeText={(text) => handleInputChange('pinCode', text)}
                onFocus={() => setFocusedInput('pinCode')}
                onBlur={() => setFocusedInput(null)}
                placeholder={t('Enter pin code')}
                placeholderTextColor="rgba(231,169,61,0.6)"
              />
            </View>

            <View style={styles.inputHalf}>
              <Text style={styles.label}>{t('Email ID')}</Text>
              <TextInput
                style={[styles.input, focusedInput === 'email' && styles.inputFocused]}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                placeholder={t('Enter email')}
                placeholderTextColor="rgba(231,169,61,0.6)"
              />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('Add Meeting Details')}</Text>
        <View style={styles.formSection}>
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>{t('Meeting Date')} <Text style={styles.asterisk}>*</Text></Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDatePicker(true);
                  setFocusedInput('meetingDate');
                }}
                style={[styles.inputTouchable, focusedInput === 'meetingDate' && styles.inputFocused]}
              >
                <Text style={styles.inputDisplay}>
                  {formData.meetingDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  testID="datePicker"
                  value={formData.meetingDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>

            <View style={styles.inputHalf}>
              <Text style={styles.label}>{t('Meeting Time')} <Text style={styles.asterisk}>*</Text></Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTimePicker(true);
                  setFocusedInput('meetingTime');
                }}
                style={[styles.inputTouchable, focusedInput === 'meetingTime' && styles.inputFocused]}
              >
                <Text style={styles.inputDisplay}>
                  {`${formData.meetingTime.getHours().toString().padStart(2, '0')}:${formData.meetingTime.getMinutes().toString().padStart(2, '0')}`}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  testID="timePicker"
                  value={formData.meetingTime}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                />
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('Meeting Agenda')} <Text style={styles.asterisk}>*</Text></Text>
            <TextInput
              style={[styles.input, focusedInput === 'meetingAgenda' && styles.inputFocused]}
              value={formData.meetingAgenda}
              onChangeText={(text) => handleInputChange('meetingAgenda', text)}
              onFocus={() => setFocusedInput('meetingAgenda')}
              onBlur={() => setFocusedInput(null)}
              placeholder={t('Enter meeting agenda')}
              placeholderTextColor="rgba(231,169,61,0.6)"
            />
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.buttonText}>{t('SAVE')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.buttonText}>{t('RESET')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors?.bg,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoider: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors?.panel,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(231,169,61,0.5)', // Adjusted border color
    marginHorizontal: 6,
  },
  buttonInactive: {
    backgroundColor: 'rgba(231,169,61,0.08)', // Less prominent background
    borderColor: 'rgba(231,169,61,0.2)', // Less prominent border
  },
  buttonActive: {
    backgroundColor: 'rgba(231,169,61,0.24)',
    borderColor: '#FFFFFF',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 3,
    paddingBottom: 140,
    flexGrow: 1,
  },
  introContainer: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(19,39,70,0.72)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 3,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.24)',
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  instructionsText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  sectionTitle: {
    width: CARD_WIDTH,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 3,
    marginBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231,169,61,0.08)',
    paddingBottom: 3,
  },
  formSection: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(19,39,70,0.95)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.22)',
    marginBottom: 4,
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  inputHalf: {
    width: '48%',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    paddingVertical: 2,
    paddingHorizontal: 3,
    marginTop: 1,
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231,169,61,0.12)',
  },
  inputTouchable: {
    width: '100%',
    paddingVertical: 3,
    paddingHorizontal: 3,
    marginTop: 1,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231,169,61,0.12)',
  },
  inputFocused: {
    borderBottomColor: '#FFFFFF',
  },
  inputDisplay: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  dropdownContainer: {
    marginTop: 1,
    width: '100%',
  },
  dropdown: {
    backgroundColor: 'transparent',
    minHeight: 28,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: 'rgba(231,169,61,0.12)',
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  dropdownFocused: {
    borderColor: '#FFFFFF',
  },
  dropdownMenu: {
    backgroundColor: colors.panel,
    borderColor: 'rgba(85,230,238,0.24)',
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 190,
    zIndex: 9999,
    elevation: 5,
  },
  dropdownModal: {
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  dropdownModalTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dropdownListItemLabel: {
    color: '#FFFFFF',
  },
  dropdownArrowIcon: {
    tintColor: '#FFFFFF',
  },
  dropdownIcon: {
    tintColor: '#FFFFFF',
  },
  listTextStyle: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  dropdownPlaceholder: {
    color: 'rgba(231,169,61,0.7)',
  },
  asterisk: {
    color: 'red',
  },
  actionButtons: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginTop: 1,
  },
  saveButton: {
    backgroundColor: '#55e6ee',
    paddingVertical: 5,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  resetButton: {
    backgroundColor: '#55e6ee',
    paddingVertical: 5,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '400',
    fontSize: 13,
  },
  searchDropdown: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    marginTop: 2,
    maxHeight: 160,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.24)',
    zIndex: 9999,
    elevation: 10,
  },
  clientItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(85,230,238,0.14)',
  },
  clientItemText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  addNewButton: {
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231,169,61,0.1)',
  },
  addNewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LocalMeetingScreen;
