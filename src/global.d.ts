import type { AppState } from './model';

declare global {
  interface Window {
    clearlist?: {
      load(): Promise<{ state: AppState; recovered: boolean; path: string }>;
      save(state: AppState): Promise<void>;
      exportData(state: AppState): Promise<boolean>;
      importData(): Promise<AppState | null>;
      restoreData(): Promise<{ state: AppState; recovered: boolean; path: string } | null>;
      notify(title: string, body: string): Promise<void>;
      onBeforeClose(callback: () => Promise<void>): void;
      readyToClose(success: boolean): void;
    };
  }
}
