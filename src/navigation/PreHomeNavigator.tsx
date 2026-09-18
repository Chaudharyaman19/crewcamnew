import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import PaymentLeaveScreen from "../screens/PreHome/PaymentLeaveScreen";
import DailyUpdateScreen from "../screens/PreHome/DailyUpdateScreen";
import BiometricGateScreen from "../screens/PreHome/BiometricGateScreen";
import ApprovalDetailScreen from "../screens/PreHome/ApprovalDetailScreen";
import AppNavigator from "./AppNavigator";
import { PreHomeStackParamList } from "../types/navigation";

const PreHomeStack = createStackNavigator<PreHomeStackParamList>();

export default function PreHomeNavigator() {
  return (
    <PreHomeStack.Navigator
      initialRouteName="PaymentLeave"
      screenOptions={{ headerShown: false }}
    >
      <PreHomeStack.Screen name="PaymentLeave" component={PaymentLeaveScreen} />
      <PreHomeStack.Screen name="DailyUpdate" component={DailyUpdateScreen} />
      <PreHomeStack.Screen name="BiometricGate" component={BiometricGateScreen} />
      <PreHomeStack.Screen name="ApprovalDetailScreen" component={ApprovalDetailScreen} />
      <PreHomeStack.Screen name="App" component={AppNavigator} />
    </PreHomeStack.Navigator>
  );
}
