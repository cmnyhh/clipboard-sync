import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "./store/appStore";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ClipboardPanel from "./components/ClipboardPanel";
import SettingsPanel from "./components/SettingsPanel";
import FloatingSync from "./components/FloatingSync";

function App() {
  const [activeTab, setActiveTab] = useState<"clipboard" | "settings">(
    "clipboard"
  );
  const { setLocalIp, setDeviceName, loadSettings, addPendingSyncItem, addClipboardItem } = useAppStore();

  // 检测当前路径：/floating 走悬浮窗，否则走主窗口
  const isFloating = window.location.pathname === "/floating";

  useEffect(() => {
    const initApp = async () => {
      try {
        const ip = await invoke<string>("get_local_ip");
        const name = await invoke<string>("get_device_name");
        setLocalIp(ip);
        setDeviceName(name);
        await loadSettings();
      } catch (err) {
        console.error("初始化失败:", err);
      }
    };
    initApp();

    // 监听来自其他客户端的同步数据
    const unlisten = listen<{
      device_id: string;
      device_name: string;
      data: { type: string; content: string; fileName?: string; fileSize?: number };
    }>("sync-received", (event) => {
      const { data, device_name } = event.payload;
      const item = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        type: data.type as "text" | "image" | "file",
        content: data.content,
        fileName: data.fileName,
        fileSize: data.fileSize,
        timestamp: Date.now(),
        sourceDevice: device_name || "未知设备",
        synced: true,
      };

      // 文本自动加入历史，图片和文件加入待接收队列
      if (data.type === "text") {
        addClipboardItem(item);
      } else {
        addPendingSyncItem(item);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // 悬浮窗模式
  if (isFloating) {
    return <FloatingSync />;
  }

  // 主窗口模式
  return (
    <div className="flex flex-col h-screen bg-mesh select-none relative overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 min-w-0 overflow-auto p-5 animate-fade-in">
          {activeTab === "clipboard" ? (
            <ClipboardPanel />
          ) : (
            <SettingsPanel />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
