import React, { useCallback, useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Keyboard,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Image,
  BackHandler,
  Pressable,
  Vibration,
  AppState,
} from 'react-native';
import { Alert, ActivityIndicator } from 'react-native';
import { colors } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pick, types as documentTypes } from '@react-native-documents/picker';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { AuthContext } from '../../context/AuthContext';
import { cancelIncomingCallNotification } from '../../services/crewcamCallNotifications';
import { io, Socket } from 'socket.io-client';
import {
  MediaStream,
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faCamera,
  faChevronLeft,
  faCheck,
  faCheckDouble,
  faEllipsisVertical,
  faFaceSmile,
  faMagnifyingGlass,
  faMicrophone,
  faMicrophoneSlash,
  faPaperclip,
  faPaperPlane,
  faPhone,
  faPhoneSlash,
  faPlus,
  faShareNodes,
  faStar,
  faThumbTack,
  faUsers,
  faVideo,
  faVideoSlash,
  faVolumeHigh,
  faVolumeXmark,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;
const ACCENT = '#ffffff';
const SCREEN_BG = '#ffffff';

// ---- Standard WhatsApp Theme tokens ----
const WA_PINK_BG = '#f6f8fb';
const WA_PINK_HEADER = '#ffffff';
const WA_PINK_CHAT_BG = '#e8f0ed';
const WA_BUBBLE_MINE = '#c9f7b9';
const WA_BUBBLE_OTHER = '#fbfdff';
const WA_TEXT_DARK = '#061014';
const WA_TEXT_SUB = '#667781';
const WA_TICK_BLUE = '#34a8eb';
const WA_GREEN_DOT = '#25d366';
const WA_GREEN_TEAL = '#008069';
const WA_FONT_FAMILY = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: undefined,
});
const CrewcamRingtone = NativeModules.CrewcamRingtone as
  | {
      start?: () => void;
      stop?: () => void;
      showIncomingCall?: (callerName: string, callType: string) => void;
      cancelIncomingCall?: () => void;
      setSpeakerphoneOn?: (enabled: boolean) => void;
    }
  | undefined;

type CallType = 'audio' | 'video' | 'group_audio' | 'group_video';
type CallStatus = 'ringing' | 'incoming' | 'connected' | 'ended' | 'rejected';
type MessageStatus = 'sent' | 'delivered' | 'read';
type CallSession = {
  sessionId: string;
  threadId: string;
  threadName: string;
  threadAvatar?: string;
  callType: CallType;
  callerId: string;
  callerName: string;
  participants: string[];
  direction: 'outgoing' | 'incoming';
  status: CallStatus;
  connectedAt?: number;
};

const HrSupportScreen = () => {
  const { t, formatName } = useLanguage();
  const { userData } = useContext(AuthContext);
  const [supportList, setSupportList] = useState<Array<any>>([]);
  const [employeeList, setEmployeeList] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const loadingOptions = false;
  const [attachment, setAttachment] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeSupport, setActiveSupport] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [chatFilter, setChatFilter] = useState<
    'all' | 'unread' | 'favorites' | 'groups'
  >('all');
  const [selectionMode, setSelectionMode] = useState<
    'group' | 'broadcast' | null
  >(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [forwardingMessage, setForwardingMessage] = useState<any>(null);
  const [starredMessageIds, setStarredMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [pinnedChatIds, setPinnedChatIds] = useState<Set<string>>(new Set());
  const [archivedChatIds, setArchivedChatIds] = useState<Set<string>>(
    new Set(),
  );
  const [mutedChatIds, setMutedChatIds] = useState<Set<string>>(new Set());
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [showInboxMenu, setShowInboxMenu] = useState(false);
  const [showChatHeaderMenu, setShowChatHeaderMenu] = useState(false);
  const [showNewChatPanel, setShowNewChatPanel] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [newChatNumber, setNewChatNumber] = useState('');

  const [statusList, setStatusList] = useState<any[]>([]);
  const [myStatuses, setMyStatuses] = useState<any[]>([]);
  const [activeStatusViewer, setActiveStatusViewer] = useState<any>(null);
  const [statusProgress, setStatusProgress] = useState(0);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

  // Function to get message status
  const getMessageStatus = useCallback(
    (message: any): MessageStatus => {
      if (!message) {
        return 'sent';
      }

      const isMine = message.senderId
        ? String(message.senderId) === String(userId)
        : false;
      if (!isMine) {
        return 'sent';
      }

      const readBy = Array.isArray(message.readBy)
        ? message.readBy.map(String)
        : [];
      const readBySomeoneElse = readBy.some(
        (readerId: string) => readerId !== String(userId),
      );

      if (
        message.readStatus === 'read' ||
        message.deliveryStatus === 'read' ||
        message.isRead ||
        readBySomeoneElse
      ) {
        return 'read';
      }
      if (
        message.deliveryStatus === 'delivered' ||
        message.delivered ||
        message.isDelivered
      ) {
        return 'delivered';
      }
      return 'sent';
    },
    [userId],
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeStatusViewer) {
      interval = setInterval(() => {
        setStatusProgress(prev => {
          if (prev >= 100) {
            const nextIndex = currentStatusIndex + 1;
            if (nextIndex < activeStatusViewer.user.statuses.length) {
              setCurrentStatusIndex(nextIndex);
              return 0;
            } else {
              setActiveStatusViewer(null);
              return 100;
            }
          }
          return prev + 2;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [activeStatusViewer, currentStatusIndex]);

  useEffect(() => {
    if (activeStatusViewer) {
      setStatusProgress(0);
      setCurrentStatusIndex(activeStatusViewer.initialIndex || 0);
    }
  }, [activeStatusViewer]);

  useEffect(() => {
    if (employeeList && employeeList.length > 0) {
      const dynamicStatuses = employeeList
        .slice(0, 10)
        .map((emp: any, index: number) => ({
          userId: emp.userId,
          userName: emp.userName,
          profileImage: emp.profileImage,
          hasUnseen: index % 3 !== 0,
          statuses: [
            {
              id: `s_${emp.userId}_1`,
              type: 'text',
              content: `Hey! It's ${emp.userName}`,
              color: index % 2 === 0 ? '#4facfe' : '#ff0844',
            },
          ],
        }));
      setStatusList(dynamicStatuses);
    }
  }, [employeeList]);

  const normalizedRole = String(userData.role || '').toLowerCase();
  const isSupportAgent = ['hr', 'hod', 'admin', 'super admin'].includes(
    normalizedRole,
  );
  const agentRole = normalizedRole === 'super admin' ? 'admin' : normalizedRole;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [localCallStream, setLocalCallStream] = useState<MediaStream | null>(null);
  const [remoteCallStream, setRemoteCallStream] = useState<MediaStream | null>(null);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isCallCameraOff, setIsCallCameraOff] = useState(false);
  const [isCallSpeakerOn, setIsCallSpeakerOn] = useState(true);
  const [isLocalVideoPrimary, setIsLocalVideoPrimary] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [composerHeight, setComposerHeight] = useState(60);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const chatBodyRef = React.useRef<View>(null);
  const activeSupportIdRef = React.useRef<string | null>(null);
  const closedChatIdRef = React.useRef<string | null>(null);
  const keyboardFrameRequestRef = React.useRef<number | null>(null);
  const lastKeyboardTopRef = React.useRef<number | null>(null);
  const translateRef = React.useRef(t);
  const activeCallSessionRef = React.useRef<CallSession | null>(null);
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const localCallStreamRef = React.useRef<MediaStream | null>(null);
  const socketRef = React.useRef<Socket | null>(null);
  const appStateRef = React.useRef(AppState.currentState);

  const stopCallRingtone = useCallback(() => {
    Vibration.cancel();
    CrewcamRingtone?.stop?.();
    cancelIncomingCallNotification();
  }, []);

  const resetCallControls = useCallback(() => {
    setIsCallMuted(false);
    setIsCallCameraOff(false);
    setIsCallSpeakerOn(true);
    CrewcamRingtone?.setSpeakerphoneOn?.(true);
  }, []);

  const closeOpenOverlays = useCallback(() => {
    if (showChatHeaderMenu) {
      setShowChatHeaderMenu(false);
      return true;
    }
    if (showInboxMenu) {
      setShowInboxMenu(false);
      return true;
    }
    if (showNewChatPanel) {
      setShowNewChatPanel(false);
      return true;
    }
    if (activeStatusViewer) {
      setActiveStatusViewer(null);
      return true;
    }
    return false;
  }, [activeStatusViewer, showChatHeaderMenu, showInboxMenu, showNewChatPanel]);

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    activeCallSessionRef.current = callSession;
  }, [callSession]);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => closeOpenOverlays(),
    );

    return () => backSubscription.remove();
  }, [closeOpenOverlays]);

  useEffect(() => {
    activeSupportIdRef.current = activeSupport?._id || null;
  }, [activeSupport?._id]);

  const updateKeyboardInset = useCallback(
    (keyboardTop: number, fallbackHeight = 0) => {
      if (!Number.isFinite(keyboardTop)) {
        setKeyboardInset(0);
        return;
      }

      lastKeyboardTopRef.current = keyboardTop;
      const windowHeight = Dimensions.get('window').height;
      const maxInset = Math.round(windowHeight * 0.7);
      const safeFallbackInset =
        Number.isFinite(fallbackHeight) && fallbackHeight > 0
          ? Math.min(fallbackHeight, maxInset)
          : 0;

      if (safeFallbackInset > 0) {
        setKeyboardInset(prev => Math.max(prev, safeFallbackInset));
      }

      if (keyboardFrameRequestRef.current !== null) {
        cancelAnimationFrame(keyboardFrameRequestRef.current);
      }

      keyboardFrameRequestRef.current = requestAnimationFrame(() => {
        keyboardFrameRequestRef.current = null;
        chatBodyRef.current?.measureInWindow((_x, y, _width, height) => {
          if (!Number.isFinite(y) || !Number.isFinite(height)) {
            setKeyboardInset(safeFallbackInset);
            return;
          }

          const bodyBottom = Math.min(y + height, windowHeight);
          const nextInset = Math.max(0, bodyBottom - keyboardTop + 42);
          const safeMeasuredInset = Number.isFinite(nextInset)
            ? Math.min(nextInset, maxInset)
            : 0;

          setKeyboardInset(
            safeMeasuredInset > 0 ? safeMeasuredInset : safeFallbackInset,
          );
        });
      });
    },
    [],
  );

  const attachFromLibrary = async (mediaType: 'photo' | 'video' | 'mixed') => {
    try {
      const result = await launchImageLibrary({
        mediaType,
        quality: 0.5,
        includeBase64: true,
      });
      if (result.assets && result.assets.length > 0) {
        setAttachment(result.assets[0]);
      }
    } catch (e) {
      console.error('Media picker error', e);
    }
  };

  const attachFromCamera = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'mixed',
        quality: 0.5,
        includeBase64: true,
      });
      if (result.assets && result.assets.length > 0) {
        setAttachment(result.assets[0]);
      }
    } catch (e) {
      console.error('Camera picker error', e);
    }
  };

  const attachDocument = async () => {
    try {
      const [doc] = await pick({
        type: [
          documentTypes.pdf,
          documentTypes.doc,
          documentTypes.docx,
          documentTypes.xls,
          documentTypes.xlsx,
        ],
      });
      if (doc) {
        setAttachment({
          uri: doc.uri,
          base64: doc.uri,
          type: doc.type || 'application/octet-stream',
          fileName: doc.name || 'Document',
        });
      }
    } catch (e: any) {
      if (e?.code !== 'OPERATION_CANCELED') {
        console.error('Document picker error', e);
      }
    }
  };

  const attachVoiceNote = () => {
    setAttachment({
      uri: '',
      base64: '',
      type: 'audio/voice-note',
      fileName: 'Voice note',
    });
    setChatMessage(prev => prev || t('Voice note'));
  };

  const handleAttachment = async () => {
    Alert.alert(t('Media & Sharing'), t('Choose attachment type'), [
      { text: t('Image'), onPress: () => attachFromLibrary('photo') },
      { text: t('Video'), onPress: () => attachFromLibrary('video') },
      { text: t('PDF / Document'), onPress: attachDocument },
      { text: t('Camera'), onPress: attachFromCamera },
      { text: t('Voice Note'), onPress: attachVoiceNote },
      { text: t('Cancel'), style: 'cancel' },
    ]);
  };

  const handleAddStatus = async () => {
    Alert.alert(t('Add Status'), t('Choose media source'), [
      {
        text: t('Image Gallery'),
        onPress: async () => {
          try {
            const result = await launchImageLibrary({
              mediaType: 'mixed',
              quality: 0.5,
              includeBase64: true,
            });
            if (result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              const newStatus = {
                id: `my_s_${Date.now()}`,
                type: asset.type?.includes('video') ? 'video' : 'image',
                uri: `data:${asset.type};base64,${asset.base64}`,
              };
              setMyStatuses(prev => [...prev, newStatus]);
            }
          } catch (e) {
            console.error('Status picker error', e);
          }
        },
      },
      {
        text: t('Camera'),
        onPress: async () => {
          try {
            const result = await launchCamera({
              mediaType: 'mixed',
              quality: 0.5,
              includeBase64: true,
            });
            if (result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              const newStatus = {
                id: `my_s_${Date.now()}`,
                type: asset.type?.includes('video') ? 'video' : 'image',
                uri: `data:${asset.type};base64,${asset.base64}`,
              };
              setMyStatuses(prev => [...prev, newStatus]);
            }
          } catch (e) {
            console.error('Status camera error', e);
          }
        },
      },
      { text: t('Cancel'), style: 'cancel' },
    ]);
  };

  useEffect(() => {
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem('user_id');
      setUserId(id);
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    const requestIncomingCallNotificationPermission = async () => {
      if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
        return;
      }
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      } catch (_error) {
        // Incoming call alert and ringtone still work without notification permission.
      }
    };

    requestIncomingCallNotificationPermission();
  }, []);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

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
        console.error('Register FCM token failed', error);
      }
    };

    const setupMessaging = async () => {
      try {
        await messaging().requestPermission();
        await messaging().registerDeviceForRemoteMessages();
        const fcmToken = await messaging().getToken();
        await registerToken(fcmToken);
      } catch (error) {
        console.error('FCM setup failed', error);
      }
    };

    setupMessaging();
    const unsubscribeRefresh = messaging().onTokenRefresh(registerToken);

    return () => {
      unsubscribeRefresh();
    };
  }, [userId]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, event => {
      updateKeyboardInset(
        event.endCoordinates?.screenY || Dimensions.get('window').height,
        event.endCoordinates?.height || 0,
      );
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      lastKeyboardTopRef.current = null;
      setKeyboardInset(0);
    });

    return () => {
      if (keyboardFrameRequestRef.current !== null) {
        cancelAnimationFrame(keyboardFrameRequestRef.current);
        keyboardFrameRequestRef.current = null;
      }
      showSub.remove();
      hideSub.remove();
    };
  }, [updateKeyboardInset]);

  const cleanupCallMedia = useCallback(() => {
    stopCallRingtone();
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localCallStreamRef.current?.getTracks().forEach(track => track.stop());
    localCallStreamRef.current = null;
    setLocalCallStream(null);
    setRemoteCallStream(null);
    setIsLocalVideoPrimary(false);
    resetCallControls();
  }, [resetCallControls, stopCallRingtone]);

  const requestCallPermissions = useCallback(async (withVideo: boolean) => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const permissionsToRequest = [
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ...(withVideo ? [PermissionsAndroid.PERMISSIONS.CAMERA] : []),
    ];
    const result = await PermissionsAndroid.requestMultiple(permissionsToRequest);
    return permissionsToRequest.every(
      permission => result[permission] === PermissionsAndroid.RESULTS.GRANTED,
    );
  }, []);

  const getLocalCallMedia = useCallback(
    async (withVideo: boolean) => {
      const granted = await requestCallPermissions(withVideo);
      if (!granted) {
        Alert.alert(
          t('Permission required'),
          withVideo
            ? t('Microphone and camera permission are required for video calls.')
            : t('Microphone permission is required for audio calls.'),
        );
        return null;
      }

      const existing = localCallStreamRef.current;
      const hasAudio = existing?.getAudioTracks().some(track => track.enabled);
      const hasVideo = existing?.getVideoTracks().some(track => track.enabled);
      if (existing && hasAudio && (!withVideo || hasVideo)) {
        return existing;
      }

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: withVideo
          ? {
            facingMode: 'user',
            width: 640,
            height: 480,
            frameRate: 24,
          }
          : false,
      });

      if (existing) {
        existing.getTracks().forEach(track => track.stop());
      }
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isCallMuted;
      });
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isCallCameraOff;
      });
      localCallStreamRef.current = stream;
      setLocalCallStream(stream);
      return stream;
    },
    [isCallCameraOff, isCallMuted, requestCallPermissions, t],
  );

  const toggleCallMute = useCallback(() => {
    setIsCallMuted(prev => {
      const next = !prev;
      localCallStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const toggleCallCamera = useCallback(() => {
    setIsCallCameraOff(prev => {
      const next = !prev;
      localCallStreamRef.current?.getVideoTracks().forEach(track => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const toggleCallSpeaker = useCallback(() => {
    setIsCallSpeakerOn(prev => {
      const next = !prev;
      CrewcamRingtone?.setSpeakerphoneOn?.(next);
      return next;
    });
  }, []);

  const emitCallSignal = useCallback(
    (eventName: string, payload: Record<string, unknown>) => {
      socketRef.current?.emit(eventName, {
        ...payload,
        fromUserId: userId,
      });
    },
    [userId],
  );

  const ensurePeerConnection = useCallback(
    async (session: CallSession, withVideo: boolean) => {
      const localStream = await getLocalCallMedia(withVideo);
      if (!localStream) {
        return null;
      }

      if (!peerConnectionRef.current) {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        (pc as any).addEventListener('icecandidate', (event: any) => {
          if (event.candidate) {
            emitCallSignal('call:ice-candidate', {
              sessionId: session.sessionId,
              threadId: session.threadId,
              candidate: event.candidate,
            });
          }
        });
        (pc as any).addEventListener('track', (event: any) => {
          const [remoteStream] = event.streams || [];
          if (remoteStream) {
            setRemoteCallStream(remoteStream);
          }
        });
        peerConnectionRef.current = pc;
      }

      const pc = peerConnectionRef.current;
      const senderTrackIds = pc
        .getSenders()
        .map(sender => sender.track?.id)
        .filter(Boolean);
      localStream.getTracks().forEach(track => {
        if (!senderTrackIds.includes(track.id)) {
          pc.addTrack(track, localStream);
        }
      });
      return pc;
    },
    [emitCallSignal, getLocalCallMedia],
  );

  const sendCallOffer = useCallback(
    async (session: CallSession, forceVideo = false) => {
      const withVideo = forceVideo || session.callType.includes('video');
      const pc = await ensurePeerConnection(session, withVideo);
      if (!pc) {
        return;
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      emitCallSignal('call:offer', {
        sessionId: session.sessionId,
        threadId: session.threadId,
        callType: forceVideo
          ? session.callType.includes('group')
            ? 'group_video'
            : 'video'
          : session.callType,
        offer,
      });
    },
    [emitCallSignal, ensurePeerConnection],
  );

  const switchCurrentCallToVideo = useCallback(async () => {
    const session = activeCallSessionRef.current;
    if (!session || session.status !== 'connected') {
      return;
    }
    const nextCallType: CallType = session.callType.includes('group')
      ? 'group_video'
      : 'video';
    const nextSession = { ...session, callType: nextCallType };
    setCallSession(nextSession);
    activeCallSessionRef.current = nextSession;
    await sendCallOffer(nextSession, true);
  }, [sendCallOffer]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const socketUrl = API_BASE_URL;
    const newSocket = io(socketUrl);
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_chat', userId);
      if (isSupportAgent) {
        newSocket.emit('join_chat', `support_${agentRole}`);
      }
    });

    newSocket.on('receive_message', (updatedSupport: any) => {
      setSupportList(prev => {
        const exists = prev.find(p => p._id === updatedSupport._id);
        if (exists) {
          return prev.map(item =>
            item._id === updatedSupport._id ? updatedSupport : item,
          );
        }
        return [updatedSupport, ...prev];
      });
      setActiveSupport((prev: any) => {
        if (closedChatIdRef.current === String(updatedSupport._id)) {
          return prev;
        }
        return prev?._id === updatedSupport._id ? updatedSupport : prev;
      });
    });

    newSocket.on('chat:read', (payload: any) => {
      const readerId = String(payload?.userId || '');
      const threadId = String(payload?.threadId || '');
      if (!readerId || !threadId || readerId === String(userId)) {
        return;
      }

      const markRead = (thread: any) => {
        if (
          String(thread?._id) !== threadId ||
          !Array.isArray(thread.messages)
        ) {
          return thread;
        }
        return {
          ...thread,
          messages: thread.messages.map((message: any) => {
            if (String(message.senderId) === readerId) {
              return message;
            }
            const readBy = new Set(
              Array.isArray(message.readBy) ? message.readBy.map(String) : [],
            );
            readBy.add(readerId);
            return {
              ...message,
              deliveryStatus: 'read',
              readStatus: 'read',
              isRead: true,
              readBy: [...readBy],
            };
          }),
        };
      };

      setSupportList(prev => prev.map(markRead));
      setActiveSupport((prev: any) => (prev ? markRead(prev) : prev));
    });

    newSocket.on('call:incoming', (payload: any) => {
      if (!payload?.sessionId || String(payload.callerId) === String(userId)) {
        return;
      }
      setCallSession(prev => {
        if (prev?.sessionId === payload.sessionId) {
          return prev;
        }
        return {
          sessionId: String(payload.sessionId),
          threadId: String(payload.threadId || ''),
          threadName:
            payload.threadName || translateRef.current('Incoming Call'),
          threadAvatar: payload.threadAvatar || '',
          callType: payload.callType || 'audio',
          callerId: String(payload.callerId || ''),
          callerName: payload.callerName || translateRef.current('User'),
          participants: Array.isArray(payload.participants)
            ? payload.participants.map(String)
            : [],
          direction: 'incoming',
          status: 'incoming',
        };
      });
    });

    newSocket.on('call:accepted', (payload: any) => {
      const currentSession = activeCallSessionRef.current;
      setCallSession(prev => {
        if (!prev || prev.sessionId !== payload?.sessionId) {
          return prev;
        }
        return { ...prev, status: 'connected', connectedAt: Date.now() };
      });
      if (
        currentSession?.sessionId === payload?.sessionId &&
        currentSession.direction === 'outgoing' &&
        String(payload?.userId || '') !== String(userId)
      ) {
        sendCallOffer({
          ...currentSession,
          status: 'connected',
          connectedAt: Date.now(),
        });
      }
    });

    newSocket.on('call:offer', async (payload: any) => {
      if (String(payload?.fromUserId || '') === String(userId)) {
        return;
      }
      const currentSession = activeCallSessionRef.current;
      if (!currentSession || currentSession.sessionId !== payload?.sessionId) {
        return;
      }
      const nextCallType = payload.callType || currentSession.callType;
      if (nextCallType !== currentSession.callType) {
        setCallSession(prev =>
          prev?.sessionId === payload.sessionId
            ? { ...prev, callType: nextCallType }
            : prev,
        );
      }
      try {
        const pc = await ensurePeerConnection(
          { ...currentSession, callType: nextCallType },
          String(nextCallType).includes('video'),
        );
        if (!pc || !payload.offer) {
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        newSocket.emit('call:answer', {
          sessionId: currentSession.sessionId,
          threadId: currentSession.threadId,
          answer,
          fromUserId: userId,
        });
      } catch (offerError) {
        console.error('Call offer failed', offerError);
      }
    });

    newSocket.on('call:answer', async (payload: any) => {
      if (String(payload?.fromUserId || '') === String(userId)) {
        return;
      }
      const currentSession = activeCallSessionRef.current;
      if (!currentSession || currentSession.sessionId !== payload?.sessionId) {
        return;
      }
      try {
        if (peerConnectionRef.current && payload.answer) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.answer),
          );
        }
      } catch (answerError) {
        console.error('Call answer failed', answerError);
      }
    });

    newSocket.on('call:ice-candidate', async (payload: any) => {
      if (String(payload?.fromUserId || '') === String(userId)) {
        return;
      }
      const currentSession = activeCallSessionRef.current;
      if (!currentSession || currentSession.sessionId !== payload?.sessionId) {
        return;
      }
      try {
        if (peerConnectionRef.current && payload.candidate) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(payload.candidate),
          );
        }
      } catch (iceError) {
        console.error('Call ICE candidate failed', iceError);
      }
    });

    newSocket.on('call:rejected', (payload: any) => {
      stopCallRingtone();
      setCallSession(prev => {
        if (!prev || prev.sessionId !== payload?.sessionId) {
          return prev;
        }
        return { ...prev, status: 'rejected' };
      });
      setTimeout(() => {
        setCallSession(prev =>
          prev?.sessionId === payload?.sessionId ? null : prev,
        );
        cleanupCallMedia();
      }, 900);
    });

    newSocket.on('call:ended', (payload: any) => {
      stopCallRingtone();
      setCallSession(prev => {
        if (!prev || prev.sessionId !== payload?.sessionId) {
          return prev;
        }
        return { ...prev, status: 'ended' };
      });
      setTimeout(() => {
        setCallSession(prev =>
          prev?.sessionId === payload?.sessionId ? null : prev,
        );
        cleanupCallMedia();
      }, 700);
    });

    return () => {
      socketRef.current = null;
      newSocket.disconnect();
    };
  }, [
    agentRole,
    cleanupCallMedia,
    ensurePeerConnection,
    isSupportAgent,
    sendCallOffer,
    stopCallRingtone,
    userId,
  ]);

  useEffect(() => {
    if (callSession?.status !== 'connected') {
      setCallDurationSeconds(0);
      return undefined;
    }

    const connectedAt = callSession.connectedAt || Date.now();
    setCallDurationSeconds(
      Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)),
    );
    const interval = setInterval(() => {
      setCallDurationSeconds(
        Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [callSession?.connectedAt, callSession?.status]);

  useEffect(() => {
    const shouldRing =
      callSession?.status === 'incoming' || callSession?.status === 'ringing';

    if (!shouldRing) {
      stopCallRingtone();
      return undefined;
    }

    const isBackgroundIncomingCall =
      callSession?.status === 'incoming' && appStateRef.current !== 'active';
    if (isBackgroundIncomingCall) {
      return undefined;
    }

    if (Platform.OS === 'android') {
      CrewcamRingtone?.start?.();
    }
    Vibration.vibrate([0, 850, 650], true);

    return () => stopCallRingtone();
  }, [callSession?.status, stopCallRingtone]);

  useEffect(() => {
    if (!socket || !activeSupport?._id) {
      return;
    }
    socket.emit('join_thread', activeSupport._id);
    return () => {
      socket.emit('leave_thread', activeSupport._id);
    };
  }, [activeSupport?._id, socket]);

  const fetchSupport = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    try {
      const supportUrl = isSupportAgent
        ? `${API_BASE_URL}/app-api/hr-support/assigned/${agentRole}?limit=1000`
        : `${API_BASE_URL}/app-api/hr-support/${userId}`;
      const res = await fetch(supportUrl);
      const data = await res.json();
      const supports = data.data || [];
      setSupportList(supports);

      const currentActiveId = activeSupportIdRef.current;
      if (
        currentActiveId &&
        closedChatIdRef.current !== String(currentActiveId)
      ) {
        const updatedActiveSupport = supports.find(
          (item: any) => item._id === currentActiveId,
        );
        if (updatedActiveSupport) {
          setActiveSupport(updatedActiveSupport);
        }
      }
    } catch (e) {
      console.error('Fetch HR support error', e);
    } finally {
      setLoading(false);
    }
  }, [agentRole, isSupportAgent, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    fetchSupport();
  }, [fetchSupport, userId]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/app-api/employees`);
      const data = await response.json();
      const employees = Array.isArray(data.result) ? data.result : [];
      setEmployeeList(
        employees
          .map((employee: any) => ({
            userId: String(employee._id || ''),
            userName: employee.name || employee.fullName || '',
            userEmpCode: employee.employeeId || employee.empCode || '',
            mobileNumber: employee.mobileNumber || employee.phone || '',
            designation: employee.designation || '',
            profileImage: employee.profileImage || employee.employeeImage || '',
          }))
          .filter(
            (employee: any) =>
              employee.userId && employee.userId !== String(userId),
          ),
      );
    } catch (error) {
      console.error('Fetch chat users error', error);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchEmployees();
    }
  }, [fetchEmployees, userId]);

  useEffect(() => {
    if (!activeSupport?._id) {
      return undefined;
    }
  }, [activeSupport?._id]);

  const openChat = (support: any) => {
    closedChatIdRef.current = null;
    setActiveSupport(support);
    setChatMessage('');
    setShowMessageSearch(false);
    if (isSupportAgent && socket) {
      socket.emit('join_chat', support.userId);
    }
  };

  const getSelectableUserFromThread = (thread: any) => {
    if (!thread || thread.conversationType === 'group') {
      return null;
    }
    const peer =
      thread.conversationType === 'direct'
        ? (thread.groupMembers || []).find(
          (member: any) => String(member.userId) !== String(userId),
        )
        : {
          userId: thread.userId,
          userName: thread.userName,
          userEmpCode: thread.userEmpCode,
        };
    if (!peer?.userId || String(peer.userId) === String(userId)) {
      return null;
    }
    return {
      userId: String(peer.userId),
      userName: peer.userName || thread.userName || '',
      userEmpCode: peer.userEmpCode || thread.userEmpCode || '',
      designation: peer.designation || '',
      profileImage: peer.profileImage || '',
    };
  };

  const toggleSelectedUser = (employee: any) => {
    if (!employee?.userId) {
      return;
    }
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(employee.userId)) {
        next.delete(employee.userId);
      } else {
        next.add(employee.userId);
      }
      return next;
    });
  };

  const getAllSelectableUsers = () => {
    const users = new Map<string, any>();
    employeeList.forEach((employee: any) => {
      if (employee?.userId) {
        users.set(String(employee.userId), employee);
      }
    });
    supportList.forEach((thread: any) => {
      const peer = getSelectableUserFromThread(thread);
      if (peer?.userId) {
        users.set(String(peer.userId), peer);
      }
    });
    return [...users.values()];
  };

  const currentChatUser = useCallback(
    () => ({
      userId: userId || '',
      userName:
        [userData.firstname, userData.lastname].filter(Boolean).join(' ') ||
        'You',
      userEmpCode: '',
    }),
    [userData.firstname, userData.lastname, userId],
  );

  const openDirectChat = async (employee: any) => {
    if (selectionMode) {
      toggleSelectedUser(employee);
      return;
    }

    const existingThread = supportList.find((thread: any) => {
      if (thread.conversationType !== 'direct') {
        return false;
      }
      const memberIds = (thread.groupMembers || []).map((member: any) =>
        String(member.userId),
      );
      return (
        memberIds.includes(String(userId)) &&
        memberIds.includes(String(employee.userId))
      );
    });

    if (existingThread) {
      openChat(existingThread);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/app-api/hr-support/direct`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentUser: currentChatUser(),
            peerUser: employee,
          }),
        },
      );
      const result = await response.json();
      if (result.result === 'true') {
        updateActiveThread(result.data);
        openChat(result.data);
      } else {
        Alert.alert(t('Error'), result.message || t('Failed to create chat'));
      }
    } catch (error) {
      console.error('Create direct chat error', error);
      Alert.alert(t('Error'), t('Failed to create chat'));
    } finally {
      setLoading(false);
    }
  };

  const closeNewChatPanel = () => {
    setShowNewChatPanel(false);
    setNewChatSearch('');
    setNewChatNumber('');
  };

  const getNewChatMatches = () => {
    const search = newChatSearch.trim().toLowerCase();
    const allUsers = getAllSelectableUsers();
    if (!search) {
      return allUsers.slice(0, 20);
    }
    return allUsers
      .filter((employee: any) =>
        [
          employee.userName,
          employee.userEmpCode,
          employee.mobileNumber,
          employee.designation,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search),
      )
      .slice(0, 20);
  };

  const openNewChatWithEmployee = (employee: any) => {
    closeNewChatPanel();
    openDirectChat(employee);
  };

  const openNewChatWithNumber = () => {
    const digits = newChatNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      Alert.alert(t('Invalid Number'), t('Please enter a valid phone number'));
      return;
    }
    closeNewChatPanel();
    openDirectChat({
      userId: `phone:${digits}`,
      userName: `+${digits}`,
      userEmpCode: digits,
      mobileNumber: digits,
      designation: t('New Contact'),
      profileImage: '',
    });
  };

  const startSelectionMode = (mode: 'group' | 'broadcast') => {
    setSelectionMode(mode);
    setSelectedUserIds(new Set());
  };

  const cancelSelectionMode = () => {
    setSelectionMode(null);
    setSelectedUserIds(new Set());
  };

  const createSelectedGroup = async () => {
    const selectedEmployees = getAllSelectableUsers().filter(employee =>
      selectedUserIds.has(employee.userId),
    );
    if (selectedEmployees.length < 2) {
      Alert.alert(t('Group Chat'), t('Select at least 2 users'));
      return;
    }

    const groupName = `${t('Group')} ${selectedEmployees
      .slice(0, 2)
      .map(employee => employee.userName)
      .join(', ')}`;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/app-api/hr-support/groups`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupName,
            groupDescription: t('Company group chat'),
            createdBy: userId,
            assignedRole: isSupportAgent ? agentRole : 'hr',
            members: [
              { ...currentChatUser(), role: 'admin' },
              ...selectedEmployees.map(employee => ({
                ...employee,
                role: 'member',
              })),
            ],
          }),
        },
      );
      const result = await response.json();
      if (result.result === 'true') {
        updateActiveThread(result.data);
        cancelSelectionMode();
        setChatFilter('groups');
      } else {
        Alert.alert(t('Error'), result.message || t('Failed to create group'));
      }
    } catch (error) {
      console.error('Create group error', error);
      Alert.alert(t('Error'), t('Failed to create group'));
    } finally {
      setLoading(false);
    }
  };

  const createBroadcast = async () => {
    const selectedEmployees = getAllSelectableUsers().filter(employee =>
      selectedUserIds.has(employee.userId),
    );
    if (selectedEmployees.length < 1) {
      Alert.alert(t('Broadcast Messages'), t('Select users first'));
      return;
    }

    const groupName = `${t('Broadcast')} ${new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/app-api/hr-support/groups`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupName,
            groupDescription: t('Broadcast announcements'),
            createdBy: userId,
            assignedRole: isSupportAgent ? agentRole : 'hr',
            members: [
              { ...currentChatUser(), role: 'admin' },
              ...selectedEmployees.map(employee => ({
                ...employee,
                role: 'member',
              })),
            ],
          }),
        },
      );
      const result = await response.json();
      if (result.result === 'true') {
        updateActiveThread({
          ...result.data,
          conversationType: 'group',
          queryType: 'Broadcast',
        });
        cancelSelectionMode();
        setChatFilter('groups');
      } else {
        Alert.alert(
          t('Error'),
          result.message || t('Failed to create broadcast'),
        );
      }
    } catch (error) {
      console.error('Create broadcast error', error);
      Alert.alert(t('Error'), t('Failed to create broadcast'));
    } finally {
      setLoading(false);
    }
  };

  const completeSelectionAction = () => {
    if (selectionMode === 'broadcast') {
      createBroadcast();
    } else {
      createSelectedGroup();
    }
  };

  const closeChat = useCallback(() => {
    closedChatIdRef.current = activeSupport?._id || activeSupportIdRef.current;
    setActiveSupport(null);
    setChatMessage('');
    setMessageSearch('');
    setShowMessageSearch(false);
    setReplyingTo(null);
    setEditingMessage(null);
    setForwardingMessage(null);
  }, [activeSupport?._id]);

  useEffect(() => {
    if (!activeSupport?._id) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        closeChat();
        return true;
      },
    );

    return () => subscription.remove();
  }, [activeSupport?._id, closeChat]);

  useEffect(() => {
    if (activeSupport?._id || !showArchivedChats) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setShowArchivedChats(false);
        return true;
      },
    );

    return () => subscription.remove();
  }, [activeSupport?._id, showArchivedChats]);

  const getThreadMessages = (support: any) => {
    if (Array.isArray(support?.messages) && support.messages.length > 0) {
      return support.messages;
    }

    if (support?.message) {
      return [
        {
          senderRole: 'user',
          message: support.message,
          attachment: support.attachment,
          createdAt: support.createdAt,
        },
      ];
    }

    return [];
  };

  const getMessageId = (item: any, index = 0) =>
    String(
      item?._id || item?.createdAt || `${item?.senderRole || 'msg'}-${index}`,
    );

  const getVisibleThreadMessages = (support: any) => {
    const search = messageSearch.trim().toLowerCase();
    return getThreadMessages(support).filter((item: any, index: number) => {
      const messageId = getMessageId(item, index);
      if (hiddenMessageIds.has(messageId)) {
        return false;
      }
      if (
        userId &&
        Array.isArray(item.deletedFor) &&
        item.deletedFor.map(String).includes(String(userId))
      ) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [item.message, item.senderName, item.attachmentName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  };

  const updateActiveThread = (updatedThread: any) => {
    setSupportList(prev => {
      const exists = prev.some(item => item._id === updatedThread._id);
      return exists
        ? prev.map(item =>
          item._id === updatedThread._id ? updatedThread : item,
        )
        : [updatedThread, ...prev];
    });
    setActiveSupport(prev => {
      if (closedChatIdRef.current === String(updatedThread._id)) {
        return prev;
      }
      return prev?._id === updatedThread._id ? updatedThread : prev;
    });
  };

  const isMessageUnreadForMe = useCallback(
    (message: any) => {
      if (!message || !userId) {
        return false;
      }
      if (String(message.senderId) === String(userId)) {
        return false;
      }
      const readBy = Array.isArray(message.readBy)
        ? message.readBy.map(String)
        : [];
      return (
        message.deliveryStatus !== 'read' &&
        message.readStatus !== 'read' &&
        !message.isRead &&
        !readBy.includes(String(userId))
      );
    },
    [userId],
  );

  const applyReadReceiptToThread = useCallback(
    (thread: any, readerId: string) => {
      if (!thread || !Array.isArray(thread.messages)) {
        return thread;
      }
      return {
        ...thread,
        messages: thread.messages.map((message: any) => {
          if (String(message.senderId) === String(readerId)) {
            return message;
          }
          const readBy = new Set(
            Array.isArray(message.readBy) ? message.readBy.map(String) : [],
          );
          readBy.add(String(readerId));
          return {
            ...message,
            deliveryStatus: 'read',
            readStatus: 'read',
            isRead: true,
            readBy: [...readBy],
          };
        }),
      };
    },
    [],
  );

  const markActiveThreadRead = useCallback(
    async (thread: any) => {
      if (!thread?._id || !userId) {
        return;
      }
      const unreadMessages = getThreadMessages(thread).filter(
        (message: any) => message?._id && isMessageUnreadForMe(message),
      );
      if (unreadMessages.length === 0) {
        return;
      }

      const readThread = applyReadReceiptToThread(thread, String(userId));
      updateActiveThread(readThread);
      socket?.emit('chat:read', { threadId: thread._id, userId });

      try {
        await Promise.all(
          unreadMessages.map((message: any) =>
            fetch(
              `${API_BASE_URL}/app-api/hr-support/${thread._id}/messages/${message._id}`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  markRead: true,
                }),
              },
            ),
          ),
        );
      } catch (error) {
        console.error('Mark messages read failed', error);
      }
    },
    [applyReadReceiptToThread, isMessageUnreadForMe, socket, userId],
  );

  const activeMessageCount = getVisibleThreadMessages(activeSupport).length;

  const scrollChatToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated });
      }, 80);
    });
  }, []);

  const handleComposerFocus = useCallback(() => {
    if (lastKeyboardTopRef.current !== null) {
      updateKeyboardInset(lastKeyboardTopRef.current);
    }
    scrollChatToBottom(true);
  }, [scrollChatToBottom, updateKeyboardInset]);

  const handleComposerTextChange = useCallback(
    (text: string) => {
      setChatMessage(text);
      scrollChatToBottom(true);
    },
    [scrollChatToBottom],
  );

  useEffect(() => {
    if (!activeSupport?._id && activeMessageCount === 0) {
      return;
    }
    scrollChatToBottom(true);
  }, [
    activeMessageCount,
    activeSupport?._id,
    keyboardInset,
    scrollChatToBottom,
  ]);

  useEffect(() => {
    if (!activeSupport?._id) {
      return;
    }
    markActiveThreadRead(activeSupport);
  }, [
    activeMessageCount,
    activeSupport,
    activeSupport?._id,
    markActiveThreadRead,
  ]);

  const sendChatMessage = async () => {
    if (!chatMessage.trim() && !attachment) {
      return;
    }

    setSendingMessage(true);
    try {
      if (editingMessage?._id && activeSupport?._id) {
        const response = await fetch(
          `${API_BASE_URL}/app-api/hr-support/${activeSupport._id}/messages/${editingMessage._id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              message: chatMessage.trim(),
            }),
          },
        );
        const result = await response.json();
        if (result.result === 'true') {
          updateActiveThread(result.data);
          setEditingMessage(null);
          setChatMessage('');
          scrollChatToBottom(true);
        } else {
          Alert.alert(
            t('Edit Failed'),
            result.message || t('Please try again'),
          );
        }
        return;
      }

      if (!activeSupport?._id) {
        const empCode = (await AsyncStorage.getItem('user_emp_code')) || '';
        const response = await fetch(`${API_BASE_URL}/app-api/hr-support`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            userName: [userData.firstname, userData.lastname]
              .filter(Boolean)
              .join(' '),
            userEmpCode: empCode,
            queryType: 'General Support Chat',
            message: chatMessage.trim() || attachment?.fileName || 'Attachment',
            attachment: attachment?.base64 || '',
            attachmentType: attachment?.type || '',
            attachmentName: attachment?.fileName || attachment?.fileName || '',
            assignedRole: 'hr',
          }),
        });
        const result = await response.json();
        if (result.result === 'true') {
          setActiveSupport(result.data);
          setSupportList([result.data]);
          setChatMessage('');
          setAttachment(null);
          scrollChatToBottom(true);
        } else {
          Alert.alert(t('Error'), result.message || t('Failed to create chat'));
        }
      } else {
        const response = await fetch(
          `${API_BASE_URL}/app-api/hr-support/${activeSupport._id}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: userId,
              senderRole: isSupportAgent ? agentRole : 'user',
              senderName: [userData.firstname, userData.lastname]
                .filter(Boolean)
                .join(' '),
              message:
                chatMessage.trim() || attachment?.fileName || 'Attachment',
              attachment: attachment?.base64 || '',
              attachmentType: attachment?.type || '',
              attachmentName: attachment?.fileName || '',
              replyToMessageId: replyingTo?._id || '',
              forwardedFrom: forwardingMessage?._id || '',
            }),
          },
        );
        const result = await response.json();

        if (result.result === 'true') {
          setActiveSupport(result.data);
          setSupportList(prev =>
            prev.map(item =>
              item._id === result.data._id ? result.data : item,
            ),
          );
          setChatMessage('');
          setAttachment(null);
          setReplyingTo(null);
          setForwardingMessage(null);
          scrollChatToBottom(true);
        } else {
          Alert.alert(
            t('Message Failed'),
            result.message || t('Please try again'),
          );
        }
      }
    } catch (err) {
      console.error('HR support chat error', err);
      Alert.alert(t('Error'), t('Failed to send message'));
    } finally {
      setSendingMessage(false);
    }
  };

  const updateMessageAction = async (
    message: any,
    payload: Record<string, any>,
  ) => {
    if (!activeSupport?._id || !message?._id) {
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/app-api/hr-support/${activeSupport._id}/messages/${message._id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, ...payload }),
        },
      );
      const result = await response.json();
      if (result.result === 'true') {
        updateActiveThread(result.data);
      } else {
        Alert.alert(t('Error'), result.message || t('Please try again'));
      }
    } catch (err) {
      console.error('Message action failed', err);
      Alert.alert(t('Error'), t('Please try again'));
    }
  };

  const updateThreadAction = async (
    support: any,
    action: string,
    value: boolean | string = true,
    extra: Record<string, any> = {},
  ) => {
    if (!support?._id) {
      return;
    }

    if (['pin', 'archive', 'mute'].includes(action)) {
      const setterMap: Record<
        string,
        React.Dispatch<React.SetStateAction<Set<string>>>
      > = {
        pin: setPinnedChatIds,
        archive: setArchivedChatIds,
        mute: setMutedChatIds,
      };
      setterMap[action]?.(prev => {
        const next = new Set(prev);
        if (value) {
          next.add(support._id);
        } else {
          next.delete(support._id);
        }
        return next;
      });
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/app-api/hr-support/${support._id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            value,
            userId,
            callerName: [userData.firstname, userData.lastname]
              .filter(Boolean)
              .join(' '),
            ...extra,
          }),
        },
      );
      const result = await response.json();
      if (result.result === 'true') {
        updateActiveThread(result.data);
      }
    } catch (err) {
      console.error('Thread action failed', err);
    }
  };

  const getCurrentUserName = useCallback(() =>
    [userData.firstname, userData.lastname].filter(Boolean).join(' ') ||
    (userData as any).name ||
    t('User'), [t, userData]);

  const restoreActiveCall = useCallback(async () => {
    if (!userId || callSession?.status === 'connected') {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/app-api/calls/active/${userId}`);
      const result = await response.json();
      const activeCall = result?.data;
      if (!activeCall?.sessionId) {
        return;
      }
      if (activeCallSessionRef.current?.sessionId === activeCall.sessionId) {
        return;
      }

      const isRestoredCaller =
        String(activeCall.callerId || '') === String(userId);
      const restoredSession: CallSession = {
        sessionId: String(activeCall.sessionId),
        threadId: String(activeCall.threadId || ''),
        threadName:
          activeCall.threadName ||
          activeCall.callerName ||
          t('Crewcam Call'),
        threadAvatar: activeCall.threadAvatar || '',
        callType: activeCall.callType || 'audio',
        callerId: String(activeCall.callerId || ''),
        callerName: activeCall.callerName || t('User'),
        participants: Array.isArray(activeCall.participants)
          ? activeCall.participants.map(String)
          : [],
        direction: isRestoredCaller ? 'outgoing' : 'incoming',
        status:
          activeCall.status === 'connected'
            ? 'connected'
            : isRestoredCaller
              ? 'ringing'
              : 'incoming',
        connectedAt:
          activeCall.status === 'connected' ? Date.now() : undefined,
      };

      setCallSession(restoredSession);
      activeCallSessionRef.current = restoredSession;
      socketRef.current?.emit('join_thread', restoredSession.threadId);
      socketRef.current?.emit('join_call', restoredSession.sessionId);
      if (appStateRef.current === 'active') {
        cancelIncomingCallNotification();
      }
    } catch (error) {
      console.error('Restore active call failed', error);
    }
  }, [callSession?.status, t, userId]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    restoreActiveCall();
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        restoreActiveCall();
      }
    });

    return () => subscription.remove();
  }, [restoreActiveCall, userId]);

  useEffect(() => {
    if (socket?.connected) {
      if (callSession?.sessionId) {
        socket.emit('join_thread', callSession.threadId);
        socket.emit('join_call', callSession.sessionId);
      }
      restoreActiveCall();
    }
  }, [callSession?.sessionId, callSession?.threadId, restoreActiveCall, socket]);

  const getThreadParticipantIds = (support: any) => {
    const members = Array.isArray(support?.groupMembers)
      ? support.groupMembers
      : [];
    const ids: string[] = members
      .map((member: any) => String(member.userId || ''))
      .filter(Boolean);
    if (support?.userId) {
      ids.push(String(support.userId));
    }
    if (userId) {
      ids.push(String(userId));
    }
    return Array.from(new Set(ids));
  };

  const startCall = async (callType: CallType) => {
    if (!activeSupport?._id || !userId) {
      return;
    }
    resetCallControls();

    const session: CallSession = {
      sessionId: `${activeSupport._id}-${Date.now()}`,
      threadId: String(activeSupport._id),
      threadName: getSupportDisplayName(activeSupport),
      threadAvatar: getSupportAvatarImage(activeSupport),
      callType,
      callerId: String(userId),
      callerName: getCurrentUserName(),
      participants: getThreadParticipantIds(activeSupport),
      direction: 'outgoing',
      status: 'ringing',
    };

    setCallSession(session);
    activeCallSessionRef.current = session;
    socket?.emit('join_thread', activeSupport._id);
    socket?.emit('call:start', {
      ...session,
      assignedRole: activeSupport.assignedRole || 'hr',
    });
    updateThreadAction(activeSupport, 'call', 'started', {
      callType,
      sessionId: session.sessionId,
    });

    const localStream = await getLocalCallMedia(callType.includes('video'));
    if (!localStream) {
      socket?.emit('call:end', {
        sessionId: session.sessionId,
        threadId: session.threadId,
        userId,
        userName: session.callerName,
      });
      setCallSession(null);
      activeCallSessionRef.current = null;
      cleanupCallMedia();
      return;
    }
  };

  const acceptCall = useCallback(async () => {
    if (!callSession || !socket || !userId) {
      return;
    }
    stopCallRingtone();
    const localStream = await getLocalCallMedia(callSession.callType.includes('video'));
    if (!localStream) {
      return;
    }
    socket.emit('call:accept', {
      sessionId: callSession.sessionId,
      threadId: callSession.threadId,
      userId,
      userName: getCurrentUserName(),
    });
    setCallSession(prev =>
      prev ? { ...prev, status: 'connected', connectedAt: Date.now() } : prev,
    );
  }, [callSession, getCurrentUserName, getLocalCallMedia, socket, stopCallRingtone, userId]);

  const rejectCall = useCallback(() => {
    if (!callSession) {
      return;
    }
    stopCallRingtone();
    socket?.emit('call:reject', {
      sessionId: callSession.sessionId,
      threadId: callSession.threadId,
      userId,
      userName: getCurrentUserName(),
    });
    setCallSession(null);
    cleanupCallMedia();
  }, [callSession, cleanupCallMedia, getCurrentUserName, socket, stopCallRingtone, userId]);

  const endCall = useCallback(() => {
    if (!callSession) {
      return;
    }
    stopCallRingtone();
    socket?.emit('call:end', {
      sessionId: callSession.sessionId,
      threadId: callSession.threadId,
      userId,
      userName: getCurrentUserName(),
    });
    setCallSession(null);
    cleanupCallMedia();
  }, [callSession, cleanupCallMedia, getCurrentUserName, socket, stopCallRingtone, userId]);

  const showMessageOptions = (item: any, mine: boolean, index: number) => {
    const messageId = getMessageId(item, index);
    const starred =
      starredMessageIds.has(messageId) ||
      item.starredBy?.map(String).includes(String(userId));
    Alert.alert(
      t('Message Options'),
      item.message || item.attachmentName || t('Attachment'),
      [
        { text: t('Reply'), onPress: () => setReplyingTo(item) },
        { text: t('Forward'), onPress: () => setForwardingMessage(item) },
        {
          text: t('Translate'),
          onPress: () =>
            Alert.alert(
              t('Message Translation'),
              item.message || t('No text to translate'),
            ),
        },
        ...(mine && !item.deletedAt
          ? [
            {
              text: t('Edit'),
              onPress: () => {
                setEditingMessage(item);
                setChatMessage(item.message || '');
              },
            },
          ]
          : []),
        {
          text: starred ? t('Unstar') : t('Star'),
          onPress: () => {
            setStarredMessageIds(prev => {
              const next = new Set(prev);
              if (starred) {
                next.delete(messageId);
              } else {
                next.add(messageId);
              }
              return next;
            });
            updateMessageAction(item, { star: !starred });
          },
        },
        {
          text: t('Delete for Me'),
          onPress: () => {
            setHiddenMessageIds(prev => new Set(prev).add(messageId));
            updateMessageAction(item, { deletedForMe: true });
          },
        },
        ...(mine && !item.deletedAt
          ? [
            {
              text: t('Delete for Everyone'),
              style: 'destructive' as const,
              onPress: () => updateMessageAction(item, { deleted: true }),
            },
          ]
          : []),
        { text: t('Cancel'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const showReactionOptions = (item: any) => {
    Alert.alert(
      t('React to Message'),
      item.message || '',
      [
        ...['👍', '❤️', '😂', '😮', '😢'].map(emoji => ({
          text: emoji,
          onPress: () => updateMessageAction(item, { reaction: { emoji } }),
        })),
        { text: t('Cancel'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const showChatOptions = (support: any) => {
    const isPinned =
      pinnedChatIds.has(support._id) ||
      support.pinnedBy?.map(String).includes(String(userId));
    const isArchived =
      archivedChatIds.has(support._id) ||
      support.archivedBy?.map(String).includes(String(userId));
    const isMuted =
      mutedChatIds.has(support._id) ||
      support.mutedBy?.map(String).includes(String(userId));
    Alert.alert(
      t('Chat Options'),
      getSupportDisplayName(support),
      [
        {
          text: isPinned ? t('Unpin Chat') : t('Pin Chat'),
          onPress: () => updateThreadAction(support, 'pin', !isPinned),
        },
        {
          text: isArchived ? t('Unarchive Chat') : t('Archive Chat'),
          onPress: () => updateThreadAction(support, 'archive', !isArchived),
        },
        {
          text: isMuted ? t('Unmute Chat') : t('Mute Chat'),
          onPress: () => updateThreadAction(support, 'mute', !isMuted),
        },
        ...(support.conversationType === 'group'
          ? [
            {
              text: t('Group Info'),
              onPress: () =>
                Alert.alert(
                  t('Group Members'),
                  `${support.groupMembers?.length || 0} ${t('members')}`,
                  [{ text: t('OK'), style: 'cancel' }],
                  { cancelable: true },
                ),
            },
          ]
          : []),
        {
          text: t('Shared Media Gallery'),
          onPress: () => {
            const mediaCount = getThreadMessages(support).filter(
              (message: any) => message.attachment,
            ).length;
            Alert.alert(
              t('Shared Media Gallery'),
              `${mediaCount} ${t('media files')}`,
              [{ text: t('OK'), style: 'cancel' }],
              { cancelable: true },
            );
          },
        },
        {
          text: t('Screen Sharing'),
          onPress: () =>
            Alert.alert(
              t('Screen Sharing'),
              t('Connect WebRTC screen sharing provider to start sharing.'),
              [{ text: t('OK'), style: 'cancel' }],
              { cancelable: true },
            ),
        },
        {
          text: t('Report User'),
          style: 'destructive',
          onPress: () =>
            updateThreadAction(support, 'report', true, {
              reason: 'Reported from mobile app',
            }),
        },
        { text: t('Cancel'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const showThreadInfo = (support: any) => {
    if (!support) {
      return;
    }
    if (support.conversationType === 'group') {
      const members = Array.isArray(support.groupMembers)
        ? support.groupMembers
        : [];
      const memberPreview = members
        .map(
          (member: any, index: number) =>
            `${index + 1}. ${formatName(member.userName) || member.userEmpCode || t('Member')
            }`,
        )
        .slice(0, 12)
        .join('\n');
      Alert.alert(
        getSupportDisplayName(support),
        `${members.length} ${t('members')}${memberPreview ? `\n\n${memberPreview}` : ''
        }${members.length > 12 ? `\n+${members.length - 12} ${t('more')}` : ''
        }`,
        [
          { text: t('Group Settings'), onPress: () => showChatOptions(support) },
          { text: t('OK'), style: 'cancel' },
        ],
        { cancelable: true },
      );
      return;
    }

    const peer =
      support.conversationType === 'direct'
        ? (support.groupMembers || []).find(
          (member: any) => String(member.userId) !== String(userId),
        )
        : null;
    Alert.alert(
      getSupportDisplayName(support),
      [peer?.userEmpCode, peer?.designation, t('Online')]
        .filter(Boolean)
        .join('\n'),
      [
        { text: t('Chat Options'), onPress: () => showChatOptions(support) },
        { text: t('OK'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const getSupportDisplayName = (support: any) => {
    if (support?.conversationType === 'group') {
      return formatName(support?.groupName) || t('Group Chat');
    }
    if (support?.conversationType === 'direct') {
      const peer = (support.groupMembers || []).find(
        (member: any) => String(member.userId) !== String(userId),
      );
      return (
        formatName(peer?.userName) || formatName(support?.userName) || t('User')
      );
    }
    if (isSupportAgent) {
      return (
        formatName(support?.userName) ||
        support?.userEmpCode ||
        t('Unknown User')
      );
    }
    const supportMessages = getThreadMessages(support);
    const latestAgentMessage = [...supportMessages]
      .reverse()
      .find(
        (item: any) =>
          item?.senderRole && item.senderRole !== 'user' && item?.senderName,
      );
    return (
      formatName(
        support?.assignedName ||
        support?.assignedUserName ||
        support?.assignedToName ||
        support?.supportName ||
        support?.agentName ||
        latestAgentMessage?.senderName,
      ) || t('HR')
    );
  };

  const getSupportInitials = (support: any) => {
    const displayName = getSupportDisplayName(support);
    const parts = String(displayName || 'HR')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return parts.length > 1
      ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      : String(displayName || 'HR')
        .slice(0, 2)
        .toUpperCase();
  };

  const getImageUri = (image?: string) => {
    if (!image) {
      return '';
    }
    const value = String(image);
    if (
      value.startsWith('data:') ||
      /^(file|content|https?):\/\//.test(value)
    ) {
      return value;
    }
    return `data:image/jpeg;base64,${value}`;
  };

  const getEmployeeByUserId = (targetUserId?: string) =>
    employeeList.find(
      (employee: any) => String(employee.userId) === String(targetUserId),
    );

  const getSupportAvatarImage = (support: any) => {
    if (!support) {
      return '';
    }
    if (support.conversationType === 'group') {
      return support.groupImage || '';
    }
    const peer =
      support.conversationType === 'direct'
        ? (support.groupMembers || []).find(
          (member: any) => String(member.userId) !== String(userId),
        )
        : null;
    return (
      peer?.profileImage ||
      getEmployeeByUserId(peer?.userId || support.userId)?.profileImage ||
      support.profileImage ||
      support.userImage ||
      ''
    );
  };

  const isSameCalendarDay = (firstDate: Date, secondDate: Date) =>
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate();

  const formatThreadTimestamp = (value?: string | number | Date) => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (isSameCalendarDay(date, today)) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (isSameCalendarDay(date, yesterday)) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const getMessageDateLabel = (value?: string | number | Date) => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (isSameCalendarDay(date, today)) {
      return t('Today');
    }
    if (isSameCalendarDay(date, yesterday)) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderAvatar = (options: {
    image?: string;
    initials: string;
    size: 'header' | 'list';
    selected?: boolean;
  }) => {
    const uri = getImageUri(options.image);
    const wrapStyle =
      options.size === 'header' ? styles.whatsappAvatar : styles.chatListAvatar;
    const imageStyle =
      options.size === 'header'
        ? styles.whatsappAvatarImage
        : styles.chatListAvatarImage;
    const textStyle =
      options.size === 'header'
        ? styles.whatsappAvatarText
        : styles.chatListAvatarText;
    return (
      <View
        style={[wrapStyle, options.selected && styles.chatListAvatarSelected]}>
        {uri ? (
          <Image source={{ uri }} style={imageStyle} resizeMode="cover" />
        ) : (
          <Text style={textStyle}>{options.initials}</Text>
        )}
        {options.selected && (
          <View style={styles.avatarSelectedBadge}>
            <Text style={styles.avatarSelectedText}>✓</Text>
          </View>
        )}
        {options.size === 'header' && <View style={styles.whatsappOnlineDot} />}
      </View>
    );
  };

  const renderCallOverlay = () => {
    if (!callSession) {
      return null;
    }

    const isIncoming =
      callSession.direction === 'incoming' && callSession.status === 'incoming';
    const isVideo = callSession.callType.includes('video');
    const isGroup = callSession.callType.includes('group');
    const isConnected = callSession.status === 'connected';
    const avatarUri = getImageUri(callSession.threadAvatar);
    const initials = String(
      callSession.threadName || callSession.callerName || 'CA',
    )
      .slice(0, 2)
      .toUpperCase();
    const durationText = `${String(Math.floor(callDurationSeconds / 60)).padStart(2, '0')}:${String(callDurationSeconds % 60).padStart(2, '0')}`;
    const statusText =
      callSession.status === 'connected'
        ? durationText
        : callSession.status === 'rejected'
          ? t('Call rejected')
          : callSession.status === 'ended'
            ? t('Call ended')
            : isIncoming
              ? t('Incoming Call')
              : t('Ringing');
    const callPartyName =
      callSession.threadName || callSession.callerName || t('Crewcam Call');
    const primaryVideoStream =
      isVideo && isConnected
        ? isLocalVideoPrimary
          ? localCallStream || remoteCallStream
          : remoteCallStream || localCallStream
        : null;
    const secondaryVideoStream =
      isVideo && isConnected
        ? isLocalVideoPrimary
          ? remoteCallStream
          : localCallStream
        : null;
    const primaryIsLocal = !!primaryVideoStream && primaryVideoStream === localCallStream;
    const secondaryIsLocal =
      !!secondaryVideoStream && secondaryVideoStream === localCallStream;
    const canSwapVideo = !!localCallStream && !!remoteCallStream;

    const renderControlButton = (
      icon: IconProp,
      label: string,
      onPress: () => void,
      active = false,
    ) => (
      <TouchableOpacity
        style={[styles.callControlButton, active && styles.callControlButtonActive]}
        onPress={onPress}>
        <FontAwesomeIcon icon={icon} size={18} color="#ffffff" />
        <Text style={styles.callControlLabel} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    );

    const renderVideoPlaceholder = (small = false) => (
      <View
        style={
          small
            ? styles.callVideoPlaceholderSmall
            : styles.callVideoPlaceholder
        }>
        <FontAwesomeIcon
          icon={isCallCameraOff && small ? faVideoSlash : faVideo}
          size={small ? 18 : 34}
          color="#ffffff"
        />
        {!small && (
          <Text style={styles.callStageText}>
            {isCallCameraOff && primaryIsLocal
              ? t('Camera off')
              : t('Waiting for video')}
          </Text>
        )}
      </View>
    );

    return (
      <View style={styles.callOverlay}>
        <View style={styles.callPanel}>
          {isVideo && isConnected ? (
            <View style={styles.fullVideoStage}>
              {primaryVideoStream && !(primaryIsLocal && isCallCameraOff) ? (
                <RTCView
                  streamURL={primaryVideoStream.toURL()}
                  style={styles.remoteVideo}
                  objectFit="cover"
                  mirror={primaryIsLocal}
                />
              ) : (
                renderVideoPlaceholder()
              )}
              <View style={styles.callTopOverlay}>
                <Text style={styles.callName} numberOfLines={1}>
                  {callPartyName}
                </Text>
                <Text style={styles.callKind} numberOfLines={1}>
                  {isGroup ? `${t('Group Call')} • ` : ''}
                  {t('Video Call')} • {statusText}
                </Text>
              </View>
              {secondaryVideoStream && (
                <Pressable
                  style={styles.localVideo}
                  onPress={() =>
                    canSwapVideo && setIsLocalVideoPrimary(prev => !prev)
                  }>
                  {secondaryIsLocal && isCallCameraOff ? (
                    renderVideoPlaceholder(true)
                  ) : (
                    <RTCView
                      streamURL={secondaryVideoStream.toURL()}
                      style={styles.localVideoStream}
                      objectFit="cover"
                      mirror={secondaryIsLocal}
                    />
                  )}
                  <View style={styles.localVideoLabel}>
                    <Text style={styles.localVideoLabelText}>
                      {secondaryIsLocal ? t('You') : callPartyName}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.callIdentity}>
              <View
                style={[
                  styles.callTypeIcon,
                  isVideo && styles.callTypeIconVideo,
                ]}>
                <FontAwesomeIcon
                  icon={isVideo ? faVideo : faPhone}
                  size={20}
                  color="#ffffff"
                />
              </View>
            <View style={styles.callAvatar}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.callAvatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.callAvatarText}>{initials}</Text>
              )}
            </View>
            <View style={styles.callTextWrap}>
              <Text style={styles.callName} numberOfLines={1}>
                {callPartyName}
              </Text>
              <Text style={styles.callKind} numberOfLines={1}>
                {isGroup ? `${t('Group Call')} • ` : ''}
                {isVideo ? t('Video Call') : t('Audio Call')}
              </Text>
              <Text style={styles.callStatus}>
                {statusText}
              </Text>
            </View>
            </View>
          )}

          <View style={styles.callBottomOverlay}>
            {isIncoming ? (
              <View style={styles.incomingCallActions}>
              <View style={styles.callActionItem}>
                <TouchableOpacity
                  style={[styles.callRoundButton, styles.callRejectButton]}
                  onPress={rejectCall}>
                  <FontAwesomeIcon icon={faXmark} size={18} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.callActionLabel}>{t('Decline')}</Text>
              </View>
              <View style={styles.callActionItem}>
                <TouchableOpacity
                  style={[styles.callRoundButton, styles.callAcceptButton]}
                  onPress={acceptCall}>
                  <FontAwesomeIcon
                    icon={isVideo ? faVideo : faPhone}
                    size={17}
                    color="#ffffff"
                  />
                </TouchableOpacity>
                <Text style={styles.callActionLabel}>{t('Accept')}</Text>
              </View>
              </View>
            ) : (
              <>
                {isConnected && (
                <View style={styles.callControlsGrid}>
                  {renderControlButton(
                    isCallMuted ? faMicrophoneSlash : faMicrophone,
                    isCallMuted ? t('Unmute') : t('Mute'),
                    toggleCallMute,
                    isCallMuted,
                  )}
                  {renderControlButton(
                    isCallSpeakerOn ? faVolumeHigh : faVolumeXmark,
                    t('Speaker'),
                    toggleCallSpeaker,
                    isCallSpeakerOn,
                  )}
                  {isVideo
                    ? renderControlButton(
                      isCallCameraOff ? faVideoSlash : faVideo,
                      isCallCameraOff ? t('Camera on') : t('Camera off'),
                      toggleCallCamera,
                      isCallCameraOff,
                    )
                    : renderControlButton(
                      faVideo,
                      t('Video'),
                      switchCurrentCallToVideo,
                    )}
                </View>
                )}
                <View style={styles.callActionRow}>
                <TouchableOpacity
                  style={[styles.callRoundButton, styles.callRejectButton]}
                  onPress={endCall}>
                  <FontAwesomeIcon icon={faPhoneSlash} size={17} color="#ffffff" />
                </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  const getAttachmentUri = (item: any) => {
    if (!item?.attachment) {
      return '';
    }
    if (String(item.attachment).startsWith('data:')) {
      return item.attachment;
    }
    if (/^(file|content|https?):\/\//.test(String(item.attachment))) {
      return item.attachment;
    }
    const type = item.attachmentType || 'image/jpeg';
    return `data:${type};base64,${item.attachment}`;
  };

  const renderAttachmentPreview = (item: any, mine: boolean) => {
    const uri = getAttachmentUri(item);
    if (!uri) {
      return null;
    }
    const type = item.attachmentType || '';
    if (type.startsWith('image/') || !type) {
      return (
        <Image
          source={{ uri }}
          style={styles.whatsappAttachmentImage}
          resizeMode="cover"
        />
      );
    }
    return (
      <View style={[styles.filePreview, mine && styles.filePreviewMine]}>
        <Text style={styles.filePreviewText} numberOfLines={1}>
          {item.attachmentName || 'Attachment'}
        </Text>
      </View>
    );
  };

  const renderMessageStatus = (item: any) => {
    const status = getMessageStatus(item);
    if (status === 'sent') {
      return <FontAwesomeIcon icon={faCheck} size={11} color={WA_TEXT_SUB} />;
    } else if (status === 'delivered') {
      return (
        <FontAwesomeIcon icon={faCheckDouble} size={11} color={WA_TEXT_SUB} />
      );
    } else {
      return (
        <FontAwesomeIcon icon={faCheckDouble} size={11} color={WA_TICK_BLUE} />
      );
    }
  };

  const renderWhatsAppMessages = (support: any, mineRole: 'user' | 'agent') => {
    const visibleThreadMessages = getVisibleThreadMessages(support);

    return (
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        onLayout={() => scrollChatToBottom(false)}
        onContentSizeChange={() => scrollChatToBottom(true)}
        style={styles.whatsappMessagesList}
        contentContainerStyle={[
          styles.whatsappMessagesContent,
          { paddingBottom: composerHeight + keyboardInset + 12 },
        ]}>
        {visibleThreadMessages.map((item: any, index: number) => {
          const mine = item.senderId
            ? String(item.senderId) === String(userId)
            : mineRole === 'user'
              ? item.senderRole === 'user'
              : item.senderRole !== 'user';
          const messageId = getMessageId(item, index);
          const isStarred =
            starredMessageIds.has(messageId) ||
            item.starredBy?.map(String).includes(String(userId));
          const senderLabel = mine
            ? t('You')
            : mineRole === 'user'
              ? formatName(item.senderName) || getSupportDisplayName(support)
              : formatName(support?.userName) || t('User');
          const dateLabel = getMessageDateLabel(item.createdAt);
          const previousItem = visibleThreadMessages[index - 1];
          const previousDateLabel = getMessageDateLabel(
            previousItem?.createdAt,
          );
          const showDateChip = !!dateLabel && dateLabel !== previousDateLabel;

          return (
            <React.Fragment
              key={`${item._id || item.createdAt || index}-${index}`}>
              {showDateChip && (
                <View style={styles.messageDateChipWrap}>
                  <Text style={styles.messageDateChipText}>{dateLabel}</Text>
                </View>
              )}
              <View
                style={[
                  styles.whatsappBubbleRow,
                  mine
                    ? styles.whatsappBubbleRowMine
                    : styles.whatsappBubbleRowOther,
                ]}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onLongPress={() => showMessageOptions(item, mine, index)}
                  onPress={() => showReactionOptions(item)}
                  style={[
                    styles.whatsappBubble,
                    mine
                      ? styles.whatsappBubbleMine
                      : styles.whatsappBubbleOther,
                  ]}>
                  {!mine && (
                    <Text style={styles.whatsappSenderLabel}>
                      {senderLabel}
                    </Text>
                  )}
                  {!!item.replyToMessageId && (
                    <Text style={styles.replyPreviewText} numberOfLines={1}>
                      {t('Reply')} #{String(item.replyToMessageId).slice(-5)}
                    </Text>
                  )}
                  {!!item.forwardedFrom && (
                    <Text style={styles.forwardedText}>{t('Forwarded')}</Text>
                  )}
                  {renderAttachmentPreview(item, mine)}
                  {!!item.message && (
                    <Text
                      style={[
                        styles.whatsappMessageText,
                        item.deletedAt && styles.deletedMessageText,
                      ]}>
                      {item.message}
                    </Text>
                  )}
                  {Array.isArray(item.reactions) &&
                    item.reactions.length > 0 && (
                      <View style={styles.reactionRow}>
                        {item.reactions
                          .slice(0, 4)
                          .map((reaction: any, reactionIndex: number) => (
                            <Text
                              key={`${reaction.emoji}-${reactionIndex}`}
                              style={styles.reactionText}>
                              {reaction.emoji}
                            </Text>
                          ))}
                      </View>
                    )}
                  <View style={styles.whatsappMetaRow}>
                    {isStarred && (
                      <FontAwesomeIcon
                        icon={faStar}
                        size={10}
                        color="#f59e0b"
                      />
                    )}
                    {!!item.editedAt && (
                      <Text style={styles.whatsappTime}>{t('edited')}</Text>
                    )}
                    <Text style={styles.whatsappTime}>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        : ''}
                    </Text>
                    {mine && renderMessageStatus(item)}
                  </View>
                </TouchableOpacity>
              </View>
            </React.Fragment>
          );
        })}
      </ScrollView>
    );
  };

  const renderWhatsAppComposer = () => {
    const hasContent = !!chatMessage.trim() || !!attachment;
    return (
      <View
        onLayout={event =>
          setComposerHeight(Math.max(60, event.nativeEvent.layout.height))
        }
        style={[styles.whatsappComposerWrap, { bottom: keyboardInset }]}>
        {(replyingTo || editingMessage || forwardingMessage) && (
          <View style={styles.contextPreviewBar}>
            <View style={styles.contextPreviewTextWrap}>
              <Text style={styles.contextPreviewTitle}>
                {editingMessage
                  ? t('Edit Message')
                  : forwardingMessage
                    ? t('Forward Message')
                    : t('Reply')}
              </Text>
              <Text style={styles.contextPreviewBody} numberOfLines={1}>
                {(editingMessage || forwardingMessage || replyingTo)?.message ||
                  (editingMessage || forwardingMessage || replyingTo)
                    ?.attachmentName ||
                  t('Attachment')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setReplyingTo(null);
                setEditingMessage(null);
                setForwardingMessage(null);
              }}>
              <FontAwesomeIcon icon={faXmark} size={16} color="#54656f" />
            </TouchableOpacity>
          </View>
        )}
        {attachment && (
          <View style={styles.whatsappAttachmentChip}>
            <Text style={styles.whatsappAttachmentChipText} numberOfLines={1}>
              {attachment.fileName || t('Attachment selected')}
            </Text>
            <TouchableOpacity onPress={() => setAttachment(null)}>
              <Text style={styles.whatsappAttachmentRemove}>×</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.whatsappComposer}>
          <View style={styles.whatsappInputContainer}>
            <TouchableOpacity
              style={styles.whatsappIconButton}
              onPress={() =>
                Alert.alert(
                  t('Emoji'),
                  t('Emoji keyboard can be wired up here.'),
                )
              }>
              <FontAwesomeIcon icon={faFaceSmile} size={20} color="#54656f" />
            </TouchableOpacity>
            <TextInput
              placeholder={t('Message')}
              placeholderTextColor="#7a6b6f"
              value={chatMessage}
              onChangeText={handleComposerTextChange}
              onFocus={handleComposerFocus}
              onContentSizeChange={() => scrollChatToBottom(true)}
              multiline
              style={styles.whatsappInput}
            />
            <TouchableOpacity
              style={styles.whatsappIconButton}
              onPress={handleAttachment}>
              <FontAwesomeIcon icon={faPaperclip} size={19} color="#54656f" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.whatsappIconButton}
              onPress={() => attachFromCamera()}>
              <FontAwesomeIcon icon={faCamera} size={20} color="#54656f" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.whatsappSendButton}
            disabled={sendingMessage}
            onPress={hasContent ? sendChatMessage : attachVoiceNote}>
            {sendingMessage ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <FontAwesomeIcon
                icon={hasContent ? faPaperPlane : faMicrophone}
                size={18}
                color="#ffffff"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getThreadPeerId = (thread: any) => {
    if (thread?.conversationType === 'direct') {
      return String(
        (thread.groupMembers || []).find(
          (member: any) => String(member.userId) !== String(userId),
        )?.userId || '',
      );
    }
    return String(thread?.userId || '');
  };

  const getInboxRows = () => {
    const rows: Array<any> = [];
    const usedPeerIds = new Set<string>();
    supportList.forEach((thread: any) => {
      const peerId = getThreadPeerId(thread);
      if (peerId) {
        usedPeerIds.add(peerId);
      }
      rows.push({ type: 'thread', key: `thread-${thread._id}`, thread });
    });
    employeeList.forEach((employee: any) => {
      if (!usedPeerIds.has(String(employee.userId))) {
        rows.push({
          type: 'employee',
          key: `employee-${employee.userId}`,
          employee,
        });
      }
    });

    const search = chatSearch.trim().toLowerCase();
    return rows
      .filter(row => {
        if (row.type === 'thread') {
          const item = row.thread;
          const isArchived =
            archivedChatIds.has(item._id) ||
            item.archivedBy?.map(String).includes(String(userId));
          if (showArchivedChats !== isArchived) {
            return false;
          }
          if (chatFilter === 'groups' && item.conversationType !== 'group') {
            return false;
          }
          if (chatFilter === 'favorites') {
            const hasFavoriteMessage =
              Array.isArray(item.messages) &&
              item.messages.some((msg: any, index: number) => {
                const messageId = getMessageId(msg, index);
                return (
                  starredMessageIds.has(messageId) ||
                  msg.starredBy?.map(String).includes(String(userId))
                );
              });
            if (!hasFavoriteMessage) {
              return false;
            }
          }
          if (chatFilter === 'unread') {
            const unread =
              Array.isArray(item.messages) &&
              item.messages.some((msg: any) => isMessageUnreadForMe(msg));
            if (!unread) {
              return false;
            }
          }
          if (!search) {
            return true;
          }
          return [
            getSupportDisplayName(item),
            item.userEmpCode,
            item.queryType,
            item.message,
            ...(Array.isArray(item.messages)
              ? item.messages.map((msg: any) => msg.message || msg.text || '')
              : []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(search);
        }
        if (showArchivedChats) {
          return false;
        }
        if (chatFilter !== 'all') {
          return false;
        }
        if (!search) {
          return true;
        }
        return [
          row.employee.userName,
          row.employee.userEmpCode,
          row.employee.designation,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'thread' ? -1 : 1;
        }
        if (a.type === 'thread' && b.type === 'thread') {
          const aPinned =
            pinnedChatIds.has(a.thread._id) ||
            a.thread.pinnedBy?.map(String).includes(String(userId));
          const bPinned =
            pinnedChatIds.has(b.thread._id) ||
            b.thread.pinnedBy?.map(String).includes(String(userId));
          if (aPinned !== bPinned) {
            return aPinned ? -1 : 1;
          }
          return (
            new Date(b.thread.updatedAt || 0).getTime() -
            new Date(a.thread.updatedAt || 0).getTime()
          );
        }
        return String(a.employee.userName).localeCompare(
          String(b.employee.userName),
        );
      });
  };

  const handleInboxRowPress = (row: any) => {
    if (selectionMode) {
      const selectable =
        row.type === 'thread'
          ? getSelectableUserFromThread(row.thread)
          : row.employee;
      if (selectable) {
        toggleSelectedUser(selectable);
      }
      return;
    }
    if (row.type === 'thread') {
      openChat(row.thread);
    } else {
      openDirectChat(row.employee);
    }
  };

  const runInboxMenuAction = (action: () => void) => {
    setShowInboxMenu(false);
    action();
  };

  // FIXED: Inbox Menu with proper close on outside click
  const renderInboxMenu = () => {
    if (!showInboxMenu) {
      return null;
    }

    const menuItems = [
      { label: 'New group', action: () => startSelectionMode('group') },
      { label: 'Broadcast', action: () => startSelectionMode('broadcast') },
      {
        label: 'Archived Chats',
        action: () => setShowArchivedChats(prev => !prev),
      },
      {
        label: 'Status',
        action: () =>
          Alert.alert(
            t('Status'),
            t('Status/Stories screen is ready to connect with media upload.'),
          ),
      },
      {
        label: 'Poll',
        action: () =>
          Alert.alert(
            t('Polls'),
            t('Open a group chat and send poll options as a message.'),
          ),
      },
      { label: 'Close', action: () => undefined },
    ];

    return (
      <Pressable
        style={styles.inboxMenuDismissLayer}
        onPress={() => setShowInboxMenu(false)}
        onTouchStart={() => setShowInboxMenu(false)}>
        <Pressable
          style={styles.inboxMenuCard}
          onPress={() => undefined}
          onTouchStart={(e) => e.stopPropagation()}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.inboxMenuItem}
              onPress={() => runInboxMenuAction(item.action)}>
              <Text style={styles.inboxMenuText}>{t(item.label)}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    );
  };

  // FIXED: Chat Header Menu with proper close on outside click
  const renderChatHeaderMenu = () => {
    if (!showChatHeaderMenu) {
      return null;
    }
    const menuItems = [
      {
        label: 'View Contact',
        action: () => showThreadInfo(activeSupport),
      },
      {
        label: 'Search',
        action: () => setShowMessageSearch(prev => !prev),
      },
      {
        label: 'Audio Call',
        action: () =>
          startCall(
            activeSupport?.conversationType === 'group'
              ? 'group_audio'
              : 'audio',
          ),
      },
      {
        label: 'Video Call',
        action: () =>
          startCall(
            activeSupport?.conversationType === 'group'
              ? 'group_video'
              : 'video',
          ),
      },
      {
        label: 'Chat Options',
        action: () => showChatOptions(activeSupport),
      },
      { label: 'Close', action: () => undefined },
    ];
    return (
      <Pressable
        style={styles.inboxMenuDismissLayer}
        onPress={() => setShowChatHeaderMenu(false)}
        onTouchStart={() => setShowChatHeaderMenu(false)}>
        <Pressable
          style={styles.chatHeaderMenuCard}
          onPress={() => undefined}
          onTouchStart={(e) => e.stopPropagation()}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.inboxMenuItem}
              onPress={() => {
                setShowChatHeaderMenu(false);
                item.action();
              }}>
              <Text style={styles.inboxMenuText}>{t(item.label)}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    );
  };

  // FIXED: New Chat Panel with proper close on outside click
  const renderNewChatPanel = () => {
    if (!showNewChatPanel) {
      return null;
    }

    return (
      <Pressable
        style={styles.newChatOverlay}
        onPress={closeNewChatPanel}
        onTouchStart={closeNewChatPanel}>
        <Pressable
          style={styles.newChatPanel}
          onPress={() => undefined}
          onTouchStart={(e) => e.stopPropagation()}>
          <View style={styles.newChatHeader}>
            <Text style={styles.newChatTitle}>{t('New Chat')}</Text>
            <TouchableOpacity
              style={styles.newChatClose}
              onPress={closeNewChatPanel}>
              <FontAwesomeIcon icon={faXmark} size={16} color="#111b21" />
            </TouchableOpacity>
          </View>

          <View style={styles.newChatSearchBox}>
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              size={15}
              color="#667781"
            />
            <TextInput
              value={newChatSearch}
              onChangeText={setNewChatSearch}
              placeholder={t('Search name or employee code')}
              placeholderTextColor="#8696a0"
              style={styles.newChatInput}
            />
          </View>

          <View style={styles.newNumberRow}>
            <View style={styles.newNumberInputWrap}>
              <FontAwesomeIcon icon={faPhone} size={14} color="#667781" />
              <TextInput
                value={newChatNumber}
                onChangeText={setNewChatNumber}
                placeholder={t('Enter new number')}
                placeholderTextColor="#8696a0"
                keyboardType="phone-pad"
                style={styles.newChatInput}
              />
            </View>
            <TouchableOpacity
              style={styles.newNumberButton}
              onPress={openNewChatWithNumber}>
              <FontAwesomeIcon icon={faPlus} size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.newChatList}
            keyboardShouldPersistTaps="handled">
            {getNewChatMatches().map((employee: any) => (
              <TouchableOpacity
                key={employee.userId}
                style={styles.newChatUserRow}
                activeOpacity={0.75}
                onPress={() => openNewChatWithEmployee(employee)}>
                {renderAvatar({
                  image: employee.profileImage,
                  initials: String(
                    employee.userName || employee.userEmpCode || 'U',
                  )
                    .charAt(0)
                    .toUpperCase(),
                  size: 'list',
                })}
                <View style={styles.newChatUserInfo}>
                  <Text style={styles.newChatUserName} numberOfLines={1}>
                    {formatName(employee.userName) || employee.userEmpCode}
                  </Text>
                  <Text style={styles.newChatUserSub} numberOfLines={1}>
                    {[
                      employee.userEmpCode,
                      employee.mobileNumber,
                      employee.designation,
                    ]
                      .filter(Boolean)
                      .join(' • ') || t('Tap to chat')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    );
  };

  // Status UI is kept for the WhatsApp-style status viewer flow.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderStatusList = () => {
    return (
      <View style={styles.statusSectionContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusListContent}>
          {/* My Status */}
          <TouchableOpacity
            style={styles.statusItem}
            onPress={
              myStatuses.length > 0
                ? () =>
                  setActiveStatusViewer({
                    user: {
                      userId: 'me',
                      userName: t('My Status'),
                      statuses: myStatuses,
                    },
                    initialIndex: 0,
                  })
                : handleAddStatus
            }>
            <View style={styles.myStatusAvatarContainer}>
              {(userData as any).profileImage ? (
                <Image
                  source={{ uri: getImageUri((userData as any).profileImage) }}
                  style={styles.statusAvatarImage}
                />
              ) : (
                <View style={styles.statusAvatarFallback}>
                  <Text style={styles.statusAvatarText}>
                    {String(userData.firstname || 'U').charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.addStatusIconContainer}>
                <FontAwesomeIcon icon={faPlus} size={10} color="#ffffff" />
              </View>
            </View>
            <Text style={styles.statusItemText} numberOfLines={1}>
              {t('My Status')}
            </Text>
          </TouchableOpacity>

          {/* Other Statuses */}
          {statusList.map(userStatus => (
            <TouchableOpacity
              key={userStatus.userId}
              style={styles.statusItem}
              onPress={() =>
                setActiveStatusViewer({ user: userStatus, initialIndex: 0 })
              }>
              <View
                style={[
                  styles.statusAvatarContainer,
                  userStatus.hasUnseen
                    ? styles.statusAvatarUnseen
                    : styles.statusAvatarSeen,
                ]}>
                {userStatus.profileImage ? (
                  <Image
                    source={{ uri: getImageUri(userStatus.profileImage) }}
                    style={styles.statusAvatarImage}
                  />
                ) : (
                  <View style={styles.statusAvatarFallback}>
                    <Text style={styles.statusAvatarText}>
                      {String(userStatus.userName || 'U').charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.statusItemText} numberOfLines={1}>
                {formatName(userStatus.userName)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderInbox = () => (
    <View style={styles.chatKeyboardView}>
      <View style={styles.whatsappScreen}>
        <View style={styles.inboxHeader}>
          <View style={styles.inboxActionRow}>
            {showArchivedChats ? (
              <TouchableOpacity
                style={styles.inboxBackRow}
                onPress={() => setShowArchivedChats(false)}>
                <FontAwesomeIcon
                  icon={faChevronLeft}
                  size={20}
                  color="#ffffff"
                />
                <Text style={styles.inboxTitle}>{t('Archived')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.inboxTitleWrap}>
                <Text style={styles.inboxTitle}>
                  {selectionMode
                    ? t(selectionMode === 'group' ? 'New Group' : 'Broadcast')
                    : 'Crewcam'}
                </Text>
              </View>
            )}
            {!showArchivedChats && (
              <View style={styles.inboxHeaderActions}>
                <TouchableOpacity
                  style={styles.inboxPlainIcon}
                  onPress={() =>
                    Alert.alert(
                      t('Camera'),
                      t('Open a chat and tap attachment to capture media.'),
                    )
                  }>
                  <FontAwesomeIcon icon={faCamera} size={19} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inboxPlainIcon}
                  onPress={() => setShowInboxMenu(prev => !prev)}>
                  <FontAwesomeIcon
                    icon={faEllipsisVertical}
                    size={19}
                    color="#ffffff"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <View style={styles.chatListToolbarInline}>
          <View style={styles.chatListSearch}>
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              size={16}
              color="#54656f"
            />
            <TextInput
              value={chatSearch}
              onChangeText={setChatSearch}
              placeholder={t('Search...')}
              placeholderTextColor="#8696a0"
              style={styles.chatListSearchInputLight}
            />
          </View>
        </View>
        {!showArchivedChats && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chatFilterChips}
            contentContainerStyle={styles.chatFilterChipsContent}>
            {[
              { id: 'all', label: 'All' },
              {
                id: 'unread',
                label: 'Unread',
                count: supportList.reduce(
                  (total: number, thread: any) =>
                    total +
                    (Array.isArray(thread.messages)
                      ? thread.messages.filter((msg: any) =>
                        isMessageUnreadForMe(msg),
                      ).length
                      : 0),
                  0,
                ),
              },
              { id: 'favorites', label: 'Favourites' },
              { id: 'groups', label: 'Groups' },
            ].map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.chatFilterChip,
                  chatFilter === filter.id && styles.chatFilterChipActive,
                ]}
                onPress={() =>
                  setChatFilter(
                    filter.id as 'all' | 'unread' | 'favorites' | 'groups',
                  )
                }>
                <Text
                  style={[
                    styles.chatFilterChipText,
                    chatFilter === filter.id && styles.chatFilterChipTextActive,
                  ]}>
                  {t(filter.label)}
                  {'count' in filter && filter.count ? ` ${filter.count}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.chatFilterAddChip}
              activeOpacity={0.78}
              onPress={() => setShowNewChatPanel(true)}
              onLongPress={() => startSelectionMode('group')}>
              <FontAwesomeIcon icon={faPlus} size={14} color="#54656f" />
            </TouchableOpacity>
          </ScrollView>
        )}
        {selectionMode && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>
              {selectedUserIds.size} {t('selected')}
            </Text>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={completeSelectionAction}>
              <FontAwesomeIcon
                icon={selectionMode === 'broadcast' ? faShareNodes : faPlus}
                size={13}
                color="#ffffff"
              />
              <Text style={styles.selectionButtonText}>
                {t(
                  selectionMode === 'broadcast'
                    ? 'Create Broadcast'
                    : 'Create Group',
                )}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionCancel}
              onPress={cancelSelectionMode}>
              <FontAwesomeIcon icon={faXmark} size={13} color="#075e54" />
            </TouchableOpacity>
          </View>
        )}
        <ScrollView
          style={styles.inboxList}
          contentContainerStyle={styles.inboxListContent}>
          {getInboxRows().map(row => {
            const item = row.type === 'thread' ? row.thread : row.employee;
            const selectable =
              row.type === 'thread' ? getSelectableUserFromThread(item) : item;
            const msgs =
              row.type === 'thread' && Array.isArray(item.messages)
                ? item.messages
                : [];
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const displayName =
              row.type === 'thread'
                ? getSupportDisplayName(item)
                : formatName(item.userName) || t('User');
            const initial = String(displayName || 'U')
              .charAt(0)
              .toUpperCase();
            const avatarImage =
              row.type === 'thread'
                ? getSupportAvatarImage(item)
                : item.profileImage;
            const selected =
              !!selectable?.userId && selectedUserIds.has(selectable.userId);
            const isPinned =
              row.type === 'thread' &&
              (pinnedChatIds.has(item._id) ||
                item.pinnedBy?.map(String).includes(String(userId)));
            const isMuted =
              row.type === 'thread' &&
              (mutedChatIds.has(item._id) ||
                item.mutedBy?.map(String).includes(String(userId)));
            const unreadCount =
              row.type === 'thread'
                ? msgs.filter((msg: any) => isMessageUnreadForMe(msg)).length
                : 0;
            const threadTimestamp =
              lastMsg?.createdAt || item.updatedAt || item.createdAt;

            const isLastMessageMine =
              lastMsg && String(lastMsg.senderId) === String(userId);
            const lastMessageStatus = isLastMessageMine
              ? getMessageStatus(lastMsg)
              : null;

            return (
              <TouchableOpacity
                key={row.key}
                style={[styles.inboxRow, selected && styles.inboxRowSelected]}
                onPress={() => handleInboxRowPress(row)}
                onLongPress={() =>
                  !selectionMode &&
                  row.type === 'thread' &&
                  showChatOptions(item)
                }
                activeOpacity={0.72}>
                {renderAvatar({
                  image: avatarImage,
                  initials: initial,
                  size: 'list',
                  selected,
                })}
                <View style={styles.chatListInfo}>
                  <View style={styles.chatListTopRow}>
                    <Text style={styles.chatListNameDark} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text
                      style={[
                        styles.chatListTimeDark,
                        unreadCount > 0 && styles.chatListTimeUnread,
                      ]}>
                      {threadTimestamp
                        ? formatThreadTimestamp(threadTimestamp)
                        : row.type === 'employee'
                          ? t('Tap to chat')
                          : ''}
                    </Text>
                  </View>
                  <View style={styles.chatListBottomRow}>
                    <View style={styles.chatListPreviewContainer}>
                      {isLastMessageMine && (
                        <View style={styles.statusIconContainer}>
                          {lastMessageStatus === 'sent' && (
                            <FontAwesomeIcon
                              icon={faCheck}
                              size={11}
                              color={WA_TEXT_SUB}
                            />
                          )}
                          {lastMessageStatus === 'delivered' && (
                            <FontAwesomeIcon
                              icon={faCheckDouble}
                              size={11}
                              color={WA_TEXT_SUB}
                            />
                          )}
                          {lastMessageStatus === 'read' && (
                            <FontAwesomeIcon
                              icon={faCheckDouble}
                              size={11}
                              color={WA_TICK_BLUE}
                            />
                          )}
                        </View>
                      )}
                      <Text
                        style={styles.chatListPreviewDark}
                        numberOfLines={1}>
                        {lastMsg?.message ||
                          item.designation ||
                          item.message ||
                          t('Start a conversation')}
                      </Text>
                    </View>
                    <View style={styles.chatListRightIcons}>
                      {isPinned && (
                        <FontAwesomeIcon
                          icon={faThumbTack}
                          size={11}
                          color="#54656f"
                        />
                      )}
                      {isMuted && (
                        <Text style={styles.chatListMiniIconDark}>M</Text>
                      )}
                      {item.conversationType === 'group' && (
                        <FontAwesomeIcon
                          icon={faUsers}
                          size={12}
                          color="#667781"
                        />
                      )}
                      {unreadCount > 0 && (
                        <View style={styles.chatListBadge}>
                          <Text style={styles.chatListBadgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {getInboxRows().length === 0 && !loading && (
            <View style={styles.emptyInbox}>
              <Text style={styles.emptyInboxText}>
                {t('No chats or users found.')}
              </Text>
            </View>
          )}
        </ScrollView>
        {!showArchivedChats && !selectionMode && (
          <TouchableOpacity
            style={styles.inboxFloatingPlus}
            activeOpacity={0.84}
            onPress={() => setShowNewChatPanel(true)}>
            <FontAwesomeIcon icon={faPlus} size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
        {renderInboxMenu()}
        {renderNewChatPanel()}
      </View>
    </View>
  );

  if (loadingOptions) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[SCREEN_BG, '#1f456f']}
          style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loaderText}>{t('Loading...')}</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const renderStatusViewer = () => {
    if (!activeStatusViewer) {
      return null;
    }
    const { user } = activeStatusViewer;
    const currentStatus = user.statuses[currentStatusIndex];

    const nextStatus = () => {
      if (currentStatusIndex < user.statuses.length - 1) {
        setCurrentStatusIndex(prev => prev + 1);
        setStatusProgress(0);
      } else {
        setActiveStatusViewer(null);
      }
    };

    const prevStatus = () => {
      if (currentStatusIndex > 0) {
        setCurrentStatusIndex(prev => prev - 1);
        setStatusProgress(0);
      }
    };

    return (
      <View style={styles.statusViewerOverlay}>
        <View style={styles.statusViewerHeader}>
          <View style={styles.statusViewerProgressContainer}>
            {user.statuses.map((_: any, idx: number) => (
              <View key={idx} style={styles.statusViewerProgressBarBg}>
                <View
                  style={[
                    styles.statusViewerProgressBarFill,
                    {
                      width:
                        idx < currentStatusIndex
                          ? '100%'
                          : idx === currentStatusIndex
                            ? `${statusProgress}%`
                            : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.statusViewerHeaderRow}>
            <TouchableOpacity
              onPress={() => setActiveStatusViewer(null)}
              style={styles.statusViewerBackButton}>
              <FontAwesomeIcon icon={faChevronLeft} size={20} color="#ffffff" />
            </TouchableOpacity>
            {user.profileImage ? (
              <Image
                source={{ uri: getImageUri(user.profileImage) }}
                style={styles.statusViewerAvatar}
              />
            ) : (
              <View style={styles.statusViewerAvatarFallback}>
                <Text style={styles.statusViewerAvatarText}>
                  {String(user.userName || 'U').charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.statusViewerUserInfo}>
              <Text style={styles.statusViewerUserName}>{user.userName}</Text>
              <Text style={styles.statusViewerTime}>{t('Just now')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setActiveStatusViewer(null)}
              style={styles.statusViewerCloseButton}>
              <FontAwesomeIcon icon={faXmark} size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <Pressable
          style={styles.statusViewerContent}
          onPress={e => {
            const { locationX } = e.nativeEvent;
            if (locationX < width / 3) {
              prevStatus();
            } else {
              nextStatus();
            }
          }}>
          {currentStatus.type === 'text' ? (
            <View
              style={[
                styles.statusViewerTextBg,
                { backgroundColor: currentStatus.color || '#4facfe' },
              ]}>
              <Text style={styles.statusViewerTextContent}>
                {currentStatus.content}
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: currentStatus.uri }}
              style={styles.statusViewerMedia}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </View>
    );
  };

  const renderChatScreen = (mineRole: 'user' | 'agent') => (
    <View style={styles.chatKeyboardView}>
      <View style={styles.whatsappScreen}>
        <View style={styles.whatsappHeader}>
          <TouchableOpacity
            style={styles.whatsappBackButton}
            onPress={closeChat}>
            <FontAwesomeIcon icon={faChevronLeft} size={21} color="#1c1c1c" />
          </TouchableOpacity>
          {renderAvatar({
            image: getSupportAvatarImage(activeSupport),
            initials: getSupportInitials(activeSupport),
            size: 'header',
          })}
          <TouchableOpacity
            style={styles.whatsappHeaderInfo}
            activeOpacity={0.75}
            onPress={() => showThreadInfo(activeSupport)}>
            <Text style={styles.whatsappHeaderTitle} numberOfLines={1}>
              {getSupportDisplayName(activeSupport)}
            </Text>
            <Text style={styles.whatsappHeaderSubtitle} numberOfLines={1}>
              {activeSupport?.conversationType === 'group'
                ? `${activeSupport?.groupMembers?.length || 0} ${t('members')}`
                : t('Business Account')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.whatsappHeaderAction}
            onPress={() =>
              startCall(
                activeSupport?.conversationType === 'group'
                  ? 'group_audio'
                  : 'audio',
              )
            }>
            <FontAwesomeIcon icon={faPhone} size={18} color="#1c1c1c" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.whatsappHeaderAction}
            onPress={() =>
              startCall(
                activeSupport?.conversationType === 'group'
                  ? 'group_video'
                  : 'video',
              )
            }>
            <FontAwesomeIcon icon={faVideo} size={17} color="#1c1c1c" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.whatsappHeaderAction}
            onPress={() => setShowChatHeaderMenu(prev => !prev)}>
            <FontAwesomeIcon
              icon={faEllipsisVertical}
              size={18}
              color="#1c1c1c"
            />
          </TouchableOpacity>
        </View>
        <View ref={chatBodyRef} style={styles.chatKeyboardBody}>
          {showMessageSearch && (
            <View style={styles.chatSearchBar}>
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                size={13}
                color="#5b4a4f"
              />
              <TextInput
                value={messageSearch}
                onChangeText={setMessageSearch}
                placeholder={t('Search messages')}
                placeholderTextColor="#5b4a4f"
                style={styles.chatSearchInput}
              />
              {messageSearch ? (
                <TouchableOpacity onPress={() => setMessageSearch('')}>
                  <FontAwesomeIcon icon={faXmark} size={13} color="#5b4a4f" />
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          {renderWhatsAppMessages(activeSupport, mineRole)}
          {renderWhatsAppComposer()}
        </View>
        {renderChatHeaderMenu()}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {!isSupportAgent ? (
        activeSupport ? (
          renderChatScreen('user')
        ) : (
          renderInbox()
        )
      ) : (
        <View style={styles.chatKeyboardView}>
          {activeSupport ? renderChatScreen('agent') : renderInbox()}
        </View>
      )}
      {renderCallOverlay()}
      {renderStatusViewer()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WA_PINK_BG,
  },
  chatKeyboardView: {
    backgroundColor: WA_PINK_BG,
    flex: 1,
    width: '100%',
  },
  chatKeyboardBody: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: '#e0e0e0',
  },
  heroCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(19,39,70,0.72)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.24)',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  heroSubTitle: {
    color: '#dbeafe',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(19,39,70,0.95)',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.24)',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    color: '#e0e0e0',
    marginBottom: 6,
    fontWeight: '500',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.22)',
    borderRadius: 6,
    backgroundColor: colors.panel,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dropdownButtonText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  dropdownArrow: {
    color: ACCENT,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    width: CARD_WIDTH,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.24)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(85,230,238,0.18)',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    color: ACCENT,
    fontSize: 20,
    fontWeight: 'bold',
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(85,230,238,0.14)',
  },
  dropdownItemText: {
    color: '#ffffff',
    fontSize: 14,
  },
  remarkInput: {
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.22)',
    borderRadius: 6,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.panel,
    color: '#ffffff',
    marginBottom: 12,
  },
  attachmentLabel: {
    fontSize: 12,
    color: '#e0e0e0',
    marginBottom: 6,
  },
  assigneeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  assigneeButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
  },
  assigneeButtonActive: {
    backgroundColor: 'rgba(85,230,238,0.18)',
    borderColor: ACCENT,
  },
  assigneeButtonText: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '800',
  },
  assigneeButtonTextActive: {
    color: ACCENT,
  },
  attachmentButton: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.22)',
    marginBottom: 6,
  },
  attachmentIcon: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '800',
  },
  attachmentSuccessText: {
    color: ACCENT,
    marginBottom: 12,
    fontSize: 11,
    fontWeight: 'bold',
  },
  sendButton: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  sendText: {
    color: SCREEN_BG,
    fontWeight: 'bold',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  successMessage: {
    marginBottom: 12,
    padding: 10,
    width: CARD_WIDTH,
    backgroundColor: 'rgba(85,230,238,0.14)',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ACCENT,
  },
  successText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '500',
  },
  listContainer: {
    width: CARD_WIDTH,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  historyCard: {
    backgroundColor: 'rgba(19,39,70,0.95)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.22)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardType: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  statusResolvedBadge: {
    backgroundColor: 'rgba(85,230,238,0.18)',
  },
  statusPendingBadge: {
    backgroundColor: '#FFC10730',
  },
  statusInProgressBadge: {
    backgroundColor: 'rgba(85,230,238,0.18)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardMessage: {
    fontSize: 12,
    color: '#e0e0e0',
    marginBottom: 8,
    lineHeight: 16,
  },
  requesterText: {
    fontSize: 11,
    color: ACCENT,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  attachmentIndicator: {
    fontSize: 10,
    color: ACCENT,
  },
  cardDate: {
    fontSize: 10,
    color: '#999',
  },
  chatButton: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(85,230,238,0.12)',
  },
  chatButtonText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '900',
  },
  emptyChatCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(19,39,70,0.78)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.18)',
    alignItems: 'center',
  },
  emptyChatText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
  },
  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 8, 18, 0.65)',
    justifyContent: 'flex-end',
  },
  chatModal: {
    height: '82%',
    backgroundColor: '#091b33',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.28)',
    overflow: 'hidden',
  },
  agentChatScreen: {
    flex: 1,
    backgroundColor: '#091b33',
  },
  chatHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(85,230,238,0.18)',
  },
  chatHeaderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  chatTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  chatSubtitle: {
    color: '#dbeafe',
    fontSize: 12,
    marginTop: 3,
    fontWeight: '700',
  },
  chatClose: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '900',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 8,
    gap: 4,
  },
  messageBubble: {
    maxWidth: '84%',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  userMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(85,230,238,0.16)',
    borderColor: 'rgba(85,230,238,0.34)',
  },
  assignedMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  messageSender: {
    color: ACCENT,
    fontFamily: WA_FONT_FAMILY,
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 1,
  },
  messageText: {
    color: '#ffffff',
    fontFamily: WA_FONT_FAMILY,
    fontSize: 12,
    lineHeight: 15,
  },
  messageTime: {
    color: '#9ca3af',
    fontFamily: WA_FONT_FAMILY,
    fontSize: 8,
  },
  chatComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(85,230,238,0.18)',
    backgroundColor: 'rgba(19,39,70,0.96)',
  },
  chatInput: {
    flex: 1,
    maxHeight: 96,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.24)',
    color: '#ffffff',
    backgroundColor: colors.panel,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  chatSendButton: {
    minWidth: 62,
    height: 42,
    borderRadius: 21,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonDisabled: {
    opacity: 0.55,
  },
  chatSendText: {
    color: SCREEN_BG,
    fontSize: 13,
    fontWeight: '900',
  },
  chatListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(19,39,70,0.85)',
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.14)',
  },
  chatListAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#d1d7db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatListAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  chatListAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  chatListInfo: {
    flex: 1,
  },
  chatListTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  chatListName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  chatListTime: {
    color: '#9ca3af',
    fontSize: 10,
  },
  chatListBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatListPreview: {
    color: '#9ca3af',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  chatListBadge: {
    backgroundColor: '#22c55e',
    minWidth: 22,
    height: 17,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chatListBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  inboxTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  inboxBackRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  inboxHeader: {
    minHeight: 56,
    backgroundColor: WA_GREEN_TEAL,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 0,
  },
  inboxActionRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  inboxHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  inboxCircleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  inboxPlainIcon: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  inboxFloatingPlus: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111b21',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 12,
  },
  inboxPlusButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#25d366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxTitle: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  inboxSubtitle: {
    color: '#5b4a4f',
    fontSize: 11,
    marginTop: -2,
    fontWeight: '600',
  },
  inboxMenuDismissLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: 'rgba(40, 20, 24, 0.08)',
  },
  inboxMenuCard: {
    position: 'absolute',
    top: 50,
    right: 10,
    width: 190,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eee0e2',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  chatHeaderMenuCard: {
    position: 'absolute',
    top: 56,
    right: 10,
    width: 190,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eee0e2',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  inboxMenuItem: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  inboxMenuText: {
    color: '#1c1c1c',
    fontSize: 13,
    fontWeight: '700',
  },
  newChatOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 30,
    backgroundColor: 'rgba(17, 27, 33, 0.24)',
  },
  newChatPanel: {
    marginTop: 74,
    marginHorizontal: 12,
    maxHeight: '76%',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9edef',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  newChatHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  newChatTitle: {
    color: '#111b21',
    fontSize: 18,
    fontWeight: '800',
  },
  newChatClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
  },
  newChatSearchBox: {
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f0f2f5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  newNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  newNumberInputWrap: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f0f2f5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  newChatInput: {
    flex: 1,
    color: '#111b21',
    fontSize: 14,
    paddingVertical: 0,
  },
  newNumberButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#111b21',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatList: {
    maxHeight: 330,
  },
  newChatUserRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
    paddingVertical: 8,
  },
  newChatUserInfo: {
    flex: 1,
    minWidth: 0,
  },
  newChatUserName: {
    color: '#111b21',
    fontSize: 15,
    fontWeight: '700',
  },
  newChatUserSub: {
    color: '#667781',
    fontSize: 12,
    marginTop: 2,
  },
  chatListToolbarInline: {
    minHeight: 50,
    backgroundColor: WA_PINK_HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 0,
  },
  chatListSearch: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  chatListSearchInputLight: {
    flex: 1,
    height: 38,
    color: '#111b21',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
    margin: 0,
  },
  chatFilterButtonLight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  chatFilterChips: {
    backgroundColor: WA_PINK_HEADER,
    maxHeight: 42,
  },
  chatFilterChipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 9,
  },
  chatFilterChip: {
    minHeight: 31,
    borderRadius: 16,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
  },
  chatFilterChipActive: {
    backgroundColor: '#d9fdd3',
  },
  chatFilterChipText: {
    color: '#667781',
    fontSize: 14,
    fontWeight: '600',
  },
  chatFilterChipTextActive: {
    color: '#075e54',
  },
  chatFilterAddChip: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
  },
  quickActionRow: {
    minHeight: 50,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  quickActionText: {
    color: '#111b21',
    fontSize: 10,
    fontWeight: '700',
  },
  selectionBar: {
    minHeight: 46,
    backgroundColor: WA_PINK_HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d7db',
  },
  selectionText: {
    flex: 1,
    color: '#111b21',
    fontSize: 13,
    fontWeight: '800',
  },
  selectionButton: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: '#075e54',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectionButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  selectionCancel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  inboxList: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  inboxListContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 96,
  },
  inboxRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  inboxRowSelected: {
    backgroundColor: '#eaeaea',
  },
  chatListAvatarSelected: {
    backgroundColor: '#075e54',
  },
  avatarSelectedBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#25d366',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  avatarSelectedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  chatListNameDark: {
    color: '#111b21',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  chatListTimeDark: {
    color: '#667781',
    fontSize: 12,
    fontWeight: '400',
  },
  chatListTimeUnread: {
    color: '#25d366',
  },
  chatListPreviewDark: {
    color: '#667781',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  chatListMiniIconDark: {
    color: '#25d366',
    fontSize: 10,
    fontWeight: '800',
    marginHorizontal: 4,
  },
  emptyInbox: {
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyInboxText: {
    color: '#667781',
    fontSize: 13,
    fontWeight: '700',
  },
  chatListToolbar: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  chatListSearchInput: {
    flex: 1,
    color: '#111111',
    fontSize: 13,
    paddingVertical: 0,
  },
  chatFilterButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(85,230,238,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19,39,70,0.9)',
  },
  chatFilterButtonActive: {
    backgroundColor: '#d9fdd3',
  },
  chatListMiniIcon: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '800',
    marginHorizontal: 4,
  },
  whatsappScreen: {
    flex: 1,
    width: '100%',
    backgroundColor: WA_PINK_BG,
  },
  whatsappHeader: {
    height: 60,
    backgroundColor: WA_PINK_HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  whatsappBackButton: {
    width: 27,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d1d7db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    position: 'relative',
  },
  whatsappAvatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  whatsappAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  whatsappOnlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: WA_GREEN_DOT,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  whatsappHeaderInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  whatsappHeaderTitle: {
    color: '#1c1c1c',
    fontSize: 16,
    fontWeight: '600',
  },
  whatsappHeaderSubtitle: {
    color: '#5b4a4f',
    fontSize: 12,
    marginTop: 1,
    fontWeight: '400',
  },
  whatsappHeaderAction: {
    width: 28,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappMessagesList: {
    flex: 1,
    backgroundColor: WA_PINK_CHAT_BG,
  },
  chatSearchBar: {
    minHeight: 32,
    backgroundColor: '#f8fafc',
    marginHorizontal: 8,
    marginVertical: 5,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  chatSearchInput: {
    flex: 1,
    color: '#1c1c1c',
    fontSize: 12,
    paddingVertical: 0,
  },
  whatsappMessagesContent: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 47,
    gap: 2,
  },
  messageDateChipWrap: {
    alignSelf: 'center',
    minHeight: 20,
    borderRadius: 7,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#d7e0df',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  messageDateChipText: {
    color: '#667781',
    fontFamily: WA_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '500',
  },
  whatsappBubbleRow: {
    width: '100%',
    flexDirection: 'row',
    marginVertical: 1,
  },
  whatsappBubbleRowMine: {
    justifyContent: 'flex-end',
  },
  whatsappBubbleRowOther: {
    justifyContent: 'flex-start',
  },
  whatsappBubble: {
    maxWidth: '92%',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  whatsappBubbleMine: {
    backgroundColor: WA_BUBBLE_MINE,
    borderColor: '#8fd67d',
    borderTopRightRadius: 2,
  },
  whatsappBubbleOther: {
    backgroundColor: WA_BUBBLE_OTHER,
    borderColor: '#c5d1dc',
    borderTopLeftRadius: 2,
  },
  whatsappSenderLabel: {
    color: '#008069',
    fontFamily: WA_FONT_FAMILY,
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 1,
  },
  whatsappMessageText: {
    color: WA_TEXT_DARK,
    fontFamily: WA_FONT_FAMILY,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 'bold',
    includeFontPadding: false,
    textShadowColor: 'rgba(255, 255, 255, 0.35)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 0.5,
  },
  deletedMessageText: {
    color: WA_TEXT_SUB,
    fontStyle: 'italic',
  },
  replyPreviewText: {
    color: '#008069',
    fontFamily: WA_FONT_FAMILY,
    fontSize: 9,
    fontWeight: '700',
    borderLeftWidth: 3,
    borderLeftColor: '#008069',
    paddingLeft: 5,
    marginBottom: 1,
  },
  forwardedText: {
    color: WA_TEXT_SUB,
    fontFamily: WA_FONT_FAMILY,
    fontSize: 9,
    fontStyle: 'italic',
    marginBottom: 1,
  },
  reactionRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 2,
  },
  reactionText: {
    fontFamily: WA_FONT_FAMILY,
    fontSize: 10,
  },
  whatsappMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 2,
    marginTop: 0,
  },
  whatsappTime: {
    color: WA_TEXT_SUB,
    fontFamily: WA_FONT_FAMILY,
    fontSize: 9,
    fontWeight: '400',
  },
  whatsappComposerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#dfe8e5',
    paddingHorizontal: 6,
    paddingTop: 5,
    paddingBottom: 5,
    borderTopWidth: 1,
    borderTopColor: '#c7d3cf',
  },
  whatsappComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  whatsappInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    minHeight: 48,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#cfd8dc',
  },
  contextPreviewBar: {
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#008069',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#d0d7de',
    borderRightColor: '#d0d7de',
    borderBottomColor: '#d0d7de',
  },
  contextPreviewTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  contextPreviewTitle: {
    color: '#008069',
    fontSize: 11,
    fontWeight: '800',
  },
  contextPreviewBody: {
    color: WA_TEXT_SUB,
    fontSize: 11,
    marginTop: 1,
  },
  whatsappIconButton: {
    width: 36,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 100,
    color: WA_TEXT_DARK,
    fontSize: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  whatsappSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#008069',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappSendButtonDisabled: {
    opacity: 0.45,
  },
  whatsappAttachmentChip: {
    minHeight: 34,
    borderRadius: 9,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  whatsappAttachmentChipText: {
    color: WA_TEXT_DARK,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  whatsappAttachmentRemove: {
    color: WA_TEXT_SUB,
    fontSize: 22,
    fontWeight: '700',
  },
  whatsappAttachmentImage: {
    width: 190,
    height: 150,
    borderRadius: 7,
    marginBottom: 5,
    backgroundColor: '#d1d7db',
  },
  filePreview: {
    minWidth: 170,
    borderRadius: 7,
    backgroundColor: '#f0f2f5',
    padding: 10,
    marginBottom: 5,
  },
  filePreviewMine: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  filePreviewText: {
    color: WA_TEXT_DARK,
    fontSize: 12,
    fontWeight: '800',
  },
  callOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#071015',
    zIndex: 999,
  },
  callPanel: {
    width: '100%',
    height: '100%',
    backgroundColor: '#071015',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIdentity: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 170,
  },
  callAvatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#1f2c33',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  callAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 66,
  },
  callAvatarText: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
  },
  callTextWrap: {
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
  },
  callName: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  callKind: {
    color: '#d1d7db',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  callStatus: {
    color: '#e9edef',
    fontSize: 18,
    marginTop: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0,
  },
  callTypeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  callTypeIconVideo: {
    backgroundColor: '#2563eb',
  },
  callActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 34,
    marginTop: 18,
  },
  incomingCallActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  callActionItem: {
    alignItems: 'center',
    gap: 10,
  },
  callActionLabel: {
    color: '#e9edef',
    fontSize: 12,
    fontWeight: '800',
  },
  callControlsGrid: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  callControlButton: {
    width: 74,
    minHeight: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  callControlButtonActive: {
    backgroundColor: 'rgba(0,168,132,0.42)',
    borderColor: 'rgba(0,168,132,0.76)',
  },
  callControlLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  callStage: {
    minHeight: 86,
    width: '100%',
    borderRadius: 18,
    backgroundColor: 'rgba(0,168,132,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,168,132,0.32)',
  },
  videoCallStage: {
    minHeight: 128,
    backgroundColor: '#111b21',
    borderColor: '#2a3942',
    overflow: 'hidden',
  },
  fullVideoStage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  localVideo: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 70 : 38,
    width: 116,
    height: 156,
    borderRadius: 18,
    backgroundColor: '#1f2c33',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.78)',
    zIndex: 3,
  },
  localVideoStream: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  localVideoLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  localVideoLabelText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  callTopOverlay: {
    position: 'absolute',
    left: 16,
    right: 148,
    top: Platform.OS === 'ios' ? 76 : 44,
    zIndex: 2,
  },
  callBottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 34 : 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 8,
    backgroundColor: 'rgba(7,16,21,0.42)',
    zIndex: 4,
  },
  callVideoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#101b21',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  callVideoPlaceholderSmall: {
    position: 'relative',
    width: '100%',
    height: '100%',
    gap: 0,
  },
  callStageText: {
    color: '#e9edef',
    fontSize: 13,
    fontWeight: '800',
  },
  videoCallStageText: {
    color: '#ffffff',
  },
  callRoundButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callAcceptButton: {
    backgroundColor: '#22c55e',
  },
  callVideoButton: {
    backgroundColor: '#2563eb',
  },
  callRejectButton: {
    backgroundColor: '#ef4444',
  },
  statusSectionContainer: {
    backgroundColor: WA_PINK_BG,
    paddingVertical: 10,
  },
  statusListContent: {
    paddingHorizontal: 12,
    gap: 15,
  },
  statusItem: {
    alignItems: 'center',
    width: 52,
  },
  statusAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    marginBottom: 4,
  },
  myStatusAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  statusAvatarUnseen: {
    borderColor: '#25d366',
  },
  statusAvatarSeen: {
    borderColor: '#d1d7db',
  },
  statusAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  statusAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: '#d1d7db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addStatusIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#25d366',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  statusItemText: {
    color: '#1c1c1c',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusViewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 9999,
  },
  statusViewerHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 12,
  },
  statusViewerProgressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  statusViewerProgressBarBg: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  statusViewerProgressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  statusViewerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusViewerBackButton: {
    padding: 8,
    marginRight: 4,
  },
  statusViewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  statusViewerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667781',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusViewerAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusViewerUserInfo: {
    flex: 1,
  },
  statusViewerUserName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  statusViewerTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  statusViewerCloseButton: {
    padding: 8,
  },
  statusViewerContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusViewerMedia: {
    width: '100%',
    height: '100%',
  },
  statusViewerTextBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusViewerTextContent: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  statusIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 3,
  },
  chatListPreviewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  chatListRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default HrSupportScreen;
