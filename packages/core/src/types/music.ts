export interface MusicTrack {
  id: string;
  name: string;
  nameEn: string;
  category: 'focus' | 'meditate' | 'exercise' | 'sleep' | 'nature' | 'user';
  file?: number;   // require() 结果，内置音乐
  uri?: string;    // 文件 URI，用户导入音乐
}

export type MusicCategory = 'all' | 'focus' | 'meditate' | 'exercise' | 'sleep' | 'nature' | 'my';
