import fetch from 'node-fetch';

export interface MonitoredServer {
  ip: string;
  port: number;
  name?: string;
}

let cachedServers: MonitoredServer[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; 

export async function getMonitoredServers(): Promise<MonitoredServer[]> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION && cachedServers.length > 0) {
    console.log('[ServerList] Sử dụng cache:', cachedServers);
    return cachedServers;
  }

  try {
    console.log('[ServerList] Đang fetch API:', 'https://api.foxstudio.site/server.php');
    const res = await fetch('https://api.foxstudio.site/server.php', {
      signal: AbortSignal.timeout(30000), 
    });

    console.log('[ServerList] Response status:', res.status);

    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status} - ${res.statusText}`);
    }

    const data = await res.json();
    console.log('[ServerList] Raw data từ API:', data);

    if (!Array.isArray(data)) {
      throw new Error('Dữ liệu không phải mảng');
    }

    cachedServers = data.map((item: any) => ({
      ip: item.ip || '',
      port: Number(item.port) || 8080,
      name: item.name || ''
    }));

    lastFetchTime = now;

    console.log('[ServerList] Đã cập nhật danh sách server:', cachedServers);
    return cachedServers;
  } catch (err: any) {
    console.error('[ServerList] Lỗi fetch API:', err.message, err.stack);
    return [];
  }
}