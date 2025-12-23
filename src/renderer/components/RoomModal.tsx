import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, message, Spin } from 'antd';
import { CopyOutlined} from '@ant-design/icons';
import { LogIn, Users } from 'lucide-react';

interface RoomModalProps {
  open: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string) => void;
  onRoomJoined: (roomId: string) => void;
}

const RoomModal: React.FC<RoomModalProps> = ({
  open,
  onClose,
  onRoomCreated,
  onRoomJoined,
}) => {
  const [view, setView] = useState<'home' | 'creating' | 'room' | 'join'>('home');
  const [inputId, setInputId] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Array<{
    displayId: string;
    isHost: boolean;
    ping: number;
  }>>([]);
  const [isHost, setIsHost] = useState(false);
  const [joinUsername, setJoinUsername] = useState('');

  // Kiểm tra xem có phòng đang tồn tại không (khi mở modal)
  useEffect(() => {
    if (open) {
      const checkExistingRoom = async () => {
        try {
          const roomId = await window.electronAPI.ipcRenderer.invoke('get-current-lan-room');
          if (roomId) {
            setCurrentRoomId(roomId);
            setView('room'); // Hiển thị thẳng phòng đang có
          } else {
            setCurrentRoomId(null);
            setView('home'); // Hiển thị màn hình chọn
          }
        } catch (err) {
          console.error('Error checking current room:', err);
          setView('home');
        }
      };

      checkExistingRoom();
    }
  }, [open]);

  // Cập nhật danh sách người chơi khi đang ở trong phòng
  useEffect(() => {
    if (open && currentRoomId && view === 'room') {
      const fetchParticipants = async () => {
        try {
          const list = await window.electronAPI.ipcRenderer.invoke('get-room-participants', currentRoomId);
          setParticipants(list);
          setIsHost(list.some((p: any) => p.isHost));
        } catch (err) {
          console.error('Error fetching participants:', err);
        }
      };

      fetchParticipants();
      const interval = setInterval(fetchParticipants, 3000);
      return () => clearInterval(interval);
    } else {
      setParticipants([]);
      setIsHost(false);
    }
  }, [open, currentRoomId, view]);

  const handleCreateRoom = async () => {
    setLoading(true);
    setView('creating');
    try {
      const newRoomId = await window.electronAPI.ipcRenderer.invoke('create-room', { localPort: 25565 });
      setCurrentRoomId(newRoomId);
      onRoomCreated(newRoomId);
      setView('room');
      message.success(`Phòng đã tạo thành công: ${newRoomId}`);
    } catch (err: any) {
      console.error('Create room error:', err);
      message.error('Tạo phòng thất bại: ' + (err.message || 'Port bị chiếm?'));
      setView('home'); // Quay về màn hình chính nếu lỗi
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!inputId.trim()) {
      message.error('Vui lòng nhập Room ID');
      return;
    }
    if (!joinUsername) {
      message.error('Vui lòng nhập username Minecraft của bạn');
      return;
    }
    if (joinUsername.length < 3 || joinUsername.length > 16) {
      message.error('Username phải từ 3 đến 16 ký tự');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(joinUsername)) {
      message.error('Username chỉ được chứa chữ cái, số và dấu gạch dưới (_)');
      return;
    }

    setLoading(true);
    try {
      await window.electronAPI.ipcRenderer.invoke('join-room', {
        roomId: inputId.trim(),
        remoteHost: 'localhost',
        remotePort: 25565,
        username: joinUsername, // ← Truyền username vào main process
      });

      setCurrentRoomId(inputId.trim());
      onRoomJoined(inputId.trim());
      setView('room');
      message.success(`Đã tham gia phòng với tên: ${joinUsername}`);
    } catch (err: any) {
      message.error('Tham gia thất bại: ' + (err.message || 'Room ID không hợp lệ hoặc host offline'));
    } finally {
      setLoading(false);
    }
  };

  const copyRoomId = () => {
    if (currentRoomId) {
      navigator.clipboard.writeText(currentRoomId);
      message.success('Đã copy Room ID!');
    }
  };

  const handleLeaveOrDissolve = async () => {
    if (!currentRoomId) return;

    try {
      await window.electronAPI.ipcRenderer.invoke('dissolve-room', currentRoomId);
      message.success(isHost ? 'Đã giải tán phòng!' : 'Đã rời khỏi phòng!');
    } catch (err) {
      message.error(isHost ? 'Không thể giải tán phòng' : 'Không thể rời phòng');
    } finally {
      setCurrentRoomId(null);
      setView('home');
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      title="Chơi LAN qua Internet"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={560}
      closable={true}
    >
      <div style={{ padding: '30px 20px', textAlign: 'center' }}>
        {view === 'home' && (
          <>
            <h2 style={{ marginBottom: 30, color: '#06b6d4', fontSize: 24 }}>
              Chọn cách chơi
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Button
                type="primary"
                size="large"
                icon={<Users size={20} />}
                onClick={handleCreateRoom}
                style={{ height: 70, fontSize: 18, borderRadius: 16 }}
                block
              >
                Tạo phòng LAN mới
              </Button>

              <Button
                size="large"
                icon={<LogIn size={20} />}
                onClick={() => setView('join')}
                style={{ height: 70, fontSize: 18, borderRadius: 16 }}
                block
              >
                Tham gia phòng có sẵn
              </Button>
            </div>
          </>
        )}

        {view === 'creating' && (
          <div style={{ padding: '60px 0' }}>
            <Spin spinning={true} size="large" />
            <p style={{ marginTop: 24, fontSize: 18, color: '#94a3b8' }}>
              Đang tạo phòng LAN...
            </p>
          </div>
        )}

        {view === 'join' && (
          <div style={{ padding: '20px 0' }}>
            <h3 style={{ marginBottom: 20 }}>Nhập Room ID từ bạn bè</h3>
            
            <Input
              placeholder="Ví dụ: abcd1234"
              value={inputId}
              onChange={(e) => setInputId(e.target.value.toLowerCase())}
              size="large"
              style={{ marginBottom: 20, fontSize: 16 }}
              allowClear
            />

            <Input
              placeholder="Nhập username Minecraft của bạn (ví dụ: Steve)"
              value={joinUsername}
              onChange={(e) => setJoinUsername(e.target.value.trim())}
              size="large"
              style={{ marginBottom: 20, fontSize: 16 }}
              allowClear
              maxLength={16}
            />

            <Button
              type="primary"
              block
              size="large"
              loading={loading}
              onClick={handleJoinRoom}
              style={{ height: 52, fontSize: 17 }}
            >
              Tham gia phòng
            </Button>

            <Button
              type="link"
              onClick={() => {
                setView('home');
                setInputId('');
                setJoinUsername('');
              }}
              style={{ marginTop: 16 }}
            >
              ← Quay lại
            </Button>
          </div>
        )}

        {view === 'room' && currentRoomId && (
          <div>
            <h3 style={{ marginBottom: 20, color: '#06b6d4' }}>
              {isHost ? 'Phòng LAN của bạn' : 'Bạn đang trong phòng'}
            </h3>

            <div style={{
              fontSize: 28,
              fontWeight: 'bold',
              margin: '20px 0',
              padding: '16px',
              background: '#1e293b',
              borderRadius: 16,
              color: '#06b6d4'
            }}>
              {currentRoomId}
            </div>

            <Button
              icon={<CopyOutlined />}
              onClick={copyRoomId}
              block
              size="large"
              style={{ marginBottom: 24 }}
            >
              Copy Room ID
            </Button>

            {/* Danh sách người chơi */}
            <div style={{ margin: '24px 0' }}>
              <p style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>
                Người chơi ({participants.length})
              </p>
              <div style={{
                maxHeight: 220,
                overflowY: 'auto',
                background: '#0f172a',
                borderRadius: 12,
                padding: 12,
                border: '1px solid #1e293b'
              }}>
                {participants.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                    Đang chờ người chơi...
                  </p>
                ) : (
                  participants.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: i < participants.length - 1 ? '1px solid #1e293b' : 'none'
                      }}
                    >
                      <span style={{
                        color: p.isHost ? '#f59e0b' : '#e2e8f0',
                        fontWeight: p.isHost ? 'bold' : 'normal'
                      }}>
                        {p.displayId}
                        {p.isHost && ' (Host)'}
                        {p.displayId === 'Host (Bạn)' && ' ← Bạn'}
                      </span>
                      <span style={{
                        color: p.ping < 60 ? '#10b981' : p.ping < 120 ? '#f59e0b' : '#ef4444',
                        fontWeight: 'bold'
                      }}>
                        {p.ping === 0 ? '—' : `${p.ping}ms`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <p style={{ marginTop: 16, color: '#52c41a', fontWeight: 'bold', fontSize: 15 }}>
              Phòng vẫn đang hoạt động
            </p>
            <p style={{ marginTop: 8, color: '#94a3b8', fontSize: 14, marginBottom: 30 }}>
              Chia sẻ Room ID cho bạn bè để cùng chơi Minecraft!
            </p>

            <Button
              type="primary"
              danger
              block
              size="large"
              onClick={handleLeaveOrDissolve}
              style={{ height: 52, fontSize: 17 }}
            >
              {isHost ? 'Giải tán phòng' : 'Rời khỏi phòng'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RoomModal;