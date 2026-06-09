import { FiClipboard, FiSettings, FiTrash2, FiMonitor, FiSmartphone, FiHardDrive } from "react-icons/fi";
import { useAppStore } from "../store/appStore";

interface SidebarProps {
  activeTab: "clipboard" | "settings";
  onTabChange: (tab: "clipboard" | "settings") => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { connectedDevices, clearHistory } = useAppStore();

  const getDeviceIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "macos":
      case "windows":
      case "linux":
        return <FiMonitor className="w-3.5 h-3.5" />;
      case "android":
      case "ios":
        return <FiSmartphone className="w-3.5 h-3.5" />;
      default:
        return <FiHardDrive className="w-3.5 h-3.5" />;
    }
  };

  return (
    <aside className="w-64 flex flex-col border-r border-white/30 bg-white/20 backdrop-blur-3xl"
      style={{ boxShadow: "inset -0.5px 0 0 rgba(0,0,0,0.03)" }}>
      {/* 导航 */}
      <nav className="flex-1 p-3 space-y-1">
        <button
          onClick={() => onTabChange("clipboard")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            activeTab === "clipboard"
              ? "shadow-sm"
              : "hover:bg-white/30"
          }`}
          style={activeTab === "clipboard" ? {
            background: "rgba(0,122,255,0.08)",
            color: "#007aff",
            border: "0.5px solid rgba(0,122,255,0.12)",
            boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.5)",
          } : {
            color: "#8e8e93",
            border: "0.5px solid transparent",
          }}
        >
          <FiClipboard className="w-[18px] h-[18px]" />
          <span className="text-[13px] font-semibold">剪贴板历史</span>
        </button>

        <button
          onClick={() => onTabChange("settings")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            activeTab === "settings"
              ? "shadow-sm"
              : "hover:bg-white/30"
          }`}
          style={activeTab === "settings" ? {
            background: "rgba(0,122,255,0.08)",
            color: "#007aff",
            border: "0.5px solid rgba(0,122,255,0.12)",
            boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.5)",
          } : {
            color: "#8e8e93",
            border: "0.5px solid transparent",
          }}
        >
          <FiSettings className="w-[18px] h-[18px]" />
          <span className="text-[13px] font-semibold">设置</span>
        </button>
      </nav>

      {/* 已连接设备 */}
      <div className="p-3 border-t border-white/30">
        <div className="mb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest px-1 mb-2" style={{ color: "#8e8e93" }}>
            已连接设备
            {connectedDevices.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[9px] rounded-full font-bold"
                style={{ background: "rgba(0,122,255,0.08)", color: "#007aff" }}>
                {connectedDevices.length}
              </span>
            )}
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {connectedDevices.map((device, index) => (
              <div
                key={device.id}
                className="device-card animate-slide-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.03)", color: "#8e8e93" }}>
                  {getDeviceIcon(device.platform)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "#3a3a3c" }}>
                    {device.name}
                  </p>
                  <p className="text-[10px]" style={{ color: "#8e8e93" }}>{device.platform}</p>
                </div>
                <div className="status-dot status-connected flex-shrink-0" />
              </div>
            ))}
            {connectedDevices.length === 0 && (
              <div className="text-center py-4">
                <FiMonitor className="w-6 h-6 mx-auto mb-1.5" style={{ color: "#d1d1d6" }} />
                <p className="text-[11px]" style={{ color: "#c7c7cc" }}>暂无连接设备</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={clearHistory}
          className="btn-danger w-full flex items-center justify-center gap-2 text-xs mt-2"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
          <span>清空历史</span>
        </button>
      </div>
    </aside>
  );
}
