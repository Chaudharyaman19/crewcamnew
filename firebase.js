import {initializeApp, getApps} from 'firebase/app';
import {initializeAuth, getReactNativePersistence} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {getFirestore} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDCmt2NcHSmqOkHNNq5iZvKbsrly1FRAM4',
  authDomain: 'running-f9d57.firebaseapp.com',
  projectId: 'running-f9d57',
  storageBucket: 'running-f9d57.appspot.com',
  messagingSenderId: '219524855610',
  appId: '1:219524855610:android:10812e7cd69a1b79afc203',
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
