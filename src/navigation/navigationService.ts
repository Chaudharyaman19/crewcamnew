import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export const isHrSupportRouteActive = () => {
  const currentRoute = navigationRef.isReady()
    ? navigationRef.getCurrentRoute()
    : undefined;
  return ['HR Support', 'HrSupportMain'].includes(String(currentRoute?.name || ''));
};

export const openHrSupportCallScreen = () => {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.navigate('PreHome', {
    screen: 'App',
    params: {
      screen: 'HR Support',
      params: {
        screen: 'HrSupportMain',
      },
    },
  });
};
