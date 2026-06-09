import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "../store/appStore";
import {
  FiCopy,
  FiCheck,
  FiType,
  FiImage,
  FiFile,
  FiClock,
} from "react-icons/fi";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

export default function FloatingSync() {
  const { pendingSyncItems, removePendingSyncItem, clearPendingSyncItems } =
    useAppStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FiType className="w-3.5 h-3.5" />;
      case "image":
        return <FiImage className="w-3.5 h-3.5" />;
      case "file":
        return <FiFile className="w-3.5 h-3.5" />;
      default:
        return <FiCopy className="w-3.5 h-3.5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "text":
        return { color: "#007aff", bg: "rgba(0,122,255,0.08)" };
      case "image":
        return { color: "#af52de", bg: "rgba(175,82,222,0.08)" };
      case "file":
        return { color: "#ff9500", bg: "rgba(255,149,0,0.08)" };
      default:
        return { color: "#8e8e93", bg: "rgba(142,142,147,0.08)" };
    }
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await invoke("write_clipboard_text", { text: content });
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId(null);
        removePendingSyncItem(id);
      }, 800);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  const handleDrag = async () => {
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      // 静默处理
    }
  };

  return (
    <div
      className="h-screen flex flex-col select-none relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, rgba(240,242,250,0.96) 0%, rgba(248,246,252,0.95) 50%, rgba(240,248,245,0.94) 100%)",
        backdropFilter: "blur(80px) saturate(2) brightness(1.08)",
        WebkitBackdropFilter: "blur(80px) saturate(2) brightness(1.08)",
        borderRadius: "14px",
        border: "0.5px solid rgba(255,255,255,0.6)",
        boxShadow: "0 12px 48px rgba(0,0,0,0.14), inset 0 0.5px 0 rgba(255,255,255,0.9), inset 0 -0.5px 0 rgba(0,0,0,0.03)",
      }}
    >
      {/* 顶部液态高光线 */}
      <div className="absolute top-0 left-[8%] right-[8%] h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)" }} />

      {/* 标题栏 - 拖拽区域 */}
      <div className="px-3 py-2 cursor-grab active:cursor-grabbing"
        onMouseDown={handleDrag}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: "rgba(0,122,255,0.1)" }}>
              <FiCopy className="w-3 h-3" style={{ color: "#007aff" }} />
            </div>
            <span className="text-[13px] font-bold tracking-tight" style={{ color: "#1d1d1f" }}>
              同步内容
            </span>
            {pendingSyncItems.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "#007aff", color: "#fff" }}>
                {pendingSyncItems.length}
              </span>
            )}
          </div>
          {pendingSyncItems.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); clearPendingSyncItems(); }}
              className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors"
              style={{ color: "#8e8e93" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,59,48,0.06)"; e.currentTarget.style.color = "#ff3b30"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8e8e93"; }}
            >
              清空
            </button>
          )}
        </div>
      </div>

      {/* 内容列表 */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {pendingSyncItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "rgba(0,0,0,0.03)" }}
            >
              <FiCopy className="w-6 h-6" style={{ color: "#d1d1d6" }} />
            </div>
            <p className="text-[12px] font-medium" style={{ color: "#8e8e93" }}>
              暂无同步内容
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "#c7c7cc" }}>
              其他设备复制的内容会出现在这里
            </p>
          </div>
        ) : (
          pendingSyncItems.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl transition-all duration-200 group"
              style={{
                background: "rgba(255,255,255,0.5)",
                backdropFilter: "blur(12px)",
                border: "0.5px solid rgba(255,255,255,0.5)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04), inset 0 0.5px 0 rgba(255,255,255,0.7)",
              }}
            >
              <div className="flex items-start gap-2.5">
                {/* 类型图标 */}
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: getTypeColor(item.type).bg,
                    color: getTypeColor(item.type).color,
                  }}
                >
                  {getIcon(item.type)}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12px] line-clamp-2 leading-relaxed"
                    style={{ color: "#3a3a3c" }}
                  >
                    {item.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px]" style={{ color: "#8e8e93" }}>
                      {item.sourceDevice}
                    </span>
                    <span style={{ color: "#d1d1d6" }}>·</span>
                    <span
                      className="text-[9px] flex items-center gap-0.5"
                      style={{ color: "#8e8e93" }}
                    >
                      <FiClock className="w-2.5 h-2.5" />
                      {dayjs(item.timestamp).fromNow()}
                    </span>
                  </div>
                </div>

                {/* 复制按钮 */}
                <button
                  onClick={() => handleCopy(item.content, item.id)}
                  className="flex-shrink-0 p-2 rounded-lg transition-all duration-200"
                  style={{
                    background:
                      copiedId === item.id
                        ? "rgba(48,209,88,0.1)"
                        : "rgba(0,122,255,0.06)",
                    color: copiedId === item.id ? "#30d158" : "#007aff",
                  }}
                  title="点击复制"
                >
                  {copiedId === item.id ? (
                    <FiCheck className="w-3.5 h-3.5" />
                  ) : (
                    <FiCopy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
