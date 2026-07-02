import type { Syncable } from './shared';

export type MantraCategory = 'dharani' | 'sutra' | 'buddha_name' | 'custom';

export interface MantraDef extends Syncable {
  id: string;
  name: string;
  subtitle?: string;
  category: MantraCategory;
  sortOrder: number;
  /** true = 经文库（只读参考），false/undefined = 我的经文（可计数/统计/编辑） */
  preset?: boolean;
  /** preset=true 时有值：参考信息 */
  pronunciation?: string;
  meaning?: string;
  /** 经文全文（仅 sutra 类 preset 有值） */
  fullText?: string;
  pageCount?: number;
  /** preset=false 时有值：用户可编辑 */
  targetCount?: number;
  /** 念诵音频远端 URL（按需下载） */
  audioUrl?: string;
  /** 音频来源归属信息（CC 协议等） */
  audioAttribution?: string;
}

export interface MantraSession extends Syncable {
  id: string;
  mantraId: string;
  date: string;
  count: number;
  rounds: number;
  durationSec: number;
  startedAt: number;
  completedAt: number;
  targetRounds?: number;
  dedication?: string;
}

export interface SutraReadingSession extends Syncable {
  id: string;
  mantraId: string;
  date: string;
  pagesRead: number;
  durationSec: number;
  completed: boolean;
}

/** 经文库预设条目定义 */
export interface PresetSutraEntry {
  name: string;
  subtitle?: string;
  category: MantraCategory;
  pageCount?: number;
  pronunciation?: string;
  meaning?: string;
  /** 对应 sutraTexts 中的 key，用于加载全文 */
  fileKey?: string;
  /** 念诵音频远端 URL */
  audioUrl?: string;
  /** 音频来源归属信息 */
  audioAttribution?: string;
}

export const SUTRA_CATEGORIES: { key: MantraCategory; labelKey: string }[] = [
  { key: 'sutra', labelKey: 'sutraCategorySutra' },
  { key: 'dharani', labelKey: 'sutraCategoryDharani' },
  { key: 'buddha_name', labelKey: 'sutraCategoryBuddhaName' },
  { key: 'custom', labelKey: 'sutraCategoryCustom' },
];

export const DEDICATION_TEMPLATES = [
  '愿以此功德，庄严佛净土。上报四重恩，下济三途苦。若有见闻者，悉发菩提心。尽此一报身，同生极乐国。',
  '愿以此功德，回向一切众生，离苦得乐，早证菩提。',
  '愿以此功德，回向家人亲友，身体健康，平安吉祥。',
  '愿以此功德，回向法界有情，同登净土，共证菩提。',
];

/**
 * 经文库预设清单（50 项）
 * - 7 部核心经文（含全文 fileKey）
 * - 32 个咒语/陀罗尼（保留现有）
 * - 11 个佛号（新增显示）
 */
export const PRESET_SUTRAS: PresetSutraEntry[] = [
  // ── 经文 (sutra) ──
  { name: '心经', subtitle: '般若波罗蜜多心经', category: 'sutra', pageCount: 1, fileKey: 'heartSutra' },
  { name: '金刚经', subtitle: '金刚般若波罗蜜经', category: 'sutra', pageCount: 32, fileKey: 'diamondSutra' },
  { name: '地藏经', subtitle: '地藏菩萨本愿经', category: 'sutra', pageCount: 13, fileKey: 'earthStoreSutra' },
  { name: '阿弥陀经', subtitle: '佛说阿弥陀经', category: 'sutra', pageCount: 1, fileKey: 'amitabhaSutra' },
  { name: '药师经', subtitle: '药师琉璃光如来本愿功德经', category: 'sutra', pageCount: 1, fileKey: 'medicineBuddhaSutra' },
  { name: '普门品', subtitle: '妙法莲华经·观世音菩萨普门品', category: 'sutra', pageCount: 1, fileKey: 'universalGateChapter' },
  { name: '楞严经', subtitle: '大佛顶首楞严经', category: 'sutra', pageCount: 10, fileKey: 'surangamaSutra' },

  // ── 咒语/陀罗尼 (dharani) ──
  { name: '六字大明咒', subtitle: 'Om Mani Padme Hum', category: 'dharani', pronunciation: 'ōng ma nī bēi mēi hòng', meaning: '观世音菩萨心咒，象征一切诸佛菩萨的慈悲与加持' },
  { name: '大悲咒', subtitle: 'Da Bei Zhou', category: 'dharani', pronunciation: 'ná mó là dá nā duō là yē yē...' },
  { name: '准提神咒', subtitle: 'Cundi Dharani', category: 'dharani', pronunciation: 'nā mó sà duō nán sān miǎo sān pú tí jù zhī nán...' },
  { name: '往生净土神咒', subtitle: '拔一切业障根本得生净土陀罗尼', category: 'dharani', pronunciation: 'nā mó ā mí duō pó duō duō tā jiē duō dì...' },
  { name: '楞严咒', subtitle: 'Shurangama Mantra', category: 'dharani', pronunciation: 'fó dǐng shān mān suō bō tà...' },
  { name: '药师灌顶真言', subtitle: 'Medicine Buddha Mantra', category: 'dharani', pronunciation: 'dá zhá yě dá dá zhá yě dá...' },
  { name: '地藏菩萨灭定业真言', subtitle: 'Ksitigarbha Mantra', category: 'dharani', pronunciation: 'ōu lín sēng hā...' },
  { name: '文殊心咒', subtitle: 'Om A Ra Pa Ca Na Dhih', category: 'dharani', pronunciation: 'om a ra pa ca na dhih', meaning: '文殊菩萨智慧咒' },
  { name: '如意宝轮王陀罗尼', subtitle: 'Ruyi Baolun Wang Dharani', category: 'dharani' },
  { name: '消灾吉祥神咒', subtitle: 'Xiaozai Jixiang Shenzhou', category: 'dharani' },
  { name: '功德宝山神咒', subtitle: 'Gongde Baoshan Shenzhou', category: 'dharani' },
  { name: '圣无量寿决定光明王陀罗尼', subtitle: 'Sheng Wuliangshou Dharani', category: 'dharani' },
  { name: '观音灵感真言', subtitle: 'Guanyin Linggan Zhenyan', category: 'dharani' },
  { name: '七佛灭罪真言', subtitle: 'Qifo Miezui Zhenyan', category: 'dharani' },
  { name: '大吉祥天女咒', subtitle: 'Dajixiang Tiannü Zhou', category: 'dharani' },
  { name: '大随求心咒', subtitle: 'Pratisara Mantra', category: 'dharani' },
  { name: '绿度母心咒', subtitle: 'Om Tare Tuttare Ture Soha', category: 'dharani' },
  { name: '白度母心咒', subtitle: 'Om Tare Tuttare Ture Mama Ayuh', category: 'dharani' },
  { name: '莲师心咒', subtitle: 'Om Ah Hum Vajra Guru Padma Siddhi Hum', category: 'dharani' },
  { name: '金刚萨埵心咒', subtitle: 'Om Vajrasattva Hum', category: 'dharani' },
  { name: '百字明咒', subtitle: 'Vajrasattva 100-Syllable Mantra', category: 'dharani' },
  { name: '阿弥陀佛心咒', subtitle: 'Om Ami Dewa Hrih', category: 'dharani' },
  { name: '释迦牟尼佛心咒', subtitle: 'Om Muni Muni Maha Muniye Soha', category: 'dharani' },
  { name: '不动佛心咒', subtitle: 'Akshobhya Mantra', category: 'dharani' },

  // ── 佛号 (buddha_name) ──
  { name: '南无阿弥陀佛', subtitle: 'Namo Amitabha Buddha', category: 'buddha_name' },
  { name: '南无本师释迦牟尼佛', subtitle: 'Namo Shakyamuni Buddha', category: 'buddha_name' },
  { name: '南无药师琉璃光如来', subtitle: 'Namo Bhaisajyaguru Buddha', category: 'buddha_name' },
  { name: '南无大日如来', subtitle: 'Namo Vairochana Buddha', category: 'buddha_name' },
  { name: '南无不动如来', subtitle: 'Namo Akshobhya Buddha', category: 'buddha_name' },
  { name: '南无观世音菩萨', subtitle: 'Namo Avalokiteshvara', category: 'buddha_name' },
  { name: '南无大势至菩萨', subtitle: 'Namo Mahasthamaprapta', category: 'buddha_name' },
  { name: '南无地藏王菩萨', subtitle: 'Namo Ksitigarbha', category: 'buddha_name' },
  { name: '南无文殊师利菩萨', subtitle: 'Namo Manjushri', category: 'buddha_name' },
  { name: '南无普贤菩萨', subtitle: 'Namo Samantabhadra', category: 'buddha_name' },
  { name: '南无弥勒菩萨', subtitle: 'Namo Maitreya', category: 'buddha_name' },
  { name: '南无虚空藏菩萨', subtitle: 'Namo Akasagarbha', category: 'buddha_name' },
];

/** 用于快速判断一个名字是否是预设 */
export const PRESET_SUTRA_NAMES = new Set(PRESET_SUTRAS.map(p => p.name));

/** 旧 PRESET_MANTRAS 别名（向后兼容，指向同一数据） */
export const PRESET_MANTRAS = PRESET_SUTRAS;
