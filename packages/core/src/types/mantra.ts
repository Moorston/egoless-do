import type { Syncable } from './shared';

export type MantraCategory = 'dharani' | 'sutra' | 'custom';

export interface MantraDef extends Syncable {
  id: string;
  name: string;
  subtitle?: string;
  category: MantraCategory;
  sortOrder: number;
  targetCount?: number;
  fullText?: string;
  pageCount?: number;
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

export const SUTRA_CATEGORIES: { key: MantraCategory; labelKey: string }[] = [
  { key: 'dharani', labelKey: 'sutraCategoryDharani' },
  { key: 'sutra', labelKey: 'sutraCategorySutra' },
  { key: 'custom', labelKey: 'sutraCategoryCustom' },
];

export const DEDICATION_TEMPLATES = [
  '愿以此功德，庄严佛净土。上报四重恩，下济三途苦。若有见闻者，悉发菩提心。尽此一报身，同生极乐国。',
  '愿以此功德，回向一切众生，离苦得乐，早证菩提。',
  '愿以此功德，回向家人亲友，身体健康，平安吉祥。',
  '愿以此功德，回向法界有情，同登净土，共证菩提。',
];

export const PRESET_MANTRAS: { name: string; subtitle: string; category: MantraCategory; fullText?: string }[] = [
  // 咒语 (dharani)
  { name: '六字大明咒', subtitle: 'Om Mani Padme Hum', category: 'dharani' },
  { name: '大悲咒', subtitle: 'Da Bei Zhou', category: 'dharani' },
  { name: '准提神咒', subtitle: 'Cundi Dharani', category: 'dharani' },
  { name: '往生咒', subtitle: 'Amitabha Rebirth Dharani', category: 'dharani' },
  { name: '楞严咒', subtitle: 'Shurangama Mantra', category: 'dharani' },
  { name: '药师灌顶真言', subtitle: 'Medicine Buddha Mantra', category: 'dharani' },
  { name: '地藏菩萨灭定业真言', subtitle: 'Ksitigarbha Mantra', category: 'dharani' },
  { name: '文殊心咒', subtitle: 'Om A Ra Pa Ca Na Dhih', category: 'dharani' },
  // 佛号
  { name: '南无阿弥陀佛', subtitle: 'Namo Amitabha Buddha', category: 'dharani' },
  { name: '南无观世音菩萨', subtitle: 'Namo Avalokiteshvara', category: 'dharani' },
  { name: '南无地藏王菩萨', subtitle: 'Namo Ksitigarbha', category: 'dharani' },
  // 经文 (sutra)
  { name: '心经', subtitle: '般若波罗蜜多心经', category: 'sutra', fullText: '观自在菩萨，行深般若波罗蜜多时，照见五蕴皆空，度一切苦厄。舍利子，色不异空，空不异色，色即是空，空即是色，受想行识，亦复如是。舍利子，是诸法空相，不生不灭，不垢不净，不增不减。是故空中无色，无受想行识，无眼耳鼻舌身意，无色声香味触法，无眼界，乃至无意识界，无无明，亦无无明尽，乃至无老死，亦无老死尽，无苦集灭道，无智亦无得。以无所得故，菩提萨埵，依般若波罗蜜多故，心无挂碍，无挂碍故，无有恐怖，远离颠倒梦想，究竟涅槃。三世诸佛，依般若波罗蜜多故，得阿耨多罗三藐三菩提。故知般若波罗蜜多，是大神咒，是大明咒，是无上咒，是无等等咒，能除一切苦，真实不虚。故说般若波罗蜜多咒，即说咒曰：揭谛揭谛，波罗揭谛，波罗僧揭谛，菩提萨婆诃。' },
  { name: '金刚经', subtitle: '金刚般若波罗蜜经', category: 'sutra', fullText: '如是我闻，一时，佛在舍卫国祇树给孤独园，与大比丘众千二百五十人俱。尔时，世尊食时，著衣持钵，入舍卫大城乞食。于其城中，次第乞已，还至本处。饭食讫，收衣钵，洗足已，敷座而坐。...' },
  { name: '阿弥陀经', subtitle: '佛说阿弥陀经', category: 'sutra', fullText: '如是我闻，一时，佛在舍卫国祇树给孤独园，与大比丘僧千二百五十人俱，皆是大阿罗汉，众所知识...' },
  { name: '地藏经', subtitle: '地藏菩萨本愿经', category: 'sutra', fullText: '忉利天宫神通品第一。如是我闻，一时佛在忉利天，为母说法。尔时十方无量世界，不可说不可说一切诸佛，及大菩萨摩诃萨，皆来集会...' },
  { name: '法华经', subtitle: '妙法莲华经', category: 'sutra', fullText: '如是我闻，一时，佛住王舍城耆闍崛山中，与大比丘众万二千人俱，皆是阿罗汉，诸漏已尽，无复烦恼...' },
  { name: '药师经', subtitle: '药师琉璃光如来本愿功德经', category: 'sutra', fullText: '如是我闻，一时，薄伽梵游化诸国，至广严城，住乐音树下，与大苾刍众八千人俱，菩萨摩诃萨三万六千，及国王大臣、婆罗门居士、天龙药叉...' },
];
