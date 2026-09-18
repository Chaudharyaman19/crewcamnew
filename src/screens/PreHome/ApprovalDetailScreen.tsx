import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import LinearGradient from "react-native-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";

import { colors, spacing } from "../../theme";
import { PreHomeStackParamList } from "../../types/navigation";
import { shortDateFormate } from "../../utils/shortDateFormate";
import { shortTimeFormat } from "../../utils/shortTimeFormat";
import { API_BASE_URL } from "@env";

const logo = require("../../assets/dashboardmainscreen/newcrekamlogo.png");

type Props = NativeStackScreenProps<
  PreHomeStackParamList,
  "ApprovalDetailScreen"
>;

const PAID_LEAVE_DETAIL_API =
  "https://arogyamantra.com/newApi/pendingPaidLeaveDetails.php";
const CASUAL_LEAVE_DETAIL_API =
  "https://arogyamantra.com/newApi/casualLeaveDetail.php";
const URGENT_LEAVE_LIST_API =
  "https://arogyamantra.com/newApi/pendingUrgentLeave.php";
const MEETING_DETAIL_API =
  "https://arogyamantra.com/app-api/pendingMeetingDetails.php";
const PAID_LEAVE_STATUS_API =
  "https://arogyamantra.com/newApi/updatePaidLeaveStatus.php";
const CASUAL_LEAVE_STATUS_API =
  "https://arogyamantra.com/newApi/casualStatusUpdate.php";
const URGENT_LEAVE_STATUS_API =
  "https://arogyamantra.com/newApi/urgentleaveStatUpdate.php";
const MEETING_STATUS_API =
  "https://arogyamantra.com/app-api/updateMeetingStatus.php";
const CREWCAM_LEAVE_DETAIL_API = `${API_BASE_URL}/app-api/leave/approvals`;
const OFFICE_OUT_DETAIL_API = `${API_BASE_URL}/app-api/office-out/approvals`;
const DISMISSED_LEAVE_KEY = "dismissed_crewcam_leave_notifications";

export default function ApprovalDetailScreen({ route, navigation }: Props) {
  const { t, formatName } = useLanguage();
  const { requestId, requestType } = route.params;

  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem("user_firstname").then((name) => {
      if (name) setUserName(name.trim());
    });
  }, []);

  useEffect(() => {
    if (!requestId) return;

    if (requestType === "PAID_LEAVE") {
      fetchPaidLeaveDetail();
    } else if (requestType === "CASUAL_LEAVE") {
      fetchCasualLeaveDetail();
    } else if (requestType === "URGENT_LEAVE") {
      fetchUrgentLeaveDetail();
    } else if (requestType === "CREWCAM_LEAVE") {
      fetchCrewcamLeaveDetail();
    } else if (requestType === "OFFICE_OUT") {
      fetchOfficeOutDetail();
    } else {
      fetchMeetingDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, requestType]);

  const fetchPaidLeaveDetail = async () => {
    try {
      const res = await fetch(PAID_LEAVE_DETAIL_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `plId=${encodeURIComponent(requestId)}`,
      });
      const json = await res.json();

      if (json?.status === 200 || json?.result) {
        setDetail(json.result || json.data || json);
      }
    } catch (e) {
      console.log("Paid Leave Error", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCasualLeaveDetail = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(CASUAL_LEAVE_DETAIL_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(token || "")}&cleaveId=${encodeURIComponent(requestId)}`,
      });
      const json = await res.json();

      if (json?.status === 200 || json?.result) {
        setDetail(json.result || json.data || json);
      }
    } catch (e) {
      console.log("Casual Leave Error", e);
    } finally {
      setLoading(false);
    }
  };

  const getUrgentLeaveItems = (json: any) => {
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.result)) return json.result;
    if (Array.isArray(json?.data)) return json.data;
    if (Array.isArray(json?.urgentLeaveRequests)) return json.urgentLeaveRequests;
    if (Array.isArray(json?.urgent_leave_requests)) return json.urgent_leave_requests;
    if (json?.result && typeof json.result === "object") return getUrgentLeaveItems(json.result);
    if (json?.data && typeof json.data === "object") return getUrgentLeaveItems(json.data);
    return [];
  };

  const getUrgentLeaveId = (item: any) =>
    String(item?.uleaveId || item?.uleave_id || item?.urgentLeaveId || item?.urgent_leave_id || item?.leaveId || item?.leave_id || item?.id || item?._id || "");

  const fetchUrgentLeaveDetail = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(URGENT_LEAVE_LIST_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(token || "")}`,
      });
      const json = await res.json();
      const urgentItems = getUrgentLeaveItems(json);
      const selected = urgentItems.find((item: any) => getUrgentLeaveId(item) === String(requestId));

      setDetail(selected || {leaveId: requestId, status: "Pending", leaveType: "Urgent Leave"});
    } catch (e) {
      console.log("Urgent Leave Error", e);
      setDetail({leaveId: requestId, status: "Pending", leaveType: "Urgent Leave"});
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingDetail = async () => {
    try {
      const res = await fetch(MEETING_DETAIL_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `mtId=${requestId}`,
      });
      const json = await res.json();

      if (json?.result) {
        setDetail(json.result);
      }
    } catch (e) {
      console.log("Meeting Error", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrewcamLeaveDetail = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const userId = await AsyncStorage.getItem("user_id");
      const empCode = await AsyncStorage.getItem("user_emp_code");
      const res = await fetch(
        `${CREWCAM_LEAVE_DETAIL_API}/${requestId}?token=${encodeURIComponent(token || "")}&id=${encodeURIComponent(userId || "")}&empCode=${encodeURIComponent(empCode || "")}`,
      );
      const json = await res.json();

      if (json?.status === "success") {
        setDetail(json.result);
      }
    } catch (e) {
      console.log("Crewcam Leave Error", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficeOutDetail = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const userId = await AsyncStorage.getItem("user_id");
      const empCode = await AsyncStorage.getItem("user_emp_code");
      const res = await fetch(
        `${OFFICE_OUT_DETAIL_API}/${requestId}?token=${encodeURIComponent(token || "")}&id=${encodeURIComponent(userId || "")}&empCode=${encodeURIComponent(empCode || "")}`,
      );
      const json = await res.json();

      if (json?.status === "success") {
        setDetail(json.result);
      }
    } catch (e) {
      console.log("Office Out Error", e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: "Approved" | "Declined") => {
    try {
      setLoading(true);

      if (requestType === "CREWCAM_LEAVE" || requestType === "OFFICE_OUT") {
        const token = await AsyncStorage.getItem("auth_token");
        const userId = await AsyncStorage.getItem("user_id");
        const empCode = await AsyncStorage.getItem("user_emp_code");
        const statusUrl =
          requestType === "CREWCAM_LEAVE"
            ? `${CREWCAM_LEAVE_DETAIL_API}/${requestId}/status`
            : `${OFFICE_OUT_DETAIL_API}/${requestId}/status`;
        const res = await fetch(statusUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            id: userId,
            empCode,
            status: requestType === "CREWCAM_LEAVE"
              ? (status === "Approved" ? "Approved" : "Rejected")
              : (status === "Approved" ? "approved" : "rejected"),
          }),
        });
        const json = await res.json();

        if (json?.status === "success") {
          const dismissedRaw = await AsyncStorage.getItem(DISMISSED_LEAVE_KEY);
          let dismissedParsed: unknown = [];
          try {
            dismissedParsed = dismissedRaw ? JSON.parse(dismissedRaw) : [];
          } catch {
            dismissedParsed = [];
          }
          const dismissedIds = Array.isArray(dismissedParsed) ? dismissedParsed.map(String) : [];
          await AsyncStorage.setItem(
            DISMISSED_LEAVE_KEY,
            JSON.stringify([...new Set([...dismissedIds, requestId])])
          );
          setDetail(json.result);
          Alert.alert("Success", `Request ${status} successfully`);
          navigation.replace("PaymentLeave");
        } else {
          Alert.alert("Error", json?.message || "Unable to update status");
        }
        return;
      }

      const api =
        requestType === "PAID_LEAVE"
          ? PAID_LEAVE_STATUS_API
          : requestType === "CASUAL_LEAVE"
            ? CASUAL_LEAVE_STATUS_API
          : requestType === "URGENT_LEAVE"
            ? URGENT_LEAVE_STATUS_API
          : MEETING_STATUS_API;

      const body =
        requestType === "PAID_LEAVE"
          ? `leaveId=${encodeURIComponent(requestId)}&status=${encodeURIComponent(status)}`
          : requestType === "CASUAL_LEAVE"
            ? `token=${encodeURIComponent(await AsyncStorage.getItem("auth_token") || "")}&mtId=${encodeURIComponent(requestId)}&status=${encodeURIComponent(status)}`
          : requestType === "URGENT_LEAVE"
            ? `token=${encodeURIComponent(await AsyncStorage.getItem("auth_token") || "")}&leaveId=${encodeURIComponent(requestId)}&type=${encodeURIComponent(detail?.type || detail?.ltype || detail?.leaveType || "Urgent Leave")}&status=${encodeURIComponent(status)}`
          : `mtId=${requestId}&status=${status}`;

      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const json = await res.json();

      if (json?.status === 200 || json?.success || json?.status === true || json?.result) {
        Alert.alert("Success", `Request ${status} successfully`);
        navigation.replace("PaymentLeave");
      } else {
        Alert.alert("Error", "Unable to update status");
      }
    } catch (error) {
      console.log("Status Update Error", error);
      Alert.alert("Server Error");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => updateStatus("Approved");
  const handleDecline = () => updateStatus("Declined");

  const formatDateTime = (value?: string) => {
    if (!value) return "--";
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return value;
    return dateValue.toLocaleString();
  };

  const renderDetailRow = (label: string, value?: string | number | null) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ? String(value) : "--"}</Text>
    </View>
  );

  const renderDescription = () => {
    if (requestType === "CREWCAM_LEAVE") {
      return (
        <View style={styles.detailList}>
          {renderDetailRow("Employee ID", detail?.employeeCode)}
          {renderDetailRow("Contact Number", detail?.employeeMobile)}
          {renderDetailRow("Leave Date", detail?.leavePeriod)}
          {renderDetailRow("Applied Date", formatDateTime(detail?.createdAt))}
          {renderDetailRow("Reason", detail?.reason)}
          {renderDetailRow("Department", detail?.department)}
          {renderDetailRow("Designation", detail?.designation)}
          {renderDetailRow("Reporting Manager", formatName(detail?.hodName || detail?.reportingManager))}
          {renderDetailRow(
            "Responsible Person",
            `${formatName(detail?.responsibleEmployee) || "--"}${detail?.responsibleDesignation ? ` | ${detail.responsibleDesignation}` : ""}`,
          )}
          {renderDetailRow("Location", detail?.address || detail?.location)}
          {renderDetailRow("Name", formatName((detail?.emp_firstName || detail?.employeeName || "").trim()))}
          {renderDetailRow("Status", detail?.status)}
        </View>
      );
    }

	    if (requestType === "PAID_LEAVE") {
	      return (
	        <Text style={styles.requestReason}>
	          {detail?.descr || "--"}
	        </Text>
	      );
	    }

    if (requestType === "CASUAL_LEAVE") {
      return (
        <View style={styles.detailList}>
          {renderDetailRow("Name", formatName((detail?.emp_firstName || detail?.employeeName || detail?.name || "").trim()))}
          {renderDetailRow("Employee ID", detail?.emp_uid || detail?.employeeCode || detail?.empCode)}
          {renderDetailRow("Contact Number", detail?.emp_mobile || detail?.employeeMobile || detail?.mobile)}
          {renderDetailRow("Leave Type", detail?.ltype || detail?.leaveType || "Casual Leave")}
          {renderDetailRow("Reason", detail?.descr || detail?.reason)}
          {renderDetailRow("Address", detail?.address)}
          {renderDetailRow("Status", detail?.status || detail?.cleave_status || detail?.leave_status)}
        </View>
      );
    }

    if (requestType === "URGENT_LEAVE") {
      return (
        <View style={styles.detailList}>
          {renderDetailRow("Name", formatName((detail?.emp_firstName || detail?.employeeName || detail?.name || "").trim()))}
          {renderDetailRow("Employee ID", detail?.emp_uid || detail?.employeeCode || detail?.empCode)}
          {renderDetailRow("Contact Number", detail?.emp_mobile || detail?.employeeMobile || detail?.mobile)}
          {renderDetailRow("Leave Type", detail?.ltype || detail?.leaveType || detail?.type || "Urgent Leave")}
          {renderDetailRow("Reason", detail?.descr || detail?.reason)}
          {renderDetailRow("Address", detail?.address || detail?.location)}
          {renderDetailRow("Status", detail?.status || detail?.uleave_status || detail?.leave_status)}
        </View>
      );
    }

    if (requestType === "OFFICE_OUT") {
      return (
        <View style={styles.detailList}>
          {renderDetailRow("Employee ID", detail?.employeeCode)}
          {renderDetailRow("Contact Number", detail?.employeeMobile)}
          {renderDetailRow("Name", formatName(detail?.employeeName))}
          {renderDetailRow("Department", detail?.department)}
          {renderDetailRow("Designation", detail?.designation)}
          {renderDetailRow("Work Type", detail?.workType)}
          {renderDetailRow("Reason", detail?.reason)}
          {renderDetailRow("Out Date", formatDateTime(detail?.outDate || detail?.createdAt))}
          {renderDetailRow("Out Time", detail?.outTime)}
          {renderDetailRow("Location", detail?.details?.log_address || detail?.location?.address)}
          {renderDetailRow("Status", detail?.status)}
        </View>
      );
    }

    return (
      <Text style={styles.requestReason}>
        <Text style={styles.bold}>Company Name : </Text>
        {detail?.mt_compName || "--"}{"\n\n"}

        <Text style={styles.bold}>Company Address : </Text>
        {detail?.mt_location || "--"}{"\n\n"}

        <Text style={styles.bold}>Client Details : </Text>
        {detail?.mt_clientName || "--"} | {detail?.mt_clientDesi || "--"} |{" "}
        {detail?.mt_clientMobile || "--"}{"\n\n"}

        <Text style={styles.bold}>Meeting Agenda : </Text>
        {"\n"}
        {detail?.reason || "--"}{"\n\n"}

        <Text style={styles.bold}>Meeting Date & Time :</Text>
        {"\n"}
        {detail?.mt_datetime
          ? `${shortDateFormate(
            detail.mt_datetime.split(" ")[0]
          )} | ${shortTimeFormat(detail.mt_datetime.split(" ")[1])}`
          : "--"}
      </Text>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const added = detail?.added || detail?.mt_added || "";
  const [date, time] = added ? added.split(" ") : ["", ""];

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

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>{t('Hi')} {formatName(userName, 1)}</Text>

        <Text style={styles.message}>
          Please see below,{" "}
          <Text style={styles.bold}>
            {formatName((detail?.emp_firstName || detail?.employeeName || "").trim())}
          </Text>{" "}
          is requesting you for{" "}
          {requestType === "PAID_LEAVE"
            ? "Paid Leave"
            : requestType === "CASUAL_LEAVE"
              ? "Casual Leave"
            : requestType === "URGENT_LEAVE"
              ? "Urgent Leave"
            : requestType === "CREWCAM_LEAVE"
              ? detail?.leaveType || "Leave"
              : requestType === "OFFICE_OUT"
                ? "Office Out"
              : "Meeting"}.
        </Text>

        <View style={styles.requestCard}>
          <Text style={styles.requestTitle}>
            {requestType === "PAID_LEAVE"
              ? "Paid Leave"
              : requestType === "CASUAL_LEAVE"
                ? "Casual Leave"
              : requestType === "URGENT_LEAVE"
                ? "Urgent Leave"
              : requestType === "CREWCAM_LEAVE"
                ? detail?.leaveType || "Leave"
                : requestType === "OFFICE_OUT"
                  ? "Office Out"
              : "Meeting"}{" "}
            Request
          </Text>

          {renderDescription()}

          <Text style={styles.regards}>
            {t('Regards')}, {formatName((detail?.emp_firstName || detail?.employeeName || "").trim())}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.acceptBtn, loading && styles.disabledActionBtn]}
            onPress={handleAccept}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.acceptBtnText}>ACCEPT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.declineBtn, loading && styles.disabledActionBtn]}
            onPress={handleDecline}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.declineBtnText}>DECLINE</Text>
          </TouchableOpacity>
        </View>

        {requestType !== "CREWCAM_LEAVE" && requestType !== "OFFICE_OUT" && (
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Request Info</Text>

          {(requestType === "PAID_LEAVE" || requestType === "CASUAL_LEAVE" || requestType === "URGENT_LEAVE") && (
            <Text style={styles.infoText}>
              Leave Type: {detail?.ltype}
            </Text>
          )}

          <Text style={styles.infoText}>
            Request Date:{" "}
            {date ? shortDateFormate(date) : "--"} |{" "}
            {time ? shortTimeFormat(time) : "--"}
          </Text>

          {(requestType === "PAID_LEAVE" || requestType === "CASUAL_LEAVE") && (
            <Text style={styles.locationText}>
              Address: {(detail?.address || "--").trim()}
            </Text>
          )}
        </View>
        )}
      </ScrollView>
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
  container: { flex: 1, padding: spacing(1.25) },
  greeting: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  message: {
    color: colors.muted,
    marginBottom: spacing(1),
    fontSize: 12,
    lineHeight: 16,
  },
  requestCard: {
    backgroundColor: colors.panel,
    padding: spacing(1),
    borderRadius: 10,
    marginBottom: spacing(1),
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  requestTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  requestReason: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
  },
  detailList: {
    gap: 3,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(231,169,61,0.08)",
    paddingBottom: 3,
  },
  detailLabel: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 1,
    width: 92,
  },
  detailValue: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    flex: 1,
    textAlign: "right",
  },
  regards: {
    color: colors.muted,
    marginTop: spacing(0.5),
    fontStyle: "italic",
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: spacing(1),
    gap: 8,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  disabledActionBtn: {
    opacity: 0.55,
  },
  acceptBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  declineBtnText: {
    color: "#ff6b6b",
    fontWeight: "800",
    fontSize: 12,
  },
  infoSection: {
    marginTop: spacing(1),
    backgroundColor: colors.panel,
    padding: spacing(2),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: spacing(4),
  },
  infoTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing(1),
  },
  infoText: {
    color: colors.muted,
    marginBottom: spacing(1),
    fontSize: 14,
  },
  locationText: {
    color: colors.muted,
    fontSize: 13,
  },
  bold: { fontWeight: "800", color: "#FFFFFF" },
});
