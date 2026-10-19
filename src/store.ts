import { useSyncExternalStore } from 'react';
import { emptyState, mergeImport, now, stateSchema, type AppState, type Task } from './model';

const key = 'clearlist.v1';
type Snapshot = {
  data: AppState;
  loaded: boolean;
  error: string;
  saving: boolean;
  recovered: boolean;
  path: string;
};
let snapshot: Snapshot = {
  data: emptyState(),
  loaded: false,
  error: '',
  saving: false,
  recovered: false,
  path: '',
};
const listeners = new Set<() => void>();
let pending: Promise<void> = Promise.resolve();
let closeListenerAttached = false;
function emit(patch: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((f) => f());
}
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const store = {
  async initialize() {
    if (window.clearlist && !closeListenerAttached) {
      closeListenerAttached = true;
      window.clearlist.onBeforeClose(async () => {
        await pending;
        window.clearlist!.readyToClose(!snapshot.loaded || !snapshot.error);
      });
    }
    try {
      if (window.clearlist) {
        const result = await window.clearlist.load();
        emit({
          data: stateSchema.parse(result.state),
          loaded: true,
          recovered: result.recovered,
          path: result.path,
        });
      } else {
        const raw = localStorage.getItem(key);
        let recovered = false;
        let data: AppState;
        try {
          data = raw ? stateSchema.parse(JSON.parse(raw)) : emptyState();
        } catch (error) {
          const backup = localStorage.getItem(`${key}.backup`);
          if (!backup) throw error;
          data = stateSchema.parse(JSON.parse(backup));
          localStorage.setItem(`${key}.corrupt.${Date.now()}`, raw!);
          localStorage.setItem(key, JSON.stringify(data));
          recovered = true;
        }
        emit({ data, loaded: true, recovered, path: '当前浏览器 · 本地存储' });
      }
    } catch (error) {
      emit({ error: `无法读取数据：${message(error)}`, loaded: false });
    }
  },
  get: () => snapshot.data,
  update(transform: (state: AppState) => AppState) {
    if (!snapshot.loaded) return;
    let data: AppState;
    try {
      data = stateSchema.parse(transform(snapshot.data));
    } catch (error) {
      emit({ error: `修改未应用：${message(error)}` });
      return;
    }
    emit({ data, saving: true });
    pending = pending.then(async () => {
      try {
        if (window.clearlist) await window.clearlist.save(data);
        else {
          const previous = localStorage.getItem(key);
          if (previous) localStorage.setItem(`${key}.backup`, previous);
          localStorage.setItem(key, JSON.stringify(data));
        }
        if (snapshot.data === data) emit({ saving: false, error: '' });
      } catch (error) {
        emit({ saving: false, error: `保存失败，请先导出备份：${message(error)}` });
      }
    });
  },
  retry() {
    store.update((state) => ({ ...state }));
  },
  patchTask(id: string, patch: Partial<Task>) {
    store.update((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now() } : t)),
    }));
  },
  async exportData() {
    const data = snapshot.data;
    if (window.clearlist) return window.clearlist.exportData(data);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `Clearlist-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  },
  importData(data: unknown) {
    const merged = mergeImport(snapshot.data, data);
    store.update(() => merged);
  },
  async flush() {
    await pending;
  },
  async restore() {
    if (!window.clearlist) return;
    try {
      const result = await window.clearlist.restoreData();
      if (result)
        emit({ ...result, data: stateSchema.parse(result.state), loaded: true, error: '' });
    } catch {
      emit({ error: '恢复失败：请选择有效的简清 JSON 备份。原文件仍保留。' });
    }
  },
};
export function useStore() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => snapshot,
  );
}
