import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faHome,
  faListCheck,
  faBell,
  faUser,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

import HomeScreen from "../screens/Main/DashboardScreen";
import CompanyUpdateScreen from "../screens/Main/CompanyUpdates";
import ProfileScreen from "../screens/Main/ProfileScreen";

import { colors } from "../theme";
import TodoScreens from "../screens/Main/TodoScreens";
import HistoryScreen from "../screens/Main/HistoryScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      id="BottomTabs"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.headerBg,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          color: colors.white,
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: colors.headerBg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarActiveTintColor: '#55e6ee',
        tabBarInactiveTintColor: '#aaa',
      }}
    >

      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <FontAwesomeIcon icon={faHome} size={size ?? 16} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Todo"
        component={TodoScreens}
        options={{
          tabBarLabel: "Todo",
          tabBarIcon: ({ color, size }) => (
            <FontAwesomeIcon icon={faListCheck} size={size ?? 16} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="CompanyUpdate"
        component={CompanyUpdateScreen}
        options={{
          tabBarLabel: "C.Updates",
          tabBarIcon: ({ color, size }) => (
            <FontAwesomeIcon icon={faBell} size={size ?? 16} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <FontAwesomeIcon icon={faUser} size={size ?? 16} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: "History",
          tabBarIcon: ({ color, size }) => (
            <FontAwesomeIcon icon={faClockRotateLeft} size={size ?? 16} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
