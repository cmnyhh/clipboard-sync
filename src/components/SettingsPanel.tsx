import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store/appStore";
import {
  FiRefreshCw,
  FiType,
  FiImage,
  FiFile,
  FiInfo,
  FiHeart,
  FiLayers,
} from "react-icons/fi";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`toggle ${enabled ? "active" : ""}`}
      role="switch"
      aria-checked={enabled}
    >
      <div className="toggle-knob" />
    </button>
  );
}

export default function SettingsPanel() {
  const {
    autoSync,
    syncText,
    syncImages,
    syncFiles,
    syncMode,
    floatingEnabled,
    setAutoSync,
    setSyncText,
    setSyncImages,
    setSyncFiles,
    setSyncMode,
    setFloatingEnabled,
    saveSettings,
  } = useAppStore();

  const iconBoxStyle = {
    background: "rgba(0,0,0,0.03)",
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 animate-slide-in-up pb-8">
      {/* 页面标题 */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(0,122,255,0.06)", border: "0.5px solid rgba(0,122,255,0.1)" }}>
          <FiRefreshCw className="w-5 h-5" style={{ color: "#007aff" }} />
        </div>
        <div>
          <h2 className="text-[15px] font-bold tracking-tight" style={{ color: "#1d1d1f" }}>设置</h2>
          <p className="text-[11px]" style={{ color: "#8e8e93" }}>配置同步行为和偏好</p>
        </div>
      </div>

      {/* 自动同步 */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between p-3 rounded-xl transition-colors"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle}>
              <FiRefreshCw className="w-4 h-4" style={{ color: "#007aff" }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "#1d1d1f" }}>自动同步</p>
              <p className="text-[11px]" style={{ color: "#8e8e93" }}>
                剪贴板变化时自动同步到其他设备
              </p>
            </div>
          </div>
          <Toggle enabled={autoSync} onChange={setAutoSync} />
        </div>
      </div>

      {/* 接收模式 */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8e8e93" }}>
            接收模式
          </h3>
        </div>
        <div className="flex gap-2 px-1">
          <button
            onClick={() => setSyncMode("manual")}
            className="flex-1 p-3 rounded-xl text-center transition-all duration-200"
            style={syncMode === "manual" ? {
              background: "rgba(0,122,255,0.08)",
              border: "0.5px solid rgba(0,122,255,0.15)",
              boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.5)",
            } : {
              background: "rgba(255,255,255,0.2)",
              border: "0.5px solid rgba(0,0,0,0.04)",
            }}
          >
            <p className="text-[13px] font-semibold" style={{ color: syncMode === "manual" ? "#007aff" : "#3a3a3c" }}>手动确认</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#8e8e93" }}>收到内容后需确认才写入剪贴板</p>
          </button>
          <button
            onClick={() => setSyncMode("auto")}
            className="flex-1 p-3 rounded-xl text-center transition-all duration-200"
            style={syncMode === "auto" ? {
              background: "rgba(0,122,255,0.08)",
              border: "0.5px solid rgba(0,122,255,0.15)",
              boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.5)",
            } : {
              background: "rgba(255,255,255,0.2)",
              border: "0.5px solid rgba(0,0,0,0.04)",
            }}
          >
            <p className="text-[13px] font-semibold" style={{ color: syncMode === "auto" ? "#007aff" : "#3a3a3c" }}>自动写入</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#8e8e93" }}>收到内容后直接写入剪贴板</p>
          </button>
        </div>
      </div>

      {/* 悬浮窗 */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between p-3 rounded-xl transition-colors"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle}>
              <FiLayers className="w-4 h-4" style={{ color: "#007aff" }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "#1d1d1f" }}>悬浮窗</p>
              <p className="text-[11px]" style={{ color: "#8e8e93" }}>
                独立小窗口显示来自其他设备的同步内容
              </p>
            </div>
          </div>
          <Toggle
            enabled={floatingEnabled}
            onChange={async () => {
              try {
                const opened = await invoke<boolean>("toggle_floating_window");
                setFloatingEnabled(opened);
                await saveSettings();
              } catch (err) {
                console.error("悬浮窗切换失败:", err);
              }
            }}
          />
        </div>
      </div>

      {/* 同步内容类型 */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8e8e93" }}>
            同步内容类型
          </h3>
        </div>

        <div className="space-y-0.5">
          {/* 文本 */}
          <div className="flex items-center justify-between p-3 rounded-xl transition-colors"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle}>
                <FiType className="w-4 h-4" style={{ color: "#007aff" }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#1d1d1f" }}>文本</p>
                <p className="text-[11px]" style={{ color: "#8e8e93" }}>同步剪贴板中的文本内容</p>
              </div>
            </div>
            <Toggle enabled={syncText} onChange={setSyncText} />
          </div>

          {/* 图片 */}
          <div className="flex items-center justify-between p-3 rounded-xl transition-colors"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle}>
                <FiImage className="w-4 h-4" style={{ color: "#af52de" }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#1d1d1f" }}>图片</p>
                <p className="text-[11px]" style={{ color: "#8e8e93" }}>同步剪贴板中的图片内容</p>
              </div>
            </div>
            <Toggle enabled={syncImages} onChange={setSyncImages} />
          </div>

          {/* 文件 */}
          <div className="flex items-center justify-between p-3 rounded-xl transition-colors"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle}>
                <FiFile className="w-4 h-4" style={{ color: "#ff9500" }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#1d1d1f" }}>文件</p>
                <p className="text-[11px]" style={{ color: "#8e8e93" }}>同步剪贴板中的文件路径</p>
              </div>
            </div>
            <Toggle enabled={syncFiles} onChange={setSyncFiles} />
          </div>
        </div>
      </div>

      {/* 关于 */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <FiInfo className="w-3.5 h-3.5" style={{ color: "#8e8e93" }} />
          <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8e8e93" }}>
            关于
          </h3>
        </div>
        <div className="px-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#8e8e93" }}>版本</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ color: "#48484a", background: "rgba(0,0,0,0.03)" }}>
              v0.2.0
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#8e8e93" }}>平台</span>
            <span className="text-xs" style={{ color: "#48484a" }}>macOS · Linux · Windows</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#8e8e93" }}>技术栈</span>
            <span className="text-xs" style={{ color: "#48484a" }}>Tauri v2 + React + Rust</span>
          </div>
          <div className="pt-2 flex items-center justify-center gap-1.5"
            style={{ borderTop: "0.5px solid rgba(0,0,0,0.04)" }}>
            <span className="text-[11px]" style={{ color: "#c7c7cc" }}>Made with</span>
            <FiHeart className="w-3 h-3" style={{ color: "#ff375f" }} />
            <span className="text-[11px]" style={{ color: "#c7c7cc" }}>by 笺流</span>
          </div>
        </div>
      </div>
    </div>
  );
}
