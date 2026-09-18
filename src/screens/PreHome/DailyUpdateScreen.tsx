import React, { useContext } from "react";
import { View, Text, StyleSheet, Image, StatusBar } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";

import { PreHomeStackParamList } from "../../types/navigation";
import { colors, spacing } from "../../theme";
import AppButton from "../../components/AppButton";
import { AuthContext } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const logo = require("../../assets/dashboardmainscreen/newcrekamlogo.png");

type RootNavProp = StackNavigationProp<PreHomeStackParamList, "DailyUpdate">;

export default function DailyUpdateScreen() {
  const navigation = useNavigation<RootNavProp>();
  const { userData } = useContext(AuthContext);
  const { t, formatName } = useLanguage();
  const userName = userData.firstname || t("User");
  const handleContinue = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "BiometricGate",
          },
        ],
      })
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['rgba(0,16,28,0.16)', 'rgba(0,26,47,0.22)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.left}>
          <Image source={logo} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.right} />
      </View>

      {/* Content */}
      <View style={styles.container}>
        <Text style={styles.greeting}>
          {t("Hello")},{' '}
          {formatName(userName)}
        </Text>
        <Text style={styles.title}>{t('Important Notice')}</Text>

        <View style={styles.notificationBox}>
          <Text style={styles.noUpdate}>{t('No update available.')}</Text>
        </View>

        <View style={styles.bottomButton}>
          <AppButton title={t('Continue to App')} onPress={handleContinue} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: 64,
    backgroundColor: colors.headerBg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  right: { flexDirection: "row", alignItems: "center" },
  logoImage: {
    width: 180,
    height: 120,
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  greeting: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    paddingLeft: spacing(2),
    marginTop: spacing(2),
  },
  title: {
    color: colors.muted,
    fontSize: 18,
    paddingLeft: spacing(2),
    marginTop: 4,
  },
  notificationBox: {
    flex: 1,
    backgroundColor: colors.panel,
    padding: spacing(4),
    justifyContent: "center",
    alignItems: "center",
    margin: spacing(2),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  noUpdate: { color: colors.muted, fontSize: 16, textAlign: "center" },
  bottomButton: {
    position: "absolute",
    bottom: spacing(6),
    left: spacing(4),
    right: spacing(4),
  },
});
