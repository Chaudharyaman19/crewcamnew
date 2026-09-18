export const colors = {
  bg: '#132746',
  panel: 'rgba(19, 39, 70, 0.98)',
  text: '#FFFFFF',
  muted: 'rgba(230, 237, 246, 0.72)',
  card: 'rgba(19, 39, 70, 0.98)',
  btn: '#55e6ee',
  black: '#FFFFFF',
  white: '#FFFFFF',
  success: '#10B981',
  primary: '#55e6ee',
  secondary: 'rgba(127, 246, 255, 0.72)',
  danger: '#ff6b6b',
  inputBorder: 'rgba(127, 246, 255, 0.34)',
  headerBg: '#132746',
  border: 'rgba(127, 246, 255, 0.72)',
  borderSubtle: 'rgba(127, 246, 255, 0.34)',
  accent: '#55e6ee',
  accentDark: '#55e6ee',
  shadowGlow: '#55e6ee',
};

export const spacing = (n = 1) => 8 * n;

export const radius = 16;

export const gradients = {
  primary: {
    colors: ['rgba(19, 39, 70, 0.98)', 'rgba(9, 27, 51, 0.98)'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  secondary: {
    colors: ['#132746', '#1f456f'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
};
