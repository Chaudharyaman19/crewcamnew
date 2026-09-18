import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Modal,
  ScrollView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { PreHomeStackParamList } from "../../types/navigation";
import AppButton from "../../components/AppButton";
import { colors, spacing } from "../../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import { API_BASE_URL } from "@env";
import { isHodRole } from "../../utils/roles";
import ProfileAvatar from "../../components/ProfileAvatar";
import Animated, { BounceIn, ZoomIn } from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCakeCandles, faChampagneGlasses, faGift, faStar } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from "../../context/LanguageContext";

const logo = require("../../assets/dashboardmainscreen/newcrekamlogo.png");

type PaymentLeaveScreenProps = {
  navigation: StackNavigationProp<PreHomeStackParamList, "PaymentLeave">;
};

type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  time: string;
  date: string;
  type: "PAID_LEAVE" | "CASUAL_LEAVE" | "URGENT_LEAVE" | "MEETING" | "CREWCAM_LEAVE" | "OFFICE_OUT" | "BIRTHDAY" | "ANNIVERSARY" | "COMPANY_UPDATE" | "WISH_RECEIVED" | "WISH_SENT";
  sortTime: number;
  source?: string;
  createdBy?: string;
  image?: string;
  targetUserId?: string;
  targetName?: string;
  isOwnOccasion?: boolean;
  wishCount?: number;
  wishSummary?: string;
  wishedBy?: string[];
  wishedByProfiles?: { name?: string; image?: string }[];
};

const CREWCAM_LEAVE_API = `${API_BASE_URL}/app-api/leave/approvals`;
const OFFICE_OUT_API = `${API_BASE_URL}/app-api/office-out/approvals`;
const USER_NOTIFICATIONS_API = `${API_BASE_URL}/app-api/user-notifications`;
const PHP_PAID_LEAVE_API = "https://arogyamantra.com/newApi/pendingPaidLeaveRequest.php";
const PHP_CASUAL_LEAVE_API = "https://arogyamantra.com/newApi/pendingCasualleaveRequest.php";
const PHP_URGENT_LEAVE_API = "https://arogyamantra.com/newApi/pendingUrgentLeave.php";
const WISH_API = (id: string) => `${API_BASE_URL}/app-api/user-notifications/${encodeURIComponent(id)}/wish`;
const ACK_API = (id: string) => `${API_BASE_URL}/app-api/user-notifications/${encodeURIComponent(id)}/ack`;
const DISMISSED_LEAVE_KEY = "dismissed_crewcam_leave_notifications";
const DISMISSED_USER_KEY = "dismissed_user_today_notifications";

const parseJsonSafely = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const assertSuccessResponse = (text: string, fallbackMessage: string) => {
  const json = parseJsonSafely(text);
  if (json?.status === "success" || json?.duplicate === true) return;
  throw new Error(json?.message || fallbackMessage);
};

const getArrayResult = (json: any) => {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.result)) return json.result;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.requests)) return json.requests;
  if (Array.isArray(json?.paidLeaveRequests)) return json.paidLeaveRequests;
  if (Array.isArray(json?.paid_leave_requests)) return json.paid_leave_requests;
  if (Array.isArray(json?.casualLeaveRequests)) return json.casualLeaveRequests;
  if (Array.isArray(json?.casual_leave_requests)) return json.casual_leave_requests;
  if (Array.isArray(json?.urgentLeaveRequests)) return json.urgentLeaveRequests;
  if (Array.isArray(json?.urgent_leave_requests)) return json.urgent_leave_requests;
  return [];
};

const isPendingStatus = (value: any) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "pending" || normalized === "p" || normalized.includes("pending");
};

const fetchPhpPendingPaidLeave = async (token: string) => {
  const postResponse = await fetch(PHP_PAID_LEAVE_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `token=${encodeURIComponent(token)}`,
  });
  return parseJsonSafely(await postResponse.text());
};

const fetchPhpPendingCasualLeave = async (token: string) => {
  const postResponse = await fetch(PHP_CASUAL_LEAVE_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `token=${encodeURIComponent(token)}`,
  });
  return parseJsonSafely(await postResponse.text());
};

const fetchPhpPendingUrgentLeave = async (token: string) => {
  const postResponse = await fetch(PHP_URGENT_LEAVE_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `token=${encodeURIComponent(token)}`,
  });
  return parseJsonSafely(await postResponse.text());
};

const getIstDateKey = (date: Date) =>
  date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const formatIstDate = (date: Date) =>
  date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const formatIstTime = (date: Date) =>
  date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

const getDismissedLeaveIds = async () => {
  const raw = await AsyncStorage.getItem(DISMISSED_LEAVE_KEY);
  const parsed = raw ? parseJsonSafely(raw) : [];
  return Array.isArray(parsed) ? parsed.map(String) : [];
};

const getUserDismissKey = (userKey: string) => {
  const safeUserKey = String(userKey || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${DISMISSED_USER_KEY}:${safeUserKey}:${getIstDateKey(new Date())}`;
};

const getDismissedUserIds = async (userKey: string) => {
  const raw = await AsyncStorage.getItem(getUserDismissKey(userKey));
  const parsed = raw ? parseJsonSafely(raw) : [];
  return Array.isArray(parsed) ? parsed.map(String) : [];
};

const saveDismissedUserId = async (id: string, userKey: string) => {
  const key = getUserDismissKey(userKey);
  const dismissedIds = await getDismissedUserIds(userKey);
  const nextIds = [...new Set([...dismissedIds, id])];
  await AsyncStorage.setItem(key, JSON.stringify(nextIds));
};

const normalizeId = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const collectRecipientIds = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap(collectRecipientIds);
  }
  if (typeof value === "object") {
    const data = value as Record<string, unknown>;
    return [
      data.id,
      data._id,
      data.userId,
      data.employeeId,
      data.empCode,
      data.employeeCode,
      data.code,
    ]
      .map(normalizeId)
      .filter(Boolean);
  }
  return [normalizeId(value)].filter(Boolean);
};

const shouldShowUserNotification = (
  item: any,
  currentUserId: string,
  currentEmpCode: string,
) => {
  const audience = normalizeId(
    item.audience ||
      item.scope ||
      item.visibility ||
      item.notificationScope ||
      item.audienceType ||
      item.recipientType ||
      item.sendType ||
      item.notificationType ||
      item.notificationFor ||
      item.notification_to ||
      item.sendTo ||
      item.send_to ||
      item.for ||
      (["common", "global", "all", "everyone", "all_users", "individual", "selected", "private", "specific"].includes(normalizeId(item.type))
        ? item.type
        : ""),
  );

  if (item.isCommon === true || item.common === true || item.isGlobal === true) {
    return true;
  }

  if (["common", "global", "all", "everyone", "all_users"].includes(audience)) {
    return true;
  }

  const selectedRecipientIds = [
    item.selectedUser,
    item.selectedUsers,
    item.selectedUserId,
    item.selectedUserIds,
    item.userIds,
    item.users,
    item.recipients,
    item.recipientIds,
    item.targetUsers,
    item.targetUserIds,
    item.employeeIds,
    item.empCodes,
    item.selectedEmployees,
    item.individualUser,
    item.individualUsers,
    item.assignedTo,
  ].flatMap(collectRecipientIds);

  const currentIds = [currentUserId, currentEmpCode].map(normalizeId).filter(Boolean);
  if (selectedRecipientIds.length > 0) {
    return selectedRecipientIds.some((id) => currentIds.includes(id));
  }

  if (["individual", "selected", "private", "specific"].includes(audience)) {
    return currentIds.includes(normalizeId(item.targetUserId)) || currentIds.includes(normalizeId(item.targetEmpCode));
  }

  if (item.type === "COMPANY_UPDATE" && item.targetUserId) {
    return currentIds.includes(normalizeId(item.targetUserId));
  }

  return true;
};

export default function PaymentLeaveScreen({ navigation }: PaymentLeaveScreenProps) {
  const { t, formatName } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [activeToken, setActiveToken] = useState("");
  const [notingId, setNotingId] = useState("");

  const formatNotificationText = (text?: string, item?: NotificationItem | null) => {
    let nextText = String(text || "").trim();
    if (!nextText) return "";

    const nameCandidates = [
      item?.targetName,
      item?.createdBy,
      ...(item?.wishedBy || []),
      ...(item?.wishedByProfiles || []).map(person => person.name),
    ].filter(Boolean) as string[];

    nameCandidates.forEach(name => {
      nextText = nextText.replace(new RegExp(String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), formatName(name));
    });

    nextText = nextText.replace(
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})('s)?\s+(Birthday|Marriage Anniversary|Anniversary)\b/g,
      (match, rawName, possessive, occasion) => {
        if (String(rawName).toLowerCase() === "happy") return match;
        const translatedOccasion = String(occasion).toLowerCase() === "birthday"
          ? t("Birthday")
          : t("Marriage Anniversary");
        return `${formatName(rawName)}${possessive || ""} ${translatedOccasion}`;
      },
    );

    return nextText
      .replace(/\bHappy Birthday\b/gi, t("Happy Birthday"))
      .replace(/\bBirthday Celebration\b/gi, t("Birthday Celebration"))
      .replace(/\bMarriage Anniversary\b/gi, t("Marriage Anniversary"))
      .replace(/\bAnniversary Celebration\b/gi, t("Anniversary Celebration"))
      .replace(/\bBirthday\b/gi, t("Birthday"))
      .replace(/\bAnniversary\b/gi, t("Marriage Anniversary"));
  };

  // 🔐 get from storage

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t])
  );

  const loadNotifications = async () => {
    setLoading(true);
    const userToken = await AsyncStorage.getItem('auth_token');
    const userId = await AsyncStorage.getItem('user_id');
    const empCode = await AsyncStorage.getItem('user_emp_code');
    const userRole = await AsyncStorage.getItem('user_role');
    setActiveToken(userToken || "");
    if (!userToken) {
      console.warn("User token missing");
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const userDismissKey = userId || userToken || "";
      const dismissedUserIds = await getDismissedUserIds(userDismissKey);
      const isHod = isHodRole(userRole);
      const [response, dismissedIds, paidLeaveRes, casualLeaveRes, urgentLeaveRes, crewcamLeaveRes, officeOutRes] = await Promise.all([
        fetch(`${USER_NOTIFICATIONS_API}?token=${encodeURIComponent(userToken)}&id=${encodeURIComponent(userId || "")}&empCode=${encodeURIComponent(empCode || "")}&scope=today&_ts=${Date.now()}`),
        isHod ? getDismissedLeaveIds() : Promise.resolve([]),
        isHod
          ? fetchPhpPendingPaidLeave(userToken)
          : Promise.resolve(null),
        isHod
          ? fetchPhpPendingCasualLeave(userToken)
          : Promise.resolve(null),
        isHod
          ? fetchPhpPendingUrgentLeave(userToken)
          : Promise.resolve(null),
        isHod
          ? fetch(`${CREWCAM_LEAVE_API}?token=${encodeURIComponent(userToken)}&id=${encodeURIComponent(userId || "")}&empCode=${encodeURIComponent(empCode || "")}&status=Pending`)
          : Promise.resolve(null),
        isHod
          ? fetch(`${OFFICE_OUT_API}?token=${encodeURIComponent(userToken)}&id=${encodeURIComponent(userId || "")}&empCode=${encodeURIComponent(empCode || "")}&status=pending`)
          : Promise.resolve(null),
      ]);
      const json = parseJsonSafely(await response.text());
      if (json?.user?.id) {
        await AsyncStorage.setItem('user_id', String(json.user.id));
      }
      const resolvedUserId = String(json?.user?.id || userId || "");
      const resolvedEmpCode = String(json?.user?.empCode || json?.user?.emp_code || empCode || "");
      const userNotifications = (json?.result || [])
        .filter((item: any) => shouldShowUserNotification(item, resolvedUserId, resolvedEmpCode))
        .map((item: any) => ({
          id: String(item.id || item._id),
          title: String(item.title || "Notification"),
          body: String(item.body || ""),
          time: String(item.time || ""),
          date: String(item.date || ""),
          type: item.type || "COMPANY_UPDATE",
          sortTime: Number(item.sortTime || 0),
          source: item.source || "",
          createdBy: item.createdBy || "",
          image: item.image || "",
          targetUserId: item.targetUserId || "",
          targetName: item.targetName || "",
          isOwnOccasion: Boolean(item.isOwnOccasion),
          wishCount: Number(item.wishCount || 0),
          wishSummary: item.wishSummary || "",
          wishedBy: Array.isArray(item.wishedBy) ? item.wishedBy : [],
          wishedByProfiles: Array.isArray(item.wishedByProfiles) ? item.wishedByProfiles : [],
        }))
        .filter((item: NotificationItem) => item.id && (item.type === "WISH_RECEIVED" || !dismissedUserIds.includes(item.id)))
        .sort((a: NotificationItem, b: NotificationItem) => b.sortTime - a.sortTime);

      if (!isHod) {
        setNotifications(userNotifications);
        return;
      }

      const paidLeaveJson = paidLeaveRes;
      const casualLeaveJson = casualLeaveRes;
      const urgentLeaveJson = urgentLeaveRes;
      const crewcamLeaveJson = crewcamLeaveRes ? parseJsonSafely(await crewcamLeaveRes.text()) : null;
      const officeOutJson = officeOutRes ? parseJsonSafely(await officeOutRes.text()) : null;

      const paidLeaveItems = getArrayResult(paidLeaveJson);
      const casualLeaveItems = getArrayResult(casualLeaveJson);
      const urgentLeaveItems = getArrayResult(urgentLeaveJson);
      if (!paidLeaveItems.length && !casualLeaveItems.length && !urgentLeaveItems.length && crewcamLeaveJson?.canApprove !== true && officeOutJson?.canApprove !== true) {
        setNotifications(userNotifications);
        return;
      }

      let todayPendingNotifications: NotificationItem[] = [];

      if (paidLeaveItems.length) {
        const paidLeaveList = paidLeaveItems
          .map((item: any) => {
            const addedValue = item.added || item.pl_added || item.createdAt || item.created_at || item.date || "";
            const added = addedValue ? new Date(String(addedValue).replace(" ", "T")) : null;
            const id = String(item.plId || item.pl_id || item.leaveId || item.leave_id || item.id || item._id || "");
            return {
              id,
              title: `${t("Paid Leave")} ${t("request by")} ${formatName(item.emp_firstName || item.employeeName || item.name || item.empName) || t("Employee")}`,
              time: added && !Number.isNaN(added.getTime()) ? formatIstTime(added) : "",
              date: added && !Number.isNaN(added.getTime()) ? formatIstDate(added) : "",
              type: "PAID_LEAVE",
              sortTime: added && !Number.isNaN(added.getTime()) ? added.getTime() : 0,
              status: item.status || item.pl_status || item.leave_status || "Pending",
            };
          })
          .filter((item: any) => item.id && isPendingStatus(item.status) && !dismissedIds.includes(item.id))
          .sort((a: NotificationItem, b: NotificationItem) => b.sortTime - a.sortTime);

        todayPendingNotifications = [...todayPendingNotifications, ...paidLeaveList];
      }

      if (casualLeaveItems.length) {
        const casualLeaveList = casualLeaveItems
          .map((item: any) => {
            const addedValue = item.added || item.cleave_added || item.createdAt || item.created_at || item.date || "";
            const added = addedValue ? new Date(String(addedValue).replace(" ", "T")) : null;
            const id = String(item.cleaveId || item.cleave_id || item.leaveId || item.leave_id || item.id || item._id || "");
            return {
              id,
              title: `${t("Casual Leave")} ${t("request by")} ${formatName(item.emp_firstName || item.employeeName || item.name || item.empName) || t("Employee")}`,
              time: added && !Number.isNaN(added.getTime()) ? formatIstTime(added) : "",
              date: added && !Number.isNaN(added.getTime()) ? formatIstDate(added) : "",
              type: "CASUAL_LEAVE",
              sortTime: added && !Number.isNaN(added.getTime()) ? added.getTime() : 0,
              status: item.status || item.cleave_status || item.leave_status || "Pending",
            };
          })
          .filter((item: any) => item.id && isPendingStatus(item.status) && !dismissedIds.includes(item.id))
          .sort((a: NotificationItem, b: NotificationItem) => b.sortTime - a.sortTime);

        todayPendingNotifications = [...todayPendingNotifications, ...casualLeaveList];
      }

      if (urgentLeaveItems.length) {
        const urgentLeaveList = urgentLeaveItems
          .map((item: any) => {
            const addedValue = item.added || item.uleave_added || item.createdAt || item.created_at || item.date || "";
            const added = addedValue ? new Date(String(addedValue).replace(" ", "T")) : null;
            const id = String(item.uleaveId || item.uleave_id || item.urgentLeaveId || item.urgent_leave_id || item.leaveId || item.leave_id || item.id || item._id || "");
            return {
              id,
              title: `${t("Urgent Leave")} ${t("request by")} ${formatName(item.emp_firstName || item.employeeName || item.name || item.empName) || t("Employee")}`,
              body: String(item.descr || item.reason || ""),
              time: added && !Number.isNaN(added.getTime()) ? formatIstTime(added) : "",
              date: added && !Number.isNaN(added.getTime()) ? formatIstDate(added) : "",
              type: "URGENT_LEAVE",
              sortTime: added && !Number.isNaN(added.getTime()) ? added.getTime() : 0,
              status: item.status || item.uleave_status || item.leave_status || "Pending",
            };
          })
          .filter((item: any) => item.id && isPendingStatus(item.status) && !dismissedIds.includes(item.id))
          .sort((a: NotificationItem, b: NotificationItem) => b.sortTime - a.sortTime);

        todayPendingNotifications = [...todayPendingNotifications, ...urgentLeaveList];
      }

      if (crewcamLeaveJson?.status === "success") {
        const todayKey = getIstDateKey(new Date());
        const crewcamLeaveList = (crewcamLeaveJson.result || [])
          .map((item: any) => {
            const added = item.createdAt ? new Date(item.createdAt) : null;
            return {
            id: `${item._id}`,
            title: `${t(item.leaveType || "Leave")} ${t("request by")} ${formatName(item.employeeName) || t("Employee")}${item.department ? ` | ${item.department}` : ""}`,
            time: added ? formatIstTime(added) : "",
            date: added ? formatIstDate(added) : "",
            type: "CREWCAM_LEAVE",
            sortTime: added ? added.getTime() : 0,
            status: item.status,
            istDateKey: added ? getIstDateKey(added) : "",
          };
        })
          .filter((item: any) => item.status === "Pending" && item.istDateKey === todayKey && !dismissedIds.includes(item.id))
          .sort((a: NotificationItem, b: NotificationItem) => b.sortTime - a.sortTime);

        todayPendingNotifications = [...todayPendingNotifications, ...crewcamLeaveList];
      }

      if (officeOutJson?.status === "success") {
        const todayKey = getIstDateKey(new Date());
        const officeOutList = (officeOutJson.result || [])
          .map((item: any) => {
            const added = item.createdAt ? new Date(item.createdAt) : null;
            const typeText = item.workType ? `${item.workType} ` : "";
            return {
              id: `${item._id}`,
              title: `${typeText}${t("Office Out")} ${t("request by")} ${formatName(item.employeeName) || t("Employee")}${item.department ? ` | ${item.department}` : ""}`,
              time: added ? formatIstTime(added) : "",
              date: added ? formatIstDate(added) : "",
              type: "OFFICE_OUT",
              sortTime: added ? added.getTime() : 0,
              status: item.status,
              istDateKey: added ? getIstDateKey(added) : "",
            };
          })
          .filter((item: any) => item.status === "pending" && item.istDateKey === todayKey && !dismissedIds.includes(item.id))
          .sort((a: NotificationItem, b: NotificationItem) => b.sortTime - a.sortTime);

        todayPendingNotifications = [...todayPendingNotifications, ...officeOutList];
      }

      setNotifications([...userNotifications, ...todayPendingNotifications].sort((a, b) => b.sortTime - a.sortTime));
    } catch (error) {
      console.log("Notification Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const isApprovalNotification = (
    item: NotificationItem,
  ): item is NotificationItem & { type: "PAID_LEAVE" | "CASUAL_LEAVE" | "URGENT_LEAVE" | "CREWCAM_LEAVE" | "OFFICE_OUT" } =>
    item.type === "PAID_LEAVE" || item.type === "CASUAL_LEAVE" || item.type === "URGENT_LEAVE" || item.type === "CREWCAM_LEAVE" || item.type === "OFFICE_OUT";

  const handleNotificationPress = (item: NotificationItem) => {
    if (isApprovalNotification(item)) {
      navigation.navigate("ApprovalDetailScreen", {
        requestId: item.id,
        requestType: item.type,
      });
      return;
    }

    setSelectedNotification(item);
  };

  const handleNoted = async () => {
    if (!selectedNotification) return;
    const currentNotification = selectedNotification;
    if (notingId === currentNotification.id) return;

    setNotingId(currentNotification.id);
    try {
      if (
        (currentNotification.type === "BIRTHDAY" || currentNotification.type === "ANNIVERSARY") &&
        !currentNotification.isOwnOccasion
      ) {
        const activeUserId = await AsyncStorage.getItem('user_id');
        const activeEmpCode = await AsyncStorage.getItem('user_emp_code');
        const response = await fetch(`${WISH_API(currentNotification.id)}?token=${encodeURIComponent(activeToken)}&id=${encodeURIComponent(activeUserId || "")}&empCode=${encodeURIComponent(activeEmpCode || "")}`, {
          method: "POST",
        });
        const responseText = await response.text();
        if (!response.ok) throw new Error(responseText || "Wish save failed");
        assertSuccessResponse(responseText, "Wish save failed");
      } else {
        const ackBody: { notificationType: string; targetUserId?: string } = {
          notificationType: currentNotification.type,
        };
        if (currentNotification.targetUserId) {
          ackBody.targetUserId = currentNotification.targetUserId;
        }

        const activeUserId = await AsyncStorage.getItem('user_id');
        const activeEmpCode = await AsyncStorage.getItem('user_emp_code');
        const response = await fetch(`${ACK_API(currentNotification.id)}?token=${encodeURIComponent(activeToken)}&id=${encodeURIComponent(activeUserId || "")}&empCode=${encodeURIComponent(activeEmpCode || "")}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ackBody),
        });
        const responseText = await response.text();
        if (!response.ok) throw new Error(responseText || "Notification ack failed");
        assertSuccessResponse(responseText, "Notification ack failed");
      }

      setNotifications((prev) => prev.filter((item) => item.id !== currentNotification.id));
      setSelectedNotification(null);
      const activeUserId = await AsyncStorage.getItem('user_id');
      await saveDismissedUserId(currentNotification.id, activeUserId || activeToken);
    } catch (error) {
      console.log("Notification action error:", error);
    } finally {
      setNotingId("");
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
    style={styles.notificationCard}
    activeOpacity={0.7}
    onPress={() => handleNotificationPress(item)}
  >
      <View style={styles.row}>
        {item.image ? (
          <ProfileAvatar uri={item.image} style={styles.notificationAvatar} iconSize={18} />
        ) : null}
        <Text style={styles.title}>{formatNotificationText(item.title, item)} | {item.time} | {item.date}</Text>
      </View>
    </TouchableOpacity>
  );

  const isCelebrationModal = selectedNotification?.type === 'BIRTHDAY' || selectedNotification?.type === 'ANNIVERSARY' || selectedNotification?.type === 'WISH_RECEIVED';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['rgba(0,16,28,0.16)', 'rgba(0,26,47,0.22)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Image source={logo} style={styles.logoImage} resizeMode="contain" />
      </View>

      <View style={styles.container}>
        <Text style={styles.heading}>{t("Today's Notifications")}</Text>
        <Text style={styles.sub}>
          {t('Please check all notifications before continuing!')}
        </Text>

        <View style={styles.card}>
          {loading ? (
            <Text style={styles.noData}>{t('Loading...')}</Text>
          ) : notifications.length === 0 ? (
            <Text style={styles.noData}>{t('No updates available')}</Text>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={styles.cardFooter}>
            <AppButton
              title={notifications.length > 0 ? t("Open all updates") : t("Continue")}
              disabled={loading || notifications.length > 0}
              onPress={() => navigation.replace("DailyUpdate")}
            />
          </View>
        </View>
      </View>

      <Modal
        visible={Boolean(selectedNotification)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={BounceIn.duration(800)} style={{ width: '100%', alignItems: 'center' }}>
            <LinearGradient
              colors={
                isCelebrationModal
                  ? ['rgba(68, 25, 87, 0.99)', 'rgba(12, 35, 67, 0.99)', 'rgba(5, 24, 45, 0.99)']
                  : ['rgba(19, 39, 70, 0.98)', 'rgba(9, 27, 51, 0.98)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.modalCard, isCelebrationModal && styles.celebrationModalCard]}
            >
              {isCelebrationModal ? (
                <View style={styles.celebrationLayer} pointerEvents="none">
                  <View style={[styles.ribbon, styles.ribbonLeft]} />
                  <View style={[styles.ribbon, styles.ribbonRight]} />
                  <View style={[styles.confettiDot, styles.confettiOne]} />
                  <View style={[styles.confettiDot, styles.confettiTwo]} />
                  <View style={[styles.confettiDot, styles.confettiThree]} />
                  <View style={[styles.confettiDash, styles.confettiFour]} />
                  <View style={[styles.confettiDash, styles.confettiFive]} />
                  <FontAwesomeIcon icon={faCakeCandles} size={28} color="rgba(255, 211, 102, 0.7)" style={{ position: 'absolute', top: 20, left: 10, transform: [{rotate: '-15deg'}] }} />
                  <FontAwesomeIcon icon={faGift} size={24} color="rgba(85, 230, 238, 0.7)" style={{ position: 'absolute', bottom: 40, right: 10, transform: [{rotate: '20deg'}] }} />
                  <FontAwesomeIcon icon={faChampagneGlasses} size={26} color="rgba(244, 114, 182, 0.7)" style={{ position: 'absolute', top: 120, right: 5, transform: [{rotate: '10deg'}] }} />
                  <FontAwesomeIcon icon={faStar} size={18} color="rgba(251, 191, 36, 0.8)" style={{ position: 'absolute', bottom: 60, left: 20 }} />
                </View>
              ) : null}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
              >
                {isCelebrationModal ? (
                  <Animated.View entering={ZoomIn.duration(1000).delay(200)} style={styles.celebrationHeader}>
                    <View style={styles.partyCap}>
                      <View style={styles.partyCapStripe} />
                      <View style={styles.partyCapDot} />
                    </View>
                    <View style={styles.celebrationBadge}>
                      <Text style={styles.celebrationBadgeText}>
                        {selectedNotification?.type === 'BIRTHDAY' || (selectedNotification?.type === 'WISH_RECEIVED' && selectedNotification?.body?.toLowerCase().includes('birthday')) ? t('Birthday Celebration') : t('Anniversary Celebration')}
                      </Text>
                    </View>
                  </Animated.View>
                ) : (
                <Text style={styles.modalType}>
                  {selectedNotification?.type === "BIRTHDAY"
                    ? t("Birthday")
                    : selectedNotification?.type === "ANNIVERSARY"
                      ? t("Marriage Anniversary")
                      : selectedNotification?.type === "WISH_RECEIVED"
	                          ? t("Wish Received")
	                        : selectedNotification?.type === "WISH_SENT"
	                          ? t("Wish Sent")
	                          : selectedNotification?.type === "URGENT_LEAVE"
	                            ? t("Urgent Leave")
	                          : t("Company Update")}
                </Text>
              )}
              <Text style={styles.modalTitle}>{formatNotificationText(selectedNotification?.title, selectedNotification)}</Text>
              {selectedNotification?.image ? (
                <ProfileAvatar uri={selectedNotification.image} style={styles.modalAvatar} iconSize={30} />
              ) : null}
              {selectedNotification?.date ? (
                <Text style={styles.modalMeta}>
                  {selectedNotification.date}{selectedNotification.time ? ` | ${selectedNotification.time}` : ""}
                </Text>
              ) : null}
              {selectedNotification?.body ? (
                <Text style={styles.modalBody}>{formatNotificationText(selectedNotification.body, selectedNotification)}</Text>
              ) : null}


              {selectedNotification?.isOwnOccasion && selectedNotification?.wishedBy?.length ? (
                <View style={styles.wishedByBox}>
                  <Text style={styles.wishedByTitle}>{t("Wished by")}</Text>
                  {selectedNotification.wishedByProfiles?.length ? (
                    selectedNotification.wishedByProfiles.map((person, index) => (
                      <View style={styles.wishedByRow} key={`${person.name || "wisher"}-${index}`}>
                        {person.image ? (
                          <ProfileAvatar uri={person.image} style={styles.wishedByAvatar} iconSize={14} />
                        ) : null}
                        <Text style={styles.wishedByNames}>{formatName(person.name) || t("Someone")}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.wishedByNames}>{selectedNotification.wishedBy.join(", ")}</Text>
                  )}
                </View>
              ) : null}
              {selectedNotification?.createdBy ? (
                <Text style={styles.modalBy}>{t("By")} {formatName(selectedNotification.createdBy)}</Text>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedNotification(null)}>
                <Text style={styles.closeButtonText}>{t("Close")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notedButton, notingId === selectedNotification?.id && styles.notedButtonDisabled]}
                onPress={handleNoted}
                disabled={notingId === selectedNotification?.id}
              >
                <Text style={styles.notedButtonText}>
                  {selectedNotification?.type === "BIRTHDAY" || selectedNotification?.type === "ANNIVERSARY"
                    ? selectedNotification?.isOwnOccasion
                      ? t("Noted")
                      : t("Send Wish")
                    : t("Noted")}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },

  header: {
    height: 64,
    backgroundColor: colors.headerBg,
    justifyContent: "center",
    paddingHorizontal: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  logoImage: { width: 180, height: 120 },

  container: { flex: 1 },

  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    paddingLeft: spacing(2),
    paddingTop: spacing(2),
  },

  sub: {
    color: colors.muted,
    paddingLeft: spacing(2),
    marginBottom: spacing(2),
    fontSize: 14,
  },

  card: {
    flex: 1,
    backgroundColor: colors.panel,
    padding: spacing(2),
    margin: spacing(1),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    justifyContent: "space-between",
  },

  notificationCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    marginBottom: 1,
    paddingVertical: spacing(1),
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(127,246,255,0.36)",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    paddingRight: 10,
  },

  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6,
  },

  pendingBadge: {
    backgroundColor: "#ffb020",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  pendingText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "700",
  },

  noData: {
    alignSelf: "center",
    marginTop: spacing(4),
    color: colors.muted,
  },

  cardFooter: {
    marginTop: spacing(2),
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.64)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(2),
  },

  modalCard: {
    width: "100%",
    maxHeight: "92%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(127,246,255,0.62)",
    padding: spacing(2),
    alignItems: 'center',
  },

  celebrationModalCard: {
    borderColor: 'rgba(255,211,102,0.82)',
    borderWidth: 1.4,
    overflow: 'hidden',
    shadowColor: '#ffd166',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  celebrationLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    width: 92,
    height: 16,
    backgroundColor: 'rgba(255,211,102,0.9)',
  },
  ribbonLeft: {
    left: -26,
    transform: [{ rotate: '-28deg' }],
  },
  ribbonRight: {
    right: -26,
    backgroundColor: 'rgba(85,230,238,0.86)',
    transform: [{ rotate: '28deg' }],
  },
  confettiDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confettiDash: {
    position: 'absolute',
    width: 16,
    height: 5,
    borderRadius: 3,
  },
  confettiOne: {
    top: 34,
    left: 26,
    backgroundColor: '#ffd166',
  },
  confettiTwo: {
    top: 70,
    right: 30,
    backgroundColor: '#55e6ee',
  },
  confettiThree: {
    top: 124,
    left: 38,
    backgroundColor: '#f472b6',
  },
  confettiFour: {
    top: 96,
    right: 58,
    backgroundColor: '#a7f3d0',
    transform: [{ rotate: '-20deg' }],
  },
  confettiFive: {
    top: 42,
    right: 98,
    backgroundColor: '#fbbf24',
    transform: [{ rotate: '24deg' }],
  },
  modalScroll: {
    width: '100%',
  },
  modalScrollContent: {
    alignItems: 'center',
  },
  celebrationHeader: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 10,
  },
  partyCap: {
    width: 0,
    height: 0,
    borderLeftWidth: 26,
    borderRightWidth: 26,
    borderBottomWidth: 58,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffd166',
    marginBottom: -4,
    transform: [{ rotate: '-8deg' }],
  },
  partyCapStripe: {
    position: 'absolute',
    left: -17,
    top: 32,
    width: 34,
    height: 7,
    borderRadius: 6,
    backgroundColor: '#55e6ee',
    transform: [{ rotate: '18deg' }],
  },
  partyCapDot: {
    position: 'absolute',
    left: -5,
    top: -7,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f472b6',
  },
  celebrationBadge: {
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255,211,102,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,211,102,0.58)',
  },
  celebrationBadgeText: {
    color: '#ffe8a3',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },

  modalType: {
    color: "#55e6ee",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 2,
    textAlign: 'left',
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
    textAlign: 'left',
  },

  modalAvatar: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    marginTop: 2,
    borderWidth: 2,
    borderColor: "rgba(127,246,255,0.46)",
  },

  modalMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
  },

  modalBody: {
    color: "rgba(230,237,246,0.88)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
    textAlign: 'left',
  },

  modalBy: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },

  wishSummaryText: {
    color: "#55e6ee",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 2,
  },

  wishCountText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },

  wishedByBox: {
    marginTop: 2,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(127,246,255,0.28)",
    backgroundColor: "rgba(127,246,255,0.08)",
  },

  wishedByTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 2,
  },

  wishedByRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  wishedByAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 9,
    borderWidth: 1,
    borderColor: "rgba(127,246,255,0.34)",
  },

  wishedByNames: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: spacing(2),
  },

  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },

  closeButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },

  notedButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "#55e6ee",
  },

  notedButtonDisabled: {
    opacity: 0.6,
  },

  notedButtonText: {
    color: "#001a2f",
    fontSize: 13,
    fontWeight: "900",
  },
});
