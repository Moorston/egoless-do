export interface ThemeColors {
  name: string;
  bg: string;
  card: string;
  cardSolid: string;
  text: string;
  sub: string;
  border: string;
  primary: string;
  navBg: string;
  starfield: boolean;
}

export const THEMES: Record<string, ThemeColors> = {
  dark:     { name:'深色',   bg:'#0F0A1E', card:'rgba(255,255,255,.07)', cardSolid:'#1A1030', text:'#fff', sub:'rgba(255,255,255,.45)', border:'rgba(255,255,255,.09)', primary:'#7C3AED', navBg:'rgba(15,10,30,.97)', starfield:false },
  light:    { name:'浅色',   bg:'#F0EFF8', card:'rgba(255,255,255,.92)', cardSolid:'#fff', text:'#111', sub:'#888', border:'#e0e0e0', primary:'#7C3AED', navBg:'rgba(240,239,248,.97)', starfield:false },
  ocean:    { name:'深海',   bg:'#071520', card:'rgba(255,255,255,.07)', cardSolid:'#0d2035', text:'#fff', sub:'rgba(255,255,255,.4)', border:'rgba(255,255,255,.08)', primary:'#0EA5E9', navBg:'rgba(7,21,32,.97)', starfield:false },
  forest:   { name:'森林',   bg:'#071510', card:'rgba(255,255,255,.07)', cardSolid:'#0d2218', text:'#fff', sub:'rgba(255,255,255,.4)', border:'rgba(255,255,255,.08)', primary:'#10B981', navBg:'rgba(7,21,16,.97)', starfield:false },
  rose:     { name:'玫瑰',   bg:'#160810', card:'rgba(255,255,255,.07)', cardSolid:'#250f1e', text:'#fff', sub:'rgba(255,255,255,.4)', border:'rgba(255,255,255,.08)', primary:'#EC4899', navBg:'rgba(22,8,16,.97)', starfield:false },
  cosmos:   { name:'星空 ✨', bg:'#050310', card:'rgba(255,255,255,.06)', cardSolid:'#0d0826', text:'#fff', sub:'rgba(180,170,255,.5)', border:'rgba(150,120,255,.12)', primary:'#8B5CF6', navBg:'rgba(5,3,16,.97)', starfield:true },
};

export const ORANGE = '#FF6B35';
export const GREEN = '#10B981';
export const RED = '#EF4444';
export const BLUE = '#0EA5E9';
export const YELLOW = '#FFC107';
