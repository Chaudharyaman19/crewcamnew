import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCy7Xc8ztJEvPbzoJK1qHPpik7mXESr9MU',
  authDomain: 'auth-59148.firebaseapp.com',
  projectId: 'auth-59148',
  storageBucket: 'auth-59148.appspot.com',
  messagingSenderId: '440530442678',
  appId: '1:440530442678:web:b5f47e759dc5a699e7fc59',
  measurementId: 'G-0H51M6B8F6',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
