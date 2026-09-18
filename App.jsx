import 'react-native-gesture-handler';
import './src/utils/lightTextStyles';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import Video from 'react-native-video';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import GlobalCallRouter from './src/services/GlobalCallRouter';
import { navigationRef } from './src/navigation/navigationService';

const splashVideo = require('./src/assets/dashboardmainscreen/thanku.mp4');
const splashLogo = require('./src/assets/dashboardmainscreen/newcrekamlogo.png');

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashVideoReady, setIsSplashVideoReady] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const appOpacity = useRef(new Animated.Value(0)).current;
  const didHideSplash = useRef(false);

  const hideSplash = useCallback(() => {
    if (didHideSplash.current) {
      return;
    }
    didHideSplash.current = true;

    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 520,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(appOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setShowSplash(false));
  }, [appOpacity, splashOpacity]);

  useEffect(() => {
    const hideTimer = setTimeout(hideSplash, 15000);

    return () => {
      clearTimeout(hideTimer);
    };
  }, [hideSplash]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <Animated.View style={[styles.appContent, { opacity: appOpacity }]}>
              <StatusBar barStyle="light-content" />
              <SafeAreaView style={styles.safeArea} edges={['right', 'left']}>
                <NavigationContainer ref={navigationRef}>
                  <GlobalCallRouter />
                  <RootNavigator />
                </NavigationContainer>
              </SafeAreaView>
            </Animated.View>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
      {showSplash ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.splash, { opacity: splashOpacity }]}
        >
          {!isSplashVideoReady ? (
            <Image
              source={splashLogo}
              style={styles.splashLogo}
              resizeMode="contain"
            />
          ) : null}
          <Video
            source={splashVideo}
            style={[
              styles.splashVideo,
              !isSplashVideoReady && styles.hiddenSplashVideo,
            ]}
            resizeMode="cover"
            paused={false}
            repeat={false}
            muted
            playInBackground={false}
            playWhenInactive={false}
            ignoreSilentSwitch="ignore"
            onReadyForDisplay={() => setIsSplashVideoReady(true)}
            onEnd={hideSplash}
            onError={hideSplash}
          />
        </Animated.View>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#132746',
  },
  appContent: {
    flex: 1,
    backgroundColor: '#132746',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#132746',
  },
  splash: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#132746',
    justifyContent: 'center',
    zIndex: 999,
  },
  splashVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  hiddenSplashVideo: {
    opacity: 0,
  },
  splashLogo: {
    height: 110,
    width: '72%',
  },
});
