import React, { useEffect, useState } from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faBell, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import ProfileAvatar from './ProfileAvatar';
import { fetchPhpUserProfile, normalizePhpProfileForApp } from '../services/phpApi';

import { colors } from '../theme';

type CustomHeaderProps = {
  onMenuPress: () => void;
  onNotifPress: () => void;
  onUpdatePress: () => void;
};

const logo = require('../assets/dashboardmainscreen/newcrekamlogo.png');
const HEADER_ICON_COLOR = colors.white;

export default function CustomHeader({ onMenuPress, onNotifPress, onUpdatePress }: CustomHeaderProps) {
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const navigation = useNavigation<any>();
  const route = useRoute();

  const isHome = route.name === 'DashboardMain' || route.name === 'HomeTabs';

  useEffect(() => {
    const fetchUserProfile = async () => {
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
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={[colors.headerBg, colors.headerBg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.left}>
          <Pressable onPress={onMenuPress} style={styles.iconButton}>
            <FontAwesomeIcon icon={faBars} size={21} color={HEADER_ICON_COLOR} />
          </Pressable>
          <Image source={logo} style={styles.logoImage} resizeMode="contain" />
        </View>

        <View style={styles.right}>
          <Pressable onPress={onUpdatePress} style={styles.iconButton}>
            <FontAwesomeIcon icon={faEnvelope} size={19} color={HEADER_ICON_COLOR} />
          </Pressable>
          <Pressable
            onPress={onNotifPress}
            style={styles.iconButton}
          >
            <FontAwesomeIcon icon={faBell} size={19} color={HEADER_ICON_COLOR} />
          </Pressable>

          <Pressable
            disabled={isHome}
            onPress={() =>
              navigation.navigate('HomeTabs', {
                screen: 'Home',
                params: { screen: 'DashboardMain' },
              })
            }
          >
            <ProfileAvatar uri={profilePic} style={styles.avatar} />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.headerBg,
  },
  container: {
    height: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 30,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 180,
    height: 120,
    marginLeft: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#55e6ee',
    borderWidth: 2,
    borderColor: colors.accent,
  },
});
