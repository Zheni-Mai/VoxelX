// src/main/webrtc-tcp-proxy.ts
import * as net from 'net';
import * as nodeDataChannel from 'node-datachannel';
import { BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';


let ICE_SERVERS: any[] = [{ urls: 'stun:stun.l.google.com:19302' }]

async function refreshIceServers() {
  try {
    const url = `https://foxstudio.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`;
    console.log('[WebRTC] Fetching from:', url);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error('[WebRTC] API error:', res.status, text);
      throw new Error(`API error ${res.status}`);
    }
    const serversFromApi: any[] = await res.json();
    const converted: any[] = [];

    for (const server of serversFromApi) {
      if (!server.urls || typeof server.urls !== 'string') continue;

      const match = server.urls.match(/^(stun|turn|turns):([^:]+):(\d+)(\?.*)?$/);
      if (!match) continue;

      const protocol = match[1];
      const hostname = match[2];
      const port = parseInt(match[3]);

      if (protocol === 'stun') {
        converted.push(`stun:${hostname}:${port}`);
      } else {
        if (!server.username || !server.credential) continue;

        const obj: any = {
          hostname,
          port,
          username: server.username,
          password: server.credential,
        };

        if (match[4]?.includes('tcp')) {
          obj.relayType = 'TurnTcp';
        }

        converted.push(obj);
      }
    }

    converted.push('stun:stun.l.google.com:19302');

    ICE_SERVERS = converted;
    console.log('[WebRTC] Final ICE_SERVERS (converted):', ICE_SERVERS);
  } catch (err) {
    console.warn('[WebRTC] Refresh failed, use minimal fallback:', err);
    ICE_SERVERS = ['stun:stun.l.google.com:19302'];
  }
}

// Refresh lúc khởi động và mỗi giờ
(async () => {
  await refreshIceServers();
  setInterval(refreshIceServers, 3600_000);
})();

// Room hiện tại do máy này làm host (nếu có)
let currentHostRoomId: string | null = null;

// Danh sách tất cả peer đang kết nối (cả host và joiner trên toàn app)
interface PeerInfo {
  roomId: string;
  clientId: string;
  username: string;
  isHost: boolean;
  lastActive: number; // Dùng để tính ping
}

const connectedPeers = new Map<string, PeerInfo>();

interface ProxyInstance {
  roomId: string;
  peer: nodeDataChannel.PeerConnection;
  dc: nodeDataChannel.DataChannel;
  tcpServer?: net.Server;
  tcpClient?: net.Socket;
  isHost: boolean;
}

const signalingChannels = new Map<string, {
  offer?: { desc: string; type: string };
  candidates: Array<{ candidate: string; mid: string }>;
}>();

export const activeProxies = new Map<string, ProxyInstance>();

const pendingOffers = new Map<
  string,
  { resolve: (data: { desc: string; type: string }) => void; reject: (err: Error) => void }
>();

const pendingCandidates = new Map<string, Array<{ candidate: string; mid: string }>>();

function broadcastToAllWindows(channel: string, data: any) {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  });
}

// Cập nhật thời gian hoạt động của peer (dùng để tính ping)
function updatePeerActivity(clientId: string) {
  const info = connectedPeers.get(clientId);
  if (info) {
    info.lastActive = Date.now();
  }
}

// Xóa peer khi disconnect
function removePeer(clientId: string) {
  connectedPeers.delete(clientId);
}

async function startHost(localPort: number, roomId: string): Promise<ProxyInstance> {
  const peer = new nodeDataChannel.PeerConnection(`host-${roomId}`, {
    iceServers: ICE_SERVERS,
  });

  const dc = peer.createDataChannel('minecraft-tcp', {
    protocol: 'tcp-proxy',
    negotiated: true,
    id: 1,
  });

  const tcpServer = net.createServer((clientSocket: net.Socket) => {
    console.log(`[${roomId}] Minecraft client connected locally`);

    clientSocket.on('data', (data: Buffer) => {
      if (dc.isOpen()) {
        dc.sendMessageBinary(data);
        // Cập nhật ping khi có dữ liệu từ game
        for (const info of connectedPeers.values()) {
          if (info.roomId === roomId && !info.isHost) {
            updatePeerActivity(info.clientId);
          }
        }
      }
    });

    dc.onMessage((msg) => {
      const buf = Buffer.isBuffer(msg) ? msg : Buffer.from(msg as ArrayBuffer);
      clientSocket.write(buf);
    });

    clientSocket.on('close', () => {
      console.log(`[${roomId}] Local Minecraft client disconnected`);
    });

    clientSocket.on('error', (err) => {
      console.error(`[${roomId}] Local TCP client error:`, err.message);
    });
  });

  // === SIGNALING: Setup trước khi listen TCP ===
  peer.onLocalDescription((sdp: string, type: string) => {
    console.log(`[${roomId}] Host generated offer`);

    // LƯU OFFER VÀO SIGNALING TRUNG GIAN ĐỂ JOINER Ở PROCESS KHÁC NHẬN ĐƯỢC
    if (!signalingChannels.has(roomId)) {
      signalingChannels.set(roomId, { candidates: [] });
    }
    signalingChannels.get(roomId)!.offer = { desc: sdp, type };

    // Vẫn broadcast cho test localhost (cùng process)
    broadcastToAllWindows('webrtc:offer', { roomId, desc: sdp, type });
  });

  peer.onLocalDescription((sdp: string, type: string) => {
    console.log(`[${roomId}] Host generated ${type}`);

    if (!signalingChannels.has(roomId)) {
      signalingChannels.set(roomId, { candidates: [] });
    }
    signalingChannels.get(roomId)!.offer = { desc: sdp, type };

    broadcastToAllWindows('webrtc:offer', { roomId, desc: sdp, type });
  });

  peer.onLocalCandidate((candidate: string, mid: string) => {
    console.log(`[${roomId}] Host generated ICE candidate`);
    broadcastToAllWindows('webrtc:candidate', { roomId, candidate, mid });

    if (signalingChannels.has(roomId)) {
      signalingChannels.get(roomId)!.candidates.push({ candidate, mid });
    }
  });

  // Khi có joiner kết nối thành công qua DataChannel
  dc.onOpen(() => {
    const clientId = uuidv4();
    const username = 'Host (Bạn)';  // Host dùng tên mặc định, hoặc lấy từ account nếu cần
    connectedPeers.set(clientId, { roomId, clientId, username, isHost: true, lastActive: Date.now() });
    console.log(`[${roomId}] Host joined: ${username}`);
  });

  dc.onMessage(() => {
    for (const info of connectedPeers.values()) {
      if (info.roomId === roomId && !info.isHost) {
        updatePeerActivity(info.clientId);
      }
    }
  });

  dc.onClosed(() => {
    console.log(`[${roomId}] A player disconnected`);
    for (const [id, info] of connectedPeers.entries()) {
      if (info.roomId === roomId && !info.isHost) {
        removePeer(id);
      }
    }
  });

  // === BẮT ĐẦU TẠO OFFER NGAY SAU KHI SETUP SIGNALING ===
  console.log(`[${roomId}] Host starting offer generation...`);
  peer.setLocalDescription();

  // Chờ offer được lưu vào signalingChannels
  let waited = 0;
  while (waited < 2000) {
    const signaling = signalingChannels.get(roomId);
    if (signaling?.offer) {
      console.log(`[${roomId}] Offer ready and stored`);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    waited += 100;
  }

  // Áp dụng candidate pending
  const pending = pendingCandidates.get(roomId) || [];
  pending.forEach(({ candidate, mid }) => {
    if (candidate && mid) peer.addRemoteCandidate(candidate, mid);
  });
  pendingCandidates.delete(roomId);

  // Listen TCP server và return proxy
  return new Promise((resolve, reject) => {
    tcpServer.listen(localPort, () => {
      console.log(`[${roomId}] TCP proxy listening on localhost:${localPort}`);
      resolve({ roomId, peer, dc, tcpServer, isHost: true });
    });

    tcpServer.on('error', (err: any) => {
      console.error(`[${roomId}] Failed to listen on port ${localPort}:`, err.message);
      reject(new Error(`Không thể sử dụng port ${localPort}. Port đã bị chiếm hoặc bị chặn.`));
    });
  });
}

async function joinPeer(roomId: string, remoteHost: string, remotePort: number, username: string): Promise<ProxyInstance> {
  const peer = new nodeDataChannel.PeerConnection(`joiner-${roomId}`, {
    iceServers: ICE_SERVERS,
  });

  const dc = peer.createDataChannel('minecraft-tcp', {
    protocol: 'tcp-proxy',
    negotiated: true,
    id: 1,
  });

  const tcpClient = net.createConnection({ host: remoteHost, port: remotePort }, () => {
    console.log(`[${roomId}] Connected to remote server ${remoteHost}:${remotePort}`);
  });

 const clientId = uuidv4();
  connectedPeers.set(clientId, { roomId, clientId, username, isHost: false, lastActive: Date.now() });
  console.log(`[${roomId}] Joiner joined: ${username}`);

  dc.onOpen(() => {
    console.log(`[${roomId}] WebRTC DataChannel opened (joiner)`);
  });

  dc.onMessage((msg) => {
    const buf = Buffer.isBuffer(msg) ? msg : Buffer.from(msg as ArrayBuffer);
    tcpClient.write(buf);
    updatePeerActivity(clientId);
  });

  tcpClient.on('data', (data: Buffer) => {
    if (dc.isOpen()) {
      dc.sendMessageBinary(data);
      updatePeerActivity(clientId);
    }
  });

  tcpClient.on('close', () => {
    console.log(`[${roomId}] Remote server connection closed`);
    dc.close();
  });

  tcpClient.on('error', (err) => {
    console.error(`[${roomId}] Remote TCP error:`, err.message);
  });

  dc.onClosed(() => {
    console.log(`[${roomId}] DataChannel closed (joiner)`);
    tcpClient.destroy();
    removePeer(clientId);
  });

  
  peer.onLocalCandidate((candidate: string, mid: string) => {
    console.log(`[${roomId}] Sending ICE candidate to host`);
    broadcastToAllWindows('webrtc:candidate', { roomId, candidate, mid });

    // Gửi candidate vào signaling trung gian
    handleWebRTCSignaling('webrtc:candidate', { roomId, candidate, mid });
  });

  // Đợi offer từ host thông qua signalingChannels (polling)
  console.log(`[${roomId}] Waiting for offer from host...`);
  const offer = await new Promise<{ desc: string; type: string }>((resolve, reject) => {
    const startTime = Date.now();
    const checkOffer = () => {
      const signaling = getPendingSignaling(roomId);
      if (signaling?.offer) {
        console.log(`[${roomId}] Received offer from host`);
        resolve(signaling.offer);
      } else if (Date.now() - startTime > 15000) {
        console.error(`[${roomId}] Timeout waiting for offer`);
        reject(new Error('Timeout: Không nhận được tín hiệu từ host (15s)'));
      } else {
        setTimeout(checkOffer, 500); // Kiểm tra lại sau 500ms
      }
    };
    checkOffer();
  });

  // Áp dụng offer từ host
  console.log(`[${roomId}] Setting remote description (offer)`);
  peer.setRemoteDescription(offer.desc, offer.type as nodeDataChannel.DescriptionType);

  // Áp dụng tất cả ICE candidates đã nhận từ host trước đó
  const currentSignaling = getPendingSignaling(roomId);
  if (currentSignaling && currentSignaling.candidates.length > 0) {
    console.log(`[${roomId}] Applying ${currentSignaling.candidates.length} pending ICE candidates`);
    currentSignaling.candidates.forEach(({ candidate, mid }) => {
      if (candidate && mid) {
        peer.addRemoteCandidate(candidate, mid);
      }
    });
  }

  // Tạo và gửi answer
  console.log(`[${roomId}] Generating local description (answer)`);
  peer.setLocalDescription();

  return { roomId, peer, dc, tcpClient, isHost: false };
}

// Public API
export async function createRoom(localPort: number): Promise<string> {
  const roomId = uuidv4().slice(0, 8);
  const proxy = await startHost(localPort, roomId);
  activeProxies.set(roomId, proxy);
  currentHostRoomId = roomId;
  console.log(`Room created: ${roomId}`);
  return roomId;
}

export async function joinRoom(roomId: string, remoteHost: string, remotePort: number, username: string): Promise<void> {
  if (activeProxies.has(roomId)) {
    console.warn(`Already in room ${roomId}`);
    return;
  }
  const proxy = await joinPeer(roomId, remoteHost, remotePort, username);
  activeProxies.set(roomId, proxy);
  console.log(`Successfully joined room: ${roomId}`);
}

export function dissolveRoom(roomId: string): void {
  const proxy = activeProxies.get(roomId);
  if (!proxy) return;

  proxy.peer.close();
  proxy.dc.close();
  proxy.tcpServer?.close();
  proxy.tcpClient?.destroy();

  activeProxies.delete(roomId);

  // Xóa tất cả peer liên quan đến room này
  for (const [id, info] of connectedPeers.entries()) {
    if (info.roomId === roomId) {
      connectedPeers.delete(id);
    }
  }

  if (currentHostRoomId === roomId) {
    currentHostRoomId = null;
  }

  console.log(`Room ${roomId} dissolved`);
  signalingChannels.delete(roomId);
}

export function getCurrentRoomId(): string | null {
  return currentHostRoomId;
}

// Lấy danh sách người chơi trong phòng (dùng cho UI)
export function getRoomParticipants(roomId: string): Array<{
  displayId: string;
  isHost: boolean;
  ping: number;
}> {
  const participants: Array<{
    displayId: string;
    isHost: boolean;
    ping: number;
  }> = [];

  const now = Date.now();

  for (const info of connectedPeers.values()) {
    if (info.roomId === roomId) {
      const ping = now - info.lastActive;
      participants.push({
        displayId: info.username || `Player (${info.clientId.slice(0, 6)}..)`,  // ← Dùng username, fallback UUID
        isHost: info.isHost,
        ping: ping < 9999 ? ping : 9999,
      });
    }
  }

  return participants;
}

// Xử lý signaling từ renderer
export function handleWebRTCSignaling(channel: string, payload: any) {
  const { roomId } = payload;

  if (channel === 'webrtc:offer') {
    console.log(`[Signaling] Received offer for room ${roomId}`);
    // Lưu offer để joiner lấy
    if (!signalingChannels.has(roomId)) {
      signalingChannels.set(roomId, { candidates: [] });
    }
    signalingChannels.get(roomId)!.offer = { desc: payload.desc, type: payload.type };

    // Broadcast đến tất cả window (cùng process) - giữ lại cho test localhost
    broadcastToAllWindows('webrtc:offer-received', payload);
  } else if (channel === 'webrtc:answer') {
    console.log(`[Signaling] Received answer for room ${roomId}`);
    const proxy = activeProxies.get(roomId);
    if (proxy && proxy.isHost) {
      proxy.peer.setRemoteDescription(payload.desc, payload.type as nodeDataChannel.DescriptionType);
    }
  } else if (channel === 'webrtc:candidate') {
    console.log(`[Signaling] Received candidate for room ${roomId}`);
    const proxy = activeProxies.get(roomId);
    if (proxy) {
      if (payload.candidate && payload.mid) {
        proxy.peer.addRemoteCandidate(payload.candidate, payload.mid);
      }
    }

    // Lưu candidate cho joiner
    if (signalingChannels.has(roomId)) {
      signalingChannels.get(roomId)!.candidates.push({ candidate: payload.candidate, mid: payload.mid });
    }
  }
}

export function getPendingSignaling(roomId: string): { offer?: { desc: string; type: string }; candidates: Array<{ candidate: string; mid: string }> } | null {
  return signalingChannels.get(roomId) || null;
}

// Optional: Dọn dẹp peer không hoạt động lâu (tùy chọn)
// setInterval(() => {
//   const now = Date.now();
//   for (const [id, info] of connectedPeers.entries()) {
//     if (now - info.lastActive > 60000) { // 60s không hoạt động
//       console.log(`Removing inactive peer: ${id.slice(0,8)}..`);
//       connectedPeers.delete(id);
//     }
//   }
// }, 10000);