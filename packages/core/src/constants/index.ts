import type { SportGroup, GlobalUser } from '../types';

export const MIND_COLORS = [
  ['#2D1B69','#7C3AED'], ['#0C4A6E','#0EA5E9'],
  ['#064E3B','#10B981'], ['#7C2D12','#F97316'],
  ['#4C0519','#EC4899'], ['#1C1917','#78716C'],
] as const;

export const TAGS_PRESET = ['#感恩','#觉察','#压力释放','#创意灵感','#健康感悟','#跑步心得','#内心独白'];

export const MOODS = ['🌿 平静','⚡ 活力','🌙 沉思','🌸 感恩'];

export const SPORT_GROUPS: SportGroup[] = [
  { group: '我的运动', items: [
    { key: '户外骑行', icon: '🚴', color: '#4CAF50' },
    { key: '室内跑步', icon: '🏃', color: '#2196F3' },
    { key: '爬楼梯',   icon: '🧗', color: '#9C27B0' },
  ]},
  { group: '跑走骑运动', items: [
    { key: '跳绳', icon: '⚡', color: '#FF9800' },
    { key: '羽毛球', icon: '🏸', color: '#4CAF50' },
    { key: '足球', icon: '⚽', color: '#2196F3' },
    { key: '篮球', icon: '🏀', color: '#FF5722' },
    { key: '乒乓球', icon: '🏓', color: '#009688' },
    { key: '网球', icon: '🎾', color: '#8BC34A' },
    { key: '排球', icon: '🏐', color: '#FF9800' },
    { key: '瑜伽', icon: '🧘', color: '#9C27B0' },
    { key: '健身操', icon: '💃', color: '#E91E63' },
    { key: '滑板', icon: '🛹', color: '#607D8B' },
    { key: '轮滑', icon: '🛼', color: '#FF4081' },
    { key: '游泳', icon: '🏊', color: '#00BCD4' },
    { key: '滑冰', icon: '⛸', color: '#B3E5FC' },
    { key: '滑雪', icon: '⛷', color: '#90CAF9' },
    { key: '打拳', icon: '🥊', color: '#F44336' },
    { key: '室内骑行', icon: '🚴', color: '#795548' },
  ]},
];

export const ALL_SPORTS = SPORT_GROUPS.flatMap(g => g.items);

export const SPORT_BG_COLORS: Record<string, string> = {
  爬楼梯: '#4CAF50', 跳绳: '#FF9800', 游泳: '#00BCD4',
  瑜伽: '#9C27B0', 篮球: '#FF5722', 足球: '#4CAF50', 羽毛球: '#2196F3',
};

export const QUICK_FOODS = [
  { name: '米饭（一碗）', cal: 200 },
  { name: '面条（一碗）', cal: 250 },
  { name: '馒头（一个）', cal: 180 },
  { name: '面包（一片）', cal: 80 },
];

export const GLOBAL_USERS: GlobalUser[] = [
  { id:1, name:'晨曦冥想者', lat:35.68, lng:139.76, days:42, sport:'冥想', since:'06:00', duration:'1小时12分' },
  { id:2, name:'晨跑少年',   lat:40.71, lng:-74,    days:28, sport:'跑步', since:'07:15', duration:'45分钟' },
  { id:3, name:'正念行者',   lat:51.5,  lng:-.12,   days:67, sport:'禁食', since:'08:00', duration:'16小时' },
  { id:4, name:'蓝天追梦',   lat:48.85, lng:2.35,   days:15, sport:'骑行', since:'07:30', duration:'30分钟' },
  { id:5, name:'宁静湖畔',   lat:39.9,  lng:116.4,  days:89, sport:'打坐', since:'05:45', duration:'2小时' },
  { id:6, name:'山间行者',   lat:22.3,  lng:114.17, days:33, sport:'行走', since:'06:30', duration:'1小时' },
  { id:7, name:'星辰追逐者', lat:-33.86,lng:151.2,  days:21, sport:'瑜伽', since:'07:00', duration:'40分钟' },
  { id:8, name:'微风漫步',   lat:19.43, lng:-99.13, days:55, sport:'禁食', since:'06:00', duration:'18小时' },
  { id:9, name:'清晨修行',   lat:28.61, lng:77.2,   days:12, sport:'冥想', since:'05:30', duration:'30分钟' },
  { id:10,name:'海浪冥思',   lat:35.68, lng:51.42,  days:8,  sport:'跑步', since:'08:00', duration:'25分钟' },
];
