import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Alert,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useRoute, useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme';
import { API_BASE_URL } from '@env';
import LinearGradient from 'react-native-linear-gradient';
import { formatMeetingDisplayDate } from '../../utils/meetingHelpers';
import { travelTrackingApi } from '../../services/travelTrackingApi';
import { authFetch } from '../../utils/authFetch';
import Geolocation from 'react-native-geolocation-service';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 20;
const ACCENT = '#55e6ee';
const SCREEN_BG = '#132746';
// Assuming 'colors' is imported from your theme file
// Assuming 'logo' is correctly imported
const logo = require("../../assets/dashboardmainscreen/crewcamlogoremovebgpreview.png");
// --- START: Assume these dependencies are defined in your project ---

const spacing = (multiplier: number) => multiplier * 8; // Example spacing function
// --- END: Assume these dependencies are defined in your project ---

type GpsLocation = {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    speed?: number | null;
    heading?: number | null;
    altitude?: number | null;
};

const TRAVEL_END_STORAGE_PREFIX = 'travel_end_ack';

const getSessionId = (session: any) => String(session?.id || session?._id || '');

const getTravelEndKey = (session: any, meetingId: string) =>
    `${TRAVEL_END_STORAGE_PREFIX}_${getSessionId(session)}_${meetingId}`;

const toFiniteNumber = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const distanceMeters = (
    from: { latitude?: number | null; longitude?: number | null; lat?: number | null; lng?: number | null } | null | undefined,
    to: { latitude?: number | null; longitude?: number | null; lat?: number | null; lng?: number | null } | null | undefined,
) => {
    const lat1 = toFiniteNumber(from?.latitude ?? from?.lat);
    const lng1 = toFiniteNumber(from?.longitude ?? from?.lng);
    const lat2 = toFiniteNumber(to?.latitude ?? to?.lat);
    const lng2 = toFiniteNumber(to?.longitude ?? to?.lng);

    if ([lat1, lng1, lat2, lng2].some(value => value === null)) {
        return null;
    }

    const earthRadius = 6371000;
    const dLat = ((lat2 as number) - (lat1 as number)) * Math.PI / 180;
    const dLng = ((lng2 as number) - (lng1 as number)) * Math.PI / 180;
    const rLat1 = (lat1 as number) * Math.PI / 180;
    const rLat2 = (lat2 as number) * Math.PI / 180;
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) ** 2;

    return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
        travelling_to_client: 'Travelling to destination',
        arrived_client: 'Destination reached',
        in_meeting: 'Meeting in progress',
        between_meetings: 'Meeting completed',
        returning_office: 'Returning to office',
        arrived_office: 'Office reached',
        checked_out: 'Checked out',
    };
    return labels[status || ''] || 'Not started';
};

// --- Custom Header Component (Kept the same) ---
const CustomMeetingHeader = ({ onMenuPress, onEditPress, onDeletePress }: { onMenuPress: () => void, onEditPress: () => void, onDeletePress: () => void }) => (
    <View style={headerStyles.header}>
        <View style={headerStyles.leftContainer}>
            <TouchableOpacity onPress={onMenuPress} style={headerStyles.iconButton}>
                <Text style={headerStyles.iconPlaceholder}>☰</Text>
            </TouchableOpacity>
            {/* You might need to adjust logo styling in headerStyles */}
            <Image source={logo} style={styles.logoImage} resizeMode="contain" />

        </View>
        <View style={headerStyles.rightContainer}>
            <TouchableOpacity onPress={onEditPress} style={headerStyles.iconButton}>
                <Text style={headerStyles.iconPlaceholder}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDeletePress} style={headerStyles.iconButton}>
                <Text style={[headerStyles.iconPlaceholder, { color: colors.danger || 'red' }]}>🗑️</Text>
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
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(231,169,61,0.1)',
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightContainer: {
        flexDirection: 'row',
    },
    crewCamText: { // Added style for the CREWCAM text title next to the icon
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: spacing(1),
    },
    iconButton: {
        padding: 4,
    },
    iconPlaceholder: {
        color: colors.text,
        fontSize: 20,
    },

});

// --- 2. Remove Dummy Data ---

// --- MeetingDetailScreen Component (Updated Rendering) ---
export default function MeetingDetailScreen({ navigation }: any) {
    const route = useRoute();
    const { meetingId } = route.params as { meetingId: string };
    const [meetingData, setMeetingData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [startingTravel, setStartingTravel] = useState(false);
    const [isTravelActive, setIsTravelActive] = useState(false);
    const [activeTravelSession, setActiveTravelSession] = useState<any>(null);
    const [currentLocation, setCurrentLocation] = useState<GpsLocation | null>(null);
    const [travelEndConfirmed, setTravelEndConfirmed] = useState(false);
    const [allowTravelEndAutoEnable, setAllowTravelEndAutoEnable] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const watchIdRef = useRef<number | null>(null);

    useFocusEffect(
        useCallback(() => {
            setCurrentLocation(null);
            setAllowTravelEndAutoEnable(false);
            fetchMeetingDetails();
            startLocationWatch();
            return () => {
                stopLocationWatch();
                setAllowTravelEndAutoEnable(false);
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [meetingId])
    );

    useEffect(() => {
        if (!activeTravelSession) {
            setTravelEndConfirmed(false);
            return;
        }

        const loadTravelEndAck = async () => {
            const value = await AsyncStorage.getItem(getTravelEndKey(activeTravelSession, meetingId));
            setTravelEndConfirmed(value === '1');
        };
        loadTravelEndAck();
    }, [activeTravelSession, meetingId]);

    const requestLocationPermission = async () => {
        if (Platform.OS !== 'android') {
            return true;
        }
        const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        return (
            granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED ||
            granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
    };

    const normalizePosition = (position: any): GpsLocation => ({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
        speed: position.coords.speed ?? null,
        heading: position.coords.heading ?? null,
        altitude: position.coords.altitude ?? null,
    });

    const getCurrentGpsLocation = async () => {
        const allowed = await requestLocationPermission();
        if (!allowed) {
            throw new Error('Location permission is required for travel tracking.');
        }

        return new Promise<GpsLocation>((resolve, reject) => {
            Geolocation.getCurrentPosition(
                position => {
                    const nextLocation = normalizePosition(position);
                    setCurrentLocation(nextLocation);
                    resolve(nextLocation);
                },
                error => reject(new Error(error.message || 'Unable to fetch GPS location.')),
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 8000,
                },
            );
        });
    };

    const refreshActiveTravelSession = async () => {
        const activeSession = await travelTrackingApi.getActiveSession().catch(() => null);
        if (activeSession?.session && activeSession.session.status !== 'checked_out') {
            setIsTravelActive(true);
            setActiveTravelSession(activeSession.session);
            return activeSession.session;
        }
        setIsTravelActive(false);
        setActiveTravelSession(null);
        return null;
    };

    const logGpsLocation = async (location: GpsLocation, force = false) => {
        const result = await travelTrackingApi.logLocation(location, force);
        if (result?.status) {
            setActiveTravelSession((current: any) => current ? { ...current, status: result.status } : current);
        }
        if (result?.status === 'arrived_client' || result?.status === 'arrived_office') {
            await refreshActiveTravelSession();
        }
        return result;
    };

    const startLocationWatch = async () => {
        const allowed = await requestLocationPermission();
        if (!allowed || watchIdRef.current !== null) {
            return;
        }

        watchIdRef.current = Geolocation.watchPosition(
            async position => {
                const nextLocation = normalizePosition(position);
                setCurrentLocation(nextLocation);
                try {
                    const session = await travelTrackingApi.getActiveSession();
                    if (session?.session && session.session.status !== 'checked_out') {
                        setIsTravelActive(true);
                        setActiveTravelSession(session.session);
                        await logGpsLocation(nextLocation, false);
                    }
                } catch (error) {
                    // Tracking is opportunistic here; explicit actions show user-facing errors.
                }
            },
            error => console.warn('Meeting travel location watch error:', error),
            {
                enableHighAccuracy: true,
                distanceFilter: 80,
                interval: 30000,
                fastestInterval: 15000,
                showsBackgroundLocationIndicator: true,
            },
        );
    };

    const stopLocationWatch = () => {
        if (watchIdRef.current !== null) {
            Geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };

    const fetchMeetingDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const userId = await AsyncStorage.getItem('user_id');
            const empCode = await AsyncStorage.getItem('user_emp_code');
            const response = await authFetch(`${API_BASE_URL}/app-api/meeting/history?token=${encodeURIComponent(token || '')}&id=${encodeURIComponent(userId || '')}&empCode=${encodeURIComponent(empCode || '')}`);
            const data = await response.json();
            if (data.status === 'success') {
                const meeting = data.meetings.find((m: any) => m._id === meetingId);
                setMeetingData(meeting);
            }
            await refreshActiveTravelSession();
        } catch (error) {
            console.error("Fetch Meeting Details Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditPress = () => {
        navigation.navigate('EditMeetingScreen', { meetingId, meetingData });
    };

    const deleteMeeting = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/app-api/meeting/${meetingId}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            if (result.error) {
                throw new Error(result?.message || 'Failed to delete meeting');
            }
            Alert.alert('Deleted', result?.message || 'Meeting deleted successfully');
            navigation.navigate('MeetingHistory');
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to delete meeting');
        }
    };

    const handleDeletePress = () => {
        Alert.alert(
            'Delete Meeting',
            'Are you sure you want to delete this meeting?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: deleteMeeting },
            ],
        );
    };

    const isAlreadyCheckedIn = async () => {
        const token = await AsyncStorage.getItem('auth_token');
        const userId = await AsyncStorage.getItem('user_id');
        const empCode = await AsyncStorage.getItem('user_emp_code');
        if (!token) {
            return false;
        }

        const response = await fetch(`${API_BASE_URL}/api/attendance/get-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, id: userId, empCode }),
        });
        const result = await response.json();
        return result?.isCheckedIn === true;
    };

    const getMeetingCoordinates = () => {
        const latitude = toFiniteNumber(meetingData?.lat ?? meetingData?.latitude);
        const longitude = toFiniteNumber(meetingData?.longt ?? meetingData?.longitude);
        if (latitude === null || longitude === null) {
            return null;
        }
        return { latitude, longitude };
    };

    const getDestinationCoordinates = () => {
        const destination = activeTravelSession?.currentDestination;
        const latitude = toFiniteNumber(destination?.lat ?? destination?.latitude ?? meetingData?.lat ?? meetingData?.latitude);
        const longitude = toFiniteNumber(destination?.lng ?? destination?.longitude ?? destination?.longt ?? meetingData?.longt ?? meetingData?.longitude);
        if (latitude === null || longitude === null) {
            return null;
        }
        return { latitude, longitude };
    };

    const getDestinationRadius = () =>
        toFiniteNumber(activeTravelSession?.currentDestination?.radiusMeters) || 150;

    const isCurrentLocationAtDestination = () => {
        const destination = getDestinationCoordinates();
        if (!currentLocation || !destination) {
            return false;
        }
        const meters = distanceMeters(currentLocation, destination);
        return meters !== null && meters <= getDestinationRadius();
    };

    const handleCheckInPress = async () => {
        if (startingTravel) {
            return;
        }

        try {
            setStartingTravel(true);
            const checkedIn = await isAlreadyCheckedIn();
            if (!checkedIn) {
                Alert.alert(
                    'Check-In Required',
                    'Please complete office Check-In first. After Check-In, return here and start travel.',
                );
                return;
            }

            const coordinates = getMeetingCoordinates();
            if (!coordinates) {
                Alert.alert(
                    'Location Required',
                    'Meeting location coordinates are missing. Please edit the meeting and save location once.',
                );
                return;
            }

            const startLocation = await getCurrentGpsLocation();

            const result = await travelTrackingApi.startTravel({
                meetingId: meetingData._id,
                clientName: meetingData.clientName,
                clientAddress: meetingData.clientAddress,
                location: startLocation,
                destination: {
                    ...coordinates,
                    name: meetingData.clientName,
                    address: [meetingData.clientAddress, meetingData.location, meetingData.city, meetingData.pinCode]
                        .filter(Boolean)
                        .join(', '),
                },
            });
            setIsTravelActive(true);
            setActiveTravelSession(result?.session || null);
            setAllowTravelEndAutoEnable(true);
            Alert.alert('Travel Started', 'Tracking started. Stay on this screen to see travel progress.');
        } catch (error: any) {
            Alert.alert('Travel Start Failed', error?.message || 'Unable to start travel.');
        } finally {
            setStartingTravel(false);
        }
    };

    const handleTravelEnd = async () => {
        try {
            setActionLoading('travelEnd');
            if (!allowTravelEndAutoEnable) {
                Alert.alert('Not Arrived Yet', 'Travel End will unlock only after the current travel flow reaches the saved meeting/site location.');
                return;
            }

            const location = await getCurrentGpsLocation();
            const destination = getDestinationCoordinates();
            const metersFromDestination = distanceMeters(location, destination);
            if (metersFromDestination === null || metersFromDestination > getDestinationRadius()) {
                Alert.alert('Not Arrived Yet', 'Travel End will unlock only after you reach the saved meeting/site location.');
                return;
            }

            const result = await logGpsLocation(location, true);
            const session = await refreshActiveTravelSession();
            if (result?.status !== 'arrived_client' && session?.status !== 'arrived_client') {
                Alert.alert('Not Arrived Yet', 'Travel End will unlock only after you reach the saved meeting/site location.');
                return;
            }
            await AsyncStorage.setItem(getTravelEndKey(session || activeTravelSession, meetingId), '1');
            setTravelEndConfirmed(true);
            Alert.alert('Travel Ended', 'Destination reached. Meeting In is now available.');
        } catch (error: any) {
            Alert.alert('Travel End Failed', error?.message || 'Unable to verify destination location.');
        } finally {
            setActionLoading('');
        }
    };

    const handleMeetingIn = async () => {
        try {
            setActionLoading('meetingIn');
            const location = await getCurrentGpsLocation();
            const result = await travelTrackingApi.meetingIn({
                meetingId: meetingData._id,
                clientName: activeTravelSession?.currentDestination?.clientName || meetingData.clientName || 'Client',
                clientAddress: meetingData.clientAddress,
                contactPerson: meetingData.contactPerson,
                purpose: meetingData.meetingAgenda,
                location,
            } as any);
            setActiveTravelSession(result?.session || activeTravelSession);
            Alert.alert('Meeting Started', 'You have successfully checked in to the meeting.');
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to start meeting');
        } finally {
            setActionLoading('');
        }
    };

    const handleMeetingOut = async () => {
        try {
            setActionLoading('meetingOut');
            const location = await getCurrentGpsLocation();
            const result = await travelTrackingApi.meetingOut({ notes: '', location });
            setActiveTravelSession(result?.session || activeTravelSession);
            Alert.alert('Meeting Ended', 'Meeting out recorded successfully.');
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to end meeting');
        } finally {
            setActionLoading('');
        }
    };

    const handleNextMeeting = () => {
        navigation.navigate('ScheduledMeeting');
    };

    const handleBackToOffice = async () => {
        try {
            setActionLoading('backToOffice');
            const result = await travelTrackingApi.backToOffice();
            setActiveTravelSession(result?.session || activeTravelSession);
            Alert.alert('Returning', 'Return to office journey started.');
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to start return journey');
        } finally {
            setActionLoading('');
        }
    };

    const handleCreateMoMPress = () => {
        navigation.navigate('CreateEditMomMeetingScreen', { meetingId: meetingData._id });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <LinearGradient colors={[SCREEN_BG, '#1f456f']} style={styles.loadingBg}>
                    <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 50 }} />
                </LinearGradient>
            </SafeAreaView>
        );
    }

    if (!meetingData) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <CustomMeetingHeader
                    onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                    onEditPress={() => {}}
                    onDeletePress={() => {}}
                />
                <LinearGradient colors={[SCREEN_BG, '#1f456f']} style={styles.loadingBg}>
                    <Text style={styles.emptyText}>Meeting details not found.</Text>
                </LinearGradient>
            </SafeAreaView>
        );
    }

    const travelStatus = activeTravelSession?.status;
    const destinationReached = travelStatus === 'arrived_client';
    const meetingInProgress = travelStatus === 'in_meeting';
    const meetingCompleted = travelStatus === 'between_meetings';
    const returningOffice = travelStatus === 'returning_office';
    const officeReached = travelStatus === 'arrived_office';
    const isAtDestinationNow = isCurrentLocationAtDestination();
    const canConfirmTravelEnd = allowTravelEndAutoEnable && destinationReached && !travelEndConfirmed && isAtDestinationNow;
    const showTravelEndButton = isTravelActive && (
        travelStatus === 'travelling_to_client' ||
        (destinationReached && !travelEndConfirmed)
    );
    const totalKm = Number(activeTravelSession?.totalKm || 0).toFixed(2);
    const routePoints = activeTravelSession?.route?.length || 0;

    return (
        <SafeAreaView style={styles.safeArea}>
            <CustomMeetingHeader
                onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                onEditPress={handleEditPress}
                onDeletePress={handleDeletePress}
            />

            <LinearGradient colors={[SCREEN_BG, '#1f456f']} style={styles.gradient}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.container}>
                    <Text style={styles.mainTitle}>Local Meeting Details</Text>

                    {/* Section 1: Client Name - MODIFIED FOR PARALLEL TEXT */}
                    {/* The entire section uses the horizontal style */}
                    <View style={styles.horizontalSectionContainer}>
                        <Text style={styles.horizontalSectionHeading}>Client Name :</Text>
                        <Text style={styles.horizontalSectionText}>{meetingData.clientName}</Text>
                    </View>

                    {/* Section 2: C. Person - MODIFIED FOR PARALLEL TEXT */}
                    <View style={styles.horizontalSectionContainer}>
                        <Text style={styles.horizontalSectionHeading}>C. Person :</Text>
                        <View style={styles.dataWrapper}>
                            <Text style={styles.horizontalSectionText}>{meetingData.contactPerson}</Text>
                        </View>
                    </View>

                    {/* Section 3: Venue Details */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeading}>Venue Details</Text>
                        <Text style={styles.sectionText}>{meetingData.clientAddress}, {meetingData.location}, {meetingData.city} - {meetingData.pinCode}</Text>
                    </View>

                    {/* Section 4: Meeting Date & Time */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeading}>Meeting Date & Time</Text>
                        <Text style={styles.sectionText}>{formatMeetingDisplayDate(meetingData.meetingDate)} | {meetingData.meetingTime}</Text>
                    </View>

                    {/* Section 5: Meeting Agenda */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeading}>Meeting Agenda</Text>
                        <Text style={styles.sectionText}>{meetingData.meetingAgenda}</Text>
                    </View>

                    {/* Section 6: Meeting Status */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeading}>Meeting Status</Text>
                        <Text style={styles.sectionText}>{meetingData.status}</Text>
                    </View>

                    {isTravelActive && (
                        <View style={styles.trackingCard}>
                            <Text style={styles.trackingTitle}>Live Travel Tracking</Text>
                            <Text style={styles.trackingText}>Status: {getStatusLabel(travelStatus)}</Text>
                            <Text style={styles.trackingText}>Distance: {totalKm} km | Route Points: {routePoints}</Text>
                            <Text style={styles.trackingText}>
                                Current GPS: {currentLocation ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}` : 'Fetching...'}
                            </Text>
                            {activeTravelSession?.lastLocation && (
                                <Text style={styles.trackingText}>
                                    Last Log: {activeTravelSession.lastLocation.lat}, {activeTravelSession.lastLocation.lng}
                                </Text>
                            )}
                        </View>
                    )}

                    {meetingData.status === 'Scheduled' && !isTravelActive && (
                        <TouchableOpacity
                            style={[styles.actionButton, startingTravel && styles.disabledActionButton]}
                            onPress={handleCheckInPress}
                            disabled={startingTravel}
                        >
                            <Text style={styles.actionButtonText}>
                                {startingTravel ? 'STARTING...' : 'TRAVEL START'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {showTravelEndButton && (
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                (!canConfirmTravelEnd || actionLoading === 'travelEnd') && styles.disabledActionButton,
                            ]}
                            onPress={handleTravelEnd}
                            disabled={!canConfirmTravelEnd || actionLoading === 'travelEnd'}
                        >
                            <Text style={styles.actionButtonText}>
                                {actionLoading === 'travelEnd' ? 'VERIFYING...' : 'TRAVEL END'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {destinationReached && travelEndConfirmed && (
                        <TouchableOpacity
                            style={[styles.actionButton, actionLoading === 'meetingIn' && styles.disabledActionButton]}
                            onPress={handleMeetingIn}
                            disabled={actionLoading === 'meetingIn'}
                        >
                            <Text style={styles.actionButtonText}>
                                {actionLoading === 'meetingIn' ? 'STARTING...' : 'MEETING IN'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {meetingInProgress && (
                        <TouchableOpacity
                            style={[styles.actionButton, actionLoading === 'meetingOut' && styles.disabledActionButton]}
                            onPress={handleMeetingOut}
                            disabled={actionLoading === 'meetingOut'}
                        >
                            <Text style={styles.actionButtonText}>
                                {actionLoading === 'meetingOut' ? 'ENDING...' : 'MEETING END'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {meetingCompleted && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleNextMeeting}>
                                <Text style={styles.actionButtonText}>NEXT MEETING</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, actionLoading === 'backToOffice' && styles.disabledActionButton]}
                                onPress={handleBackToOffice}
                                disabled={actionLoading === 'backToOffice'}
                            >
                                <Text style={styles.actionButtonText}>
                                    {actionLoading === 'backToOffice' ? 'STARTING...' : 'BACK TO OFFICE'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {returningOffice && (
                        <TouchableOpacity style={[styles.actionButton, styles.disabledActionButton]} disabled>
                            <Text style={styles.actionButtonText}>RETURNING TO OFFICE</Text>
                        </TouchableOpacity>
                    )}

                    {officeReached && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('AttendanceMgmt', {
                                screen: 'DailyAttendance',
                                params: { screen: 'CheckOut' },
                            })}
                        >
                            <Text style={styles.actionButtonText}>CHECK OUT</Text>
                        </TouchableOpacity>
                    )}

                    {meetingData.status === 'Completed' ? (
                        meetingData.mom ? (
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionHeading}>Minutes of Meeting (MoM)</Text>
                                <Text style={styles.sectionText}>{meetingData.mom}</Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.actionButton} onPress={handleCreateMoMPress}>
                                <Text style={styles.actionButtonText}>CREATE MoM</Text>
                            </TouchableOpacity>
                        )
                    ) : null}
                </View>
            </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
}

// --- 4. Updated Styles ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.bg
    },
    gradient: { flex: 1 },
    loadingBg: { flex: 1 },
    emptyText: {
        color: colors.text,
        textAlign: 'center',
        marginTop: 40,
        fontSize: 14,
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingTop: 5,
        paddingBottom: 16,
    },
    container: {
        flex: 1,
        width: CARD_WIDTH,
        backgroundColor: 'rgba(19,39,70,0.95)',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(85,230,238,0.24)',
    },
    // The logo image from the original full code block
    logoImage: {
        width: 132,
        height: 34,
        marginLeft: 8,
    },
    mainTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 6,
    },

    // --- STACKED (Heading on top, Data below) Layout Styles (Used for Venue down) ---
    sectionContainer: {
        marginBottom: 5,
        backgroundColor: colors.panel,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: 'rgba(85,230,238,0.16)',
    },
    sectionHeading: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(85,230,238,0.24)',
        paddingBottom: 3,
    },
    sectionText: {
        color: colors.text,
        fontSize: 13,
        lineHeight: 18,
    },

    // --- PARALLEL (Label and Data side-by-side) Layout Styles (New for Client Name and C. Person) ---
    horizontalSectionContainer: {
        flexDirection: 'row', // Make children display side-by-side
        marginBottom: 5,
        paddingHorizontal: 8,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: colors.panel,
        borderWidth: 1,
        borderColor: 'rgba(85,230,238,0.16)',
    },
    horizontalSectionHeading: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '600',
        minWidth: 84,
        marginRight: 6,
        // No borderBottom here, as it's on the container
    },
    horizontalSectionText: {
        color: colors.text,
        fontSize: 13,
        flexShrink: 1,
        lineHeight: 18,
    },
    dataWrapper: {
        flex: 1,
    },
    actionButton: {
        backgroundColor: ACCENT,
        paddingVertical: 9,
        paddingHorizontal: 18,
        borderRadius: 8,
        minWidth: 160,
        alignSelf: 'center',
        alignItems: 'center',
        marginTop: 4,
        borderWidth: 1,
        borderColor: ACCENT,
    },
    disabledActionButton: {
        opacity: 0.65,
    },
    secondaryButton: {
        backgroundColor: '#f59e0b',
        borderColor: '#f59e0b',
    },
    actionRow: {
        gap: 8,
        alignItems: 'center',
        marginTop: 2,
    },
    actionButtonText: {
        color: SCREEN_BG,
        fontWeight: 'bold',
        fontSize: 13,
    },
    trackingCard: {
        backgroundColor: 'rgba(85,230,238,0.10)',
        borderColor: 'rgba(85,230,238,0.38)',
        borderWidth: 1,
        borderRadius: 8,
        padding: 9,
        marginBottom: 8,
    },
    trackingTitle: {
        color: ACCENT,
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 4,
    },
    trackingText: {
        color: colors.text,
        fontSize: 12,
        lineHeight: 17,
    },
});
