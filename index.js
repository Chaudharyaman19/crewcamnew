/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';
import {showIncomingCallNotification} from './src/services/crewcamCallNotifications';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  if (remoteMessage?.data?.type === 'crewcam_call') {
    showIncomingCallNotification(remoteMessage.data);
  }
});

AppRegistry.registerComponent(appName, () => App);
