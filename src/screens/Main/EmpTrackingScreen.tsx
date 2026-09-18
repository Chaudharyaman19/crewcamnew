import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomHeader from "../../components/CustomHeader";
import { colors } from "../../theme";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { travelTrackingApi } from "../../services/travelTrackingApi";

type RootStackParamList = {
  Dashboard: undefined;
  Notification: undefined;
  PreHome: { screen?: string };
};

type EmpTrackingNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Dashboard"
>;

interface Employee {
  session_id?: string;
  emp_id: string;
  emp_name: string;
  designation: string;
  battery: string;
  tower: string;
  current_location?: string;
  current_time?: string;
  last_inactive_location?: string;
  last_inactive_time?: string;
  status?: string;
  totalDistanceKm?: number;
  totalTravelSeconds?: number;
  clientVisitCount?: number;
  routePointCount?: number;
  destination?: string;
  latitude?: number;
  longitude?: number;
}

import { useLanguage } from '../../context/LanguageContext';

const EmpTrackingScreen = () => {
  const { t, formatName } = useLanguage();
  const navigation = useNavigation<EmpTrackingNavigationProp>();
  const [username, setUsername] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [empData, setEmpData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleNotifPress = () => {
    navigation.navigate('Notification');
  };

  const mapSessionToEmployee = useCallback((session: any): Employee => {
    const lastRoutePoint = Array.isArray(session.route)
      ? session.route[session.route.length - 1]
      : null;
    const latitude = Number(
      session.lastLocation?.lat ??
      session.lastLocation?.latitude ??
      lastRoutePoint?.lat ??
      lastRoutePoint?.latitude,
    );
    const longitude = Number(
      session.lastLocation?.lng ??
      session.lastLocation?.longitude ??
      lastRoutePoint?.lng ??
      lastRoutePoint?.longitude,
    );

    return {
      session_id: String(session._id || session.sessionId || ""),
      emp_id: String(session.empCode || session.employeeUserId || session._id || ""),
      emp_name: session.employeeName || session.empCode || "Unknown",
      designation: session.roleScope || "",
      battery: "N/A",
      tower: String(session.status || "N/A"),
      current_location:
        session.lastLocation?.address ||
        session.currentDestination?.address ||
        session.currentDestination?.clientName ||
        "Unknown",
      current_time:
        session.lastLocation?.capturedAt || session.lastLocation?.recordedAt || session.updatedAt,
      status: session.status,
      totalDistanceKm:
        session.totalKm ?? ((session.metrics?.totalDistanceMeters || 0) / 1000),
      totalTravelSeconds:
        session.metrics?.travelDurationSeconds || session.metrics?.totalTravelSeconds,
      clientVisitCount: session.metrics?.clientVisitCount,
      routePointCount: session.route?.length || session.routePointCount || 0,
      destination: session.currentDestination?.clientName || session.currentDestination?.address || "",
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
    };
  }, []);

  const fetchEmployees = useCallback(async (name = searchName) => {
    setLoading(true);
    setError(null);
    setEmpData([]);

    try {
      const data = await travelTrackingApi.getLiveSessions(true);
      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      const query = String(name || "").trim().toLowerCase();
      const mapped = sessions.map(mapSessionToEmployee).filter((emp) => {
        if (!query) return true;
        return [
          emp.emp_name,
          emp.emp_id,
          emp.status,
          emp.current_location,
          emp.destination,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      });

      if (mapped.length > 0) {
        setEmpData(mapped);
      } else {
        setError("No record found.");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [mapSessionToEmployee, searchName]);

  const handleSearch = () => {
    fetchEmployees(searchName);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getLastActivity = (emp: Employee) =>
    `Last Active: ${emp.current_location || "Unknown"} | ${emp.current_time || "N/A"}`;

  const openEmployeeLocation = async (emp: Employee) => {
    if (emp.latitude === undefined || emp.longitude === undefined) {
      Alert.alert("Location not available", "This user's latest GPS location is not available yet.");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${emp.latitude},${emp.longitude}`;
    try {
      await Linking.openURL(url);
    } catch (mapError) {
      console.error("Open map error:", mapError);
      Alert.alert("Unable to open map", "Please try again.");
    }
  };

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const user = await AsyncStorage.getItem("user_firstname");
        if (user) setUsername(user);
      } catch (storageError) {
        console.error("Error fetching username:", storageError);
      }
    };
    fetchUserName();

    fetchEmployees();
    const interval = setInterval(() => fetchEmployees(), 30000);
    return () => clearInterval(interval);
  }, [fetchEmployees]);

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() =>
          navigation.navigate("PreHome", { screen: "PaymentLeave" })
        }
      />

      <View style={styles.contentArea}>

        <View style={styles.topSection}>
          <Text style={styles.greeting}>{t('Hi')}, {formatName(username, 1)}</Text>
          <Text style={styles.subTitle}>{t('Tracking details of all employees')}</Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder={t('Enter Employee Name')}
              placeholderTextColor="#3A3A4E"
              value={searchName}
              onChangeText={setSearchName}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>


        <View style={styles.cardWrapper}>
          {loading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : empData.length > 0 ? (
            empData.map((emp, index) => (
              <View
                style={styles.card}
                key={`${emp.emp_id}-${emp.session_id || index}`}>
                <View style={styles.cardContent}>
                  <View style={styles.cardTextWrapper}>
                    <Text style={styles.cardText}>
                      {emp.emp_name} | {emp.designation}
                    </Text>
                    <Text style={styles.cardSubText}>
                      Status: {emp.status || emp.tower || "N/A"} | Destination: {emp.destination || "N/A"}
                    </Text>
                    <Text style={styles.cardSubText}>
                      Distance: {Number(emp.totalDistanceKm || 0).toFixed(2)} km | Travel: {formatDuration(emp.totalTravelSeconds)} | Meetings: {emp.clientVisitCount || 0}
                    </Text>
                    <Text style={styles.cardSubText}>
                      {getLastActivity(emp)}
                    </Text>
                    <Text style={styles.cardSubText}>
                      Route points: {emp.routePointCount || 0}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.iconRow}
                    activeOpacity={0.75}
                    onPress={() => openEmployeeLocation(emp)}>
                    <FontAwesomeIcon
                      icon={faMapMarkerAlt}
                      size={20}
                      color="red"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.infoText}>
              No employees found. Use search to filter.
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EmpTrackingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  contentArea: { flex: 1, paddingHorizontal: 15, paddingVertical: 8 },
  topSection: { marginBottom: 8 },
  greeting: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF", marginBottom: 2 },
  subTitle: { fontSize: 13, color: "#e6e6e6", marginBottom: 6 },
  searchRow: { flexDirection: "row" },
  input: {
    flex: 1,
    backgroundColor: "#1E3A5F",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 2,
    color: "#FFFFFF",
    marginRight: 8,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#55e6ee',
    paddingHorizontal: 15,
    borderRadius: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  searchText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  cardWrapper: { flex: 1, justifyContent: "flex-start" },
  card: {
    backgroundColor: "#1E1E2E",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    minHeight: 80,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTextWrapper: {
    flex: 1,
    marginRight: 8,
  },
  cardText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 1,
  },
  cardSubText: {
    color: "#a0a0b0",
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 1,
  },
  cardTextBold: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 2,
    fontSize: 12,
  },
  iconRow: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { color: "red", textAlign: "center", marginTop: 20 },
  infoText: { color: "white", textAlign: "center", marginTop: 20 },
}); 
