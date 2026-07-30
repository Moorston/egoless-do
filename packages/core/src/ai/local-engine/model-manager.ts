// ─── ModelManager（模型 OTA 更新）────────────────────────────────
// 管理端侧 AI 模型的下载、验证、版本控制。

import { LocalAIEngine } from './types';

export interface ModelInfo {
  name: string;
  version: string;
  url: string;
  checksum: string;
  size: number;
}

export class ModelManager {
  private currentVersions: Map<string, string> = new Map();
  private modelPath: string = '/models/';

  /**
   * 检查模型是否有新版本。
   * @returns 新版本号，null 表示无更新
   */
  async checkForUpdate(modelName: string): Promise<string | null> {
    try {
      // 从 PocketBase 获取最新模型信息
      const latest = await this.fetchLatestModelInfo(modelName);
      if (!latest) return null;

      const currentVersion = this.currentVersions.get(modelName) || '0.0.0';
      return this.compareVersions(latest.version, currentVersion) > 0 ? latest.version : null;
    } catch {
      return null;
    }
  }

  /**
   * 下载并安装模型。
   */
  async downloadModel(modelName: string, version: string): Promise<boolean> {
    try {
      // 1. 获取模型信息
      const info = await this.fetchModelInfo(modelName, version);
      if (!info) return false;

      // 2. 下载模型文件
      const response = await fetch(info.url);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);

      const blob = await response.blob();

      // 3. 验证文件大小
      if (blob.size !== info.size) {
        throw new Error(`Size mismatch: expected ${info.size}, got ${blob.size}`);
      }

      // 4. 保存到本地（占位，实际需 FileSystem API）
      const path = `${this.modelPath}${modelName}-${version}.onnx`;
      await this.saveModel(path, blob);

      // 5. 验证校验和
      const checksum = await this.calculateChecksum(path);
      if (checksum !== info.checksum) {
        throw new Error('Checksum mismatch');
      }

      // 6. 更新版本
      this.currentVersions.set(modelName, version);
      return true;
    } catch (err) {
      console.error(`[ModelManager] Download failed:`, err);
      return false;
    }
  }

  /**
   * 回滚到旧版本。
   */
  async rollback(modelName: string): Promise<void> {
    // 删除当前模型，使用内置版本
    this.currentVersions.delete(modelName);
  }

  /**
   * 获取当前模型版本。
   */
  getCurrentVersion(modelName: string): string | null {
    return this.currentVersions.get(modelName) || null;
  }

  // ── Private Methods ──

  private async fetchLatestModelInfo(modelName: string): Promise<ModelInfo | null> {
    // TODO: 从 PocketBase 获取
    return null;
  }

  private async fetchModelInfo(modelName: string, version: string): Promise<ModelInfo | null> {
    // TODO: 从 PocketBase 获取
    return null;
  }

  private async saveModel(path: string, blob: Blob): Promise<void> {
    // TODO: 使用 expo-file-system 保存
    console.log(`[ModelManager] Saving model to ${path} (${blob.size} bytes)`);
  }

  private async calculateChecksum(path: string): Promise<string> {
    // TODO: 计算 SHA-256
    return 'placeholder-checksum';
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const diff = (partsA[i] || 0) - (partsB[i] || 0);
      if (diff !== 0) return Math.sign(diff);
    }
    return 0;
  }
}
