import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCalendarCheck,
  faUser,
  faListCheck,
  faBullhorn,
  faHeadset,
  faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';

// Screens
import DashboardScreen from '../screens/Main/DashboardScreen';
import ToDoScreen from '../screens/Main/TodoScreens';
import CreateTodo from '../screens/Main/CreateTodo';
import UpdatesScreen from '../screens/Main/CompanyUpdates';
import HrSupportScreen from '../screens/Main/HrSupport';
import ProfileScreen from '../screens/Main/ProfileScreen';
import HistoryScreen from '../screens/Main/HistoryScreen';
import AboutScreen from '../screens/Main/AboutScreen';
import HolidayListScreen from '../screens/Main/HolidayListScreen';

// Drawer
import CustomDrawerContent from '../components/CustomDrawerContent';
import AttendanceScreen from '../screens/Main/AttendanceScreen';
import LeaveMgmt from '../screens/Main/LeaveMgmt';
import MeetingVisit from '../screens/Main/MeetingVisit';
import MasterEye from '../screens/Main/MasterEye';
import EmpTrackingScreen from '../screens/Main/EmpTrackingScreen';
import NotificationsHello from '../screens/Main/NotificationsHello';
import DailyAttendanceScreen from '../screens/Main/DailyAttendance';
import AttendanceStatus from '../screens/Main/AttendanceStatus';
import CheckInScreen from '../screens/Main/CheckInScreen';
import AddMeetingScreen from '../screens/Main/AddMeetingScreen';
import LocalMeetingScreen from '../screens/Main/LocalMeetingScreen';
import OutstationMeetingScreen from '../screens/Main/OutstationMeetingScreen';
import CheckOutScreen from '../screens/Main/CheckOutScreen';
import OfficeOutScreen from '../screens/Main/OfficeOutScreen';
import OfficeInScreen from '../screens/Main/OfficeInScreen';
import PaidLeaveScreen from '../screens/Main/PaidLeave';
import UrgentLeaveScreen from '../screens/Main/UrgentLeave';
import CasualLeaveScreen from '../screens/Main/CasualLeaveScreen';
import OutStationLeaveScreen from '../screens/Main/OutStationLeaveScreen';
import ScheduledMeeting from '../screens/Main/ScheduledMeeting';
import EditMeetingScreen from '../screens/Main/EditMeetingScreen';
import MeetingDetailScreen from '../screens/Main/MeetingDetailScreen';
import CreateMomScreen from '../screens/Main/CreateMomScreen';
import MeetingHistoryScreen from '../screens/Main/MeetingHistoryScreen';
import AddSiteVisit from '../screens/Main/AddSiteVisit';
import CreateEditMomMeetingScreen from '../screens/Main/CreateEditMomMeetingScreen';
import MoMDetailsScreen from '../screens/Main/MoMDetailsScreen';
import EmployeeAttendance from '../screens/Main/EmployeeAttendance';
import EmployeeLiveTracking from '../screens/Main/EmployeeLiveTracking';
import EmployeeHistory from '../screens/Main/EmployeeHistory';

import { colors } from '../theme';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();
const ToDoStack = createStackNavigator();
const HomeStack = createStackNavigator();
const AttendanceStack = createStackNavigator();
const DailyAttendanceStack = createStackNavigator();
const MeetingStack = createStackNavigator();
const LeaveStack = createStackNavigator();
const MasterEyeStack = createStackNavigator();
const UpdatesStack = createStackNavigator();
const HrSupportStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const HistoryStack = createStackNavigator();
const TAB_ACCENT = '#55e6ee';
const TAB_BG = '#132746';
const TAB_ICON = '#55e6ee';

const getTabIconConfig = (routeName: string): { icon: IconProp; color: string } => {
  if (routeName === 'ToDo') {
    return { icon: faListCheck, color: TAB_ICON };
  }
  if (routeName === 'C.Updates') {
    return { icon: faBullhorn, color: TAB_ICON };
  }
  if (routeName === 'HR Support') {
    return { icon: faHeadset, color: TAB_ICON };
  }
  if (routeName === 'Profile') {
    return { icon: faUser, color: TAB_ICON };
  }
  if (routeName === 'History') {
    return { icon: faClockRotateLeft, color: TAB_ICON };
  }

  return { icon: faCalendarCheck, color: TAB_ICON };
};

// ✅ ToDo Stack
function ToDoStackNavigator() {
  return (
    <ToDoStack.Navigator id="ToDoStack" screenOptions={{ headerShown: false }}>
      <ToDoStack.Screen name="ToDoMain" component={ToDoScreen} />
      <ToDoStack.Screen name="Notification" component={NotificationsHello} />
      <ToDoStack.Screen name="CreateTodo" component={CreateTodo} />
    </ToDoStack.Navigator>
  );
}

// ✅ Daily Attendance Stack
function DailyAttendanceStackNavigator() {
  return (
    <DailyAttendanceStack.Navigator id="DailyAttendanceStack" screenOptions={{ headerShown: false }}>
      <DailyAttendanceStack.Screen
        name="DailyAttendanceMain"
        component={DailyAttendanceScreen}
      />
      <DailyAttendanceStack.Screen name="CheckIn" component={CheckInScreen} />
      <DailyAttendanceStack.Screen
        name="Notification"
        component={NotificationsHello}
      />
      <DailyAttendanceStack.Screen name="CheckOut" component={CheckOutScreen} />
      <DailyAttendanceStack.Screen name="OfficeOut" component={OfficeOutScreen} />
      <DailyAttendanceStack.Screen name="OfficeIn" component={OfficeInScreen} />
      <DailyAttendanceStack.Screen name="PaidLeave" component={PaidLeaveScreen} />
      <DailyAttendanceStack.Screen name="UrgentLeave" component={UrgentLeaveScreen} />
    </DailyAttendanceStack.Navigator>
  );
}
function LeaveStackNavigator() {
  return (
    <LeaveStack.Navigator id="LeaveStack" screenOptions={{ headerShown: false }} >
      <LeaveStack.Screen name="LeaveMgmtMain" component={LeaveMgmt} />
      <LeaveStack.Screen name="Notification" component={NotificationsHello} />
      <LeaveStack.Screen name="UrgentLeave" component={UrgentLeaveScreen} />
      <LeaveStack.Screen name="CasualLeave" component={CasualLeaveScreen} />
      <LeaveStack.Screen name="OutstationLeave" component={OutStationLeaveScreen} />
    </LeaveStack.Navigator>
  );
}

function MasterEyeStackNavigator() {
  return (
    <MasterEyeStack.Navigator id="MasterEyeStack" screenOptions={{ headerShown: false }} >
      <MasterEyeStack.Screen name="MasterEyeMain" component={MasterEye} />
      <MasterEyeStack.Screen name="Notification" component={NotificationsHello} />
      <MasterEyeStack.Screen name="EmployeeAttendance" component={EmployeeAttendance} />
      <MasterEyeStack.Screen name="EmployeeLiveTracking" component={EmployeeLiveTracking} />
      <MasterEyeStack.Screen name="EmployeeHistory" component={EmployeeHistory} />
    </MasterEyeStack.Navigator>
  );
}
// ✅ Attendance Stack
function AttendanceStackNavigator() {
  return (
    <AttendanceStack.Navigator id="AttendanceStack" screenOptions={{ headerShown: false }}>
      <AttendanceStack.Screen
        name="AttendanceMgmtMain"
        component={AttendanceScreen}
      />

      {/* 🔥 Renamed to avoid duplicate name */}
      <AttendanceStack.Screen
        name="DailyAttendance"
        component={DailyAttendanceStackNavigator}
      />

      <AttendanceStack.Screen
        name="Notification"
        component={NotificationsHello}
      />
      <AttendanceStack.Screen
        name="AttendanceStatus"
        component={AttendanceStatus}
      />
      <AttendanceStack.Screen name="LeaveRequest" component={LeaveStackNavigator} />
    </AttendanceStack.Navigator>
  );
}
function MeetingStackNavigator() {
  return (
    <MeetingStack.Navigator id="MeetingStack" screenOptions={{ headerShown: false }}>
      <MeetingStack.Screen name="MeetingVisitMain" component={MeetingVisit} />
      <MeetingStack.Screen
        name="AddMeeting"
        component={AddMeetingScreen}
      />
      <MeetingStack.Screen name="LocalMeeting" component={LocalMeetingScreen} />
      <MeetingStack.Screen name="OutstationMeeting" component={OutstationMeetingScreen} />
      <MeetingStack.Screen name="ScheduledMeeting" component={ScheduledMeeting} />
      <MeetingStack.Screen name="MeetingDetailScreen" component={MeetingDetailScreen} />
      <MeetingStack.Screen name="EditMeetingScreen" component={EditMeetingScreen} />
      <MeetingStack.Screen name="CreateMon" component={CreateMomScreen} />
      <MeetingStack.Screen name="MeetingHistory" component={MeetingHistoryScreen} />
      <MeetingStack.Screen name="AddSiteVisit" component={AddSiteVisit} />
      <MeetingStack.Screen name="CreateEditMomMeetingScreen" component={CreateEditMomMeetingScreen} />
      <MeetingStack.Screen name="MoMDetailsScreen" component={MoMDetailsScreen} />
    </MeetingStack.Navigator>
  );
}

// ✅ Home Stack
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator id="HomeStack" screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="DashboardMain" component={DashboardScreen} />
      <HomeStack.Screen name="Notification" component={NotificationsHello} />
      <HomeStack.Screen name="AttendanceMgmt" component={AttendanceStackNavigator} />
      <HomeStack.Screen name="LeaveMgmt" component={LeaveStackNavigator} />
      <HomeStack.Screen name="MeetingVisit" component={MeetingStackNavigator} />
      <HomeStack.Screen name="Tracking" component={EmpTrackingScreen} />
      <HomeStack.Screen name="MasterEye" component={MasterEyeStackNavigator} />
    </HomeStack.Navigator>
  );
}

// ✅ Updates Stack
function UpdatesStackNavigator() {
  return (
    <UpdatesStack.Navigator id="UpdatesStack" screenOptions={{ headerShown: false }}>
      <UpdatesStack.Screen name="UpdatesMain" component={UpdatesScreen} />
      <UpdatesStack.Screen name="Notification" component={NotificationsHello} />
    </UpdatesStack.Navigator>
  );
}

// ✅ HR Support Stack
function HrSupportStackNavigator() {
  return (
    <HrSupportStack.Navigator id="HrSupportStack" screenOptions={{ headerShown: false }}>
      <HrSupportStack.Screen name="HrSupportMain" component={HrSupportScreen} />
      <HrSupportStack.Screen name="Notification" component={NotificationsHello} />
    </HrSupportStack.Navigator>
  );
}

// ✅ Profile Stack
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator id="ProfileStack" screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Notification" component={NotificationsHello} />
    </ProfileStack.Navigator>
  );
}

// ✅ History Stack
function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator id="HistoryStack" screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="HistoryMain" component={HistoryScreen} />
      <HistoryStack.Screen name="Notification" component={NotificationsHello} />
    </HistoryStack.Navigator>
  );
}

// ✅ Bottom Tabs
function BottomTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        id="BottomTabs"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: 'rgba(221,239,244,0.72)',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            paddingBottom: 2,
          },
          tabBarStyle: {
            backgroundColor: 'rgba(19,39,70,0.98)',
            borderTopColor: 'rgba(127,246,255,0.62)',
            borderTopWidth: 1.2,
            height: 68 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            elevation: 0,
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0,
            shadowRadius: 0,
          },
          tabBarIcon: ({ focused }) => {
            const { icon, color } = getTabIconConfig(route.name);

            return (
              <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
                <FontAwesomeIcon
                  icon={icon}
                  size={focused ? 20 : 18}
                  color={focused ? TAB_BG : color}
                />
              </View>
            );
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeStackNavigator}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tab.Screen
          name="ToDo"
          component={ToDoStackNavigator}
          options={{ tabBarLabel: t('ToDo') }}
        />
        <Tab.Screen
          name="C.Updates"
          component={UpdatesStackNavigator}
          options={{ tabBarLabel: t('C.Updates') }}
        />
        <Tab.Screen
          name="HR Support"
          component={HrSupportStackNavigator}
          options={{ tabBarLabel: t('HR Support') }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStackNavigator}
          options={{ tabBarLabel: t('Profile') }}
        />
        <Tab.Screen
          name="History"
          component={HistoryStackNavigator}
          options={{ tabBarLabel: t('History') }}
        />
        <Tab.Screen
          name="Notifications"
          component={NotificationsHello}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 34,
    height: 28,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    backgroundColor: 'rgba(85,230,238,0.08)',
  },
  tabIconWrapActive: {
    backgroundColor: TAB_ACCENT,
    shadowColor: TAB_ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.48,
    shadowRadius: 10,
    elevation: 8,
  },
});

// ✅ App Navigator
export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const bottomTabHeight = 68 + insets.bottom;

  return (
    <Drawer.Navigator
      id="DrawerNav"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerType: 'front',
        drawerStyle: {
          backgroundColor: colors.bg,
          width: Math.min(300, Dimensions.get('window').width * 0.82),
          height: screenHeight - bottomTabHeight, // ✅ stops at top of BottomTabs
          borderTopRightRadius: 22,
          borderBottomRightRadius: 22,
          overflow: 'hidden',
          borderRightWidth: 1.2,
          borderRightColor: colors.border,
          shadowColor: TAB_ACCENT,
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.22,
          shadowRadius: 16,
          elevation: 18,
        },
        overlayColor: '#132746',
        headerShown: false,
      }}
    >
      <Drawer.Screen
        name="HomeTabs"
        component={BottomTabs}
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="HolidayList"
        component={HolidayListScreen}
        options={{ headerShown: false }}
      />
    </Drawer.Navigator>
  );
}
