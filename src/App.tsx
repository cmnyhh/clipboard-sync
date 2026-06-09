import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  const { setLocalIp, setDeviceName, loadSettings } = useAppStore();

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
