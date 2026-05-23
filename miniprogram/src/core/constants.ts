import type { Theme, ThemeName, Mood, SportGroup, GlobalUser } from './types';

export const THEMES: Record<ThemeName, Theme> = {
  dark:   { name:'深色',    nameEn:'Dark',      bg:'#0F0A1E', card:'rgba(255,255,255,.07)', cardSolid:'#1A1030', text:'#fff', sub:'rgba(255,255,255,.45)', border:'rgba(255,255,255,.09)', primary:'#7C3AED', navBg:'rgba(15,10,30,.97)',   starfield:false },
  light:  { name:'浅色',    nameEn:'Light',     bg:'#F0EFF8', card:'rgba(255,255,255,.92)', cardSolid:'#fff',    text:'#111', sub:'#888',                  border:'#e0e0e0',                primary:'#7C3AED', navBg:'rgba(240,239,248,.97)',starfield:false },
  ocean:  { name:'深海',    nameEn:'Ocean',     bg:'#071520', card:'rgba(255,255,255,.07)', cardSolid:'#0d2035', text:'#fff', sub:'rgba(255,255,255,.4)',   border:'rgba(255,255,255,.08)', primary:'#0EA5E9', navBg:'rgba(7,21,32,.97)',    starfield:false },
  forest: { name:'森林',    nameEn:'Forest',    bg:'#071510', card:'rgba(255,255,255,.07)', cardSolid:'#0d2218', text:'#fff', sub:'rgba(255,255,255,.4)',   border:'rgba(255,255,255,.08)', primary:'#10B981', navBg:'rgba(7,21,16,.97)',    starfield:false },
  rose:   { name:'玫瑰',    nameEn:'Rose',      bg:'#160810', card:'rgba(255,255,255,.07)', cardSolid:'#250f1e', text:'#fff', sub:'rgba(255,255,255,.4)',   border:'rgba(255,255,255,.08)', primary:'#EC4899', navBg:'rgba(22,8,16,.97)',    starfield:false },
  cosmos: { name:'星空 ✨', nameEn:'Cosmos ✨', bg:'#050310', card:'rgba(255,255,255,.06)', cardSolid:'#0d0826', text:'#fff', sub:'rgba(180,170,255,.5)',   border:'rgba(150,120,255,.12)', primary:'#8B5CF6', navBg:'rgba(5,3,16,.97)',    starfield:true  },
};

export const COLORS = {
  ORANGE: '#FF6B35',
  GREEN:  '#10B981',
  RED:    '#EF4444',
  BLUE:   '#0EA5E9',
  YELLOW: '#FFC107',
};

export const MIND_COLORS = [
  ['#2D1B69','#7C3AED'],
  ['#0C4A6E','#0EA5E9'],
  ['#064E3B','#10B981'],
  ['#7C2D12','#F97316'],
  ['#4C0519','#EC4899'],
  ['#1C1917','#78716C'],
] as const;

export const TAGS_PRESET = ['#感恩','#觉察','#压力释放','#创意灵感','#健康感悟','#跑步心得','#内心独白'];
export const TAGS_PRESET_EN = ['#Gratitude','#Awareness','#Stress','#Creativity','#Health','#Running','#Inner Voice'];
export const MOOD_DISPLAY: Record<Mood, string> = {
  '平静': '🌿 平静',
  '活力': '⚡ 活力',
  '沉思': '🌙 沉思',
  '感恩': '🌸 感恩',
};
export const MOODS: Mood[] = ['平静','活力','沉思','感恩'];
export const MOODS_EN = ['Calm','Energetic','Contemplative','Grateful'] as const;

export const FASTING_DURATIONS = [8,12,14,16,18,20,24] as const;
export const MEDITATION_DURATIONS_MIN = [1,5,10,15,20,30,45,60,120,180,300] as const;
export const MED_SOUNDS = ['海潮','雨声','钵声','鸟叫','流水','风铃','无'];

export const QUICK_FOODS: { name: string; nameEn: string; cal: number }[] = [
  { name:'米饭（一碗）', nameEn:'Rice (1 bowl)', cal:200 },
  { name:'面条（一碗）', nameEn:'Noodles (1 bowl)', cal:250 },
  { name:'馒头（一个）', nameEn:'Steamed bun', cal:180 },
  { name:'面包（一片）', nameEn:'Bread (1 slice)', cal:80  },
];

export const SPORT_GROUPS: SportGroup[] = [
  { group:'我的运动', groupEn:'My Sports', items:[
    { key:'户外骑行', keyEn:'Outdoor Cycling', icon:'🚴', color:'#4CAF50' },
    { key:'室内跑步', keyEn:'Indoor Running',  icon:'🏃', color:'#2196F3' },
    { key:'爬楼梯',   keyEn:'Stair Climbing',  icon:'🧗', color:'#9C27B0' },
  ]},
  { group:'更多运动', groupEn:'More Sports', items:[
    { key:'跳绳',   keyEn:'Jump Rope',    icon:'⚡', color:'#FF9800' },
    { key:'羽毛球', keyEn:'Badminton',     icon:'🏸', color:'#4CAF50' },
    { key:'足球',   keyEn:'Football',      icon:'⚽', color:'#2196F3' },
    { key:'篮球',   keyEn:'Basketball',    icon:'🏀', color:'#FF5722' },
    { key:'乒乓球', keyEn:'Table Tennis',  icon:'🏓', color:'#009688' },
    { key:'网球',   keyEn:'Tennis',        icon:'🎾', color:'#8BC34A' },
    { key:'瑜伽',   keyEn:'Yoga',          icon:'🧘', color:'#9C27B0' },
    { key:'游泳',   keyEn:'Swimming',      icon:'🏊', color:'#00BCD4' },
  ]},
];

export const ALL_SPORTS = SPORT_GROUPS.flatMap(g => g.items);

export const SPORT_BG_COLORS: Record<string, string> = {
  爬楼梯: '#4CAF50', 跳绳: '#FF9800', 游泳: '#00BCD4',
  瑜伽: '#9C27B0', 篮球: '#FF5722', 足球: '#4CAF50', 羽毛球: '#2196F3',
};

export const GLOBAL_USERS: GlobalUser[] = [];

export const LANG_LIST: { code: string; flag: string; name: string }[] = [
  { code:'zh',      flag:'🇨🇳', name:'简体中文' },
  { code:'en',      flag:'🇺🇸', name:'English'  },
  { code:'ja',      flag:'🇯🇵', name:'日本語'   },
  { code:'ko',      flag:'🇰🇷', name:'한국어'   },
  { code:'fr',      flag:'🇫🇷', name:'Français' },
  { code:'de',      flag:'🇩🇪', name:'Deutsch'  },
  { code:'es',      flag:'🇪🇸', name:'Español'  },
  { code:'zh-Hant', flag:'🇹🇼', name:'繁體中文' },
];

