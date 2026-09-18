import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    FlatList,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from 'react-native-dropdown-picker';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme';
import { DrawerActions } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { AuthContext } from "../../context/AuthContext";
import { useContext } from "react";
import { API_BASE_URL } from '@env';
import { useLanguage } from '../../context/LanguageContext';
import { formatMeetingDateForApi, formatMeetingTimeForApi } from '../../utils/meetingHelpers';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 20;
const ACCENT = colors.accent;
const SCREEN_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const TEXT_DARK = colors.black;


// --- THEME COLORS (Based on screenshots) ---
// Assuming colors.bg is the darker blue/teal background
// Assuming colors.panel is a lighter color for cards/tabs
// Mock color based on image

// --- STATIC DATA FOR SEARCH ---
const MOCK_SITE_NAMES = [
    'Sunil Furnishers | Kangra',
    'Sun Furnishers | Pune',
    'Chawla Furnishers | Hoshiarpur',
    'Best Furnishers | Ludhiana',
    'Vijay Bed Sheet House | Kanpur',
    'Goyal Furniture | Delhi',
    'Rani Motors | Chandigarh',
];

// Mock Data for Dropdowns
const MOCK_STATES = [
    { label: 'Himachal Pradesh', value: 'HP' },
    { label: 'Maharashtra', value: 'MH' },
    { label: 'Punjab', value: 'PB' },
    { label: 'Uttar Pradesh', value: 'UP' },
    { label: 'Delhi', value: 'DL' },
];

const MOCK_CITIES = [
    { label: 'Kangra', value: 'Kangra' },
    { label: 'Pune', value: 'Pune' },
    { label: 'Hoshiarpur', value: 'Hoshiarpur' },
    { label: 'Ludhiana', value: 'Ludhiana' },
    { label: 'Kanpur', value: 'Kanpur' },
    { label: 'Delhi', value: 'Delhi' },
];


// Function to simulate fetching site details
const getMockSiteDetails = (fullName: string) => {
    const [name, city] = fullName.split(' | ');
    return {
        fullName: fullName,
        address: `${name} store, ${city} main road.`,
        contact: `9876543210 (Manager, ${name})`,
        venue: city, // Used for the small text below the input field
    };
};

const AddSiteVisit = ({ navigation }: any) => {
    const { userData } = useContext(AuthContext);
    const { t, formatName } = useLanguage();

      const handleMenuPress = () => {

        navigation.dispatch(DrawerActions.openDrawer()); // ✅ Open Drawer
      };
    
      const handleNotifPress = () => {
        navigation.navigate('Notification');
      };
    const [activeTab, setActiveTab] = useState<'RECCE' | 'MARKETING'>('RECCE');

    // --- MARKETING STATE ---
    const [siteName, setSiteName] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [selectedSiteDetails, setSelectedSiteDetails] = useState<any>(null);

    // --- RECCE DROP DOWN PICKER STATE ---
    const [openStatePicker, setOpenStatePicker] = useState(false);
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [stateItems, setStateItems] = useState(MOCK_STATES);

    const [openCityPicker, setOpenCityPicker] = useState(false);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [cityItems, setCityItems] = useState(MOCK_CITIES);

    const [agenda, setAgenda] = useState('');

    // Date/Time State
    const [departureDateTime, setDepartureDateTime] = useState<Date | null>(null);
    const [returnDateTime, setReturnDateTime] = useState<Date | null>(null);

    // Picker Visibility State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'departure' | 'return'>('departure');

    // --- SEARCH LOGIC (Only for MARKETING tab) ---
    useEffect(() => {
        if (activeTab === 'MARKETING' && siteName.length > 2 && !selectedSiteDetails) {
            const filtered = MOCK_SITE_NAMES.filter(item =>
                item.toLowerCase().includes(siteName.toLowerCase())
            );
            setSearchResults(filtered);
        } else {
            setSearchResults([]);
        }
    }, [siteName, selectedSiteDetails, activeTab]);

    const handleSearch = (text: string) => {
        setSiteName(text);
        setSelectedSiteDetails(null);
    };

    const handleSiteSelect = (site: string) => {
        setSiteName(site);
        setSelectedSiteDetails(getMockSiteDetails(site));
        setSearchResults([]);
    };

    // --- DATE/TIME PICKER LOGIC (Remains unchanged) ---
    const onOpenPicker = (mode: 'departure' | 'return') => {
        setPickerMode(mode);
        if (Platform.OS === 'ios') {
            setShowDatePicker(true);
        } else {
            setShowDatePicker(true);
        }
    };

    const onChangeDateTime = (event: any, selectedDateTime?: Date) => {
        if (event.type === 'dismissed' || event.type === 'neutralButton') {
            setShowDatePicker(false);
            setShowTimePicker(false);
            return;
        }

        const dateToUpdate = pickerMode === 'departure' ? departureDateTime : returnDateTime;
        const setDateFn = pickerMode === 'departure' ? setDepartureDateTime : setReturnDateTime;

        if (showDatePicker && Platform.OS !== 'ios') {
            setShowDatePicker(false);

            if (selectedDateTime) {
                const newCombinedDate = dateToUpdate ? new Date(dateToUpdate.getTime()) : new Date();
                newCombinedDate.setFullYear(selectedDateTime.getFullYear());
                newCombinedDate.setMonth(selectedDateTime.getMonth());
                newCombinedDate.setDate(selectedDateTime.getDate());
                setDateFn(newCombinedDate);
            }

            setTimeout(() => {
                setShowTimePicker(true);
            }, 10);
            return;
        }

        if (selectedDateTime) {
            setShowTimePicker(false);
            setShowDatePicker(false); 

            const newCombinedDate = dateToUpdate ? new Date(dateToUpdate.getTime()) : new Date();

            newCombinedDate.setHours(selectedDateTime.getHours());
            newCombinedDate.setMinutes(selectedDateTime.getMinutes());
            newCombinedDate.setSeconds(0);
            
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                newCombinedDate.setFullYear(selectedDateTime.getFullYear());
                newCombinedDate.setMonth(selectedDateTime.getMonth());
                newCombinedDate.setDate(selectedDateTime.getDate());
            }

            setDateFn(newCombinedDate);
        }
    };

    const formatDateForDisplay = (date: Date | null, isDeparture: boolean) => {
        if (!date) return isDeparture ? 'Departure Date | Time' : 'Return Date | Time';
        return date
            .toLocaleString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            })
            .replace(/, | /g, ' | ');
    };


    const handleSave = async () => {
        const isRecceValid = activeTab === 'RECCE' && selectedState && selectedCity && departureDateTime && returnDateTime && agenda;
        const isMarketingValid = activeTab === 'MARKETING' && siteName && selectedSiteDetails && departureDateTime && returnDateTime;

        if (activeTab === 'RECCE' && !isRecceValid) {
            Alert.alert('Incomplete Details', 'Please fill all required fields: State, City, Depart Date | Time, Return Date | Time, and Agenda.');
            return;
        }

        if (activeTab === 'MARKETING' && !isMarketingValid) {
            Alert.alert('Incomplete Details', 'Please search and select a Site Name and fill both Date/Times.');
            return;
        }

        try {
            Geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        
                        // Fetch real address info from Nominatim (Reverse Geocoding)
                        let pinCode = "";
                        try {
                            const geoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`, {
                                headers: { 'User-Agent': 'Crewcam/1.0' }
                            });
                            const geoData = await geoResponse.json();
                            pinCode = geoData.address.postcode || "";
                        } catch (geoErr) {
                            console.log("Geo fetch failed, proceeding anyway", geoErr);
                        }

                        const token = await AsyncStorage.getItem('auth_token');
                        const userId = await AsyncStorage.getItem('user_id');
                        const empCode = await AsyncStorage.getItem('user_emp_code');

                        const payload = {
                            token,
                            id: userId,
                            empCode,
                            meetingType: 'SiteVisit',
                            clientName: activeTab === 'RECCE' ? `Recce at ${selectedCity}` : siteName,
                            contactPerson: activeTab === 'RECCE' ? 'Recce Visit' : 'Marketing Visit',
                            designation: 'Site Visit',
                            mobileNo: 'N/A',
                            email: 'not-provided@example.com',
                            clientAddress: activeTab === 'RECCE' ? `${selectedCity}, ${selectedState}` : (selectedSiteDetails?.address || "Site Address Not Provided"),
                            state: activeTab === 'RECCE' ? selectedState : 'N/A',
                            city: activeTab === 'RECCE' ? selectedCity : (selectedSiteDetails?.venue || ""),
                            location: activeTab === 'RECCE' ? selectedState : (selectedSiteDetails?.venue || ""),
                            pinCode: pinCode,
                            meetingDate: formatMeetingDateForApi(departureDateTime),
                            meetingTime: formatMeetingTimeForApi(departureDateTime),
                            departureDate: departureDateTime?.toISOString(),
                            returnDate: returnDateTime?.toISOString(),
                            meetingAgenda: activeTab === 'RECCE' ? agenda : "Marketing Visit",
                            visitRemarks: activeTab === 'RECCE' ? `Visit to ${selectedCity}, ${selectedState}` : selectedSiteDetails?.address,
                            lat: latitude.toString(),
                            longt: longitude.toString(),
                            status: 'Scheduled'
                        };

                        const saveResponse = await fetch(`${API_BASE_URL}/app-api/meeting/save`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        const saveResult = await saveResponse.json();
                        if (!saveResult.error) {
                            Alert.alert('Success', `Site Visit (${activeTab}) scheduled successfully.`);
                            navigation.navigate('ScheduledMeeting');
                        } else {
                            Alert.alert('Error', saveResult.message || 'Failed to save visit');
                        }
                    } catch (innerErr: any) {
                        console.error("Inner Error:", innerErr);
                        Alert.alert("Error", "Something went wrong saving the visit.");
                    }
                },
                (error) => {
                    console.error("Geolocation Error:", error);
                    Alert.alert("Error", "Could not get your location. Please check your GPS settings.");
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
        } catch (error) {
            console.error("Save Visit Error:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        }
    };

    const TabButton = ({ title, tabKey }: { title: string, tabKey: 'RECCE' | 'MARKETING' }) => (
        <TouchableOpacity
            style={[
                styles.tabButton,
                activeTab === tabKey ? styles.activeTabButton : styles.inactiveTabButton,
                activeTab === tabKey && { backgroundColor: ACCENT },
            ]}
            onPress={() => setActiveTab(tabKey)}
        >
            <Text style={[styles.tabText, activeTab === tabKey ? styles.activeTabText : styles.inactiveTabText]}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    // --- RECCE FORM RENDER FUNCTION ---
    const renderRecceForm = () => (
        // 🚨 CRITICAL Z-INDEX WRAPPER: Needs to handle the zIndex hierarchy for the dropdowns
        <View style={Platform.OS !== 'web' ? { zIndex: openStatePicker || openCityPicker ? 3000 : 1 } : null}>
            {/* Add Location Details */}
            <Text style={styles.reccelabel}>Add Location Details</Text>
            <View style={styles.reccedropdownContainer}>
                {/* 1. DropDownPicker for State */}
                <DropDownPicker
                    open={openStatePicker}
                    value={selectedState}
                    items={stateItems}
                    setOpen={setOpenStatePicker}
                    setValue={setSelectedState}
                    setItems={setStateItems}
                    placeholder="Select State *"
                    style={[styles.dropdownPickerStyle, { marginRight: 8 }]}
                    containerStyle={styles.dropdownPickerContainer}
                    textStyle={styles.dropdownPickerTextStyle}
                    dropDownContainerStyle={styles.dropdownPickerContainerStyle}
                    zIndex={3000} // Ensure it's above City picker (2000)
                    listMode="SCROLLVIEW" listItemLabelStyle={{ color: "#FFFFFF" }}
                />

                {/* 2. DropDownPicker for City (Using the full component now) */}
                <DropDownPicker
                    open={openCityPicker}
                    value={selectedCity}
                    items={cityItems}
                    setOpen={setOpenCityPicker}
                    setValue={setSelectedCity}
                    setItems={setCityItems}
                    placeholder="Select City *"
                    style={styles.dropdownPickerStyle}
                    containerStyle={styles.dropdownPickerContainer}
                    textStyle={styles.dropdownPickerTextStyle}
                    listItemLabelStyle={{ color: "#FFFFFF" }}
                    dropDownContainerStyle={styles.dropdownPickerContainerStyle}
                    zIndex={2000} // Lower zIndex than State picker
                    listMode="SCROLLVIEW"
                />
            </View>

            {/* Add Meeting Details */}
            <Text style={styles.reccelabel}>Add Meeting Details</Text>
            <View style={styles.reccedateTimeContainer}>
                {/* Depart Date Selector */}
                <TouchableOpacity
                    style={styles.reccedateTimeButton}
                    onPress={() => onOpenPicker('departure')}
                >
                    <Text style={styles.reccedateTimeText}>
                        {formatDateForDisplay(departureDateTime, true)}
                    </Text>

                </TouchableOpacity>

                {/* Return Date Selector */}
                <TouchableOpacity
                    style={styles.reccedateTimeButton}
                    onPress={() => onOpenPicker('return')}
                >
                    <Text style={styles.reccedateTimeText}>
                        {formatDateForDisplay(returnDateTime, false)}
                    </Text>

                </TouchableOpacity>
            </View>

            {/* Agenda Input */}
            <Text style={styles.reccelabel}>Agenda *</Text>
            <TextInput
                style={styles.reccetexTinput}
                placeholder="Type Agenda here..."
                placeholderTextColor="#FFFFFF"
                value={agenda}
                onChangeText={setAgenda}
            />

            {/* SAVE / RESET Buttons */}
            <View style={styles.recceButtonContainer}>
                <TouchableOpacity style={styles.recceSaveButton} onPress={handleSave}>
                    <Text style={styles.recceButtonText}>SAVE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.recceResetButton} onPress={() => {
                    setSelectedState(null); setSelectedCity(null); setDepartureDateTime(null); setReturnDateTime(null); setAgenda('');
                }}>
                    <Text style={[styles.recceButtonText, styles.recceResetButtonText]}>RESET</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // --- MARKETING FORM RENDER FUNCTION (No changes here) ---
    const renderMarketingForm = () => (
        // Added zIndex: 1 to ensure it doesn't accidentally block the RECCE picker when tabs change
        <View style={{ zIndex: 1 }}>
            {/* Site Name / Venue (Search Input) */}
            <Text style={styles.label}>Site Name / Venue</Text>
            <TextInput
                style={styles.input}
                placeholder="Start typing to search..."
                placeholderTextColor="#FFFFFF"
                value={siteName}
                onChangeText={handleSearch}
            />

            {/* --- Search Results List --- */}
            {searchResults.length > 0 && !selectedSiteDetails && (
                <View style={styles.searchResultsContainer}>
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item}
                        style={{ maxHeight: 200 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.searchResultItem}
                                onPress={() => handleSiteSelect(item)}
                            >
                                <Text style={styles.searchResultText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* The small text showing the selected site city */}
            {selectedSiteDetails && (
                <Text style={styles.selectedSiteText}>
                    {selectedSiteDetails.venue}
                </Text>
            )}

            {/* Selected Site Details (Details card) */}
            <Text style={styles.label}>Selected Site Details</Text>
            <View style={styles.siteDetailsCard}>
                {selectedSiteDetails ? (
                    <>
                        <Text style={styles.cardDetailText}>
                            <Text style={styles.cardDetailLabel}>Address: </Text>
                            {selectedSiteDetails.address}
                        </Text>
                        <Text style={styles.cardDetailText}>
                            <Text style={styles.cardDetailLabel}>Contact: </Text>
                            {selectedSiteDetails.contact}
                        </Text>
                        <Text style={styles.cardDetailText}>
                            <Text style={styles.cardDetailLabel}>Site Name: </Text>
                            {selectedSiteDetails.fullName}
                        </Text>
                    </>
                ) : (
                    <Text style={styles.cardPlaceholderText}>
                        Search for a site above or add notes here
                    </Text>
                )}
            </View>

            {/* Travel Details Section */}
            <View style={styles.travelHeader}>
                <Text style={styles.travelHeaderText}>Add Travel Details</Text>
            </View>

            <View style={styles.dateTimeContainer}>
                {/* Departure Date/Time Selector */}
                <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => onOpenPicker('departure')}
                >
                    <Text style={styles.dateTimeText}>
                        {formatDateForDisplay(departureDateTime, true)}
                    </Text>
                </TouchableOpacity>

                {/* Return Date/Time Selector */}
                <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => onOpenPicker('return')}
                >
                    <Text style={styles.dateTimeText}>
                        {formatDateForDisplay(returnDateTime, false)}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* SEND Button */}
            <View style={styles.sendButtonWrapper}>
                <TouchableOpacity style={styles.sendButton} onPress={handleSave}>
                    <Text style={styles.sendButtonText}>SEND</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
    
    return (
        <SafeAreaView style={styles.safeArea}>

              <CustomHeader onMenuPress={handleMenuPress} onNotifPress={handleNotifPress} onUpdatePress={() => {
        navigation.navigate('PreHome', { screen: 'PaymentLeave' });
      }} />
            {/* Tabs (RECCE/MARKETING) */}
            <View style={[styles.tabContainer, { backgroundColor: SCREEN_BG, borderBottomWidth: 1, borderColor: '#FFFFFF' }]}>
                <TabButton title="RECCE" tabKey="RECCE" />
                <TabButton title="MARKETING" tabKey="MARKETING" />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardAvoider}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentInsetAdjustmentBehavior="automatic"
            >
                {/* Greeting and Instructions */}
                <Text style={styles.greeting}>{t('Hi')} {formatName(userData.firstname, 1)},</Text>
                <Text style={styles.instructions}>

                    Before going out for the site work / our {activeTab.toLowerCase() === 'recce' ? 'marketing' : 'installation'}, please fill full details of the
                    questions below:
                </Text>

                {/* Conditional Form Rendering */}
                {activeTab === 'RECCE' ? renderRecceForm() : renderMarketingForm()}

                {/* --- DATE/TIME PICKER RENDER LOGIC --- */}
                {/* 1. Android Date Picker (Sequential) */}
                {showDatePicker && Platform.OS !== 'ios' && (
                    <DateTimePicker
                        value={pickerMode === 'departure' ? (departureDateTime || new Date()) : (returnDateTime || new Date())}
                        mode="date"
                        display="default"
                        onChange={onChangeDateTime}
                    />
                )}

                {/* 2. Android Time Picker (Sequential) */}
                {showTimePicker && Platform.OS === 'android' && (
                    <DateTimePicker
                        value={pickerMode === 'departure' ? (departureDateTime || new Date()) : (returnDateTime || new Date())}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={onChangeDateTime}
                    />
                )}

                {/* 3. iOS Combined Picker */}
                {showDatePicker && Platform.OS === 'ios' && (
                    <DateTimePicker
                        value={pickerMode === 'departure' ? (departureDateTime || new Date()) : (returnDateTime || new Date())}
                        mode={"datetime" as any}
                        is24Hour={true}
                        display="spinner"
                        onChange={onChangeDateTime}
                    />
                )}
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};


// ------------------------------------------------------------------

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: SCREEN_BG,
    },
    keyboardAvoider: {
        flex: 1,
    },
    // ... (Existing header styles removed for brevity)
    container: {
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 5,
        paddingBottom: 140,
        // The ScrollView itself doesn't need a zIndex, the content inside does.
    },
    // --- Tab Styles ---
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: SCREEN_BG,
    },
    tabButton: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        marginRight: 8,
        backgroundColor: '#55e6ee',
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 20,
    },
    activeTabButton: {
        backgroundColor: ACCENT,
    },
    inactiveTabButton: {
        backgroundColor: '#55e6ee',
    },
    tabText: {
        fontWeight: '600',
        fontSize: 13,
    },
    activeTabText: {
        color: TEXT_DARK,
    },
    inactiveTabText: {
        color: TEXT_DARK,
    },
    // -------------------------
    greeting: {
        width: CARD_WIDTH,
        fontSize: 16,
        color: TEXT_DARK,
        marginTop: 0,
        fontWeight: '700',
    },
    instructions: {
        width: CARD_WIDTH,
        fontSize: 12,
        color: '#FFFFFF',
        marginBottom: 6,
        lineHeight: 15,
    },

    // ===================================
    // --- MARKETING FORM STYLES ---
    // ===================================
    label: {
        width: CARD_WIDTH,
        fontSize: 13,
        color: TEXT_DARK,
        marginBottom: 3,
        marginTop: 6,
        fontWeight: '600',
    },
    input: {
        width: CARD_WIDTH,
        minHeight: 32,
        borderBottomWidth: 1,
        // borderColor: '#FFFFFF',
        color: TEXT_DARK,
        paddingHorizontal: 0,
        marginBottom: 3,
        fontSize: 13,
    },
    searchResultsContainer: {
        width: CARD_WIDTH,
        backgroundColor: SURFACE_YELLOW_DEEP,
        marginBottom: 6,
        borderRadius: 8,
    },
    searchResultItem: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#FFFFFF',
    },
    searchResultText: {
        color: TEXT_DARK,
        fontSize: 13,
    },
    selectedSiteText: {
        width: CARD_WIDTH,
        fontSize: 12,
        color: '#FFFFFF',
        marginBottom: 6,
        marginLeft: 0,
    },
    siteDetailsCard: {
        width: CARD_WIDTH,
        minHeight: 64,
        backgroundColor: SURFACE_YELLOW,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        justifyContent: 'center',
    },
    cardDetailText: {
        color: '#FFFFFF',
        fontSize: 12,
        marginBottom: 4,
    },
    cardDetailLabel: {
        fontWeight: '600',
        color: TEXT_DARK,
    },
    cardPlaceholderText: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    travelHeader: {
        width: CARD_WIDTH,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
        alignItems: 'center',
    },
    travelHeaderText: {
        fontSize: 14,
        color: TEXT_DARK,
        fontWeight: '600',
    },
    dateTimeContainer: {
        width: CARD_WIDTH,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        marginHorizontal: -5,
    },
    dateTimeButton: {
        flex: 1,
        marginHorizontal: 5,
        minHeight: 32,
        borderBottomWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#55e6ee',
    },
    dateTimeText: {
        color: TEXT_DARK,
        fontSize: 12,
        textAlign: 'center',
    },
    sendButtonWrapper: {
        width: CARD_WIDTH,
        alignItems: 'flex-start',
        marginTop: 4,
    },
    sendButton: {
        backgroundColor: ACCENT,
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 96,
        borderWidth: 1,
        borderColor: ACCENT,
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 4,
    },
    sendButtonText: {
        color: TEXT_DARK,
        fontSize: 13,
        fontWeight: '800',
    },


    // ===================================
    // --- RECCE FORM STYLES (Updated for DropDownPicker) ---
    // ===================================
    reccelabel: {
        width: CARD_WIDTH,
        fontSize: 14,
        color: TEXT_DARK,
        fontWeight: '600',
        marginBottom: 4,
        marginTop: 7,
    },
    reccedropdownContainer: {
        width: CARD_WIDTH,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
        // No explicit zIndex here, handled by the parent wrapper and individual pickers
    },
    // 💡 DropDownPicker Specific Styles
    dropdownPickerContainer: {
        flex: 1,
        marginRight: 8, // Only the first one needs a margin
    },
    dropdownPickerStyle: {
        backgroundColor: SURFACE_YELLOW,
        borderBottomColor: colors.border,
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 1,
    
        borderRadius: 0,
        minHeight: 32,
        paddingHorizontal: 0,
    },
    dropdownPickerTextStyle: {
        color: TEXT_DARK,
        fontSize: 13,
    },
    dropdownPickerContainerStyle: {
        backgroundColor: SURFACE_YELLOW,
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 1,

        borderRadius: 0,
    },
    // Mock Dropdown Styles (Deprecated, kept for reference)
    dropdownButton: {
        flex: 1,
        minHeight: 32,
        marginRight: 8,
        borderBottomWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    dropdownText: {
        color: TEXT_DARK,
        fontSize: 13,
        paddingRight: 30, // Make space for the icon
    },
    reccedateTimeContainer: {
        width: CARD_WIDTH,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
        marginHorizontal: -5,
    },
    reccedateTimeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 5,
        minHeight: 32,
        borderBottomWidth: 1,
      
        paddingHorizontal: 5,
        backgroundColor: '#55e6ee',
    },
    reccedateTimeText: {
        color: TEXT_DARK,
        fontSize: 12,
    },
    reccetexTinput: {
        width: CARD_WIDTH,
        minHeight: 32,
        borderBottomWidth: 1,
     
        color: TEXT_DARK,
        paddingHorizontal: 0,
        marginBottom: 8,
        fontSize: 13,
    },
    recceButtonContainer: {
        width: CARD_WIDTH,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    recceSaveButton: {
        backgroundColor: ACCENT,
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 18,
        minWidth: 96,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: ACCENT,
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 4,
    },
    recceResetButton: {
        backgroundColor: '#55e6ee',
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 18,
        minWidth: 96,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: ACCENT,
    },
    recceButtonText: {
        color: TEXT_DARK,
        fontWeight: '800',
        fontSize: 13,
        textTransform: 'uppercase',
    },
    recceResetButtonText: {
        color: TEXT_DARK,
    },

});

export default AddSiteVisit;
