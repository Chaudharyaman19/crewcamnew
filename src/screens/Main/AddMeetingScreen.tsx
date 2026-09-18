import React from 'react';
import { Dimensions, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { colors } from '../../theme';
import CustomHeader from '../../components/CustomHeader';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 20;

const AddMeetingScreen = ({ navigation }: any) => {
  const { t } = useLanguage();
  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleNotifPress = () => {
    navigation.navigate('Notification');
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
        onUpdatePress={() => navigation.navigate('PreHome', { screen: 'PaymentLeave' })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('Select Meeting Type')}</Text>
        <Text style={styles.subtitle}>{t('Choose between a local meeting or an outstation meeting to proceed.')}</Text>

        <View style={styles.content}>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('LocalMeeting')}
          >
            <Image
              source={require('../../assets/three_person_blu.png')}
              style={styles.iconImage}
            />
            <Text style={styles.cardText}>{t('Local Meeting')}</Text>
          </TouchableOpacity>


          <View style={styles.orContainer}>
            <Text style={styles.orText}>{t('OR')}</Text>
          </View>


          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('OutstationMeeting')}
          >
            <Image
              source={require('../../assets/single_person_blue.png')}
              style={styles.iconImage}
            />
            <Text style={styles.cardText}>{t('Outstation Meeting')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddMeetingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 5,
    alignItems: 'center',
    paddingBottom: 20,
  },
  title: {
    width: CARD_WIDTH,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 0,
  },
  subtitle: {
    width: CARD_WIDTH,
    fontSize: 12,
    color: 'rgba(231,169,61,0.7)',
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 15,
  },
  content: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.panel,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  iconImage: {
    width: 68,
    height: 54,
    resizeMode: 'contain',
    marginBottom: 5,
  },
  cardText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  orContainer: {
    marginVertical: 8,
    backgroundColor: 'rgba(231,169,61,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  orText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
