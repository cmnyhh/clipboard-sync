import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store/appStore";
import {
  FiCopy,
  FiFile,
  FiImage,
  FiType,
  FiSend,
  FiClock,
  FiClipboard,
  FiCheck,
} from "react-icons/fi";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

export default function ClipboardPanel() {
  const {
    clipboardHistory,
    addClipboardItem,
    pendingSyncItems,
    removePendingSyncItem,
    clearPendingSyncItems,
    networkContent,
    setNetworkContent,
    skipSyncContent,
    setSkipSyncContent,
    skipNextPoll,
    setSkipNextPoll,
  } = useAppStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingExpanded, setPendingExpanded] = useState(false);

  // 防抖监听剪贴板变化
  // 检测到变化后等待 500ms 稳定才记录，避免快速连续复制产生多条记录
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastContent = "";

    const checkClipboard = async () => {
      // 如果标记了跳过本轮轮询
      if (useAppStore.getState().skipNextPoll) {
        useAppStore.getState().setSkipNextPoll(false);
        return;
      }
      try {
        const content = await invoke<{
          type: string;
          content: string;
          fileName?: string;
          fileSize?: number;
        } | null>("read_clipboard");

        if (content && content.content !== lastContent) {
          lastContent = content.content;

          // 如果内容来自网络（防循环），跳过同步
          if (networkContent && content.content === networkContent) {
            setNetworkContent(null);
            return;
          }
          // 如果是程序写入的内容（如文件URI），跳过同步
          if (skipSyncContent && content.content === skipSyncContent) {
            setSkipSyncContent(null);
            return;
          }

          // 防抖：清除上一个定时器，重新计时
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            try {
              await invoke("sync_clipboard", { data: content });
            } catch (err) {
              console.error("同步到房间失败:", err);
            }
            addClipboardItem({
              id: Date.now().toString(),
              type: content.type as "text" | "image" | "file",
              content: content.content,
              fileName: content.fileName,
              fileSize: content.fileSize,
              timestamp: Date.now(),
              sourceDevice: "本机",
              synced: false,
            });
          }, 500);
        }
      } catch (err) {
        // 静默处理错误
      }
    };

    const interval = setInterval(checkClipboard, 1000);
    return () => {
      clearInterval(interval);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  const copyToClipboard = async (content: string, id: string) => {
    try {
      await invoke("write_clipboard_text", { text: content });
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  // 发送选中的文件
  const handlePickFile = async () => {
    try {
      const file = await invoke<{
        type: string;
        content: string;
        fileName?: string;
        fileSize?: number;
      } | null>("pick_file");
      if (file) {
        // 跳过下一次轮询（文件对话框可能写入剪贴板）
        setSkipNextPoll(true);
        await invoke("sync_clipboard", { data: file });
        addClipboardItem({
          id: Date.now().toString(),
          type: file.type as "text" | "image" | "file",
          content: file.content,
          fileName: file.fileName,
          fileSize: file.fileSize,
          timestamp: Date.now(),
          sourceDevice: "本机",
          synced: false,
        });
      }
    } catch (err) {
      console.error("选择文件失败:", err);
    }
  };

  // 保存接收到的文件
  const handleSaveFile = async (fileName: string, content: string) => {
    try {
      const path = await invoke<string>("save_received_file", { fileName, base64Content: content });
      console.log("文件已保存到:", path);
    } catch (err) {
      console.error("保存文件失败:", err);
    }
  };

  // 保存文件并写入剪贴板（文件管理器可直接粘贴）
  const handleSaveAndCopy = async (fileName: string, content: string) => {
    try {
      const path = await invoke<string>("save_and_copy_file", { fileName, base64Content: content });
      // 标记文件URI，防止轮询把它当文本同步出去
      setSkipSyncContent(`file://${path}`);
      console.log("文件已保存并复制到剪贴板:", path);
    } catch (err) {
      console.error("保存并复制失败:", err);
    }
  };

  // 应用待接收项：写入剪贴板 + 移入历史
  const applyPendingItem = async (item: typeof pendingSyncItems[0]) => {
    try {
      if (item.type === "text") {
        await invoke("write_clipboard_text", { text: item.content });
        // 标记文本内容，防止轮询同步回来源设备
        setSkipSyncContent(item.content);
      }
      addClipboardItem({ ...item, synced: true });
      removePendingSyncItem(item.id);
    } catch (err) {
      console.error("应用失败:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FiType className="w-4 h-4" />;
      case "image":
        return <FiImage className="w-4 h-4" />;
      case "file":
        return <FiFile className="w-4 h-4" />;
      default:
        return <FiCopy className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "text":
        return { color: "#007aff", bg: "rgba(0,122,255,0.06)", border: "rgba(0,122,255,0.1)" };
      case "image":
        return { color: "#af52de", bg: "rgba(175,82,222,0.06)", border: "rgba(175,82,222,0.1)" };
      case "file":
        return { color: "#ff9500", bg: "rgba(255,149,0,0.06)", border: "rgba(255,149,0,0.1)" };
      default:
        return { color: "#8e8e93", bg: "rgba(142,142,147,0.06)", border: "rgba(142,142,147,0.1)" };
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 animate-slide-in-up min-h-0">
      {/* 待接收队列 - 折叠徽标 */}
      {pendingSyncItems.length > 0 && (
        <div className="glass-card overflow-hidden" style={{
          background: "rgba(0,122,255,0.03)",
          borderColor: "rgba(0,122,255,0.12)",
        }}>
          {/* 标题栏 - 点击展开/折叠 */}
          <button
            onClick={() => setPendingExpanded(!pendingExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,122,255,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center relative"
                style={{ background: "rgba(0,122,255,0.08)" }}>
                <FiSend className="w-3 h-3" style={{ color: "#007aff" }} />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ background: "#007aff" }}>
                  {pendingSyncItems.length}
                </span>
              </div>
              <span className="text-[12px] font-semibold" style={{ color: "#007aff" }}>
                {pendingSyncItems.length} 条待接收
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: "#8e8e93" }}>
                {pendingExpanded ? "收起" : "展开"}
              </span>
              <svg className="w-3 h-3 transition-transform duration-200"
                style={{ color: "#8e8e93", transform: pendingExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* 展开内容 */}
          {pendingExpanded && (
            <div className="px-4 pb-3 space-y-1.5 border-t" style={{ borderColor: "rgba(0,122,255,0.06)" }}>
              <div className="pt-2 space-y-1.5 max-h-36 overflow-y-auto">
                {pendingSyncItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                    style={{ background: "rgba(255,255,255,0.4)" }}>
                    {/* 图片缩略图 */}
                    {item.type === "image" && item.content.startsWith("data:") ? (
                      <img src={item.content} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : item.type === "file" ? (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(255,149,0,0.08)" }}>
                        <FiFile className="w-5 h-5" style={{ color: "#ff9500" }} />
                      </div>
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] line-clamp-1" style={{ color: "#3a3a3c" }}>
                        {item.type === "file" ? (item.fileName || "未知文件") : item.type === "image" ? "图片" : item.content}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#8e8e93" }}>
                        来自 {item.sourceDevice}
                        {item.fileSize ? ` · ${((item.fileSize || 0) / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {item.type === "file" ? (
                        <button
                          onClick={() => handleSaveAndCopy(item.fileName || "file", item.content)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                          style={{
                            background: "linear-gradient(180deg, #ff9f0a, #ff9500)",
                            color: "#fff",
                            boxShadow: "0 1px 3px rgba(255,149,0,0.2)",
                          }}
                        >
                          保存并粘贴
                        </button>
                      ) : (
                        <button
                          onClick={() => applyPendingItem(item)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                          style={{
                            background: "linear-gradient(180deg, #3395ff, #007aff)",
                            color: "#fff",
                            boxShadow: "0 1px 3px rgba(0,122,255,0.2)",
                          }}
                        >
                          应用
                        </button>
                      )}
                      <button
                        onClick={() => removePendingSyncItem(item.id)}
                        className="text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
                        style={{ color: "#8e8e93" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,59,48,0.06)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        忽略
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={clearPendingSyncItems}
                className="w-full text-center text-[11px] font-medium py-1.5 rounded-lg transition-colors"
                style={{ color: "#8e8e93" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,59,48,0.05)"; e.currentTarget.style.color = "#ff3b30"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8e8e93"; }}
              >
                全部忽略
              </button>
            </div>
          )}
        </div>
      )}

      {/* 剪贴板历史 */}
      <div className="flex-1 min-h-0 glass-card p-5 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.03)" }}>
              <FiClipboard className="w-4 h-4" style={{ color: "#8e8e93" }} />
            </div>
            <h2 className="text-[13px] font-bold tracking-tight" style={{ color: "#1d1d1f" }}>剪贴板历史</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePickFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: "rgba(255,149,0,0.06)",
                color: "#ff9500",
                border: "0.5px solid rgba(255,149,0,0.1)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,149,0,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,149,0,0.06)"; }}
            >
              <FiFile className="w-3 h-3" />
              发送文件
            </button>
            <span className="tag-muted text-[11px]">
              {clipboardHistory.length} 条记录
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {clipboardHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(0,0,0,0.03)" }}>
                <FiClipboard className="w-8 h-8" style={{ color: "#d1d1d6" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#8e8e93" }}>暂无剪贴板记录</p>
              <p className="text-xs mt-1" style={{ color: "#c7c7cc" }}>复制内容后将自动显示在这里</p>
            </div>
          ) : (
            clipboardHistory.map((item, index) => (
              <div
                key={item.id}
                className="clipboard-item group animate-slide-in-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-start gap-3">
                  {/* 类型图标 */}
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: getTypeColor(item.type).bg,
                      border: `0.5px solid ${getTypeColor(item.type).border}`,
                      color: getTypeColor(item.type).color,
                    }}
                  >
                    {getIcon(item.type)}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: getTypeColor(item.type).bg,
                          color: getTypeColor(item.type).color,
                          border: `0.5px solid ${getTypeColor(item.type).border}`,
                        }}
                      >
                        {item.type === "text"
                          ? "文本"
                          : item.type === "image"
                          ? "图片"
                          : "文件"}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {dayjs(item.timestamp).fromNow()}
                      </span>
                      {item.synced && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <FiSend className="w-3 h-3" />
                          已同步
                        </span>
                      )}
                    </div>

                    {item.type === "text" ? (
                      <p className="text-[13px] line-clamp-2 break-all leading-relaxed" style={{ color: "#48484a" }}>
                        {item.content}
                      </p>
                    ) : item.type === "file" ? (
                      <div className="flex items-center gap-2 text-[13px]" style={{ color: "#48484a" }}>
                        <FiFile className="w-4 h-4" style={{ color: "#ff9500" }} />
                        <span className="font-medium">{item.fileName}</span>
                        <span className="text-xs" style={{ color: "#8e8e93" }}>
                          ({((item.fileSize || 0) / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          onClick={() => handleSaveFile(item.fileName || "file", item.content)}
                          className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all"
                          style={{
                            background: "rgba(255,149,0,0.08)",
                            color: "#ff9500",
                            border: "0.5px solid rgba(255,149,0,0.15)",
                          }}
                        >
                          另存为
                        </button>
                        <button
                          onClick={() => handleSaveAndCopy(item.fileName || "file", item.content)}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all"
                          style={{
                            background: "rgba(0,122,255,0.08)",
                            color: "#007aff",
                            border: "0.5px solid rgba(0,122,255,0.15)",
                          }}
                        >
                          复制粘贴
                        </button>
                      </div>
                    ) : item.type === "image" && item.content.startsWith("data:") ? (
                      <img src={item.content} alt="图片" className="max-h-24 rounded-lg object-contain" />
                    ) : (
                      <p className="text-[13px] italic" style={{ color: "#8e8e93" }}>[图片内容]</p>
                    )}

                    <p className="text-[10px] mt-1.5" style={{ color: "#c7c7cc" }}>
                      来自 {item.sourceDevice}
                    </p>
                  </div>

                  {/* 复制按钮 */}
                  <button
                    onClick={() => copyToClipboard(item.content, item.id)}
                    className={`flex-shrink-0 p-2 rounded-xl transition-all duration-300 ${
                      copiedId === item.id
                        ? "bg-emerald-500/10 text-emerald-400 opacity-100"
                        : "opacity-0 group-hover:opacity-100 hover:bg-slate-700/50 text-slate-400"
                    }`}
                    title="复制到剪贴板"
                  >
                    {copiedId === item.id ? (
                      <FiCheck className="w-4 h-4" />
                    ) : (
                      <FiCopy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
