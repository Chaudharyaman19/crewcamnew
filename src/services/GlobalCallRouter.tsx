import { useContext, useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { API_BASE_URL } from '@env';
import { io, Socket } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import {
  isHrSupportRouteActive,
  openHrSupportCallScreen,
} from '../navigation/navigationService';
import {
  cancelIncomingCallNotification,
  showIncomingCallNotification,
} from './crewcamCallNotifications';

const parseJsonResponse = async (response: Response) => {
  const rawText = await response.text();
  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
};

const GlobalCallRouter = () => {
  const { isLoggedIn } = useContext(AuthContext);
  const socketRef = useRef<Socket | null>(null);
  const handledSessionRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return undefined;
    }

    let mounted = true;
    const parseCallUrl = (url: string) => {
      const [path, query = ''] = url.split('?');
      if (!path.startsWith('crewcam://call/')) {
        return null;
      }
      const action = path.replace('crewcam://call/', '');
      const params = query.split('&').reduce<Record<string, string>>(
        (acc, part) => {
          const [key, value = ''] = part.split('=');
          if (key) {
            acc[decodeURIComponent(key)] = decodeURIComponent(value);
          }
          return acc;
        },
        {},
      );
      return { action, params };
    };

    const handleCallUrl = async (url?: string | null) => {
      if (!url) {
        return;
      }
      const parsed = parseCallUrl(url);
      if (!parsed) {
        return;
      }

      const threadId = String(parsed.params.threadId || '');
      const sessionId = String(parsed.params.sessionId || '');
      cancelIncomingCallNotification();

      if (parsed.action === 'reject' && threadId && sessionId) {
        handledSessionRef.current = null;
        try {
          await fetch(`${API_BASE_URL}/app-api/calls/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              threadId,
              sessionId,
              userId: userIdRef.current || '',
            }),
          });
        } catch (error) {
          console.error('Global notification reject failed', error);
        }
        return;
      }

      if (parsed.action === 'open') {
        if (sessionId) {
          handledSessionRef.current = sessionId;
        }
        if (!isHrSupportRouteActive()) {
          openHrSupportCallScreen();
        }
      }
    };

    const openActiveCallIfNeeded = async (userId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/app-api/calls/active/${userId}`);
        const result = await parseJsonResponse(response);
        if (!response.ok || !result) {
          return;
        }
        const activeCall = result?.data;
        if (!mounted || !activeCall?.sessionId) {
          return;
        }
        const sessionId = String(activeCall.sessionId);
        if (appStateRef.current === 'active') {
          cancelIncomingCallNotification();
          if (!isHrSupportRouteActive()) {
            openHrSupportCallScreen();
          }
          handledSessionRef.current = sessionId;
          return;
        }

        if (handledSessionRef.current === sessionId) {
          return;
        }
        handledSessionRef.current = sessionId;
      } catch (error) {
        console.error('Global active call check failed', error);
      }
    };

    const connect = async () => {
      const userId = await AsyncStorage.getItem('user_id');
      const role = (await AsyncStorage.getItem('user_role')) || '';
      const normalizedRole = role.toLowerCase();
      const agentRole =
        normalizedRole === 'super admin' ? 'admin' : normalizedRole;
      const isSupportAgent = ['hr', 'hod', 'admin', 'super admin'].includes(
        normalizedRole,
      );

      if (!mounted || !userId) {
        return;
      }
      userIdRef.current = userId;

      const registerToken = async (fcmToken?: string) => {
        if (!fcmToken) {
          return;
        }
        try {
          await fetch(`${API_BASE_URL}/app-api/device-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, fcmToken }),
          });
        } catch (error) {
          console.error('Global FCM token registration failed', error);
        }
      };

      try {
        await messaging().requestPermission();
        await messaging().registerDeviceForRemoteMessages();
        registerToken(await messaging().getToken());
      } catch (error) {
        console.error('Global FCM setup failed', error);
      }

      openActiveCallIfNeeded(userId);

      const socket = io(API_BASE_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 700,
        reconnectionDelayMax: 5000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join_chat', userId);
        if (isSupportAgent) {
          socket.emit('join_chat', `support_${agentRole}`);
        }
        openActiveCallIfNeeded(userId);
      });

      socket.on('call:incoming', payload => {
        if (!payload?.sessionId || String(payload.callerId) === String(userId)) {
          return;
        }
        if (handledSessionRef.current === String(payload.sessionId)) {
          return;
        }

        handledSessionRef.current = String(payload.sessionId);
        const isActive = appStateRef.current === 'active';

        if (isActive) {
          cancelIncomingCallNotification();
          if (!isHrSupportRouteActive()) {
            openHrSupportCallScreen();
          }
        } else {
          showIncomingCallNotification(payload);
        }
      });

      const clearIncomingState = (payload: any) => {
        if (
          payload?.sessionId &&
          handledSessionRef.current === String(payload.sessionId)
        ) {
          handledSessionRef.current = null;
        }
        cancelIncomingCallNotification();
      };

      socket.on('call:accepted', clearIncomingState);
      socket.on('call:rejected', clearIncomingState);
      socket.on('call:ended', clearIncomingState);
    };

    connect();
    Linking.getInitialURL()
      .then(handleCallUrl)
      .catch(() => undefined);
    const urlSubscription = Linking.addEventListener('url', event => {
      handleCallUrl(event.url);
    });
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async token => {
      if (!userIdRef.current) {
        return;
      }
      try {
        await fetch(`${API_BASE_URL}/app-api/device-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userIdRef.current, fcmToken: token }),
        });
      } catch (error) {
        console.error('Global refreshed FCM token registration failed', error);
      }
    });
    const appStateSubscription = AppState.addEventListener('change', nextState => {
      appStateRef.current = nextState;
      if (nextState === 'active' && userIdRef.current) {
        openActiveCallIfNeeded(userIdRef.current);
      }
    });

    return () => {
      mounted = false;
      appStateSubscription.remove();
      urlSubscription.remove();
      unsubscribeTokenRefresh();
      socketRef.current?.disconnect();
      socketRef.current = null;
      userIdRef.current = null;
    };
  }, [isLoggedIn]);

  return null;
};

export default GlobalCallRouter;
