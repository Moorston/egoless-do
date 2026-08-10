// ─── 音乐下载服务 ──────────────────────────────────────────────────
// 下载音乐到本地存储

import { File, Directory, Paths } from 'expo-file-system';
import { createLogger } from '@egoless-do/core';

import type { CatalogTrack } from './MusicCatalogService';

const log = createLogger('MusicDownload');

// 下载目录
const DOWNLOAD_DIR = new Directory(Paths.document, 'music-downloads');

// 确保下载目录存在
async function ensureDownloadDir(): Promise<void> {
  if (!DOWNLOAD_DIR.exists) {
    DOWNLOAD_DIR.create({ intermediates: true });
  }
}

// 下载状态接口
export interface DownloadStatus {
  trackId: string;
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
  filePath?: string;
}

// 下载进度回调
type DownloadProgressCallback = (status: DownloadStatus) => void;

// 下载管理器
class MusicDownloadService {
  private downloads: Map<string, DownloadStatus> = new Map();
  private listeners: Map<string, DownloadProgressCallback> = new Map();

  // 初始化
  async initialize(): Promise<void> {
    await ensureDownloadDir();
  }

  // 下载音乐
  async download(
    track: CatalogTrack,
    onProgress?: DownloadProgressCallback
  ): Promise<string> {
    const trackId = track.id;

    // 检查是否已下载
    if (this.isDownloaded(trackId)) {
      const existingPath = this.getDownloadPath(trackId);
      if (existingPath) {
        log.info('音乐已下载:', trackId);
        return existingPath;
      }
    }

    // 设置下载状态
    const status: DownloadStatus = {
      trackId,
      progress: 0,
      status: 'pending',
    };
    this.downloads.set(trackId, status);

    if (onProgress) {
      this.listeners.set(trackId, onProgress);
      onProgress(status);
    }

    try {
      // 更新状态为下载中
      status.status = 'downloading';
      this.notifyProgress(trackId, status);

      // 验证 URL
      if (!track.previewUrl || !track.previewUrl.startsWith('http')) {
        throw new Error('无效的下载链接');
      }

      // 生成文件路径
      const filePath = this.generateFilePath(trackId);

      // 下载文件
      log.info('开始下载:', track.title);

      const response = await fetch(track.previewUrl);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // 写入文件
      const file = new File(filePath);
      file.write(uint8Array);

      // 更新状态为完成
      status.status = 'completed';
      status.progress = 100;
      status.filePath = filePath;
      this.notifyProgress(trackId, status);

      log.info('下载完成:', track.title, filePath);

      // 保存下载记录
      await this.saveDownloadRecord(trackId, filePath);

      return filePath;
    } catch (error) {
      // 更新状态为失败
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : '下载失败';
      this.notifyProgress(trackId, status);

      log.error('下载失败:', error);
      throw error;
    } finally {
      // 清理监听器
      this.listeners.delete(trackId);
    }
  }

  // 取消下载
  async cancel(trackId: string): Promise<void> {
    const status = this.downloads.get(trackId);
    if (status && status.status === 'downloading') {
      // 注意：fetch 不支持取消，这里只是更新状态
      status.status = 'failed';
      status.error = '已取消';
      this.notifyProgress(trackId, status);
    }
  }

  // 删除下载
  async delete(trackId: string): Promise<void> {
    const filePath = this.getDownloadPath(trackId);
    if (filePath) {
      try {
        const file = new File(filePath);
        if (file.exists) {
          file.delete();
        }
      } catch (error) {
        log.warn('删除文件失败:', error);
      }
    }

    // 删除下载记录
    await this.deleteDownloadRecord(trackId);
    this.downloads.delete(trackId);
  }

  // 检查是否已下载
  isDownloaded(trackId: string): boolean {
    const filePath = this.getDownloadPath(trackId);
    if (!filePath) return false;

    const file = new File(filePath);
    return file.exists;
  }

  // 获取下载路径
  getDownloadPath(trackId: string): string | null {
    const filePath = this.generateFilePath(trackId);

    const file = new File(filePath);
    return file.exists ? filePath : null;
  }

  // 生成文件名
  private generateFileName(trackId: string): string {
    return `${trackId.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
  }

  // 生成文件路径
  private generateFilePath(trackId: string): string {
    return `${DOWNLOAD_DIR.uri}/${this.generateFileName(trackId)}`;
  }

  // 获取下载状态
  getDownloadStatus(trackId: string): DownloadStatus | null {
    return this.downloads.get(trackId) || null;
  }

  // 获取所有已下载的曲目
  async getDownloadedTracks(): Promise<string[]> {
    try {
      const files = DOWNLOAD_DIR.list();
      return files
        .filter(f => f.name.endsWith('.mp3'))
        .map(f => f.name.replace('.mp3', ''));
    } catch (error) {
      log.warn('获取下载列表失败:', error);
      return [];
    }
  }

  // 通知进度
  private notifyProgress(trackId: string, status: DownloadStatus): void {
    const listener = this.listeners.get(trackId);
    if (listener) {
      listener(status);
    }
  }

  // 保存下载记录
  private async saveDownloadRecord(trackId: string, filePath: string): Promise<void> {
    try {
      const recordFile = new File(DOWNLOAD_DIR, 'downloads.json');
      let records: Record<string, string> = {};

      if (recordFile.exists) {
        const content = await recordFile.text();
        records = JSON.parse(content) as Record<string, string>;
      }

      records[trackId] = filePath;
      recordFile.write(JSON.stringify(records, null, 2));
    } catch (error) {
      log.warn('保存下载记录失败:', error);
    }
  }

  // 删除下载记录
  private async deleteDownloadRecord(trackId: string): Promise<void> {
    try {
      const recordFile = new File(DOWNLOAD_DIR, 'downloads.json');
      if (!recordFile.exists) return;

      const content = await recordFile.text();
      const records: Record<string, string> = JSON.parse(content);

      delete records[trackId];
      recordFile.write(JSON.stringify(records, null, 2));
    } catch (error) {
      log.warn('删除下载记录失败:', error);
    }
  }

  // 加载下载记录
  async loadDownloadRecords(): Promise<void> {
    try {
      const recordFile = new File(DOWNLOAD_DIR, 'downloads.json');
      if (!recordFile.exists) return;

      const content = await recordFile.text();
      const records: Record<string, string> = JSON.parse(content);

      for (const [trackId, filePath] of Object.entries(records)) {
        const file = new File(filePath);
        if (file.exists) {
          this.downloads.set(trackId, {
            trackId,
            progress: 100,
            status: 'completed',
            filePath,
          });
        }
      }
    } catch (error) {
      log.warn('加载下载记录失败:', error);
    }
  }
}

// 单例实例
export const musicDownloadService = new MusicDownloadService();
