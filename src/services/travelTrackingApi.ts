import { API_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Coordinates = {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
};

type Geofence = Coordinates & {
  name?: string;
  address?: string;
  radiusMeters?: number;
};

type TravelStartPayload = {
  location: Coordinates;
  destination: Geofence;
  office?: Geofence;
  meetingId?: string;
  clientName?: string;
  clientAddress?: string;
};

type MeetingInPayload = {
  clientName: string;
  clientAddress?: string;
  contactPerson?: string;
  purpose?: string;
  notes?: string;
  photos?: string[];
  location?: Coordinates;
};

type MeetingOutPayload = {
  notes?: string;
  followUps?: string[];
  photos?: string[];
  outcome?: string;
  location?: Coordinates;
};

type NextMeetingPayload = {
  destination: Geofence;
  clientName: string;
  clientAddress?: string;
  meetingId?: string;
};

const withIdentity = async (payload: Record<string, unknown> = {}) => {
  const [token, userId, empCode] = await Promise.all([
    AsyncStorage.getItem('auth_token'),
    AsyncStorage.getItem('user_id'),
    AsyncStorage.getItem('user_emp_code'),
  ]);

  return {
    token: token || '',
    id: userId || '',
    empCode: empCode || '',
    ...payload,
  };
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}/app-api/travel${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.message || 'Travel tracking request failed');
  }
  return data;
};

export const travelTrackingApi = {
  getActiveSession: async () => {
    const identity = await withIdentity();
    const query = new URLSearchParams(identity as Record<string, string>).toString();
    return request(`/active?${query}`);
  },

  getLiveSessions: async (includeClosed = false) =>
    request(`/live${includeClosed ? '?includeClosed=true' : ''}`),

  getDailyReport: async (date?: string) => {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return request(`/report${query}`);
  },

  startTravel: async (payload: TravelStartPayload) =>
    request('/start', {
      method: 'POST',
      body: JSON.stringify(await withIdentity(payload as unknown as Record<string, unknown>)),
    }),

  logLocation: async (location: Coordinates, force = false) =>
    request('/location', {
      method: 'POST',
      body: JSON.stringify(await withIdentity({ location, force })),
    }),

  meetingIn: async (payload: MeetingInPayload) =>
    request('/meeting-in', {
      method: 'POST',
      body: JSON.stringify(await withIdentity(payload as unknown as Record<string, unknown>)),
    }),

  meetingOut: async (payload: MeetingOutPayload = {}) =>
    request('/meeting-out', {
      method: 'POST',
      body: JSON.stringify(await withIdentity(payload as unknown as Record<string, unknown>)),
    }),

  nextMeeting: async (payload: NextMeetingPayload) =>
    request('/next-meeting', {
      method: 'POST',
      body: JSON.stringify(await withIdentity(payload as unknown as Record<string, unknown>)),
    }),

  backToOffice: async () =>
    request('/back-to-office', {
      method: 'POST',
      body: JSON.stringify(await withIdentity()),
    }),

  endDay: async (location?: Coordinates, force = false) =>
    request('/end-day', {
      method: 'POST',
      body: JSON.stringify(await withIdentity({ location, force })),
    }),
};
