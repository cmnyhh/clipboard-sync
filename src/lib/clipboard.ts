import { invoke } from "@tauri-apps/api/core";

export interface ClipboardData {
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
  fileSize?: number;
}

// 读取剪贴板内容
export async function readClipboard(): Promise<ClipboardData | null> {
  try {
    const result = await invoke<ClipboardData>("read_clipboard");
    return result;
  } catch (err) {
    console.error("读取剪贴板失败:", err);
    return null;
  }
}

// 写入剪贴板内容
export async function writeClipboard(data: ClipboardData): Promise<boolean> {
  try {
    await invoke("write_clipboard", { data });
    return true;
  } catch (err) {
    console.error("写入剪贴板失败:", err);
    return false;
  }
}

// 连接到服务器
export async function connectToServer(address: string): Promise<boolean> {
  try {
    await invoke("connect_to_server", { address });
    return true;
  } catch (err) {
    console.error("连接失败:", err);
    return false;
  }
}

// 启动服务器
export async function startServer(port: number): Promise<string> {
  try {
    const address = await invoke<string>("start_server", { port });
    return address;
  } catch (err) {
    console.error("启动服务器失败:", err);
    throw err;
  }
}

// 断开连接
export async function disconnect(): Promise<void> {
  try {
    await invoke("disconnect");
  } catch (err) {
    console.error("断开连接失败:", err);
  }
}

// 发送剪贴板内容到指定设备
export async function sendClipboard(
  deviceId: string,
  data: ClipboardData
): Promise<boolean> {
  try {
    await invoke("send_clipboard", { deviceId, data });
    return true;
  } catch (err) {
    console.error("发送失败:", err);
    return false;
  }
}
