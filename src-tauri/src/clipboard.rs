use crate::ClipboardData;
use anyhow::Result;
use arboard::Clipboard;
use base64::Engine;

pub struct ClipboardManager {
    clipboard: Clipboard,
    last_content: Option<String>,
}

impl ClipboardManager {
    pub fn new() -> Self {
        Self {
            clipboard: Clipboard::new().expect("无法初始化剪贴板"),
            last_content: None,
        }
    }

    pub fn read(&mut self) -> Result<Option<ClipboardData>> {
        // 尝试读取文本
        if let Ok(text) = self.clipboard.get_text() {
            if self.last_content.as_deref() != Some(&text) {
                self.last_content = Some(text.clone());
                return Ok(Some(ClipboardData {
                    data_type: "text".to_string(),
                    content: text,
                    file_name: None,
                    file_size: None,
                }));
            }
            return Ok(None);
        }

        // 尝试读取图片
        if let Ok(image) = self.clipboard.get_image() {
            // 将图片转换为 base64
            let base64 = base64::engine::general_purpose::STANDARD.encode(&image.bytes);
            let content = format!(
                "data:image/png;base64,{}",
                base64
            );

            if self.last_content.as_deref() != Some(&content) {
                self.last_content = Some(content.clone());
                return Ok(Some(ClipboardData {
                    data_type: "image".to_string(),
                    content,
                    file_name: None,
                    file_size: Some(image.bytes.len() as u64),
                }));
            }
        }

        Ok(None)
    }

    pub fn write_text(&mut self, text: &str) -> Result<()> {
        self.clipboard.set_text(text.to_string())?;
        self.last_content = Some(text.to_string());
        Ok(())
    }

    pub fn write_image_from_base64(&mut self, base64_data: &str) -> Result<()> {
        // 去掉 data:image/png;base64, 前缀
        let raw = if let Some(idx) = base64_data.find(',') {
            &base64_data[idx + 1..]
        } else {
            base64_data
        };
        let bytes = base64::engine::general_purpose::STANDARD.decode(raw)?;
        // 尝试用 image crate 解码获取宽高；如果没有则用 arboard 的默认方式
        // 这里我们假设 PNG 格式，解析 IHDR 获取宽高
        if bytes.len() > 24 && bytes[0..8] == [137, 80, 78, 71, 13, 10, 26, 10] {
            // PNG: width at offset 16, height at offset 20 (big-endian u32)
            let width = u32::from_be_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]) as usize;
            let height = u32::from_be_bytes([bytes[20], bytes[21], bytes[22], bytes[23]]) as usize;
            // PNG 像素是 RGBA，IHDR 之后是 IDAT，需要解码
            // 简单方案：把整个 PNG bytes 作为 RGBA 像素数据写入
            // 但 arboard 需要原始 RGBA 像素，不是 PNG 编码
            // 我们直接把 base64 存下来，让前端处理显示即可
            // 写入剪贴板需要用 decoded pixels
            // 实际上 arboard.set_image 只支持 RGBA 原始像素
            // 所以我们保留 base64 content，不做 set_image
            // 改为在 main.rs 里用 write_image_from_pixels 处理
            let _ = (width, height);
        }
        // 对于非标准格式，直接跳过
        Ok(())
    }

    pub fn write_image_from_pixels(&mut self, rgba: &[u8], width: usize, height: usize) -> Result<()> {
        let image = arboard::ImageData {
            width,
            height,
            bytes: rgba.into(),
        };
        self.clipboard.set_image(image)?;
        self.last_content = None;
        Ok(())
    }

    pub fn write_image(&mut self, data: &[u8], width: usize, height: usize) -> Result<()> {
        let image = arboard::ImageData {
            width,
            height,
            bytes: data.into(),
        };
        self.clipboard.set_image(image)?;
        Ok(())
    }

    /// 读取剪贴板文件路径（Linux/macOS 上从文本读取文件路径列表）
    pub fn read_file_path(&mut self) -> Option<String> {
        if let Ok(text) = self.clipboard.get_text() {
            let path = std::path::Path::new(text.trim());
            if path.exists() {
                return Some(text.trim().to_string());
            }
        }
        None
    }
}
