import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { JsonRepository } from './persistence';
import { stateSchema } from './model';

interface NativeFiles {
  read(options: { name: string }): Promise<{ content: string | null }>;
  write(options: { name: string; content: string }): Promise<void>;
  pickBackup(): Promise<{ content: string | null }>;
  exportBackup(options: { content: string; name: string }): Promise<{ saved: boolean }>;
  appearance(options: { dark: boolean }): Promise<void>;
}
const files = registerPlugin<NativeFiles>('ClearlistFiles');
export const isMobileApp = Capacitor.isNativePlatform();

export async function initializeMobile() {
  if (!isMobileApp) return;
  document.documentElement.classList.add('native-mobile');
  const repository = new JsonRepository({
    read: async (name) => (await files.read({ name })).content,
    write: (name, content) => files.write({ name, content }),
  });
  window.clearlist = {
    platform: 'android',
    load: async () => ({ ...(await repository.load()), path: '此设备 · 应用私有存储' }),
    save: (state) => repository.save(state),
    exportData: async (state) =>
      (
        await files.exportBackup({
          content: JSON.stringify(stateSchema.parse(state), null, 2),
          name: `Clearlist-${Date.now()}.json`,
        })
      ).saved,
    importData: async () => {
      const { content } = await files.pickBackup();
      return content === null ? null : stateSchema.parse(JSON.parse(content));
    },
    restoreData: async () => {
      const { content } = await files.pickBackup();
      return content === null
        ? null
        : { ...(await repository.restore(JSON.parse(content))), path: '此设备 · 应用私有存储' };
    },
    setTheme: (theme) =>
      files.appearance({
        dark:
          theme === 'dark' ||
          (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches),
      }),
    notify: async () => {},
    onBeforeClose: () => {},
    readyToClose: () => {},
  };
  await NativeApp.addListener('backButton', () => {
    const event = new CustomEvent('clearlist:back', { cancelable: true });
    if (document.dispatchEvent(event)) void NativeApp.minimizeApp();
  });
}
