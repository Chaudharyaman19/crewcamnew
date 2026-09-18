import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import CustomHeader from '../../components/CustomHeader';
import {StackNavigationProp} from '@react-navigation/stack';
import {DrawerActions, useNavigation} from '@react-navigation/native';
import {colors} from '../../theme';
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useLanguage } from '../../context/LanguageContext';

type RootStackParamList = {
  MasterEye: undefined;
  Notification: undefined;
  EmployeeAttendance: undefined;
  EmployeeLiveTracking: undefined;
  EmployeeHistory: undefined;
  PreHome: {screen?: string};
};

type MasterEyeNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MasterEye'
>;

const MasterEyeScreen = () => {
  const { userData } = useContext(AuthContext);
  const { t, formatName } = useLanguage();
  const [userName, setUserName] = React.useState<string | null>(userData.firstname);

  React.useEffect(() => {
    if (userData.firstname) {
      setUserName(userData.firstname);
    }
  }, [userData.firstname]);

  const navigation = useNavigation<MasterEyeNavigationProp>();
  const handleMenuPress = () => navigation.dispatch(DrawerActions.openDrawer());
  const handleNotifPress = () => navigation.navigate('Notifications');

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => {
          navigation.navigate('PreHome', {screen: 'PaymentLeave'});
        }}
      />

      {/* Welcome Section */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>
          {t('Hi')}, <Text style={{fontWeight: 'bold'}}>{formatName(userName)}</Text>
        </Text>
        <Text style={styles.subText}>{t('Please select one option given below')}</Text>
      </View>

      {/* Options */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('EmployeeAttendance')}>
          <Text style={styles.buttonText}>{t('Employee Attendance')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('EmployeeLiveTracking')}>
          <Text style={styles.buttonText}>{t('Employee Live Tracking')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('EmployeeHistory')}>
          <Text style={styles.buttonText}>{t('Employee History')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default MasterEyeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  welcomeContainer: {
    padding: 20,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  subText: {
    color: '#FFFFFF',
    marginTop: 4,
    fontSize: 14,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
  },
  button: {
    backgroundColor: '#55e6ee',
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    alignItems: 'center',
    textAlign: 'center',
  },
});
