import React, {useRef, useState, useContext, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import LinearGradient from 'react-native-linear-gradient';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList, RootStackParamList} from '../../types/navigation';
import {AuthContext} from '../../context/AuthContext';
import {OPUS_API_KEY} from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useLanguage} from '../../context/LanguageContext';
import {colors} from '../../theme';
import {
  isPhpSuccess,
  normalizePhpAuth,
  requestPhpLogin,
  verifyPhpOtp,
} from '../../services/phpApi';

const COLORS = {
  ACCENT: colors.accent,
  ACCENT_DARK: colors.accentDark,
  SCREEN_BG: colors.bg,
  PANEL_BG: colors.panel,
  INPUT_BG: '#132746',
  MODAL_HEADER_BG: colors.headerBg,
  TEXT_PRIMARY: colors.black,
  TEXT_SECONDARY: colors.muted,
  TEXT_MUTED: '#FFFFFF',
  TEXT_DIMMED: '#FFFFFF',
  BORDER_NORMAL: colors.borderSubtle,
  BORDER_FOCUSED: colors.border,
  BORDER_MODAL: colors.border,
  BUTTON_DISABLED: '#55e6ee',
  SHADOW: colors.shadowGlow,
  SHADOW_DARK: '#132746',
  GRADIENT_START: colors.bg,
  GRADIENT_END: colors.bg,
  ICON_NORMAL: '#FFFFFF',
  ICON_FOCUSED: colors.accentDark,
  SUCCESS: '#FFFFFF',
  ERROR: '#FFFFFF',
  WARNING: '#FFFFFF',
};

// Spacing System
const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 24,
  XXXL: 28,
};

// Typography System
const TYPOGRAPHY = {
  H1: 24,
  H2: 20,
  H3: 18,
  BODY: 15,
  CAPTION: 13,
  SMALL: 12,
  BUTTON: 15,
};

// Border Radius System
const BORDER_RADIUS = {
  SM: 8,
  MD: 12,
  LG: 18,
  XL: 20,
  ROUND: 25,
  PILL: 50,
};

type OtpScreenRouteProp = RouteProp<AuthStackParamList, 'Otp'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const formatMobileForWhatsApp = (mobile: string) => {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
};

const sendOtpOnWhatsApp = async (mobile: string, otp: string | number) => {
  const formattedMobile = formatMobileForWhatsApp(mobile);
  const msg = `Your CrewCam OTP is ${otp}. Please do not share it with anyone.`;
  const url = `https://api.opustechnology.in/wapp/v2/api/send?apikey=${OPUS_API_KEY}&mobile=${formattedMobile}&msg=${encodeURIComponent(
    msg,
  )}`;
  const response = await fetch(url);
  const result = await response.json();

  if (!response.ok || result?.status !== 'success') {
    throw new Error(result?.msg || 'Failed to send OTP');
  }
};

export default function OtpScreen() {
  const route = useRoute<OtpScreenRouteProp>();
  const {mobile, userId, empCode} = route.params;
  const {t} = useLanguage();

  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputs = useRef<(TextInput | null)[]>([]);
  const {login} = useContext(AuthContext);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    setTimeout(() => {
      inputs.current[0]?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    if (text.length > 1) {
      const nextOtpValues = [...otpValues];
      text
        .slice(0, 6 - index)
        .split('')
        .forEach((char, offset) => {
          nextOtpValues[index + offset] = char;
        });
      setOtpValues(nextOtpValues);
      inputs.current[Math.min(index + text.length, 5)]?.focus();
      return;
    }

    const newOtpValues = [...otpValues];
    newOtpValues[index] = text;
    setOtpValues(newOtpValues);

    if (text && index < otpValues.length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otpValues.join('');
    if (enteredOtp.length !== 6) {
      Alert.alert(t('Error'), t('Please enter full 6-digit OTP'));
      return;
    }

    try {
      setLoading(true);

      const data = await verifyPhpOtp({
        userId,
        empCode,
        mobile,
        otp: enteredOtp,
      });
      setLoading(false);
      console.log('Verify Response:', data);

      if (isPhpSuccess(data)) {
        const auth = normalizePhpAuth(data, {userId, empCode, mobile});
        await login(
          auth.token || 'dummy-token',
          auth.mobile || mobile,
          auth.firstname,
          auth.lastname,
          auth.role,
        );
        await AsyncStorage.setItem('user_id', auth.userId || userId);
        await AsyncStorage.setItem('user_emp_code', auth.empCode || empCode || '');
      } else {
        Alert.alert(t('Invalid OTP'), data.message || t('Please try again'));
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(t('Error'), t('Something went wrong. Please try again.'));
      console.error(error);
    }
  };

  const handleResend = async () => {
    if (!canResend) {
      Alert.alert(
        t('Wait'),
        `${t('Please wait')} ${timer} ${t('seconds before resending')}`,
      );
      return;
    }

    try {
      setResendLoading(true);

      const data = await requestPhpLogin(empCode || '', mobile);

      if (isPhpSuccess(data)) {
        try {
          if (data.otp) {
            await sendOtpOnWhatsApp(mobile, data.otp);
          }
        } catch (otpError) {
          const message =
            otpError instanceof Error
              ? otpError.message
              : t('Failed to send OTP');
          console.warn('WhatsApp OTP resend bypassed:', message);
        }
        Alert.alert(t('Success'), t('OTP resent successfully!'));
        setTimer(30);
        setCanResend(false);
        setOtpValues(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
      } else {
        Alert.alert(t('Error'), data.message || t('Failed to resend OTP.'));
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('Something went wrong. Please try again.');
      Alert.alert(t('OTP Not Sent'), message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const isOtpComplete = otpValues.join('').length === 6;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[COLORS.GRADIENT_START, COLORS.GRADIENT_END]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFillObject}
      />
      <StatusBar barStyle="dark-content" />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={40}
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>{t('Back')}</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/dashboardmainscreen/newcrekamlogo.png')}
              style={styles.img}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.subtitle}>
            {t('Enter the 6-digit OTP sent to')} {mobile}
          </Text>

          <View style={styles.otpContainer}>
            {otpValues.map((value, index) => (
              <TextInput
                key={index}
                ref={ref => {
                  inputs.current[index] = ref;
                }}
                style={styles.otpBox}
                value={value}
                onChangeText={text =>
                  handleChange(text.replace(/[^0-9]/g, '').slice(0, 6), index)
                }
                onKeyPress={({nativeEvent}) => {
                  if (
                    nativeEvent.key === 'Backspace' &&
                    !otpValues[index] &&
                    index > 0
                  ) {
                    inputs.current[index - 1]?.focus();
                  }
                }}
                keyboardType="number-pad"
                maxLength={1}
                underlineColorAndroid="transparent"
                placeholderTextColor="transparent"
                selectionColor={COLORS.ACCENT}
                cursorColor={COLORS.ACCENT}
              />
            ))}
          </View>

          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[
                styles.equalButton,
                styles.textButton,
                (!canResend || resendLoading) && styles.disabledButton,
              ]}
              onPress={handleResend}
              disabled={!canResend || resendLoading}
              activeOpacity={0.8}>
              {resendLoading ? (
                <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
              ) : (
                <Text style={styles.smallButtonText}>
                  {canResend ? t('RESEND OTP') : `${t('RESEND')} (${timer}s)`}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.equalButton,
                styles.verifyButton,
                (!isOtpComplete || loading) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerify}
              disabled={!isOtpComplete || loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color={COLORS.TEXT_PRIMARY} />
              ) : (
                <Text style={styles.verifyButtonText}>
                  {t('VERIFY OTP')}{' '}
                  {!isOtpComplete ? `(${otpValues.join('').length}/6)` : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.SCREEN_BG,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
    paddingBottom: 50,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 10,
    backgroundColor: COLORS.ACCENT,
    borderWidth: 1,
    borderColor: COLORS.BORDER_NORMAL,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
  },
  backButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.BODY,
    fontWeight: 'bold',
  },
  logoContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    width: 220,
    maxWidth: 220,
    backgroundColor: COLORS.PANEL_BG,
    borderWidth: 1,
    borderColor: COLORS.BORDER_NORMAL,
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 3,
  },
  img: {
    width: 180,
    height: 120,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.BODY,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 28,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: SPACING.LG,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  otpBox: {
    width: 44,
    height: 50,
    backgroundColor: COLORS.INPUT_BG,
    borderWidth: 1,
    borderColor: COLORS.BORDER_NORMAL,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: BORDER_RADIUS.SM,
    marginHorizontal: 4,
    padding: 0,
    includeFontPadding: false,
  },
  rowButtons: {
    flexDirection: 'row',
    width: '82%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    marginBottom: 20,
    gap: SPACING.MD,
  },
  equalButton: {
    flex: 1,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.XS,
    borderRadius: BORDER_RADIUS.LG,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.BORDER_NORMAL,
    backgroundColor: COLORS.ACCENT,
  },
  autofillButton: {
    backgroundColor: COLORS.ACCENT,
  },
  textButton: {
    backgroundColor: COLORS.ACCENT,
  },
  disabledButton: {
    opacity: 0.8,
    borderColor: COLORS.BORDER_NORMAL,
  },
  smallButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '800',
    fontSize: 11,
  },
  verifyButton: {
    backgroundColor: COLORS.ACCENT,
    borderWidth: 1.2,
    borderColor: COLORS.BORDER_FOCUSED,
  },
  verifyButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '900',
    fontSize: 12,
  },
  verifyButtonDisabled: {
    opacity: 0.8,
    backgroundColor: COLORS.BUTTON_DISABLED,
    borderColor: COLORS.BORDER_NORMAL,
  },
});
