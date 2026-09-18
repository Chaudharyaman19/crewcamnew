import React, {useContext} from 'react';
import {createStackNavigator} from '@react-navigation/stack';

import AuthNavigator from './AuthNavigator';
import PreHomeNavigator from './PreHomeNavigator';
import {RootStackParamList} from '../types/navigation';
import {AuthContext} from '../context/AuthContext';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {colors} from '../theme';

const RootStack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const {isLoggedIn, isLoading} = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.btn} />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{headerShown: false}}>
       {isLoggedIn ? (
        <RootStack.Screen name="PreHome" component={PreHomeNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
});
