import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserData = {
  token: string | null;
  mobile: string | null;
  firstname: string | null;
  lastname: string | null;
  role: string | null;
};

type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userData: UserData;
  login: (
    token: string,
    mobile: string,
    firstname: string,
    lastname: string,
    role: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  userData: {
    token: null,
    mobile: null,
    firstname: null,
    lastname: null,
    role: null,
  },
  login: async () => { },
  logout: async () => { },
  refreshToken: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData>({
    token: null,
    mobile: null,
    firstname: null,
    lastname: null,
    role: null,
  });

  const login = async (
    token: string,
    mobile: string,
    firstname: string,
    lastname: string,
    role: string,
  ) => {
    await AsyncStorage.multiSet([
      ['auth_token', token],
      ['user_mobile', mobile],
      ['user_firstname', firstname],
      ['user_lastname', lastname],
      ['user_role', role],
    ]);

    setUserData({ token, mobile, firstname, lastname, role });
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([
      'auth_token',
      'user_mobile',
      'user_firstname',
      'user_lastname',
      'user_role',
      'user_id',
      'user_emp_code',
    ]);
    setUserData({
      token: null,
      mobile: null,
      firstname: null,
      lastname: null,
      role: null,
    });
    setIsLoggedIn(false);
  };

  const refreshToken = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    const mobile = await AsyncStorage.getItem('user_mobile');
    const firstname = await AsyncStorage.getItem('user_firstname');
    const lastname = await AsyncStorage.getItem('user_lastname');
    const role = await AsyncStorage.getItem('user_role');

    if (!token) {
      return;
    }

    setUserData({ token, mobile, firstname, lastname, role });
    setIsLoggedIn(true);
  };

  // ✅ FIXED: useEffect with proper loading state handling
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const mobile = await AsyncStorage.getItem('user_mobile');
        const firstname = await AsyncStorage.getItem('user_firstname');
        const lastname = await AsyncStorage.getItem('user_lastname');
        const role = await AsyncStorage.getItem('user_role');

        if (token) {
          setUserData({ token, mobile, firstname, lastname, role });
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.log('Init auth error:', error);
      } finally {
        // ✅ CRITICAL: Always set loading to false when done
        setIsLoading(false);
      }
    };

    initAuth();

    // Safety timeout - never stay loading for more than 5 seconds
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(safetyTimeout);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isLoading, userData, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};
