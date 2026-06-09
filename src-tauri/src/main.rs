use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{Manager, State};
use tokio::sync::Mutex;
use base64::Engine;

mod clipboard;
mod clipboard_file;
mod network;
mod settings;

// 应用状态
pub struct AppState {
    pub server: Arc<Mutex<Option<network::Server>>>,
    pub client: Arc<Mutex<Option<network::Client>>>,
    pub clipboard_manager: Arc<Mutex<clipboard::ClipboardManager>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClipboardData {
    #[serde(rename = "type")]
    pub data_type: String,
    pub content: String,
    #[serde(rename = "fileName")]
    pub file_name: Option<String>,
    #[serde(rename = "fileSize")]
    pub file_size: Option<u64>,
}

// 获取本机 IP
#[tauri::command]
async fn get_local_ip() -> Result<String, String> {
    network::get_local_ip().map_err(|e| e.to_string())
}

// 获取设备名称
#[tauri::command]
async fn get_device_name() -> Result<String, String> {
    Ok(hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "未知设备".to_string()))
}

// 读取剪贴板
#[tauri::command]
async fn read_clipboard(
    state: State<'_, AppState>,
) -> Result<Option<ClipboardData>, String> {
    let mut manager = state.clipboard_manager.lock().await;
    manager.read().map_err(|e| e.to_string())
}

// 写入剪贴板文本
#[tauri::command]
async fn write_clipboard_text(
    state: State<'_, AppState>,
    text: String,
) -> Result<(), String> {
    let mut manager = state.clipboard_manager.lock().await;
    manager.write_text(&text).map_err(|e| e.to_string())
}

// 启动服务器
#[tauri::command]
async fn start_server(
    state: State<'_, AppState>,
    port: u16,
) -> Result<String, String> {
    let mut server = state.server.lock().await;
    let mut client = state.client.lock().await;
    let s = network::start_server(port, state.clipboard_manager.clone())
        .await
        .map_err(|e| e.to_string())?;
    let address = s.address.clone();
    let self_client = network::connect_to_server(&address, state.clipboard_manager.clone())
        .await
        .map_err(|e| e.to_string())?;
    *server = Some(s);
    *client = Some(self_client);
    Ok(address)
}

// 连接到服务器
#[tauri::command]
async fn connect_to_server(
    state: State<'_, AppState>,
    address: String,
) -> Result<(), String> {
    let mut client = state.client.lock().await;
    let c = network::connect_to_server(&address, state.clipboard_manager.clone())
        .await
        .map_err(|e| e.to_string())?;
    *client = Some(c);
    Ok(())
}

// 断开连接
#[tauri::command]
async fn sync_clipboard(
    state: State<'_, AppState>,
    data: ClipboardData,
) -> Result<(), String> {
    let client = state.client.lock().await;
    if let Some(client) = client.as_ref() {
        client.send(data).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn disconnect(state: State<'_, AppState>) -> Result<(), String> {
    let mut client = state.client.lock().await;
    if let Some(c) = client.take() {
        c.disconnect().await;
    }
    let mut server = state.server.lock().await;
    if let Some(s) = server.take() {
        s.stop().await;
    }
    Ok(())
}

// 读取设置
#[tauri::command]
fn load_settings() -> settings::AppSettings {
    settings::load_settings()
}

// 保存设置
#[tauri::command]
fn save_settings(new_settings: settings::AppSettings) -> Result<(), String> {
    settings::save_settings(&new_settings)
}

// 选择文件（返回文件路径、名称、大小和 base64 内容）
#[tauri::command]
async fn pick_file() -> Result<Option<ClipboardData>, String> {
    use std::fs;
    use std::path::PathBuf;

    let file = rfd::AsyncFileDialog::new()
        .set_title("选择要发送的文件")
        .pick_file()
        .await;

    let file = match file {
        Some(f) => f,
        None => return Ok(None),
    };

    let path: PathBuf = file.path().to_path_buf();
    let file_name = file.file_name();
    let bytes = fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    let file_size = bytes.len() as u64;
    let base64_content = base64::engine::general_purpose::STANDARD.encode(&bytes);

    // 判断是否是图片
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let is_image = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "ico"].contains(&ext.as_str());

    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "pdf" => "application/pdf",
        "zip" => "application/zip",
        _ => "application/octet-stream",
    };

    let content = format!("data:{};base64,{}", mime, base64_content);

    Ok(Some(ClipboardData {
        data_type: if is_image { "image".to_string() } else { "file".to_string() },
        content,
        file_name: Some(file_name),
        file_size: Some(file_size),
    }))
}

// 保存接收到的文件到本地
#[tauri::command]
async fn save_received_file(
    file_name: String,
    base64_content: String,
) -> Result<String, String> {
    use std::fs;

    // 去掉 data:xxx;base64, 前缀
    let raw = if let Some(idx) = base64_content.find(',') {
        &base64_content[idx + 1..]
    } else {
        &base64_content
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(raw)
        .map_err(|e| format!("解码失败: {}", e))?;

    // 弹出保存对话框
    let file = rfd::AsyncFileDialog::new()
        .set_title("保存文件")
        .set_file_name(&file_name)
        .save_file()
        .await;

    let file = match file {
        Some(f) => f,
        None => return Err("用户取消".to_string()),
    };

    let path = file.path().to_path_buf();
    fs::write(&path, &bytes).map_err(|e| format!("写入文件失败: {}", e))?;

    Ok(path.to_string_lossy().to_string())
}

// 打开文件（用系统默认应用）
#[tauri::command]
async fn open_file_path(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| format!("打开文件失败: {}", e))
}

// 保存文件并写入系统剪贴板（文件管理器可直接粘贴）
#[tauri::command]
async fn save_and_copy_file(
    file_name: String,
    base64_content: String,
) -> Result<String, String> {
    use std::fs;

    let raw = if let Some(idx) = base64_content.find(',') {
        &base64_content[idx + 1..]
    } else {
        &base64_content
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(raw)
        .map_err(|e| format!("解码失败: {}", e))?;

    // 保存到 ~/ClipboardSync/ 目录
    let save_dir = dirs::download_dir()
        .or_else(|| dirs::home_dir())
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("ClipboardSync");

    fs::create_dir_all(&save_dir).map_err(|e| format!("创建目录失败: {}", e))?;

    let save_path = save_dir.join(&file_name);
    fs::write(&save_path, &bytes).map_err(|e| format!("写入文件失败: {}", e))?;

    // 写入系统剪贴板（文件引用）
    clipboard_file::write_file_to_clipboard(&save_path)?;

    Ok(save_path.to_string_lossy().to_string())
}

fn create_floating_window(app: &tauri::AppHandle) -> Result<(), String> {
    if app.get_webview_window("floating").is_some() {
        return Ok(());
    }

    let s = settings::load_settings();
    use tauri::WebviewUrl;
    use tauri::WebviewWindowBuilder;

    let window = WebviewWindowBuilder::new(app, "floating", WebviewUrl::App("/floating".into()))
        .title("")
        .inner_size(s.floating_width.max(320.0), s.floating_height.max(380.0))
        .always_on_top(true)
        .decorations(false)
        .resizable(false)
        .skip_taskbar(true)
        .transparent(true)
        .shadow(true)
        .position(s.floating_x.max(0.0), s.floating_y.max(0.0))
        .build()
        .map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    let _ = window.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(position) = event {
            let mut current = settings::load_settings();
            current.floating_x = position.x as f64;
            current.floating_y = position.y as f64;
            let _ = settings::save_settings(&current);
            let _ = app_handle.get_webview_window("floating");
        }
    });

    let mut s2 = settings::load_settings();
    s2.floating_enabled = true;
    let _ = settings::save_settings(&s2);
    Ok(())
}

// 切换悬浮窗
#[tauri::command]
async fn toggle_floating_window(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("floating") {
        if let Ok(pos) = window.outer_position() {
            let mut s = settings::load_settings();
            s.floating_x = pos.x as f64;
            s.floating_y = pos.y as f64;
            s.floating_enabled = false;
            let _ = settings::save_settings(&s);
        }
        window.close().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        create_floating_window(&app)?;
        Ok(true)
    }
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            server: Arc::new(Mutex::new(None)),
            client: Arc::new(Mutex::new(None)),
            clipboard_manager: Arc::new(Mutex::new(clipboard::ClipboardManager::new())),
        })
        .invoke_handler(tauri::generate_handler![
            get_local_ip,
            get_device_name,
            read_clipboard,
            write_clipboard_text,
            start_server,
            connect_to_server,
            sync_clipboard,
            disconnect,
            toggle_floating_window,
            load_settings,
            save_settings,
            pick_file,
            save_received_file,
            open_file_path,
            save_and_copy_file,
        ])
        .setup(|app| {
            if settings::load_settings().floating_enabled {
                let _ = create_floating_window(&app.handle().clone());
            }

            // 主窗口关闭时，同时保存悬浮窗位置并关闭悬浮窗
            if let Some(main_window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                main_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { .. } = event {
                        if let Some(floating) = app_handle.get_webview_window("floating") {
                            if let Ok(pos) = floating.outer_position() {
                                let mut s = settings::load_settings();
                                s.floating_x = pos.x as f64;
                                s.floating_y = pos.y as f64;
                                let _ = settings::save_settings(&s);
                            }
                            let _ = floating.destroy();
                        }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
