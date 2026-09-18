import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';
import {
  Camera,
  useCameraDevice,
} from 'react-native-vision-camera';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCircleCheck,
  faFaceSmile,
  faFingerprint,
  faGlobe,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PreHomeStackParamList } from '../../types/navigation';
import { API_BASE_URL } from '@env';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme';

const logo = require('../../assets/dashboardmainscreen/newcrekamlogo.png');

const ACCENT = colors.accent;
const SCREEN_BG = colors.bg;
const CARD_BG = '#132746';
const SURFACE_YELLOW = '#132746';
const INPUT_BG = '#132746';
const TEXT_DARK = colors.black;
const BORDER = colors.border;

type NavigationProp = StackNavigationProp<PreHomeStackParamList, 'BiometricGate'>;
type VerifyMode = 'face' | 'fingerprint';
type FaceResultState = 'success' | 'failed' | null;
const DEFAULT_FACE_THRESHOLD = 55;

const countries = [
  { code: 'IN', en: 'India', hi: 'भारत' },
  { code: 'US', en: 'United States', hi: 'संयुक्त राज्य अमेरिका' },
  { code: 'AE', en: 'United Arab Emirates', hi: 'संयुक्त अरब अमीरात' },
  { code: 'GB', en: 'United Kingdom', hi: 'यूनाइटेड किंगडम' },
  { code: 'CA', en: 'Canada', hi: 'कनाडा' },
  { code: 'AU', en: 'Australia', hi: 'ऑस्ट्रेलिया' },
];

const copy = {
  en: {
    faceTitle: 'Face Recognition',
    faceSubtitle: 'Keep your face inside the circle',
    capturingFace: 'Capturing face...',
    cancel: 'Cancel',
    badgeTitle: 'Secure Verification',
    badgeSubtitle: 'Verify your identity to open dashboard',
    faceCardTitle: 'Face Recognition',
    faceCardSubtitle: 'Open camera and match face',
    fingerprintTitle: 'Fingerprint',
    fingerprintSubtitle: 'Verify phone fingerprint',
    verified: 'Verified',
    language: 'Language',
    country: 'Country',
    selectCountry: 'Select Country',
    close: 'Close',
    fingerprintRequiredTitle: 'Fingerprint Required',
    fingerprintRequiredMessage: 'Please set up fingerprint in your phone Settings first, then try again.',
    fingerprintPrompt: 'Verify your fingerprint',
    fingerprintFailedTitle: 'Verification Failed',
    fingerprintFailedMessage: 'Fingerprint verification was cancelled or failed.',
    fingerprintSuccessTitle: 'Fingerprint Verified Successfully',
    fingerprintSuccessMessage: 'Your fingerprint verification is successful.',
    continue: 'Continue',
    verificationErrorTitle: 'Verification Error',
    cameraRequiredTitle: 'Camera Required',
    cameraRequiredMessage: 'Please allow camera permission for face recognition.',
    cameraNotFoundTitle: 'Camera Not Found',
    cameraNotFoundMessage: 'Front camera is not available on this device.',
    loginRequiredTitle: 'Login Required',
    loginRequiredMessage: 'Please login again.',
    faceNetworkError: 'Face verify API network failed',
    faceSuccessTitle: 'Face Verified Successfully',
    faceSuccessMessage: 'Your face verification is successful.',
    faceFailedTitle: 'Face Not Verified',
    faceFailedMessage: 'Face does not match your profile image.',
    cameraNotReadyTitle: 'Camera Not Ready',
    cameraNotReadyMessage: 'Please wait a moment and try again.',
  },
  hi: {
    faceTitle: 'चेहरा पहचान',
    faceSubtitle: 'अपना चेहरा गोले के अंदर रखें',
    capturingFace: 'चेहरा कैप्चर हो रहा है...',
    cancel: 'रद्द करें',
    badgeTitle: 'सुरक्षित सत्यापन',
    badgeSubtitle: 'डैशबोर्ड खोलने के लिए अपनी पहचान सत्यापित करें',
    faceCardTitle: 'चेहरा पहचान',
    faceCardSubtitle: 'कैमरा खोलें और चेहरा मिलाएं',
    fingerprintTitle: 'अंगुली छाप',
    fingerprintSubtitle: 'फोन की अंगुली छाप से सत्यापित करें',
    verified: 'सत्यापित',
    language: 'भाषा',
    country: 'देश',
    selectCountry: 'देश चुनें',
    close: 'बंद करें',
    fingerprintRequiredTitle: 'अंगुली छाप आवश्यक है',
    fingerprintRequiredMessage: 'कृपया पहले फोन सेटिंग में अंगुली छाप जोड़ें, फिर दोबारा प्रयास करें।',
    fingerprintPrompt: 'अपनी अंगुली छाप सत्यापित करें',
    fingerprintFailedTitle: 'सत्यापन असफल',
    fingerprintFailedMessage: 'अंगुली छाप सत्यापन रद्द या असफल हो गया।',
    fingerprintSuccessTitle: 'अंगुली छाप सफलतापूर्वक सत्यापित हुई',
    fingerprintSuccessMessage: 'आपकी अंगुली छाप का सत्यापन सफल रहा।',
    continue: 'जारी रखें',
    verificationErrorTitle: 'सत्यापन त्रुटि',
    cameraRequiredTitle: 'कैमरा जरूरी है',
    cameraRequiredMessage: 'चेहरा पहचान के लिए कैमरे की अनुमति दें।',
    cameraNotFoundTitle: 'कैमरा नहीं मिला',
    cameraNotFoundMessage: 'इस डिवाइस पर फ्रंट कैमरा उपलब्ध नहीं है।',
    loginRequiredTitle: 'लॉगिन जरूरी है',
    loginRequiredMessage: 'कृपया फिर से लॉगिन करें।',
    faceNetworkError: 'चेहरा सत्यापन सेवा से संपर्क असफल रहा',
    faceSuccessTitle: 'चेहरा सफलतापूर्वक सत्यापित',
    faceSuccessMessage: 'आपका चेहरा सत्यापन सफल रहा।',
    faceFailedTitle: 'चेहरा सत्यापित नहीं हुआ',
    faceFailedMessage: 'चेहरा आपकी प्रोफाइल फोटो से मेल नहीं खाता।',
    cameraNotReadyTitle: 'कैमरा तैयार नहीं है',
    cameraNotReadyMessage: 'कृपया थोड़ी देर रुककर फिर कोशिश करें।',
  },
};

export default function BiometricGateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loadingMode, setLoadingMode] = useState<VerifyMode | null>(null);
  const [verifiedMode, setVerifiedMode] = useState<VerifyMode | null>(null);
  const [showFaceCamera, setShowFaceCamera] = useState(false);
  const [faceResult, setFaceResult] = useState<FaceResultState>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const { language, countryCode, setLanguage, setCountryCode } = useLanguage();
  const cameraRef = useRef<Camera>(null);
  const autoCaptureStartedRef = useRef(false);
  const faceDevice = useCameraDevice('front');
  const t = copy[language];
  const selectedCountry = countries.find(country => country.code === countryCode) || countries[0];

  const updateCountry = async (nextCountryCode: string) => {
    await setCountryCode(nextCountryCode);
    setShowCountryModal(false);
  };

  const openApp = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'App',
            state: {
              routes: [
                {
                  name: 'HomeTabs',
                  state: {
                    index: 0,
                    routes: [{ name: 'Home' }],
                  },
                },
              ],
            },
          },
        ],
      }),
    );
  }, [navigation]);

  const handleVerify = async (mode: VerifyMode) => {
    if (mode === 'face') {
      await openFaceCamera();
      return;
    }

    await verifyFingerprint();
  };

  const verifyFingerprint = async () => {
    try {
      setLoadingMode('fingerprint');
      const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });
      const { available } = await rnBiometrics.isSensorAvailable();

      if (!available) {
        Alert.alert(
          t.fingerprintRequiredTitle,
          t.fingerprintRequiredMessage,
        );
        return;
      }

      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: t.fingerprintPrompt,
        cancelButtonText: t.cancel,
      });

      if (!success) {
        Alert.alert(t.fingerprintFailedTitle, t.fingerprintFailedMessage);
        return;
      }

      setVerifiedMode('fingerprint');
      Alert.alert(t.fingerprintSuccessTitle, t.fingerprintSuccessMessage, [
        { text: t.continue, onPress: openApp },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.fingerprintFailedMessage;
      Alert.alert(t.verificationErrorTitle, message);
    } finally {
      setLoadingMode(null);
    }
  };

  const openFaceCamera = async () => {
    const permission = await Camera.requestCameraPermission();

    if (permission !== 'granted') {
      Alert.alert(t.cameraRequiredTitle, t.cameraRequiredMessage);
      return;
    }

    if (!faceDevice) {
      Alert.alert(t.cameraNotFoundTitle, t.cameraNotFoundMessage);
      return;
    }

    setFaceResult(null);
    autoCaptureStartedRef.current = false;
    setShowFaceCamera(true);
  };

  const uploadFaceForVerification = useCallback(async (imageUri: string) => {
    const token = await AsyncStorage.getItem('auth_token');
    const userId = await AsyncStorage.getItem('user_id');
    const empCode = await AsyncStorage.getItem('user_emp_code');

    if (!token && !userId && !empCode) {
      Alert.alert(t.loginRequiredTitle, t.loginRequiredMessage);
      return;
    }

    const formData = new FormData();
    formData.append('token', token || '');
    formData.append('id', userId || '');
    formData.append('empCode', empCode || '');
    formData.append('faceImage', {
      uri: imageUri,
      name: `face-${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/app-api/face-verify`, {
        method: 'POST',
        body: formData,
      });
    } catch (networkError) {
      throw new Error(`${t.faceNetworkError}: ${API_BASE_URL}`);
    }

    const data = await response.json();

    const score = Number(data.score || 0);
    const threshold = Number(data.threshold || DEFAULT_FACE_THRESHOLD);
    const distance = Number(data.distance ?? Number.POSITIVE_INFINITY);
    const maxDistance = Number(data.maxDistance ?? Number.POSITIVE_INFINITY);
    const isConfirmedFaceMatch =
      data.result === 'true' &&
      data.matched === true &&
      score >= threshold &&
      distance <= maxDistance;

    if (isConfirmedFaceMatch) {
      setVerifiedMode('face');
      setFaceResult('success');
      Alert.alert(t.faceSuccessTitle, t.faceSuccessMessage, [
        { text: t.continue, onPress: openApp },
      ]);
      return;
    }

    const profileName = data.profileName ? `\nProfile: ${data.profileName}` : '';
    const profileId = data.profileId ? `\nID: ${data.profileId}` : '';
    setFaceResult('failed');
    Alert.alert(
      t.faceFailedTitle,
      `${t.faceFailedMessage}${profileName}${profileId}`,
    );
  }, [openApp, t]);

  const captureFace = useCallback(async () => {
    try {
      if (!cameraRef.current) {
        Alert.alert(t.cameraNotReadyTitle, t.cameraNotReadyMessage);
        return;
      }

      setLoadingMode('face');
      const photo = await cameraRef.current.takePhoto();
      await uploadFaceForVerification(`file://${photo.path}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.faceFailedMessage;
      setFaceResult('failed');
      Alert.alert(t.faceFailedTitle, message);
    } finally {
      setLoadingMode(null);
    }
  }, [
    uploadFaceForVerification,
    t.cameraNotReadyMessage,
    t.cameraNotReadyTitle,
    t.faceFailedMessage,
    t.faceFailedTitle,
  ]);

  useEffect(() => {
    if (
      !showFaceCamera ||
      !faceDevice ||
      faceResult ||
      loadingMode === 'face' ||
      autoCaptureStartedRef.current
    ) {
      return undefined;
    }

    autoCaptureStartedRef.current = true;
    const captureTimer = setTimeout(() => {
      captureFace();
    }, 900);

    return () => clearTimeout(captureTimer);
  }, [showFaceCamera, faceDevice, faceResult, loadingMode, captureFace]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[SCREEN_BG, SCREEN_BG]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.content}>
        <View style={styles.preferencePanel}>
          <View style={styles.languageToggle}>
            <Text style={styles.preferenceLabel}>{t.language}</Text>
            <View style={styles.segment}>
              <TouchableOpacity
                style={[styles.segmentButton, language === 'en' && styles.segmentButtonActive]}
                onPress={() => setLanguage('en')}
              >
                <Text style={[styles.segmentText, language === 'en' && styles.segmentTextActive]}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, language === 'hi' && styles.segmentButtonActive]}
                onPress={() => setLanguage('hi')}
              >
                <Text style={[styles.segmentText, language === 'hi' && styles.segmentTextActive]}>हिंदी</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.countryButton} onPress={() => setShowCountryModal(true)}>
            <FontAwesomeIcon icon={faGlobe} size={15} color={ACCENT} />
            <Text style={styles.countryText}>
              {t.country}: {language === 'hi' ? selectedCountry.hi : selectedCountry.en}
            </Text>
          </TouchableOpacity>
        </View>

        {showFaceCamera && faceDevice ? (
          <View style={styles.faceCapturePanel}>
            <Text style={styles.title}>{t.faceTitle}</Text>
            <Text style={styles.subtitle}>{t.faceSubtitle}</Text>

            <View
              style={[
                styles.roundCameraFrame,
                loadingMode === 'face' && !faceResult && styles.roundCameraFrameLoading,
                faceResult === 'success' && styles.roundCameraFrameSuccess,
                faceResult === 'failed' && styles.roundCameraFrameFailed,
              ]}
            >
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFillObject}
                device={faceDevice}
                isActive={showFaceCamera && !faceResult}
                photo
              />
            </View>

            {loadingMode === 'face' && (
              <View style={styles.autoCaptureStatus}>
                <ActivityIndicator color={ACCENT} />
                <Text style={styles.autoCaptureText}>{t.capturingFace}</Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.78}
              style={styles.cancelButton}
              onPress={() => {
                setShowFaceCamera(false);
                setFaceResult(null);
                autoCaptureStartedRef.current = false;
              }}
              disabled={loadingMode === 'face'}
            >
              <Text style={styles.cancelButtonText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        <View style={styles.badge}>
          <FontAwesomeIcon icon={faShieldHalved} size={24} color={ACCENT} />
        </View>

        <Text style={styles.title}>{t.badgeTitle}</Text>
        <Text style={styles.subtitle}>{t.badgeSubtitle}</Text>

        <View style={styles.cards}>
          <VerifyCard
            title={t.faceCardTitle}
            subtitle={t.faceCardSubtitle}
            icon={faFaceSmile}
            isLoading={loadingMode === 'face'}
            isVerified={verifiedMode === 'face'}
            verifiedText={t.verified}
            onPress={() => handleVerify('face')}
          />

          <VerifyCard
            title={t.fingerprintTitle}
            subtitle={t.fingerprintSubtitle}
            icon={faFingerprint}
            isLoading={loadingMode === 'fingerprint'}
            isVerified={verifiedMode === 'fingerprint'}
            verifiedText={t.verified}
            onPress={() => handleVerify('fingerprint')}
          />
        </View>
          </>
        )}
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={showCountryModal}
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.countryModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.selectCountry}</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Text style={styles.modalClose}>{t.close}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {countries.map(country => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryOption,
                    country.code === countryCode && styles.countryOptionActive,
                  ]}
                  onPress={() => updateCountry(country.code)}
                >
                  <Text style={styles.countryOptionText}>
                    {language === 'hi' ? country.hi : country.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type VerifyCardProps = {
  title: string;
  subtitle: string;
  icon: any;
  isLoading: boolean;
  isVerified: boolean;
  verifiedText: string;
  onPress: () => void;
};

const VerifyCard = ({
  title,
  subtitle,
  icon,
  isLoading,
  isVerified,
  verifiedText,
  onPress,
}: VerifyCardProps) => (
  <TouchableOpacity
    activeOpacity={0.88}
    onPress={onPress}
    disabled={isLoading || isVerified}
    style={styles.cardButton}
  >
    <LinearGradient
      colors={[SURFACE_YELLOW, CARD_BG]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.iconTile}>
        {isLoading ? (
          <ActivityIndicator size="small" color={TEXT_DARK} />
        ) : (
          <FontAwesomeIcon icon={isVerified ? faCircleCheck : icon} size={30} color={TEXT_DARK} />
        )}
      </View>

      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{isVerified ? verifiedText : subtitle}</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  header: {
    height: 64,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: colors.headerBg,
  },
  logo: {
    width: 180,
    height: 120,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 34,
  },
  preferencePanel: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    gap: 10,
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  preferenceLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: INPUT_BG,
  },
  segmentButton: {
    minWidth: 76,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
  },
  segmentButtonActive: {
    backgroundColor: ACCENT,
  },
  segmentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: TEXT_DARK,
  },
  countryButton: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    backgroundColor: '#55e6ee',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryText: {
    flex: 1,
    color: TEXT_DARK,
    fontSize: 12,
    fontWeight: '800',
  },
  badge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: BORDER,
    backgroundColor: SURFACE_YELLOW,
    marginBottom: 16,
  },
  title: {
    color: TEXT_DARK,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
  cards: {
    width: '100%',
    marginTop: 26,
    gap: 12,
  },
  cardButton: {
    width: '100%',
  },
  card: {
    minHeight: 82,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: BORDER,
    shadowColor: ACCENT,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    color: TEXT_DARK,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  faceCapturePanel: {
    width: '100%',
    alignItems: 'center',
  },
  roundCameraFrame: {
    width: 250,
    height: 250,
    borderRadius: 125,
    overflow: 'hidden',
    marginTop: 24,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    backgroundColor: INPUT_BG,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.36,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  roundCameraFrameLoading: {
    borderWidth: 6,
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.58,
    shadowRadius: 24,
  },
  roundCameraFrameSuccess: {
    borderWidth: 7,
    borderColor: '#FFFFFF',
    backgroundColor: '#55e6ee',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.68,
    shadowRadius: 26,
  },
  roundCameraFrameFailed: {
    borderWidth: 7,
    borderColor: '#FFFFFF',
    backgroundColor: '#55e6ee',
    shadowColor: '#FFFFFF',
  },
  captureButton: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    marginTop: 26,
    shadowColor: ACCENT,
    shadowOpacity: 0.42,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  captureButtonDisabled: {
    opacity: 0.72,
  },
  captureButtonText: {
    color: TEXT_DARK,
    fontSize: 14,
    fontWeight: '900',
  },
  autoCaptureStatus: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 26,
  },
  autoCaptureText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 10,
    backgroundColor: '#55e6ee',
    borderRadius: 18,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#132746',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  countryModal: {
    width: '100%',
    maxHeight: '72%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE_YELLOW,
    overflow: 'hidden',
  },
  modalHeader: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalTitle: {
    color: TEXT_DARK,
    fontSize: 16,
    fontWeight: '900',
  },
  modalClose: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '900',
  },
  countryOption: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  countryOptionActive: {
    backgroundColor: '#55e6ee',
  },
  countryOptionText: {
    color: TEXT_DARK,
    fontSize: 14,
    fontWeight: '800',
  },
});
