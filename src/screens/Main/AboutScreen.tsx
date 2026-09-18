import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Share,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowLeft,
  faHome,
  faEnvelope,
  faPhone,
  faGlobe,
  faShareAlt,
  faInfoCircle,
  faBuilding,
  faMapMarkerAlt,
  faCopyright,
} from '@fortawesome/free-solid-svg-icons';
import { API_BASE_URL } from '@env';
import LinearGradient from 'react-native-linear-gradient';

const ACCENT = '#55e6ee';
const SCREEN_BG = '#132746';
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;

const staticAboutData = {
  companyName: 'CrewCam',
  description: 'Attendance, Leave & Meeting Management App',
  address: 'India',
  contactEmail: 'designhouse20250@gmail.com',
  phoneNumber: '+91 XXXXXXXXXX',
  supportEmail: 'support@crewcam.com',
  website: 'www.crewcam.com',
  version: '1.0.0',
  copyright: '© 2024 CrewCam. All rights reserved.',
  socialLinks: {
    facebook: 'https://facebook.com/crewcam',
    twitter: 'https://twitter.com/crewcam',
    linkedin: 'https://linkedin.com/company/crewcam',
  },
};

const AboutScreen = () => {

  const navigation = useNavigation() as any;
  const [about, setAbout] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/app-api/about`);
        const data = await res.json();

        if (data.result === 'true' && data.data) {
          setAbout(data.data);
        } else {
          setAbout(staticAboutData);
        }
      } catch (e) {
        console.error('About fetch error', e);
        setAbout(staticAboutData);
      } finally {
        setLoading(false);
      }
    };
    fetchAbout();
  }, []);

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleWebsitePress = (website: string) => {
    Linking.openURL(`https://${website}`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${about?.companyName} app!\n\n${about?.description}\n\nWebsite: ${about?.website}\nEmail: ${about?.contactEmail}`,
        title: `About ${about?.companyName}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleHomePress = () => {
    navigation.navigate('HomeTabs', {
      screen: 'Home',
      params: { screen: 'DashboardMain' },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}>
            <FontAwesomeIcon icon={faArrowLeft} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About Us</Text>
          <TouchableOpacity
            onPress={handleHomePress}
            style={styles.iconButton}>
            <FontAwesomeIcon icon={faHome} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}>
          <FontAwesomeIcon icon={faArrowLeft} size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <TouchableOpacity
          onPress={handleHomePress}
          style={styles.iconButton}>
          <FontAwesomeIcon icon={faHome} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={[SCREEN_BG, '#1f456f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}>

        <View style={styles.card}>
          <View style={styles.iconHeader}>
            <View style={styles.iconCircle}>
              <FontAwesomeIcon
                icon={faBuilding}
                size={22}
                color={ACCENT}
              />
            </View>
            <Text style={styles.companyName}>{about?.companyName}</Text>
          </View>
          <Text style={styles.versionText}>Version {about?.version}</Text>
          <Text style={styles.sectionText}>{about?.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            <FontAwesomeIcon
              icon={faInfoCircle}
              size={15}
              color={ACCENT}
            />{' '}
            Contact Information
          </Text>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => handleEmailPress(about?.contactEmail)}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}>
                <FontAwesomeIcon icon={faEnvelope} size={14} color={ACCENT} />
              </View>
              <Text style={styles.infoLabel}>Email</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>
              {about?.contactEmail}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => handlePhonePress(about?.phoneNumber)}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}>
                <FontAwesomeIcon icon={faPhone} size={14} color={ACCENT} />
              </View>
              <Text style={styles.infoLabel}>Phone</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>
              {about?.phoneNumber}
            </Text>
          </TouchableOpacity>

          {about?.supportEmail && (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => handleEmailPress(about?.supportEmail)}>
              <View style={styles.infoLeft}>
                <View style={styles.infoIcon}>
                  <FontAwesomeIcon icon={faEnvelope} size={14} color={ACCENT} />
                </View>
                <Text style={styles.infoLabel}>Support</Text>
              </View>
              <Text style={styles.infoValue} numberOfLines={1}>
                {about?.supportEmail}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => handleWebsitePress(about?.website)}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}>
                <FontAwesomeIcon icon={faGlobe} size={14} color={ACCENT} />
              </View>
              <Text style={styles.infoLabel}>Website</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>
              {about?.website}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoRowLast}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}>
                <FontAwesomeIcon icon={faMapMarkerAlt} size={14} color={ACCENT} />
              </View>
              <Text style={styles.infoLabel}>Address</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={2}>
              {about?.address}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <FontAwesomeIcon icon={faShareAlt} size={18} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>Share App</Text>
        </TouchableOpacity>

        <View style={styles.copyrightContainer}>
          <FontAwesomeIcon icon={faCopyright} size={12} color="rgba(230,237,246,0.62)" />
          <Text style={styles.copyrightText}>{about?.copyright}</Text>
        </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 16,
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127,246,255,0.42)',
  },
  iconButton: {
    padding: 7,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(230,237,246,0.82)',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 140,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(19, 39, 70, 0.98)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(127,246,255,0.62)',
  },
  iconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(9,27,51,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  companyName: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  versionText: {
    fontSize: 11,
    color: ACCENT,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(230,237,246,0.82)',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127,246,255,0.18)',
  },
  infoRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(9,27,51,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(230,237,246,0.82)',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
    flexShrink: 1,
  },
  shareButton: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19, 39, 70, 0.98)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginTop: 4,
    marginBottom: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(127,246,255,0.62)',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  copyrightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  copyrightText: {
    fontSize: 11,
    color: 'rgba(230,237,246,0.62)',
    marginLeft: 5,
  },
});

export default AboutScreen;
