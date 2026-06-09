use crate::ClipboardData;
use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use local_ip_address::local_ip;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, mpsc, Mutex};
use tokio_tungstenite::{accept_async, connect_async, tungstenite::Message};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncMessage {
    pub device_id: String,
    pub device_name: String,
    pub data: ClipboardData,
}

pub struct Server {
    pub address: String,
    shutdown_tx: broadcast::Sender<()>,
}

impl Server {
    pub async fn stop(&self) {
        let _ = self.shutdown_tx.send(());
    }
}

pub struct Client {
    tx: mpsc::Sender<Message>,
}

impl Client {
    pub async fn disconnect(&self) {
        let _ = self.tx.send(Message::Close(None)).await;
    }

    pub async fn send(&self, data: crate::ClipboardData) -> Result<()> {
        let device_id = hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string());
        let message = SyncMessage {
            device_id: device_id.clone(),
            device_name: device_id,
            data,
        };
        let payload = serde_json::to_string(&message)?;
        self.tx.send(Message::Text(payload)).await?;
        Ok(())
    }
}

fn private_ipv4_priority(ip: std::net::IpAddr) -> u8 {
    if let std::net::IpAddr::V4(addr) = ip {
        let [a, b, _, _] = addr.octets();
        if a == 192 && b == 168 {
            return 0;
        }
        if a == 172 && (16..=31).contains(&b) {
            return 1;
        }
        if a == 10 {
            return 2;
        }
    }
    3
}

fn is_virtual_interface(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.starts_with("lo")
        || lower.starts_with("tun")
        || lower.starts_with("tap")
        || lower.starts_with("docker")
        || lower.starts_with("br-")
        || lower.starts_with("veth")
        || lower.starts_with("virbr")
        || lower.starts_with("wg")
        || lower.starts_with("tailscale")
}

fn choose_preferred_local_ip(
    ips: impl IntoIterator<Item = (String, std::net::IpAddr)>,
) -> Option<String> {
    ips.into_iter()
        .filter(|(name, ip)| !is_virtual_interface(name) && !ip.is_loopback() && ip.is_ipv4())
        .min_by_key(|(name, ip)| (private_ipv4_priority(*ip), name.clone(), ip.to_string()))
        .map(|(_, ip)| ip.to_string())
}

fn fallback_via_udp_socket() -> Option<String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let ip = socket.local_addr().ok()?.ip();
    if ip.is_loopback() || !ip.is_ipv4() {
        return None;
    }
    Some(ip.to_string())
}

pub fn get_local_ip() -> Result<String> {
    if let Ok(ifs) = local_ip_address::list_afinet_netifas() {
        if let Some(ip) = choose_preferred_local_ip(ifs) {
            return Ok(ip);
        }
    }

    if let Ok(ip) = local_ip() {
        if !ip.is_loopback() && ip.is_ipv4() {
            return Ok(ip.to_string());
        }
    }

    if let Some(ip) = fallback_via_udp_socket() {
        return Ok(ip);
    }

    Ok("127.0.0.1".to_string())
}

#[cfg(test)]
mod tests {
    use super::{choose_preferred_local_ip, is_virtual_interface};
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

    #[test]
    fn prefers_non_loopback_ipv4() {
        let ips = vec![
            ("tun0".to_string(), IpAddr::V6(Ipv6Addr::LOCALHOST)),
            ("tun0".to_string(), IpAddr::V4(Ipv4Addr::new(172, 17, 0, 1))),
            ("wlp0s20f3".to_string(), IpAddr::V4(Ipv4Addr::new(192, 168, 1, 10))),
            ("lo".to_string(), IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1))),
        ];

        assert_eq!(
            choose_preferred_local_ip(ips),
            Some("192.168.1.10".to_string())
        );
    }

    #[test]
    fn ignores_virtual_tunnel_interfaces() {
        assert!(is_virtual_interface("tun0"));
        assert!(is_virtual_interface("docker0"));
        assert!(!is_virtual_interface("wlp0s20f3"));
    }

    #[test]
    fn prefers_192_private_network_over_172() {
        let ips = vec![
            ("tun0".to_string(), IpAddr::V4(Ipv4Addr::new(172, 18, 0, 5))),
            ("wlp0s20f3".to_string(), IpAddr::V4(Ipv4Addr::new(192, 168, 50, 40))),
        ];

        assert_eq!(
            choose_preferred_local_ip(ips),
            Some("192.168.50.40".to_string())
        );
    }
}

pub async fn start_server(
    port: u16,
    clipboard_manager: Arc<Mutex<crate::clipboard::ClipboardManager>>,
) -> Result<Server> {
    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr).await?;
    let local_ip = get_local_ip()?;
    let address = format!("{}:{}", local_ip, port);

    let (shutdown_tx, _) = broadcast::channel(1);
    let (sync_tx, _) = broadcast::channel::<SyncMessage>(64);
    let shutdown_rx = shutdown_tx.subscribe();

    tokio::spawn(accept_connections(
        listener,
        clipboard_manager,
        sync_tx,
        shutdown_rx,
    ));

    Ok(Server {
        address,
        shutdown_tx,
    })
}

async fn accept_connections(
    listener: TcpListener,
    clipboard_manager: Arc<Mutex<crate::clipboard::ClipboardManager>>,
    sync_tx: broadcast::Sender<SyncMessage>,
    mut shutdown: broadcast::Receiver<()>,
) {
    loop {
        tokio::select! {
            result = listener.accept() => {
                match result {
                    Ok((stream, addr)) => {
                        println!("新连接: {}", addr);
                        let cm = clipboard_manager.clone();
                        let sync_tx = sync_tx.clone();
                        tokio::spawn(handle_connection(stream, cm, sync_tx));
                    }
                    Err(e) => {
                        eprintln!("接受连接失败: {}", e);
                    }
                }
            }
            _ = shutdown.recv() => {
                println!("服务器关闭");
                break;
            }
        }
    }
}

async fn handle_connection(
    stream: TcpStream,
    clipboard_manager: Arc<Mutex<crate::clipboard::ClipboardManager>>,
    sync_tx: broadcast::Sender<SyncMessage>,
) -> Result<()> {
    let ws_stream = accept_async(stream).await?;
    let (write, mut read) = ws_stream.split();
    let (out_tx, mut out_rx) = mpsc::channel::<Message>(32);

    let mut write = write;
    tokio::spawn(async move {
        while let Some(msg) = out_rx.recv().await {
            if let Err(err) = write.send(msg).await {
                eprintln!("发送消息失败: {}", err);
                break;
            }
        }
    });

    let mut sync_rx = sync_tx.subscribe();
    tokio::spawn(async move {
        while let Ok(sync_msg) = sync_rx.recv().await {
            let payload = serde_json::to_string(&sync_msg).unwrap_or_default();
            if out_tx.send(Message::Text(payload)).await.is_err() {
                break;
            }
        }
    });

    while let Some(msg) = read.next().await {
        match msg? {
            Message::Text(text) => {
                if let Ok(sync_msg) = serde_json::from_str::<SyncMessage>(&text) {
                    let mut manager = clipboard_manager.lock().await;
                    match sync_msg.data.data_type.as_str() {
                        "text" => {
                            let _ = manager.write_text(&sync_msg.data.content);
                            let _ = sync_tx.send(sync_msg.clone());
                        }
                        "image" => {
                            // 图片数据（base64），转发给其他客户端，不写入剪贴板
                            let _ = sync_tx.send(sync_msg.clone());
                        }
                        "file" => {
                            // 文件数据（base64），转发给其他客户端
                            let _ = sync_tx.send(sync_msg.clone());
                        }
                        _ => {}
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    Ok(())
}

pub async fn connect_to_server(
    address: &str,
    clipboard_manager: Arc<Mutex<crate::clipboard::ClipboardManager>>,
) -> Result<Client> {
    let url = format!("ws://{}", address);
    let (ws_stream, _) = connect_async(&url).await?;
    let (mut write, mut read) = ws_stream.split();

    let (tx, mut rx) = mpsc::channel(32);

    let _write_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Err(e) = write.send(msg).await {
                eprintln!("发送失败: {}", e);
                break;
            }
        }
    });

    let cm = clipboard_manager.clone();
    let _read_task = tokio::spawn(async move {
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(sync_msg) = serde_json::from_str::<SyncMessage>(&text) {
                        let mut manager = cm.lock().await;
                        match sync_msg.data.data_type.as_str() {
                            "text" => {
                                if let Err(e) = manager.write_text(&sync_msg.data.content) {
                                    eprintln!("写入剪贴板失败: {}", e);
                                }
                            }
                            "image" | "file" => {
                                // 图片和文件不自动写入剪贴板，交给前端处理队列
                                // 这里只打印日志
                                println!("收到 {} 类型数据，大小: {} bytes",
                                    sync_msg.data.data_type,
                                    sync_msg.data.content.len());
                            }
                            _ => {}
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    println!("连接已关闭");
                    break;
                }
                Err(e) => {
                    eprintln!("接收错误: {}", e);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(Client { tx })
}
