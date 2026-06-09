use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(alias = "auto_sync")]
    pub auto_sync: bool,
    #[serde(alias = "sync_text")]
    pub sync_text: bool,
    #[serde(alias = "sync_images")]
    pub sync_images: bool,
    #[serde(alias = "sync_files")]
    pub sync_files: bool,
    #[serde(alias = "sync_mode")]
    pub sync_mode: String,
    #[serde(alias = "floating_enabled")]
    pub floating_enabled: bool,
    #[serde(alias = "floating_x")]
    pub floating_x: f64,
    #[serde(alias = "floating_y")]
    pub floating_y: f64,
    #[serde(alias = "floating_width")]
    pub floating_width: f64,
    #[serde(alias = "floating_height")]
    pub floating_height: f64,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_sync: true,
            sync_text: true,
            sync_images: true,
            sync_files: true,
            sync_mode: "manual".to_string(),
            floating_enabled: false,
            floating_x: 800.0,
            floating_y: 100.0,
            floating_width: 340.0,
            floating_height: 420.0,
        }
    }
}

fn settings_path() -> PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("clipboard-sync");
    fs::create_dir_all(&path).ok();
    path.push("settings.json");
    path
}

pub fn load_settings() -> AppSettings {
    let path = settings_path();
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => AppSettings::default(),
    }
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = settings_path();
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::AppSettings;

    #[test]
    fn parses_camel_case_settings() {
        let json = r#"{
            "autoSync": false,
            "syncText": false,
            "syncImages": true,
            "syncFiles": false,
            "syncMode": "auto",
            "floatingEnabled": true,
            "floatingX": 123.0,
            "floatingY": 456.0,
            "floatingWidth": 340.0,
            "floatingHeight": 420.0
        }"#;

        let settings: AppSettings = serde_json::from_str(json).unwrap();
        assert!(!settings.auto_sync);
        assert!(!settings.sync_text);
        assert!(settings.floating_enabled);
        assert_eq!(settings.sync_mode, "auto");
    }

    #[test]
    fn parses_legacy_snake_case_settings() {
        let json = r#"{
            "auto_sync": true,
            "sync_text": true,
            "sync_images": false,
            "sync_files": true,
            "sync_mode": "manual",
            "floating_enabled": false,
            "floating_x": 100.0,
            "floating_y": 200.0,
            "floating_width": 300.0,
            "floating_height": 400.0
        }"#;

        let settings: AppSettings = serde_json::from_str(json).unwrap();
        assert!(settings.auto_sync);
        assert!(settings.sync_text);
        assert!(!settings.floating_enabled);
        assert_eq!(settings.floating_x, 100.0);
    }
}
