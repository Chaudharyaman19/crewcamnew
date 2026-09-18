export type AuthStackParamList = {
  Login: undefined;
  Otp: {mobile: string; otp: string; userId: string; empCode?: string};
};

export type AppTabParamList = {
  Notifications: undefined;
  Dashboard: undefined;
  Attendance: undefined;
  Leave: undefined;
  Meeting: undefined;
  EmpTracking: undefined;
  MasterEye: undefined;
};

export type PreHomeStackParamList = {
  PaymentLeave: undefined;
  DailyUpdate: undefined;
  BiometricGate: undefined;
  ApprovalDetailScreen: {
    requestId: string;
    requestType: 'PAID_LEAVE' | 'CASUAL_LEAVE' | 'URGENT_LEAVE' | 'MEETING' | 'CREWCAM_LEAVE' | 'OFFICE_OUT';
  };
  App: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  PreHome: undefined;
};
