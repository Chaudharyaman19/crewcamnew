import { NativeModules, Platform } from 'react-native';

type IncomingCallPayload = {
  callerName?: string;
  callType?: string;
  threadName?: string;
  threadId?: string;
  sessionId?: string;
};

const CrewcamRingtone = NativeModules.CrewcamRingtone as
  | {
      showIncomingCall?: (
        callerName: string,
        callType: string,
        threadId: string,
        sessionId: string,
      ) => void;
      cancelIncomingCall?: () => void;
    }
  | undefined;

export const showIncomingCallNotification = (payload: IncomingCallPayload) => {
  if (Platform.OS !== 'android') {
    return;
  }

  const callerName =
    payload.threadName || payload.callerName || 'Incoming Crewcam call';
  const callType = payload.callType || 'audio';
  CrewcamRingtone?.showIncomingCall?.(
    callerName,
    callType,
    String(payload.threadId || ''),
    String(payload.sessionId || ''),
  );
};

export const cancelIncomingCallNotification = () => {
  CrewcamRingtone?.cancelIncomingCall?.();
};
