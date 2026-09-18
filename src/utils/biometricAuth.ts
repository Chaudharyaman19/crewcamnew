import { Alert } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

export const verifyAttendanceBiometric = async (actionName = 'mark attendance') => {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    if (!available) {
      Alert.alert(
        'Biometric Required',
        'Please enable fingerprint or face lock in your phone settings, then try attendance again.',
      );
      return false;
    }

    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: `Verify with ${biometryType || 'biometric'} to ${actionName}`,
      cancelButtonText: 'Cancel',
    });

    if (!success) {
      Alert.alert(
        'Verification Required',
        'Please verify with fingerprint or face to submit attendance.',
      );
      return false;
    }

    return true;
  } catch (error) {
    Alert.alert(
      'Verification Required',
      'Fingerprint or face verification was cancelled. Please try again to submit attendance.',
    );
    return false;
  }
};
