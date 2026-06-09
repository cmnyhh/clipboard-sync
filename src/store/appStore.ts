import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type ClipboardType = "text" | "image" | "file";

export interface ClipboardItem {
  id: string;
  type: ClipboardType;
  content: string;
  fileName?: string;
  fileSize?: number;
  timestamp: number;
  sourceDevice: string;
  synced: boolean;
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  platform: string;
  connected: boolean;
  lastSeen: number;
}

interface AppState {
  // 连接状态
  isConnected: boolean;
  serverAddress: string;
  localIp: string;
  deviceName: string;

  // 剪贴板历史
  clipboardHistory: ClipboardItem[];

  // 已连接设备
  connectedDevices: Device[];

  // 同步设置
  autoSync: boolean;
  syncText: boolean;
  syncImages: boolean;
  syncFiles: boolean;
  syncMode: "auto" | "manual"; // auto=直接写入, manual=进队列等用户确认

  // 悬浮窗
  floatingEnabled: boolean;
  floatingX: number;
  floatingY: number;
  floatingWidth: number;
  floatingHeight: number;

  // 待接收队列（来自其他设备的同步内容）
  pendingSyncItems: ClipboardItem[];

  // 防止同步循环：标记来自网络的内容
  networkContent: string | null;
  setNetworkContent: (content: string | null) => void;
  // 标记程序写入的内容（不触发同步）
  skipSyncContent: string | null;
  setSkipSyncContent: (content: string | null) => void;
  // 跳过下一次剪贴板轮询
  skipNextPoll: boolean;
  setSkipNextPoll: (skip: boolean) => void;

  // Actions
  setConnected: (connected: boolean) => void;
  setServerAddress: (address: string) => void;
  setLocalIp: (ip: string) => void;
  setDeviceName: (name: string) => void;
  addClipboardItem: (item: ClipboardItem) => void;
  clearHistory: () => void;
  addDevice: (device: Device) => void;
  removeDevice: (deviceId: string) => void;
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncText: (enabled: boolean) => void;
  setSyncImages: (enabled: boolean) => void;
  setSyncFiles: (enabled: boolean) => void;
  setSyncMode: (mode: "auto" | "manual") => void;
  setFloatingEnabled: (enabled: boolean) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  addPendingSyncItem: (item: ClipboardItem) => void;
  removePendingSyncItem: (id: string) => void;
  clearPendingSyncItems: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isConnected: false,
  serverAddress: "",
  localIp: "",
  deviceName: "",

  clipboardHistory: [],
  connectedDevices: [],

  autoSync: true,
  syncText: true,
  syncImages: true,
  syncFiles: true,
  syncMode: "manual",

  floatingEnabled: false,
  floatingX: 800,
  floatingY: 100,
  floatingWidth: 340,
  floatingHeight: 420,

  pendingSyncItems: [],

  networkContent: null,
  setNetworkContent: (content) => set({ networkContent: content }),
  skipSyncContent: null,
  setSkipSyncContent: (content) => set({ skipSyncContent: content }),
  skipNextPoll: false,
  setSkipNextPoll: (skip) => set({ skipNextPoll: skip }),

  setConnected: (connected) => set({ isConnected: connected }),
  setServerAddress: (address) => set({ serverAddress: address }),
  setLocalIp: (ip) => set({ localIp: ip }),
  setDeviceName: (name) => set({ deviceName: name }),

  addClipboardItem: (item) =>
    set((state) => ({
      clipboardHistory: [item, ...state.clipboardHistory].slice(0, 100),
    })),

  clearHistory: () => set({ clipboardHistory: [] }),

  addDevice: (device) =>
    set((state) => ({
      connectedDevices: [
        ...state.connectedDevices.filter((d) => d.id !== device.id),
        device,
      ],
    })),

  removeDevice: (deviceId) =>
    set((state) => ({
      connectedDevices: state.connectedDevices.filter((d) => d.id !== deviceId),
    })),

  updateDevice: (deviceId, updates) =>
    set((state) => ({
      connectedDevices: state.connectedDevices.map((d) =>
        d.id === deviceId ? { ...d, ...updates } : d
      ),
    })),

  setAutoSync: (enabled) => {
    set({ autoSync: enabled });
    void useAppStore.getState().saveSettings();
  },
  setSyncText: (enabled) => {
    set({ syncText: enabled });
    void useAppStore.getState().saveSettings();
  },
  setSyncImages: (enabled) => {
    set({ syncImages: enabled });
    void useAppStore.getState().saveSettings();
  },
  setSyncFiles: (enabled) => {
    set({ syncFiles: enabled });
    void useAppStore.getState().saveSettings();
  },
  setSyncMode: (mode) => {
    set({ syncMode: mode });
    void useAppStore.getState().saveSettings();
  },
  setFloatingEnabled: (enabled) => {
    set({ floatingEnabled: enabled });
    void useAppStore.getState().saveSettings();
  },

  // 从 Rust 加载持久化设置
  loadSettings: async () => {
    try {
      const s = await invoke<{
        autoSync: boolean;
        syncText: boolean;
        syncImages: boolean;
        syncFiles: boolean;
        syncMode: string;
        floatingEnabled: boolean;
        floatingX: number;
        floatingY: number;
        floatingWidth: number;
        floatingHeight: number;
      }>("load_settings");
      set({
        autoSync: s.autoSync,
        syncText: s.syncText,
        syncImages: s.syncImages,
        syncFiles: s.syncFiles,
        syncMode: s.syncMode as "auto" | "manual",
        floatingEnabled: s.floatingEnabled,
        floatingX: s.floatingX ?? 800,
        floatingY: s.floatingY ?? 100,
        floatingWidth: s.floatingWidth ?? 340,
        floatingHeight: s.floatingHeight ?? 420,
      });
    } catch (err) {
      console.error("加载设置失败:", err);
    }
  },

  // 保存当前设置到 Rust
  saveSettings: async () => {
    try {
      const state = useAppStore.getState();
      await invoke("save_settings", {
        newSettings: {
          autoSync: state.autoSync,
          syncText: state.syncText,
          syncImages: state.syncImages,
          syncFiles: state.syncFiles,
          syncMode: state.syncMode,
          floatingEnabled: state.floatingEnabled,
          floatingX: state.floatingX,
          floatingY: state.floatingY,
          floatingWidth: state.floatingWidth,
          floatingHeight: state.floatingHeight,
        },
      });
    } catch (err) {
      console.error("保存设置失败:", err);
    }
  },

  addPendingSyncItem: (item) =>
    set((state) => ({
      pendingSyncItems: [item, ...state.pendingSyncItems].slice(0, 20),
    })),
  removePendingSyncItem: (id) =>
    set((state) => ({
      pendingSyncItems: state.pendingSyncItems.filter((i) => i.id !== id),
    })),
  clearPendingSyncItems: () => set({ pendingSyncItems: [] }),
}));
