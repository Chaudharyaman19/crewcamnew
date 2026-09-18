import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faInfoCircle,
  faClipboardList,
  faPowerOff,
} from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../context/AuthContext";
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { fetchPhpUserProfile, normalizePhpProfileForApp } from '../services/phpApi';
import ProfileAvatar from './ProfileAvatar';

import { colors } from '../theme';

const logo = require("../assets/dashboardmainscreen/newcrekamlogo.png");
const ACCENT = colors.accent;
const SCREEN_BG = colors.black;
const DRAWER_ICON_COLOR = '#FFFFFF';

const CustomDrawerContent = (props: any) => {
  const { logout, userData } = useContext(AuthContext);
  const { language, setLanguage, t, formatName } = useLanguage();
  const { firstname } = userData;
  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfilePic = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) { return; }

        const data = await fetchPhpUserProfile({
          token,
        });
        const normalized = normalizePhpProfileForApp(data);

        if (normalized.profilePic) {
          setProfilePic(String(normalized.profilePic).replace(/\s/g, ''));
        }
      } catch (error) {
        console.error('Drawer profile fetch error:', error);
      }
    };

    fetchProfilePic();
  }, []);

  return (
    <LinearGradient
      colors={[colors.bg, colors.bg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.drawerRoot}
    >
      <LinearGradient
        colors={[colors.headerBg, colors.headerBg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <ProfileAvatar uri={profilePic} style={styles.profileImage} iconSize={24} />
        <Text style={styles.userName}>
          {formatName(firstname)}
        </Text>
      </LinearGradient>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
        <Text style={styles.sectionLabel}>{t('Menu')}</Text>
        <View style={styles.languageSwitch}>
          <TouchableOpacity
            style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.languageButtonText, language === 'en' && styles.languageButtonTextActive]}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageButton, language === 'hi' && styles.languageButtonActive]}
            onPress={() => setLanguage('hi')}
          >
            <Text style={[styles.languageButtonText, language === 'hi' && styles.languageButtonTextActive]}>
              हिंदी
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => props.navigation.navigate("About")}
        >
          <View style={styles.iconContainer}>
            <FontAwesomeIcon icon={faInfoCircle} size={19} color={DRAWER_ICON_COLOR} />
          </View>
          <Text style={styles.menuText}>{t('About us')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => props.navigation.navigate("HolidayList")}
        >
          <View style={styles.iconContainer}>
            <FontAwesomeIcon icon={faClipboardList} size={19} color={DRAWER_ICON_COLOR} />
          </View>
          <Text style={styles.menuText}>{t('Holiday List')}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={logout}>
          <View style={styles.iconContainer}>
            <FontAwesomeIcon icon={faPowerOff} size={19} color={DRAWER_ICON_COLOR} />
          </View>
          <Text style={[styles.menuText, styles.logoutText]}>{t('Logout')}</Text>
        </TouchableOpacity>
      </DrawerContentScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  drawerRoot: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 240,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 10,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  logo: {
    width: 180,
    height: 120,
    marginBottom: 12,
  },
  profileImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: '#55e6ee',
  },
  userName: {
    fontSize: 17,
    color: colors.white,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center",
  },
  drawerContent: {
    paddingTop: 10,
    paddingBottom: 24,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginHorizontal: 18,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  languageSwitch: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    backgroundColor: colors.panel,
  },
  languageButton: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
  },
  languageButtonActive: {
    backgroundColor: ACCENT,
  },
  languageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  languageButtonTextActive: {
    color: SCREEN_BG,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginVertical: 3,
    borderRadius: 12,
    backgroundColor: '#55e6ee',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: 'center',
    backgroundColor: '#55e6ee',
  },
  menuText: {
    fontSize: 13,
    marginLeft: 11,
    color: colors.text,
    fontWeight: "800",
  },
  logoutItem: {
    marginTop: 8,
    backgroundColor: "#55e6ee",
    borderColor: '#FFFFFF',
  },
  divider: {
    height: 1,
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 5,
    backgroundColor: colors.borderSubtle,
  },
  logoutText: {
    color: "#FFFFFF",
  },
});

export default CustomDrawerContent;
