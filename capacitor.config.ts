import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.clearlist.mobile',
  appName: '简清',
  webDir: 'dist',
  backgroundColor: '#18221f',
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
  plugins: { SystemBars: { insetsHandling: 'css' } },
};
export default config;
