import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stellarsudoku.app',
  appName: 'StellarSudoku',
  webDir: 'dist',
  backgroundColor: '#0b1020',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0b1020',
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b1020',
    },
  },
};

export default config;
