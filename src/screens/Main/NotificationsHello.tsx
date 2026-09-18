import React, { useState, useCallback } from "react";
import {
  Dimensions,
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomHeader from "../../components/CustomHeader";
import { DrawerActions, useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';

const ACCENT = '#55e6ee';
const SCREEN_BG = '#132746';
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;

interface ActivityLogItem {
  _id: string;
  name: string;
  action: string;
  module: string;
  location: string;
  address: string;
  companyName: string;
  lat: string;
  long: string;
  message: string;
  deviceId: string;
  createdAt: string;
}

export default function NotificationsScreen({ navigation }: any) {
  const { t, formatName } = useLanguage();
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notifications');

  const getTodayDateIST = () => {
    const now = new Date();
    return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // returns YYYY-MM-DD
  };

  const isToday = (dateString: string) => {
    const logDate = new Date(dateString).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    return logDate === getTodayDateIST();
  };

  const fetchActivityLogs = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const userId = await AsyncStorage.getItem("user_id");
      const empCode = await AsyncStorage.getItem("user_emp_code");

      if (!token) {
        setLogs([]);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/app-api/activity-logs?token=${encodeURIComponent(token)}&id=${encodeURIComponent(userId || "")}&empCode=${encodeURIComponent(empCode || "")}`
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        const todayLogs = data.filter((log: ActivityLogItem) => isToday(log.createdAt));
        setLogs(todayLogs);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error("Failed to fetch activity logs:", err);
      setLogs([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActivityLogs();
      // Preserve the existing focus refresh behavior for today's activity log.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = useCallback(() => {
    fetchActivityLogs(true);
    // Preserve the existing pull-to-refresh behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getActionColor = (action: string) => {
    if (action === "Check In") return ACCENT;
    if (action === "Check Out") return ACCENT;
    if (action === "Office In") return ACCENT;
    if (action === "Office Out") return ACCENT;
    if (action === "Office Out Approved") return "#8BC34A";
    if (action === "Office Out Rejected") return "#F44336";
    if (action === "Urgent Leave") return "#F44336";
    if (action === "Casual Leave") return "#9C27B0";
    if (action === "Outstation Leave") return "#E91E63";
    if (action === "HR Support") return "#2196F3";
    if (action === "Task Created") return "#00BCD4";
    if (action === "Task Updated") return "#8BC34A";
    return "#E4405F";
  };

  const getActionBgColor = (action: string) => {
    if (action === "Check In") return "rgba(127,246,255,0.14)";
    if (action === "Check Out") return "rgba(127,246,255,0.14)";
    if (action === "Office In") return "rgba(127,246,255,0.14)";
    if (action === "Office Out") return "rgba(127,246,255,0.14)";
    if (action === "Office Out Approved") return "#8BC34A25";
    if (action === "Office Out Rejected") return "#F4433625";
    if (action === "Urgent Leave") return "#F4433625";
    if (action === "Casual Leave") return "#9C27B025";
    if (action === "Outstation Leave") return "#E91E6325";
    if (action === "HR Support") return "#2196F325";
    if (action === "Task Created") return "#00BCD425";
    if (action === "Task Updated") return "#8BC34A25";
    if (action === "Leave Approved" || action === "Approved Leave") return "#8BC34A25";
    if (action === "Leave Rejected" || action === "Rejected Leave") return "#F4433625";
    return "#E4405F25";
  };

  const getActionBadgeText = (action: string) => {
    if (action === "Check In") return t("Check In");
    if (action === "Check Out") return t("Check Out");
    if (action === "Office In") return t("Office In");
    if (action === "Office Out") return t("Office Out");
    if (action === "Office Out Approved") return t("Office Out Approved");
    if (action === "Office Out Rejected") return t("Office Out Rejected");
    if (action === "Urgent Leave") return t("Urgent Leave");
    if (action === "Casual Leave") return t("Casual Leave");
    if (action === "Outstation Leave") return t("Outstation Leave");
    if (action === "HR Support") return "HR";
    if (action === "Task Created") return "TODO";
    if (action === "Task Updated") return "DONE";
    if (action === "Leave Approved" || action === "Approved Leave") return t("Leave Approved");
    if (action === "Leave Rejected" || action === "Rejected Leave") return t("Leave Rejected");
    return action;
  };

  const formatTime = (datetime: string) => {
    const dateObj = new Date(datetime);
    return dateObj.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  const formatDate = (datetime: string) => {
    const dateObj = new Date(datetime);
    return dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Kolkata",
    });
  };

  const isLeaveStatusLog = (item: ActivityLogItem) =>
    item.action === "Leave Approved" ||
    item.action === "Leave Rejected" ||
    item.action === "Approved Leave" ||
    item.action === "Rejected Leave" ||
    item.action === "Office Out Approved" ||
    item.action === "Office Out Rejected" ||
    item.message?.toLowerCase().includes("approved by") ||
    item.message?.toLowerCase().includes("rejected by");

  const handleNotificationPress = (item: ActivityLogItem) => {
    if (item.action === "HR Support") {
      navigation.navigate("HR Support");
    }
  };

  const renderItem = ({ item }: { item: ActivityLogItem }) => (
    <TouchableOpacity activeOpacity={0.8} onPress={() => handleNotificationPress(item)}>
      <LinearGradient
        colors={['rgba(19, 39, 70, 0.98)', 'rgba(9, 27, 51, 0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logCard}
      >
      <View style={styles.logRow}>
        <View style={styles.logLeftSection}>

          <View style={styles.userContainer}>
            <Text style={styles.logUser} numberOfLines={1}>
              {formatName(item.name)}
            </Text>
            <Text style={styles.logDate}>{formatDate(item.createdAt)}</Text>
          </View>


          <Text style={styles.logAction}>
            {t(item.action)} - {formatTime(item.createdAt)}
          </Text>

          {item.address ? (
            <Text style={[styles.addressText, isLeaveStatusLog(item) && styles.leaveStatusText]} numberOfLines={2}>
              {item.address}
            </Text>
          ) : item.message ? (
            <Text style={[styles.addressText, isLeaveStatusLog(item) && styles.leaveStatusText]} numberOfLines={2}>
              {item.message}
            </Text>
          ) : null}


          {item.location ? (
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>{item.location}</Text>
              {item.companyName ? (
                <Text style={styles.companyLabel}> | {item.companyName}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.logRightSection}>

          <View
            style={[
              styles.actionBadge,
              isLeaveStatusLog(item) && styles.leaveStatusBadge,
              { backgroundColor: getActionBgColor(item.action) },
            ]}
          >
            <Text
              style={[
                styles.actionText,
                { color: getActionColor(item.action) },
              ]}
              numberOfLines={1}
            >
              {getActionBadgeText(item.action)}
            </Text>
          </View>


          <Text style={styles.timeLabel}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => {
          navigation.navigate("PreHome", { screen: "PaymentLeave" });
        }}
      />

      <LinearGradient
        colors={[SCREEN_BG, '#1f456f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.content}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.feedTitle}>{t('Activity Log')}</Text>
          <Text style={styles.feedSubtitle}>{t("Today's attendance, leave and work activity.")}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={ACCENT}
            style={styles.loader}
          />
        ) : logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.noLogText}>{t('No Activity Log')}</Text>
            <Text style={styles.noLogSubText}>{t('Nothing to show yet.')}</Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[ACCENT]}
                tintColor={ACCENT}
              />
            }
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  content: {
    flex: 1,
  },
  headerBlock: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    paddingTop: 14,
    paddingBottom: 12,
  },
  feedTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  feedSubtitle: {
    color: 'rgba(230,237,246,0.78)',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 4,
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    alignItems: 'center',
    paddingBottom: 140,
    paddingTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noLogText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  noLogSubText: {
    fontSize: 13,
    color: "rgba(230,237,246,0.78)",
    textAlign: "center",
    marginTop: 8,
  },
  logCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    marginBottom: 6,
    overflow: "hidden",
    elevation: 10,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(127,246,255,0.62)',
  },
  logRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  logLeftSection: {
    flex: 1,
    gap: 2,
  },
  logRightSection: {
    flexShrink: 0,
    maxWidth: 140,
    marginLeft: 7,
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  logUser: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    maxWidth: "70%",
  },
  logDate: {
    color: "rgba(230,237,246,0.72)",
    fontSize: 11,
  },
  logAction: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
  addressText: {
    color: "rgba(230,237,246,0.74)",
    fontSize: 11,
    lineHeight: 14,
  },
  leaveStatusText: {
    fontSize: 10,
    lineHeight: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  locationLabel: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: "700",
  },
  companyLabel: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: "700",
  },
  actionBadge: {
    minWidth: 72,
    maxWidth: 132,
    height: 24,
    marginTop: -4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(127,246,255,0.62)',
    justifyContent: "center",
    alignItems: "center",
  },
  leaveStatusBadge: {
    minWidth: 72,
    maxWidth: 132,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  timeLabel: {
    color: "rgba(230,237,246,0.72)",
    fontSize: 11,
  },
});
