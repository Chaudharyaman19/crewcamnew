import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
  faCheckSquare,
  faPhone,
  faShieldAlt,
  faSquare,
  faTimes,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {OPUS_API_KEY} from '@env';
import {useLanguage} from '../../context/LanguageContext';
import {isPhpSuccess, requestPhpLogin} from '../../services/phpApi';
import {colors} from '../../theme';

type Props = NativeStackScreenProps<any, 'Login'>;

const ACCENT = colors.accent;
const SCREEN_BG = colors.bg;
const PANEL_BG = colors.panel;
const INPUT_BG = '#132746';
const TEXT_DARK = colors.black;
const BORDER = colors.border;

const terms = [
  [
    '1. Accurate Information',
    'You must provide accurate and complete information during registration.',
  ],
  [
    '2. Location Tracking',
    'Your location will be tracked during work hours for attendance purposes.',
  ],
  [
    '3. Data Security',
    'Your data is secure and not shared with third parties without consent.',
  ],
  [
    '4. Acceptable Use',
    'You must not misuse the application or attempt unauthorized access.',
  ],
  [
    '5. Account Access',
    'Company reserves the right to suspend access for policy violations.',
  ],
  [
    '6. OTP Confidentiality',
    'OTP is confidential and should not be shared with anyone.',
  ],
  [
    '7. Agreement',
    'By using this application, you agree to these terms and conditions.',
  ],
];

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

const LoginScreen = ({navigation}: Props) => {
  const {t} = useLanguage();
  const [empCode, setEmpCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isLoginEnabled = empCode.length > 0 && phoneNumber.length > 0 && agreed;

  const handleLogin = async () => {
    if (!isLoginEnabled) {
      Alert.alert(
        t('Validation Error'),
        t('Please fill all fields and agree to terms.'),
      );
      return;
    }

    try {
      setLoading(true);

      const data = await requestPhpLogin(empCode.trim(), phoneNumber.trim());

      if (isPhpSuccess(data)) {
        try {
          if (data.otp) {
            await sendOtpOnWhatsApp(phoneNumber, data.otp);
          }
        } catch (otpError) {
          const message =
            otpError instanceof Error
              ? otpError.message
              : t('Failed to send OTP');
          console.warn('WhatsApp OTP send bypassed:', message);
        }

        navigation.navigate('Otp', {
          otp: data.otp,
          mobile: phoneNumber,
          userId: data.userId || data.user_id || data.id || '',
          empCode: empCode.trim(),
        });
      } else {
        Alert.alert(
          t('Login Failed'),
          data.message || t('Invalid credentials'),
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('Network error. Please check your connection.');
      Alert.alert(t('Error'), message);
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.bg, colors.bg]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.backgroundColor} />

      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.form}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/dashboardmainscreen/newcrekamlogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View
              style={[
                styles.inputBox,
                focusedField === 'empCode' && styles.inputBoxFocused,
              ]}>
              <FontAwesomeIcon
                icon={faUser}
                size={16}
                color={
                  focusedField === 'empCode'
                    ? colors.accentDark
                    : '#FFFFFF'
                }
              />
              <TextInput
                style={styles.input}
                value={empCode}
                onChangeText={setEmpCode}
                onFocus={() => setFocusedField('empCode')}
                onBlur={() => setFocusedField(null)}
                keyboardType="default"
                autoCapitalize="characters"
                placeholder={t('Employee Code')}
                placeholderTextColor="#FFFFFF"
                underlineColorAndroid="transparent"
                selectionColor={colors.accent}
              />
            </View>

            <View
              style={[
                styles.inputBox,
                focusedField === 'phone' && styles.inputBoxFocused,
              ]}>
              <FontAwesomeIcon
                icon={faPhone}
                size={16}
                color={
                  focusedField === 'phone'
                    ? colors.accentDark
                    : '#FFFFFF'
                }
              />
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                keyboardType="phone-pad"
                placeholder={t('Phone Number')}
                placeholderTextColor="#FFFFFF"
                underlineColorAndroid="transparent"
                selectionColor={colors.accent}
              />
            </View>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkboxToggle}
                onPress={() => setAgreed(prev => !prev)}
                activeOpacity={0.75}>
                <FontAwesomeIcon
                  icon={agreed ? faCheckSquare : faSquare}
                  size={18}
                  color={agreed ? colors.accentDark : colors.muted}
                />
                <Text style={styles.checkboxText}>
                  {t('I have read and agree to the')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowTermsModal(true)}
                activeOpacity={0.75}>
                <Text style={styles.termsText}>
                  {t('terms and conditions')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                !isLoginEnabled && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!isLoginEnabled || loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color={TEXT_DARK} />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    !isLoginEnabled && styles.buttonTextDisabled,
                  ]}>
                  {t('SEND OTP')}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.helpText}>
              {t('Need assistance? Contact support')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTermsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <FontAwesomeIcon icon={faShieldAlt} size={22} color={colors.accentDark} />
              <Text style={styles.modalTitle}>{t('Terms & Conditions')}</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <FontAwesomeIcon icon={faTimes} size={20} color={TEXT_DARK} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}>
              {terms.map(([title, body]) => (
                <View style={styles.termsSection} key={title}>
                  <Text style={styles.termsHeading}>{t(title)}</Text>
                  <Text style={styles.modalText}>{t(body)}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.agreeButton}
              onPress={() => {
                setAgreed(true);
                setShowTermsModal(false);
              }}>
              <Text style={styles.agreeButtonText}>{t('I Agree')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  backgroundColor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SCREEN_BG,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  form: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 18,
    padding: 18,
    shadowColor: colors.shadowGlow,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 3,
  },
  logoContainer: {
    width: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    overflow: 'hidden',
  },
  logo: {
    width: 180,
    height: 120,
  },
  inputBox: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputBoxFocused: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: BORDER,
    backgroundColor: '#55e6ee',
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 48,
    color: TEXT_DARK,
    fontSize: 15,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 24,
  },
  checkboxToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkboxText: {
    color: TEXT_DARK,
    fontSize: 12,
    marginLeft: 12,
    lineHeight: 18,
  },
  termsText: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  loginButton: {
    width: '78%',
    height: 50,
    borderRadius: 25,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 1.2,
    borderColor: BORDER,
    shadowColor: colors.shadowGlow,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#55e6ee',
    borderColor: colors.borderSubtle,
    shadowOpacity: 0.18,
    elevation: 2,
  },
  buttonText: {
    color: TEXT_DARK,
    fontSize: 15,
    fontWeight: '900',
  },
  buttonTextDisabled: {
    color: '#FFFFFF',
  },
  helpText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#55e6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    width: '86%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalHeader: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#132746',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: {
    flex: 1,
    color: TEXT_DARK,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalContent: {
    padding: 18,
  },
  termsSection: {
    marginBottom: 18,
  },
  termsHeading: {
    color: colors.accentDark,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  agreeButton: {
    margin: 18,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 1.2,
    borderColor: BORDER,
  },
  agreeButtonText: {
    color: TEXT_DARK,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default LoginScreen;
