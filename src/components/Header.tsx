import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store/appStore";
import { FiWifi, FiMonitor, FiCopy, FiZap, FiLink } from "react-icons/fi";

export default function Header() {
  const { isConnected, localIp, deviceName, setConnected } = useAppStore();
  const [connectionInput, setConnectionInput] = useState("");
  const [isHosting, setIsHosting] = useState(false);
  const [hostAddress, setHostAddress] = useState("");

  const handleConnect = async () => {
    try {
      await invoke("connect_to_server", { address: connectionInput });
      setConnected(true);
    } catch (err) {
      console.error("连接失败:", err);
    }
  };

  const handleHost = async () => {
    try {
      const address = await invoke<string>("start_server", { port: 9527 });
      setHostAddress(address);
      setIsHosting(true);
    } catch (err) {
      console.error("启动服务器失败:", err);
    }
  };

  const handleStopHosting = async () => {
    try {
      await invoke("disconnect");
      setIsHosting(false);
      setHostAddress("");
      setConnected(false);
    } catch (err) {
      console.error("关闭房间失败:", err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await invoke("disconnect");
      setIsHosting(false);
      setConnected(false);
    } catch (err) {
      console.error("退出房间失败:", err);
    }
  };



  const pillStyle = {
    background: "rgba(255,255,255,0.35)",
    border: "0.5px solid rgba(255,255,255,0.4)",
    boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.6)",
    backdropFilter: "blur(20px)",
  };

  return (
    <header
      className="flex flex-col px-6 py-2 bg-white/30 backdrop-blur-3xl border-b border-white/40"
      style={{ boxShadow: "inset 0 -0.5px 0 rgba(0,0,0,0.03)" }}
    >
      {/* 第一行：Logo + 设备信息 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-[11px]"
            style={{
              background: "linear-gradient(135deg, rgba(0,122,255,0.1), rgba(88,86,214,0.08))",
              border: "0.5px solid rgba(0,122,255,0.12)",
              boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.5)",
            }}>
            <FiCopy className="w-[18px] h-[18px]" style={{ color: "#007aff" }} />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px] border-white/80 animate-pulse-slow"
              style={{ background: "#30d158", boxShadow: "0 0 5px rgba(48,209,88,0.5)" }} />
          </div>
          <div>
            <h1 className="text-[14px] font-bold tracking-tight leading-tight" style={{ color: "#1d1d1f" }}>
              Clipboard<span style={{ color: "#007aff" }}>Sync</span>
            </h1>
            <p className="text-[9px] font-medium tracking-wide" style={{ color: "#8e8e93" }}>
              跨平台剪贴板同步
            </p>
          </div>
        </div>

        {/* 设备 + IP */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs" style={pillStyle}>
          <FiMonitor className="w-3 h-3" style={{ color: "#8e8e93" }} />
          <span className="font-medium" style={{ color: "#48484a" }}>{deviceName || "未知"}</span>
          <span style={{ color: "#d1d1d6" }}>·</span>
          <span className="font-mono text-[11px]" style={{ color: "#8e8e93" }}>{localIp || "..."}</span>
        </div>
      </div>

      {/* 第二行：连接操作 */}
      <div className="flex items-center gap-2 mt-1.5 h-[34px]">
        {!isConnected && !isHosting ? (
          <>
            <button onClick={handleHost}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: "rgba(0,122,255,0.06)",
                color: "#007aff",
                border: "0.5px solid rgba(0,122,255,0.1)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,122,255,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,122,255,0.06)"; }}
            >
              <FiZap className="w-3 h-3" />
              创建房间
            </button>
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={connectionInput}
                onChange={(e) => setConnectionInput(e.target.value)}
                placeholder="IP:端口"
                className="text-xs flex-1 px-2.5 py-1.5 rounded-xl outline-none"
                style={{
                  background: "rgba(255,255,255,0.4)",
                  color: "#1d1d1f",
                  border: "0.5px solid rgba(0,0,0,0.06)",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,122,255,0.3)"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,122,255,0.06)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
                onKeyDown={e => { if (e.key === "Enter") handleConnect(); }}
              />
              <button onClick={handleConnect}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{
                  background: "linear-gradient(180deg, #3395ff, #007aff)",
                  color: "#fff",
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 1px 4px rgba(0,122,255,0.2), inset 0 0.5px 0 rgba(255,255,255,0.2)",
                  textShadow: "0 -0.5px 0 rgba(0,0,0,0.12)",
                }}
              >
                <FiLink className="w-3 h-3" />
                连接
              </button>
            </div>
          </>
        ) : isHosting && !isConnected ? (
          <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-xl"
            style={{
              background: "rgba(0,122,255,0.06)",
              border: "0.5px solid rgba(0,122,255,0.1)",
              boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.5)",
            }}>
            <div className="status-dot status-connected" />
            <span className="text-[11px] font-medium" style={{ color: "#007aff" }}>房间已创建</span>
            <span className="font-mono text-[11px] font-semibold" style={{ color: "#007aff" }}>{hostAddress}</span>
            <button
              onClick={handleStopHosting}
              className="ml-auto px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all duration-200"
              style={{
                background: "rgba(255,59,48,0.08)",
                color: "#ff3b30",
                border: "0.5px solid rgba(255,59,48,0.12)",
              }}
            >
              关闭房间
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 h-full px-3 rounded-xl" style={{
            background: "rgba(48,209,88,0.1)",
            border: "0.5px solid rgba(48,209,88,0.15)",
            boxShadow: "0 0 8px rgba(48,209,88,0.08), inset 0 0.5px 0 rgba(255,255,255,0.5)",
          }}>
            <div className="status-dot status-connected" />
            <span className="text-xs font-semibold" style={{ color: "#28a745" }}>已连接</span>
            <FiWifi className="w-3.5 h-3.5" style={{ color: "#28a745" }} />
            <button
              onClick={handleDisconnect}
              className="ml-auto px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all duration-200"
              style={{
                background: "rgba(255,59,48,0.08)",
                color: "#ff3b30",
                border: "0.5px solid rgba(255,59,48,0.12)",
              }}
            >
              退出房间
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
