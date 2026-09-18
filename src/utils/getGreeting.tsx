// utils/getGreeting.ts
const isHindiSelected = () =>
  (globalThis as { __crewcamLanguage?: string }).__crewcamLanguage === 'hi';

export const getGreeting = () => {
  const currentHour = new Date().getHours();

  if (currentHour >= 5 && currentHour < 12) {
    return isHindiSelected() ? 'गुड मॉर्निंग' : 'Good Morning';
  } else if (currentHour >= 12 && currentHour < 13) {
    return isHindiSelected() ? 'गुड नून' : 'Good Noon';
  } else if (currentHour >= 13 && currentHour < 17) {
    return isHindiSelected() ? 'गुड आफ्टरनून' : 'Good Afternoon';
  } else if (currentHour >= 17 && currentHour < 21) {
    return isHindiSelected() ? 'गुड इवनिंग' : 'Good Evening';
  } else {
    return isHindiSelected() ? 'गुड नाइट' : 'Good Night';
  }
};
