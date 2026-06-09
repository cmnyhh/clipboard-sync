use std::path::Path;

/// 把本地文件路径写入系统剪贴板，使文件管理器能直接「粘贴」该文件
pub fn write_file_to_clipboard(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err(format!("文件不存在: {}", path.display()));
    }

    #[cfg(target_os = "linux")]
    {
        linux::write_file(path)
    }

    #[cfg(target_os = "macos")]
    {
        macos::write_file(path)
    }

    #[cfg(target_os = "windows")]
    {
        windows::write_file(path)
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        Err("不支持的平台".to_string())
    }
}

// ───────────────────────── Linux ─────────────────────────
#[cfg(target_os = "linux")]
mod linux {
    use std::path::Path;
    use std::process::Command;

    pub fn write_file(path: &Path) -> Result<(), String> {
        // 方案1: 优先用 xclip (X11)
        if try_xclip(path).is_ok() {
            return Ok(());
        }
        // 方案2: 用 xsel
        if try_xsel(path).is_ok() {
            return Ok(());
        }
        // 方案3: 用 wl-copy (Wayland)
        if try_wl_copy(path).is_ok() {
            return Ok(());
        }
        Err("需要安装 xclip、xsel 或 wl-clipboard 才能复制文件引用".to_string())
    }

    fn try_xclip(path: &Path) -> Result<(), String> {
        // xclip 支持写入 text/uri-list 和 x-special/gnome-copied-files
        let uri = format!("file://{}", path.display());

        // 先写 gnome-copied-files（GNOME/Nautilus 识别）
        let gnome_data = format!("copy\n{}", uri);
        let status = Command::new("xclip")
            .args(["-selection", "clipboard", "-t", "x-special/gnome-copied-files"])
            .arg(&gnome_data)
            .status();

        match status {
            Ok(s) if s.success() => {
                // 同时写入 text/uri-list（Thunar/Dolphin 等识别）
                let _ = Command::new("xclip")
                    .args(["-selection", "clipboard", "-t", "text/uri-list"])
                    .arg(&uri)
                    .status();
                Ok(())
            }
            _ => Err("xclip 执行失败".to_string()),
        }
    }

    fn try_xsel(path: &Path) -> Result<(), String> {
        let uri = format!("file://{}", path.display());
        let status = Command::new("xsel")
            .args(["--clipboard", "--input"])
            .arg(&uri)
            .status();

        match status {
            Ok(s) if s.success() => Ok(()),
            _ => Err("xsel 执行失败".to_string()),
        }
    }

    fn try_wl_copy(path: &Path) -> Result<(), String> {
        let uri = format!("file://{}", path.display());
        let status = Command::new("wl-copy")
            .args(["--type", "text/uri-list"])
            .arg(&uri)
            .status();

        match status {
            Ok(s) if s.success() => Ok(()),
            _ => Err("wl-copy 执行失败".to_string()),
        }
    }
}

// ───────────────────────── macOS ─────────────────────────
#[cfg(target_os = "macos")]
mod macos {
    use std::path::Path;

    pub fn write_file(path: &Path) -> Result<(), String> {
        // 使用 objc2 + AppKit 桥接 NSPasteboard
        // 这里用最简单的方案：运行 osascript
        use std::process::Command;

        let path_str = path.to_string_lossy();
        let script = format!(
            r#"use framework "AppKit"
            set pb to current application's NSPasteboard's generalPasteboard
            set fileURL to current application's NSURL's fileURLWithPath:"{}"
            pb clearContents()
            pb writeObjects:[fileURL]"#,
            path_str.replace('"', "\\\"")
        );

        let status = Command::new("osascript")
            .args(["-l", "AppleScript", "-e", &script])
            .status();

        match status {
            Ok(s) if s.success() => Ok(()),
            _ => {
                // 备用方案：用 pbcopy + Finder AppleScript
                fallback_finder(path)
            }
        }
    }

    fn fallback_finder(path: &Path) -> Result<(), String> {
        use std::process::Command;

        let path_str = path.to_string_lossy();
        let script = format!(
            r#"tell application "Finder"
                set f to POSIX file "{}" as alias
                set selection to {{f}}
                activate
            end tell"#,
            path_str.replace('"', "\\\"")
        );

        let status = Command::new("osascript")
            .args(["-e", &script])
            .status();

        match status {
            Ok(s) if s.success() => Ok(()),
            _ => Err("macOS 文件复制失败".to_string()),
        }
    }
}

// ───────────────────────── Windows ─────────────────────────
#[cfg(target_os = "windows")]
mod windows {
    use std::path::Path;

    pub fn write_file(path: &Path) -> Result<(), String> {
        // Windows: 使用 PowerShell 设置 CF_HDROP
        use std::process::Command;

        let path_str = path.to_string_lossy().replace('/', "\\");
        let ps_script = format!(
            r#"
            Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ClipboardHelper {{
    [DllImport("user32.dll")]
    public static extern bool OpenClipboard(IntPtr hWndNewOwner);
    [DllImport("user32.dll")]
    public static extern bool CloseClipboard();
    [DllImport("user32.dll")]
    public static extern bool EmptyClipboard();
    [DllImport("user32.dll")]
    public static extern IntPtr SetClipboardData(uint uFormat, IntPtr hMem);
    [DllImport("kernel32.dll")]
    public static extern IntPtr GlobalAlloc(uint uFlags, UIntPtr dwBytes);
    [DllImport("kernel32.dll")]
    public static extern IntPtr GlobalLock(IntPtr hMem);
    [DllImport("kernel32.dll")]
    public static extern bool GlobalUnlock(IntPtr hMem);
}}
"@
            $CF_HDROP = 15
            $file = [System.IO.Path]::GetFullPath("{}")
            # 使用 .NET Clipboard API 更可靠
            Add-Type -AssemblyName System.Windows.Forms
            $files = New-Object System.Collections.Specialized.StringCollection
            $files.Add($file) | Out-Null
            [System.Windows.Forms.Clipboard]::SetFileDropList($files)
            "#,
            path_str.replace('"', "`\"")
        );

        let status = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_script])
            .status();

        match status {
            Ok(s) if s.success() => Ok(()),
            _ => Err("Windows 文件复制失败".to_string()),
        }
    }
}
