import { useState, useEffect, useRef, useMemo } from "react";

const T0={appName:"心流纪",streak:"连续打卡",days:"天",home:"主页",fasting:"禁食",meditation:"冥想",reflections:"感念",exercise:"锻炼",habits:"习惯",stats:"统计",settings:"设置",linkWorld:"全球脉动",todayCheckin:"今日打卡",openCheckin:"📋 进入打卡",done:"已完成",notDone:"未完成",cancel:"取消",save:"保存",submit:"提交打卡",note:"打卡感念",freeCheckin:"自由打卡",startFasting:"⏰ 开始禁食",quickStart:"⚡ 快速开始 8小时",stopFasting:"⏹ 停止禁食",accMed:"累计打坐 (分钟)",bgMusic:"背景音乐",startMed:"开始打坐",stopMed:"停止",shareMed:"☯ 分享我的打坐",mindPulse:"感念脉络",newReflection:"新建感念",saveReflection:"保存感念 ✦",myHabits:"我的习惯",addHabit:"+ 添加习惯",habitName:"习惯名称",startDate:"开始日期",targetDays:"目标天数",habitGoal:"目标",habitInsight:"习惯感念",createTag:"自动创建感念标签",createHabit:"创建习惯 ◇",editHabit:"编辑习惯",allStatus:"全部",notStarted:"未开始",inProgress:"进行中",paused:"暂停",abandoned:"废弃",completed:"已完成",selectExercise:"选择运动类型",leaderboard:"打卡排行榜",addFood:"添加饮食",foodName:"食物名称",calories2:"卡路里",quickAdd:"快速添加",theme:"主题",language:"语言",remindOn:"启用每日提醒",remindTime:"提醒时间",statsData:"统计数据",history:"打卡历史",foodLog:"饮食记录",appleHealth:"Apple Health",shareApp:"分享应用",version:"版本",privacy:"隐私政策",resetWelcome:"重置欢迎页",graceRestore:"宽限期恢复",devTest:"🔧 开发者测试",premiumTitle:"升级 Premium",premiumSub:"解锁高级模板与 AI 感悟总结",learnMore:"了解 →",water:"今日饮水量",addFoodBtn:"+ 添加饮食",totalFasting:"禁食时长",totalExercise:"锻炼次数",noHistory:"暂无记录",interrupted:"中断天数",fastingHistory:"禁食历史",meditationHistory:"冥想历史"};

const LANG_LIST=[{code:"zh",flag:"🇨🇳",name:"简体中文"},{code:"en",flag:"🇺🇸",name:"English"},{code:"ja",flag:"🇯🇵",name:"日本語"},{code:"ko",flag:"🇰🇷",name:"한국어"},{code:"fr",flag:"🇫🇷",name:"Français"},{code:"de",flag:"🇩🇪",name:"Deutsch"},{code:"es",flag:"🇪🇸",name:"Español"},{code:"pt",flag:"🇵🇹",name:"Português"},{code:"ru",flag:"🇷🇺",name:"Русский"},{code:"ar",flag:"🇸🇦",name:"العربية"},{code:"it",flag:"🇮🇹",name:"Italiano"},{code:"hi",flag:"🇮🇳",name:"हिन्दी"},{code:"vi",flag:"🇻🇳",name:"Tiếng Việt"},{code:"th",flag:"🇹🇭",name:"ภาษาไทย"},{code:"zh-Hant",flag:"🇹🇼",name:"繁體中文"}];

const THEMES={dark:{name:"深色",bg:"#0F0A1E",card:"rgba(255,255,255,.07)",cardSolid:"#1A1030",text:"#fff",sub:"rgba(255,255,255,.45)",border:"rgba(255,255,255,.09)",primary:"#7C3AED",navBg:"rgba(15,10,30,.97)",starfield:false},light:{name:"浅色",bg:"#F0EFF8",card:"rgba(255,255,255,.92)",cardSolid:"#fff",text:"#111",sub:"#888",border:"#e0e0e0",primary:"#7C3AED",navBg:"rgba(240,239,248,.97)",starfield:false},ocean:{name:"深海",bg:"#071520",card:"rgba(255,255,255,.07)",cardSolid:"#0d2035",text:"#fff",sub:"rgba(255,255,255,.4)",border:"rgba(255,255,255,.08)",primary:"#0EA5E9",navBg:"rgba(7,21,32,.97)",starfield:false},forest:{name:"森林",bg:"#071510",card:"rgba(255,255,255,.07)",cardSolid:"#0d2218",text:"#fff",sub:"rgba(255,255,255,.4)",border:"rgba(255,255,255,.08)",primary:"#10B981",navBg:"rgba(7,21,16,.97)",starfield:false},rose:{name:"玫瑰",bg:"#160810",card:"rgba(255,255,255,.07)",cardSolid:"#250f1e",text:"#fff",sub:"rgba(255,255,255,.4)",border:"rgba(255,255,255,.08)",primary:"#EC4899",navBg:"rgba(22,8,16,.97)",starfield:false},cosmos:{name:"星空 ✨",bg:"#050310",card:"rgba(255,255,255,.06)",cardSolid:"#0d0826",text:"#fff",sub:"rgba(180,170,255,.5)",border:"rgba(150,120,255,.12)",primary:"#8B5CF6",navBg:"rgba(5,3,16,.97)",starfield:true}};

const ORANGE="#FF6B35",GREEN="#10B981",RED="#EF4444",BLUE="#0EA5E9",YELLOW="#FFC107";
const fmt=s=>{const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;};
const fmtMS=s=>{const m=Math.floor(s/60),ss=s%60;return`${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;};
const dateStr=(d=new Date())=>d.toISOString().slice(0,10);
const tmr=()=>{const d=new Date();d.setDate(d.getDate()+1);return dateStr(d);};
const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();

const MIND_COLORS=[["#2D1B69","#7C3AED"],["#0C4A6E","#0EA5E9"],["#064E3B","#10B981"],["#7C2D12","#F97316"],["#4C0519","#EC4899"],["#1C1917","#78716C"]];
const TAGS_PRESET=["#感恩","#觉察","#压力释放","#创意灵感","#健康感悟","#跑步心得","#内心独白"];
const MOODS=["🌿 平静","⚡ 活力","🌙 沉思","🌸 感恩"];

const SPORT_GROUPS=[
  {group:"我的运动",items:[{key:"户外骑行",icon:"🚴",color:"#4CAF50"},{key:"室内跑步",icon:"🏃",color:"#2196F3"},{key:"爬楼梯",icon:"🧗",color:"#9C27B0"}]},
  {group:"跑走骑运动",items:[{key:"跳绳",icon:"⚡",color:"#FF9800"},{key:"羽毛球",icon:"🏸",color:"#4CAF50"},{key:"足球",icon:"⚽",color:"#2196F3"},{key:"篮球",icon:"🏀",color:"#FF5722"},{key:"乒乓球",icon:"🏓",color:"#009688"},{key:"网球",icon:"🎾",color:"#8BC34A"},{key:"排球",icon:"🏐",color:"#FF9800"},{key:"瑜伽",icon:"🧘",color:"#9C27B0"},{key:"健身操",icon:"💃",color:"#E91E63"},{key:"滑板",icon:"🛹",color:"#607D8B"},{key:"轮滑",icon:"🛼",color:"#FF4081"},{key:"游泳",icon:"🏊",color:"#00BCD4"},{key:"滑冰",icon:"⛸",color:"#B3E5FC"},{key:"滑雪",icon:"⛷",color:"#90CAF9"},{key:"打拳",icon:"🥊",color:"#F44336"},{key:"室内骑行",icon:"🚴",color:"#795548"}]},
];
const ALL_SPORTS=SPORT_GROUPS.flatMap(g=>g.items);
const SPORT_BG_COLORS={爬楼梯:"#4CAF50",跳绳:"#FF9800",游泳:"#00BCD4",瑜伽:"#9C27B0",篮球:"#FF5722",足球:"#4CAF50",羽毛球:"#2196F3"};

const GLOBAL_USERS=[{id:1,name:"晨曦冥想者",lat:35.68,lng:139.76,days:42,sport:"冥想",since:"06:00",duration:"1小时12分"},{id:2,name:"晨跑少年",lat:40.71,lng:-74,days:28,sport:"跑步",since:"07:15",duration:"45分钟"},{id:3,name:"正念行者",lat:51.5,lng:-.12,days:67,sport:"禁食",since:"08:00",duration:"16小时"},{id:4,name:"蓝天追梦",lat:48.85,lng:2.35,days:15,sport:"骑行",since:"07:30",duration:"30分钟"},{id:5,name:"宁静湖畔",lat:39.9,lng:116.4,days:89,sport:"打坐",since:"05:45",duration:"2小时"},{id:6,name:"山间行者",lat:22.3,lng:114.17,days:33,sport:"行走",since:"06:30",duration:"1小时"},{id:7,name:"星辰追逐者",lat:-33.86,lng:151.2,days:21,sport:"瑜伽",since:"07:00",duration:"40分钟"},{id:8,name:"微风漫步",lat:19.43,lng:-99.13,days:55,sport:"禁食",since:"06:00",duration:"18小时"},{id:9,name:"清晨修行",lat:28.61,lng:77.2,days:12,sport:"冥想",since:"05:30",duration:"30分钟"},{id:10,name:"海浪冥思",lat:35.68,lng:51.42,days:8,sport:"跑步",since:"08:00",duration:"25分钟"}];
const QUICK_FOODS=[{name:"米饭（一碗）",cal:200},{name:"面条（一碗）",cal:250},{name:"馒头（一个）",cal:180},{name:"面包（一片）",cal:80}];

// ── Globe SVG Icon ────────────────────────────────────────
const GlobeIcon=({size=20,color="#8B5CF6"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

// ── Starfield ─────────────────────────────────────────────
function Starfield(){
  const ref=useRef();
  useEffect(()=>{
    const c=ref.current;if(!c)return;
    const ctx=c.getContext("2d"),W=390,H=Math.max(window.innerHeight,800);
    c.width=W;c.height=H;
    const stars=Array.from({length:150},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+.3,o:Math.random()*.8+.15,s:Math.random()*.003+.001,ph:Math.random()*Math.PI*2}));
    let raf,t=0;
    const draw=()=>{ctx.clearRect(0,0,W,H);const g=ctx.createRadialGradient(195,H*.35,0,195,H*.35,H*.75);g.addColorStop(0,"#1a1060");g.addColorStop(.5,"#0a0520");g.addColorStop(1,"#050310");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);stars.forEach(s=>{const op=s.o*(0.4+0.6*Math.sin(t*s.s*60+s.ph));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(200,210,255,${op})`;ctx.fill();});t+=.016;raf=requestAnimationFrame(draw);};
    draw();return()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}

// ── OSM Map ───────────────────────────────────────────────
const OSMap=()=>(
  <div style={{flex:1,position:"relative",minHeight:0,overflow:"hidden"}}>
    <iframe title="osm" src="https://www.openstreetmap.org/export/embed.html?bbox=116.38,39.90,116.42,39.92&layer=mapnik" style={{width:"100%",height:"100%",border:"none",position:"absolute",inset:0}} scrolling="no"/>
    <div style={{position:"absolute",top:10,left:10,background:"rgba(255,255,255,.93)",borderRadius:20,padding:"5px 12px",fontSize:12,display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:4,background:RED}}/>GPS 未连接</div>
    <div style={{position:"absolute",top:10,right:10,background:"rgba(255,255,255,.93)",borderRadius:10,padding:"5px 12px",fontSize:12}}>📊 历史</div>
  </div>
);

// ── Habit Calendar ────────────────────────────────────────
function HabitCalendar({habit,onClose,TH,P}){
  const today=new Date();const [vy,setVy]=useState(today.getFullYear());const [vm,setVm]=useState(today.getMonth());
  const checked=useMemo(()=>new Set(habit.checkedDates||[]),[habit]);
  const first=new Date(vy,vm,1).getDay(),days=daysInMonth(vy,vm);
  const cells=[];for(let i=0;i<first;i++)cells.push(null);for(let d=1;d<=days;d++)cells.push(d);
  const ms=`${vy}-${String(vm+1).padStart(2,"0")}`;
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:TH.cardSolid,borderRadius:20,padding:20,width:"100%",maxWidth:340}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={()=>{if(vm===0){setVy(y=>y-1);setVm(11);}else setVm(m=>m-1);}} style={{background:"transparent",border:"none",color:TH.text,fontSize:22,cursor:"pointer"}}>‹</button>
        <div style={{fontWeight:700,fontSize:16,color:TH.text}}>{vy}年{vm+1}月</div>
        <button onClick={()=>{if(vm===11){setVy(y=>y+1);setVm(0);}else setVm(m=>m+1);}} style={{background:"transparent",border:"none",color:TH.text,fontSize:22,cursor:"pointer"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>{["日","一","二","三","四","五","六"].map(d=><div key={d} style={{textAlign:"center",fontSize:11,color:TH.sub}}>{d}</div>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {cells.map((d,i)=>{if(!d)return<div key={i}/>;const ds=`${ms}-${String(d).padStart(2,"0")}`;const ck=checked.has(ds);const isT=ds===dateStr();return(<div key={i} style={{textAlign:"center",padding:"5px 0",borderRadius:7,fontSize:12,fontWeight:ck?700:400,background:ck?P:isT?`${P}22`:"transparent",color:ck?"#fff":isT?P:TH.text}}>{d}</div>);})}
      </div>
      <div style={{display:"flex",gap:14,marginTop:12,justifyContent:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:P}}/><span style={{fontSize:11,color:TH.sub}}>已打卡</span></div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:`${P}22`}}/><span style={{fontSize:11,color:TH.sub}}>今天</span></div>
      </div>
      <button onClick={onClose} style={{width:"100%",marginTop:14,padding:11,borderRadius:12,border:`1px solid ${TH.border}`,background:"transparent",color:TH.sub,fontSize:14,cursor:"pointer"}}>关闭</button>
    </div>
  </div>);
}

// ── Food Modal ────────────────────────────────────────────
function FoodModal({TH,P,inp,name,setName,cal,setCal,note,setNote,onAdd,onClose}){
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{background:TH.cardSolid,borderRadius:20,padding:24,width:"100%",maxWidth:340}}>
      <div style={{fontWeight:700,fontSize:18,marginBottom:16,color:TH.text}}>添加饮食</div>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="食物名称" style={{...inp,marginBottom:10,border:`2px solid ${P}`}}/>
      <input type="number" value={cal} onChange={e=>setCal(e.target.value)} placeholder="卡路里" style={{...inp,marginBottom:10}}/>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="饮食感念" rows={2} style={{width:"100%",background:TH.card,border:`1px solid ${TH.border}`,borderRadius:10,padding:"10px 12px",color:TH.text,fontSize:14,resize:"none",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
      <div style={{fontSize:12,color:TH.sub,marginBottom:8}}>快速添加</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:16}}>
        {QUICK_FOODS.map(f=>(<button key={f.name} onClick={()=>{setName(f.name);setCal(String(f.cal));}} style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${TH.border}`,background:"transparent",cursor:"pointer",textAlign:"left"}}><div style={{fontSize:12,color:TH.text}}>{f.name}</div><div style={{fontSize:11,color:P,marginTop:2}}>{f.cal}</div></button>))}
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onClose} style={{flex:1,padding:12,borderRadius:12,border:`1px solid ${TH.border}`,background:"transparent",color:TH.sub,fontSize:14,cursor:"pointer"}}>取消</button>
        <button onClick={onAdd} style={{flex:1,padding:12,borderRadius:12,border:"none",background:ORANGE,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>确定</button>
      </div>
    </div>
  </div>);
}

// ── GlobalMapPage ─────────────────────────────────────────
function GlobalMapPage({TH,P,onClose}){
  const [sel,setSel]=useState(null);
  const cs={background:TH.card,borderRadius:16,padding:16,marginBottom:12,border:`1px solid ${TH.border}`};
  return(<div style={{maxWidth:390,margin:"0 auto",fontFamily:"-apple-system,system-ui,sans-serif",background:TH.bg,minHeight:"100vh",display:"flex",flexDirection:"column",color:TH.text}}>
    {TH.starfield&&<Starfield/>}
    <div style={{padding:"16px 16px 0",display:"flex",alignItems:"center",gap:12,position:"relative",zIndex:1}}>
      <button onClick={onClose} style={{background:"transparent",border:"none",color:TH.text,fontSize:20,cursor:"pointer"}}>←</button>
      <div style={{display:"flex",alignItems:"center",gap:8}}><GlobeIcon size={20} color={P}/><div style={{fontWeight:700,fontSize:18}}>全球脉动</div></div>
    </div>
    <div style={{position:"relative",height:250,margin:16,borderRadius:16,overflow:"hidden",zIndex:1}}>
      <iframe title="gmap" src="https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik" style={{width:"100%",height:"100%",border:"none"}} scrolling="no"/>
      {GLOBAL_USERS.map(u=>(<button key={u.id} onClick={()=>setSel(u)} style={{position:"absolute",left:`${((u.lng+180)/360)*100}%`,top:`${((90-u.lat)/180)*100}%`,transform:"translate(-50%,-50%)",width:26,height:26,borderRadius:13,background:u.id===1?P:"rgba(255,107,53,.9)",border:"2px solid #fff",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700}}>{u.name[0]}</button>))}
      {sel&&(<div style={{position:"absolute",bottom:8,left:8,right:8,background:"rgba(0,0,0,.85)",borderRadius:12,padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{sel.name}</div><div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:3}}>打卡 {sel.days} 天 · {sel.sport}</div><div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>{sel.since} 开始 · 坚持了 {sel.duration}</div></div>
          <button onClick={()=>setSel(null)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,.5)",fontSize:18,cursor:"pointer"}}>×</button>
        </div>
      </div>)}
    </div>
    <div style={{padding:"0 16px 4px",fontWeight:600,fontSize:15,position:"relative",zIndex:1}}>打卡排行榜 🏆</div>
    <div style={{padding:"0 16px",flex:1,overflowY:"auto",position:"relative",zIndex:1}}>
      {[...GLOBAL_USERS].sort((a,b)=>b.days-a.days).map((u,i)=>(<div key={u.id} style={{...cs,display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
        <div style={{width:30,height:30,borderRadius:15,background:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":P,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13,flexShrink:0}}>{i+1}</div>
        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{u.name}</div><div style={{fontSize:11,color:TH.sub,marginTop:2}}>{u.sport} · {u.since}</div></div>
        <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:18,color:P}}>{u.days}</div><div style={{fontSize:10,color:TH.sub}}>天</div></div>
      </div>))}
    </div>
  </div>);
}

// ── SportPrepPage (图2风格) ───────────────────────────────
function SportPrepPage({sport,TH,P,onStart,onBack}){
  const [mode,setMode]=useState("free"); // free | target
  const bg=SPORT_BG_COLORS[sport.key]||"#4CAF50";
  return(<div style={{maxWidth:390,margin:"0 auto",fontFamily:"-apple-system,system-ui,sans-serif",background:TH.bg,minHeight:"100vh",display:"flex",flexDirection:"column",color:TH.text}}>
    {/* top bar */}
    <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:16}}>{sport.icon}</span>
        <span style={{fontWeight:600,fontSize:15}}>{sport.key}</span>
      </div>
      <div style={{display:"flex",gap:12,fontSize:20}}>❤️ 🎵 ⚙️</div>
    </div>
    {/* sport banner */}
    <div style={{margin:"0 16px",borderRadius:18,overflow:"hidden",height:260,background:bg,position:"relative",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexWrap:"wrap",gap:0,overflow:"hidden",opacity:.25}}>
        {Array.from({length:12}).map((_,i)=><span key={i} style={{fontSize:42,fontWeight:900,color:"rgba(0,0,0,.4)",lineHeight:1.1,whiteSpace:"nowrap"}}>{sport.key.toUpperCase()} </span>)}
      </div>
      <div style={{fontSize:72,position:"relative",zIndex:1}}>{sport.icon}</div>
      <div style={{position:"absolute",bottom:12,left:12,right:12,background:"rgba(255,255,255,.85)",borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"flex-start",gap:8}}>
        <span style={{fontSize:16}}>💡</span>
        <div style={{fontSize:12,color:"#333",lineHeight:1.5}}>{sport.key}运动数据将自动记录。请确保健康权限已开启，以获取更准确的数据。</div>
      </div>
    </div>
    {/* mode selector */}
    <div style={{display:"flex",justifyContent:"center",gap:24,padding:"20px 0 16px"}}>
      {["free","target"].map(m=>(<button key={m} onClick={()=>setMode(m)} style={{background:"transparent",border:"none",fontSize:16,fontWeight:700,cursor:"pointer",color:mode===m?bg:TH.sub,borderBottom:mode===m?`2px solid ${bg}`:"2px solid transparent",paddingBottom:4}}>
        {m==="free"?"自由练":"目标练"}
      </button>))}
    </div>
    {/* GO button */}
    <div style={{padding:"0 16px",display:"flex",gap:12}}>
      <button onClick={onStart} style={{flex:1,height:64,borderRadius:32,border:"none",background:bg,color:"#fff",fontWeight:900,fontSize:28,cursor:"pointer",letterSpacing:2}}>GO</button>
      <button style={{height:64,padding:"0 20px",borderRadius:32,border:"none",background:TH.card,color:TH.text,fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>⚙️ 装备</button>
    </div>
    <button onClick={onBack} style={{margin:"16px auto 0",background:"transparent",border:"none",color:TH.sub,fontSize:13,cursor:"pointer"}}>← 返回</button>
  </div>);
}

// ── SportActivePage (图3风格) ─────────────────────────────
function SportActivePage({sport,TH,onStop}){
  const [sec,setSec]=useState(0);const [active,setActive]=useState(true);
  const ref=useRef();
  useEffect(()=>{if(active){ref.current=setInterval(()=>setSec(s=>s+1),1000);}else clearInterval(ref.current);return()=>clearInterval(ref.current);},[active]);
  return(<div style={{maxWidth:390,margin:"0 auto",fontFamily:"-apple-system,system-ui,sans-serif",background:"#2a2835",minHeight:"100vh",display:"flex",flexDirection:"column",color:"#fff"}}>
    <div style={{padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>{sport.icon}</span><span style={{fontSize:15,fontWeight:600,color:"#bbb"}}>{sport.key}</span></div>
      <div style={{display:"flex",gap:16,alignItems:"center"}}>
        <span style={{color:"#aaa",fontSize:16}}>❤️</span>
        <span style={{color:GREEN,fontSize:16}}>↗</span>
        <span style={{color:GREEN,fontSize:16}}>✏️</span>
      </div>
    </div>
    {/* music bar */}
    <div style={{background:"rgba(255,255,255,.06)",margin:"14px 16px 0",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:40,height:40,background:"rgba(255,255,255,.1)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎵</div>
      <div><div style={{fontSize:14,fontWeight:600}}>选择运动音乐</div><div style={{fontSize:12,color:"rgba(255,255,255,.45)",marginTop:2}}>让音乐陪伴你的每一次运动</div></div>
    </div>
    {/* stats */}
    <div style={{flex:1,padding:"32px 28px 0"}}>
      <div style={{fontSize:88,fontWeight:900,lineHeight:1,color:"#fff"}}>{Math.floor(sec/60)||0}</div>
      <div style={{fontSize:14,color:"rgba(255,255,255,.45)",marginTop:6,marginBottom:48}}>总消耗</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",rowGap:40}}>
        <div><div style={{fontSize:38,fontWeight:800}}>{fmtMS(sec)}</div><div style={{fontSize:13,color:"rgba(255,255,255,.45)",marginTop:4}}>总时长</div></div>
        <div><div style={{fontSize:38,fontWeight:800}}>0.{String(Math.floor(sec/15)).padStart(2,"0")}</div><div style={{fontSize:13,color:"rgba(255,255,255,.45)",marginTop:4}}>爬升高度</div></div>
        <div><div style={{fontSize:38,fontWeight:800}}>0</div><div style={{fontSize:13,color:"rgba(255,255,255,.45)",marginTop:4}}>层数</div></div>
        <div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:38,fontWeight:800}}>--</span><span style={{fontSize:22,color:"#e53935"}}>❤️</span></div><div style={{fontSize:13,color:"rgba(255,255,255,.45)",marginTop:4}}>实时心率</div></div>
      </div>
    </div>
    {/* controls */}
    <div style={{padding:"0 24px 48px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <button style={{width:52,height:52,borderRadius:26,background:"rgba(255,255,255,.1)",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}}>🔓</button>
      <button onClick={()=>setActive(v=>!v)} style={{width:76,height:76,borderRadius:38,background:"#fff",border:"none",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#333"}}>
        {active?"⏸":"▶"}
      </button>
      <button onClick={onStop} style={{width:52,height:52,borderRadius:26,background:"rgba(255,255,255,.1)",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}}>⚙️</button>
    </div>
  </div>);
}

// ══════════════════════════════════════════════════════════
export default function App(){
  const [themeName,setThemeName]=useState("dark");
  const TH=THEMES[themeName];const P=TH.primary;
  const T=T0;

  const cs={background:TH.card,borderRadius:16,padding:16,marginBottom:12,border:`1px solid ${TH.border}`,position:"relative",zIndex:1};
  const Card=({children,style={}})=><div style={{...cs,...style}}>{children}</div>;
  const StatCard=({icon,label,value,unit,bg})=>(<div style={{background:bg,borderRadius:14,padding:"14px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,flex:1}}><div style={{fontSize:22}}>{icon}</div><div style={{fontSize:11,color:"rgba(255,255,255,.78)",textAlign:"center"}}>{label}</div><div style={{fontWeight:700,color:"#fff",fontSize:17}}>{value}<span style={{fontSize:12,fontWeight:400}}> {unit}</span></div></div>);
  const Toggle=({on,onChange})=>(<div onClick={onChange} style={{width:44,height:24,borderRadius:12,background:on?P:"rgba(128,128,128,.3)",position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}><div style={{position:"absolute",top:2,left:on?22:2,width:20,height:20,borderRadius:10,background:"#fff",transition:"left .2s"}}/></div>);
  const RowItem=({label,right,sub,icon,last,onClick})=>(<div onClick={onClick} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 0",borderBottom:last?"none":`1px solid ${TH.border}`,cursor:onClick?"pointer":"default"}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>{icon&&<span style={{fontSize:18}}>{icon}</span>}<div><div style={{fontSize:14,color:TH.text}}>{label}</div>{sub&&<div style={{fontSize:11,color:TH.sub,marginTop:1}}>{sub}</div>}</div></div>
    <div style={{display:"flex",alignItems:"center",gap:6,color:TH.sub,fontSize:13}}>{right}</div>
  </div>);
  const Btn=({children,onClick,bg,style={}})=>(<button onClick={onClick} style={{padding:"13px 0",borderRadius:12,border:"none",background:bg||P,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",width:"100%",...style}}>{children}</button>);
  const inp={width:"100%",background:TH.card,border:`1px solid ${TH.border}`,borderRadius:10,padding:"10px 12px",color:TH.text,fontSize:14,outline:"none",boxSizing:"border-box"};

  const LinkWorldBtn=({label="",onClick})=>(<div onClick={onClick} style={{...cs,cursor:"pointer",display:"flex",alignItems:"center",gap:10,padding:"12px 14px"}}>
    <GlobeIcon size={18} color={P}/><span style={{fontSize:13,color:TH.text}}>{T.linkWorld}{label&&` — ${label}`}</span><span style={{marginLeft:"auto",color:TH.sub}}>›</span>
  </div>);

  const [tab,setTab]=useState(0);
  const H_TABS=[T.home,T.fasting,T.meditation,T.reflections,T.exercise,T.habits,T.stats,T.settings];
  const H_ICONS=["◎","⏱","☯","✦","🏃","◇","◈","⚙"];
  const B_TABS=[{l:T.home,i:"◎",h:0},{l:T.fasting,i:"⏱",h:1},{l:T.meditation,i:"☯",h:2},{l:T.exercise,i:"🏃",h:4},{l:T.settings,i:"⚙",h:7}];
  const streak=7;

  // water
  const [waterGoal,setWaterGoal]=useState(2000);const [waterMl,setWaterMl]=useState(0);
  const [showWaterGoal,setShowWaterGoal]=useState(false);const [waterGoalInput,setWaterGoalInput]=useState("2000");
  // calories
  const [calGoal,setCalGoal]=useState(2000);const [showCalGoal,setShowCalGoal]=useState(false);const [calGoalInput,setCalGoalInput]=useState("2000");
  const [foodLog,setFoodLog]=useState([]);const totalCal=foodLog.reduce((a,f)=>a+f.cal,0);
  const [showAddFood,setShowAddFood]=useState(false);const [fn2,setFn2]=useState("");const [fc2,setFc2]=useState("");const [fno2,setFno2]=useState("");
  function addFoodItem(){if(!fn2.trim())return;setFoodLog(f=>[...f,{name:fn2,cal:+fc2||0,note:fno2,ts:Date.now()}]);setFn2("");setFc2("");setFno2("");setShowAddFood(false);}

  // checkin
  const [showCheckin,setShowCheckin]=useState(false);const [checkinDone,setCheckinDone]=useState(null);const [checkinNote,setCheckinNote]=useState("");
  const [weight,setWeight]=useState(65);const [fasted,setFasted]=useState(false);const [water,setWater]=useState("");
  const [practices,setPractices]=useState({sit:false,stand:false,chant:false});
  const [freeItems,setFreeItems]=useState([]);const [freeCheckins,setFreeCheckins]=useState({});
  const [checkinHistory,setCheckinHistory]=useState([{date:"2026-05-13",done:true,note:"状态不错",streak:6},{date:"2026-05-12",done:false,note:"",streak:5},{date:"2026-05-11",done:true,note:"",streak:4}]);
  const [habitCheckins,setHabitCheckins]=useState({});
  function submitCheckin(){setCheckinHistory(h=>[{date:dateStr(),done:checkinDone,note:checkinNote,streak},...h]);setShowCheckin(false);}

  // fasting
  const [showDurModal,setShowDurModal]=useState(false);const [fastDur,setFastDur]=useState(8);const [tmpDur,setTmpDur]=useState(8);
  const [fastSec,setFastSec]=useState(0);const [fastActive,setFastActive]=useState(false);const [agreed,setAgreed]=useState(false);
  const [fastHistory,setFastHistory]=useState([{date:"2026-05-13",dur:"16h 02m",kcal:580},{date:"2026-05-12",dur:"15h 48m",kcal:560},{date:"2026-05-11",dur:"16h 05m",kcal:585}]);
  const [showFastHistory,setShowFastHistory]=useState(false);
  const fastRef=useRef();
  useEffect(()=>{if(fastActive){fastRef.current=setInterval(()=>setFastSec(s=>s+1),1000);}else clearInterval(fastRef.current);return()=>clearInterval(fastRef.current);},[fastActive]);

  // meditation
  const [medDur,setMedDur]=useState(5*60);const [medSec,setMedSec]=useState(0);const [medActive,setMedActive]=useState(false);const [totalMed,setTotalMed]=useState(42);const [sound,setSound]=useState("海潮");
  const [medHistory,setMedHistory]=useState([{date:"2026-05-13",dur:"10分钟",mood:"🌿 平静"},{date:"2026-05-12",dur:"5分钟",mood:"🌙 沉思"},{date:"2026-05-11",dur:"20分钟",mood:"🌸 感恩"}]);
  const [showMedHistory,setShowMedHistory]=useState(false);
  const medRef=useRef();
  useEffect(()=>{if(medActive){medRef.current=setInterval(()=>setMedSec(s=>{if(s+1>=medDur){clearInterval(medRef.current);setMedActive(false);setTotalMed(t=>t+Math.floor(medDur/60));setMedHistory(h=>[{date:dateStr(),dur:`${Math.floor(medDur/60)}分钟`,mood:"🌿 平静"},...h]);return 0;}return s+1;}),1000);}else clearInterval(medRef.current);return()=>clearInterval(medRef.current);},[medActive,medDur]);

  // reflections
  const [reflections,setReflections]=useState([{id:1,ts:Date.now()-3600000,content:"今天跑步时感受到风吹过的那一刻，突然理解了什么叫当下。",tags:["#跑步心得","#觉察"],mood:"🌿 平静",colors:MIND_COLORS[1]},{id:2,ts:Date.now()-86400000,content:"焦虑不是敌人，它只是提醒你还在乎一些东西。",tags:["#压力释放","#内心独白"],mood:"🌙 沉思",colors:MIND_COLORS[0]},{id:3,ts:Date.now()-86400000*2,content:"感谢今天的阳光，感谢今天能呼吸。",tags:["#感恩"],mood:"🌸 感恩",colors:MIND_COLORS[2]}]);
  const [showNewMind,setShowNewMind]=useState(false);const [mindContent,setMindContent]=useState("");const [mindTags,setMindTags]=useState([]);const [mindMood,setMindMood]=useState("");const [mindColorIdx,setMindColorIdx]=useState(0);const [filterTag,setFilterTag]=useState("");
  const allTags=[...new Set(reflections.flatMap(r=>r.tags))];
  const filteredMind=filterTag?reflections.filter(r=>r.tags.includes(filterTag)):reflections;
  function addMind(){if(!mindContent.trim())return;setReflections(r=>[{id:Date.now(),ts:Date.now(),content:mindContent,tags:mindTags,mood:mindMood,colors:MIND_COLORS[mindColorIdx]},...r]);setMindContent("");setMindTags([]);setMindMood("");setShowNewMind(false);}
  const mindByDay=useMemo(()=>{const m={};filteredMind.forEach(r=>{const d=new Date(r.ts).toLocaleDateString("zh-CN",{month:"long",day:"numeric",weekday:"short"});if(!m[d])m[d]=[];m[d].push(r);});return m;},[filteredMind]);

  // exercise
  const [showOtherList,setShowOtherList]=useState(false);
  const [selectedSport,setSelectedSport]=useState(null); // {key, icon, color}
  const [showSportPrep,setShowSportPrep]=useState(false);
  const [showSportActive,setShowSportActive]=useState(false);
  const [showRunPage,setShowRunPage]=useState(false);const [runSportName,setRunSportName]=useState("跑步");const [runSec,setRunSec]=useState(0);const [runActive,setRunActive]=useState(false);
  const runRef=useRef();useEffect(()=>{if(runActive){runRef.current=setInterval(()=>setRunSec(s=>s+1),1000);}else clearInterval(runRef.current);return()=>clearInterval(runRef.current);},[runActive]);

  // habits
  const emptyForm={name:"",startDate:tmr(),targetDays:21,goal:"",insight:"",createTag:true};
  const [habits,setHabits]=useState([{id:1,name:"早起冥想",startDate:"2026-05-01",targetDays:30,goal:"每天静心5分钟",insight:"宁静致远",createTag:true,doneDays:12,streak:5,interrupted:1,status:"inProgress",checkedDates:["2026-05-01","2026-05-02","2026-05-03","2026-05-04","2026-05-05","2026-05-08","2026-05-09","2026-05-10","2026-05-11","2026-05-12","2026-05-13","2026-05-14"],pauseReason:"",abandonReason:""},{id:2,name:"每日阅读",startDate:tmr(),targetDays:60,goal:"每天阅读30分钟",insight:"书中自有黄金屋",createTag:true,doneDays:0,streak:0,interrupted:0,status:"notStarted",checkedDates:[],pauseReason:"",abandonReason:""}]);
  const [habitFilter,setHabitFilter]=useState("all");const [showAddHabit,setShowAddHabit]=useState(false);const [habitForm,setHabitForm]=useState(emptyForm);const [editingHabit,setEditingHabit]=useState(null);
  const [showStatusModal,setShowStatusModal]=useState(null);const [statusReason,setStatusReason]=useState("");const [calendarHabit,setCalendarHabit]=useState(null);
  const STATUS_LABELS={notStarted:T.notStarted,inProgress:T.inProgress,paused:T.paused,abandoned:T.abandoned,completed:T.completed};
  const STATUS_COLORS={notStarted:TH.sub,inProgress:GREEN,paused:YELLOW,abandoned:RED,completed:P};
  function saveHabit(){if(!habitForm.name.trim())return;if(editingHabit){setHabits(h=>h.map(x=>x.id===editingHabit?{...x,...habitForm,targetDays:+habitForm.targetDays}:x));setEditingHabit(null);}else{setHabits(h=>[...h,{id:Date.now(),...habitForm,targetDays:+habitForm.targetDays,doneDays:0,streak:0,interrupted:0,status:"notStarted",checkedDates:[],pauseReason:"",abandonReason:""}]);}setHabitForm(emptyForm);setShowAddHabit(false);}
  function openEditHabit(h){setHabitForm({name:h.name,startDate:h.startDate,targetDays:h.targetDays,goal:h.goal||"",insight:h.insight||"",createTag:h.createTag});setEditingHabit(h.id);setShowAddHabit(true);}
  function deleteHabit(id){setHabits(h=>h.filter(x=>x.id!==id));}
  function changeHabitStatus(id,ns){if(ns==="paused"||ns==="abandoned"){setShowStatusModal({id,newStatus:ns});setStatusReason("");return;}setHabits(h=>h.map(x=>x.id===id?{...x,status:ns}:x));}
  function confirmStatusChange(){if(!showStatusModal)return;const{id,newStatus}=showStatusModal;setHabits(h=>h.map(x=>x.id===id?{...x,status:newStatus,pauseReason:newStatus==="paused"?statusReason:x.pauseReason,abandonReason:newStatus==="abandoned"?statusReason:x.abandonReason}:x));setShowStatusModal(null);setStatusReason("");}
  const filteredHabits=habitFilter==="all"?habits:habits.filter(h=>h.status===habitFilter);

  // settings
  const [remindOn,setRemindOn]=useState(true);const [healthSync,setHealthSync]=useState(false);
  const [showLangPicker,setShowLangPicker]=useState(false);const [showThemePicker,setShowThemePicker]=useState(false);
  const [showHistoryPage,setShowHistoryPage]=useState(false);const [showFoodLogPage,setShowFoodLogPage]=useState(false);const [showGrace,setShowGrace]=useState(false);
  const [showGlobalMap,setShowGlobalMap]=useState(false);

  const FAB=()=>(<button onClick={()=>setShowNewMind(true)} style={{position:"fixed",bottom:80,right:"calc(50% - 185px)",width:52,height:52,borderRadius:26,border:"none",background:`linear-gradient(135deg,${P}99,${P})`,color:"#fff",fontSize:24,cursor:"pointer",zIndex:60,boxShadow:`0 4px 20px ${P}80`,display:"flex",alignItems:"center",justifyContent:"center"}}>✦</button>);

  // ── Special pages ─────────────────────────────────────────
  if(showGlobalMap)return <GlobalMapPage TH={TH} P={P} onClose={()=>setShowGlobalMap(false)}/>;
  if(showSportActive&&selectedSport)return <SportActivePage sport={selectedSport} TH={TH} onStop={()=>{setShowSportActive(false);setShowSportPrep(false);}}/>;
  if(showSportPrep&&selectedSport)return <SportPrepPage sport={selectedSport} TH={TH} P={P} onStart={()=>setShowSportActive(true)} onBack={()=>{setShowSportPrep(false);setShowOtherList(true);}}/>;

  if(showRunPage)return(
    <div style={{maxWidth:390,margin:"0 auto",fontFamily:"-apple-system,system-ui,sans-serif",background:"#111",height:"100vh",display:"flex",flexDirection:"column",color:"#fff",overflow:"hidden"}}>
      <OSMap/>
      <div style={{background:"#1a1a1a",padding:"14px 16px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-around",marginBottom:10}}>{[{val:runSec>0?"-- m":"0m",label:"距离"},{val:fmt(runSec),label:"时间"},{val:"--'--\"",label:"配速"}].map(({val,label})=>(<div key={label} style={{textAlign:"center"}}><div style={{fontWeight:800,fontSize:24}}>{val}</div><div style={{fontSize:12,color:"#aaa",marginTop:2}}>{label}</div></div>))}</div>
        <div style={{display:"flex",justifyContent:"space-around",paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,.1)",marginBottom:12}}>{[{val:"0",label:"步频(步/分)"},{val:"--",label:"步幅(m)"},{val:"--",label:"速度(km/h)"}].map(({val,label})=>(<div key={label} style={{textAlign:"center"}}><div style={{fontWeight:700,fontSize:16}}>{val}</div><div style={{fontSize:11,color:"#aaa",marginTop:2}}>{label}</div></div>))}</div>
        {runActive?(<div style={{display:"flex",gap:10}}><button onClick={()=>setRunActive(false)} style={{flex:1,padding:14,borderRadius:12,border:"none",background:"#FF9800",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>⏸ 暂停</button><button onClick={()=>{setRunActive(false);setRunSec(0);}} style={{flex:1,padding:14,borderRadius:12,border:"none",background:RED,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>⏹ 结束</button></div>)
        :(<div style={{display:"flex",gap:10}}><button onClick={()=>setShowRunPage(false)} style={{padding:"14px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,.2)",background:"transparent",color:"#aaa",fontSize:14,cursor:"pointer"}}>← 返回</button><button onClick={()=>setRunActive(true)} style={{flex:1,padding:14,borderRadius:12,border:"none",background:ORANGE,color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer"}}>开始{runSportName}</button></div>)}
      </div>
    </div>
  );

  if(showHistoryPage)return(<div style={{maxWidth:390,margin:"0 auto",fontFamily:"-apple-system,system-ui,sans-serif",background:TH.bg,minHeight:"100vh",color:TH.text,position:"relative"}}>{TH.starfield&&<Starfield/>}<div style={{padding:"20px 16px 10px",display:"flex",alignItems:"center",gap:12,position:"relative",zIndex:1}}><button onClick={()=>setShowHistoryPage(false)} style={{background:"transparent",border:"none",color:TH.text,fontSize:20,cursor:"pointer"}}>←</button><div style={{fontWeight:700,fontSize:18}}>打卡历史</div></div><div style={{padding:"0 16px",position:"relative",zIndex:1}}>{checkinHistory.length===0&&<div style={{textAlign:"center",color:TH.sub,padding:"40px 0"}}>{T.noHistory}</div>}{checkinHistory.map((h,i)=>(<div key={i} style={cs}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:600,fontSize:15}}>{h.date}</div>{h.note&&<div style={{fontSize:12,color:TH.sub,marginTop:2}}>{h.note}</div>}</div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><span style={{padding:"3px 10px",borderRadius:10,fontSize:12,fontWeight:600,background:h.done?"rgba(16,185,129,.15)":"rgba(239,68,68,.1)",color:h.done?GREEN:RED}}>{h.done?T.done:T.notDone}</span><span style={{fontSize:11,color:TH.sub}}>连续 {h.streak} 天</span></div></div></div>))}</div></div>);

  if(showFoodLogPage)return(<div style={{maxWidth:390,margin:"0 auto",fontFamily:"-apple-system,system-ui,sans-serif",background:TH.bg,minHeight:"100vh",color:TH.text,position:"relative"}}>{TH.starfield&&<Starfield/>}<div style={{padding:"20px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative",zIndex:1}}><div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setShowFoodLogPage(false)} style={{background:"transparent",border:"none",color:TH.text,fontSize:20,cursor:"pointer"}}>←</button><div><div style={{fontWeight:700,fontSize:22}}>饮食</div><div style={{fontSize:13,color:TH.sub}}>{new Date().toLocaleDateString("zh-CN",{month:"long",day:"numeric"})}</div></div></div></div><div style={{padding:"0 16px",position:"relative",zIndex:1}}><Card style={{textAlign:"center",padding:"20px 16px"}}><div style={{fontSize:13,color:TH.sub,marginBottom:8}}>今日卡路里</div><div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:8}}><span style={{fontSize:42,fontWeight:800,color:ORANGE}}>{totalCal}</span><span style={{fontSize:20,color:TH.sub}}>/ {calGoal}</span></div><div style={{fontSize:13,color:GREEN,marginTop:6}}>剩余卡路里: {Math.max(0,calGoal-totalCal)} kcal</div></Card><Card style={{textAlign:"center"}}>{foodLog.length===0?<div style={{color:TH.sub,fontSize:14}}>今天还没有饮食记录</div>:foodLog.map((f,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<foodLog.length-1?`1px solid ${TH.border}`:"none"}}><div><div style={{fontWeight:600,fontSize:14}}>{f.name}</div>{f.note&&<div style={{fontSize:11,color:TH.sub}}>{f.note}</div>}</div><div style={{fontWeight:700,color:P}}>{f.cal} kcal</div></div>))}</Card><Btn bg={ORANGE} onClick={()=>setShowAddFood(true)}>+ 添加饮食</Btn></div>{showAddFood&&<FoodModal TH={TH} P={P} inp={inp} name={fn2} setName={setFn2} cal={fc2} setCal={setFc2} note={fno2} setNote={setFno2} onAdd={addFoodItem} onClose={()=>setShowAddFood(false)}/>}</div>);

  if(showGrace)return(<div style={{maxWidth:390,margin:"0 auto",fontFamily:"-apple-system,system-ui,sans-serif",background:TH.bg,minHeight:"100vh",color:TH.text,position:"relative"}}>{TH.starfield&&<Starfield/>}<div style={{padding:"20px 16px 10px",display:"flex",alignItems:"center",gap:12,position:"relative",zIndex:1}}><button onClick={()=>setShowGrace(false)} style={{background:"transparent",border:"none",color:TH.text,fontSize:20,cursor:"pointer"}}>←</button><div style={{fontWeight:700,fontSize:18}}>{T.graceRestore}</div></div><div style={{padding:"0 16px",position:"relative",zIndex:1}}><Card><div style={{fontSize:14,lineHeight:1.7,color:TH.sub,marginBottom:16}}>宽限期机制：中断1天内补打卡，连胜不断。<br/>昨天未打卡，今天可以补卡：</div><div style={{padding:"12px 0",borderBottom:`1px solid ${TH.border}`,marginBottom:12}}><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>2026-05-12（昨天）</div><div style={{fontSize:12,color:TH.sub}}>状态：未打卡</div></div><Btn onClick={()=>{setCheckinHistory(h=>[{date:"2026-05-12",done:true,note:"宽限期补卡",streak:5},...h.filter(x=>x.date!=="2026-05-12")]);setShowGrace(false);}}>✓ 补打卡（1天宽限期）</Btn></Card></div></div>);

  // ── MAIN ──────────────────────────────────────────────────
  return(<div style={{maxWidth:390,margin:"0 auto",fontFamily:"-apple-system,system-ui,sans-serif",background:TH.bg,minHeight:"100vh",display:"flex",flexDirection:"column",color:TH.text,fontSize:14,position:"relative"}}>
    {TH.starfield&&<Starfield/>}
    {/* HEADER */}
    <div style={{padding:"20px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0,position:"relative",zIndex:1}}>
      <div><div style={{fontSize:11,color:TH.sub,letterSpacing:3,textTransform:"uppercase",fontWeight:500}}>Egoless Do</div><div style={{fontSize:24,fontWeight:700,marginTop:2}}>{T.appName}</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:11,color:TH.sub}}>{T.streak}</div><div style={{fontSize:26,fontWeight:800,color:P,lineHeight:1.2}}>{streak} <span style={{fontSize:16}}>{T.days} 🔥</span></div></div>
    </div>
    {/* HEADER TABS */}
    <div style={{display:"flex",padding:"12px 12px 0",gap:4,flexShrink:0,overflowX:"auto",scrollbarWidth:"none",msOverflowStyle:"none",position:"relative",zIndex:1}}>
      {H_TABS.map((t,i)=>(<button key={i} onClick={()=>setTab(i)} style={{flexShrink:0,padding:"7px 10px",border:"none",borderRadius:12,fontSize:10,cursor:"pointer",background:tab===i?P:TH.card,color:tab===i?"#fff":TH.sub,display:"flex",flexDirection:"column",alignItems:"center",gap:1,minWidth:44}}><span style={{fontSize:14}}>{H_ICONS[i]}</span>{t}</button>))}
    </div>
    <div style={{padding:"10px 16px 0",fontSize:12,color:TH.sub,flexShrink:0,position:"relative",zIndex:1}}>今天 · {new Date().toLocaleDateString("zh-CN",{month:"long",day:"numeric",weekday:"short"})}</div>

    {/* CONTENT */}
    <div style={{flex:1,overflowY:"auto",padding:"12px 16px",paddingBottom:120,position:"relative",zIndex:1}}>

      {/* HOME */}
      {tab===0&&<>
        <div style={{borderRadius:16,background:"linear-gradient(135deg,#16A34A,#15803D)",padding:"18px 20px",marginBottom:12,color:"#fff"}}>
          <div style={{fontWeight:700,fontSize:17,textAlign:"center"}}>{T.todayCheckin}</div>
          <div style={{textAlign:"center",fontSize:12,opacity:.8,marginTop:3,marginBottom:14}}>今天朝目标迈进了吗？</div>
          <button onClick={()=>setShowCheckin(true)} style={{width:"100%",padding:"11px 0",borderRadius:12,border:"2px solid rgba(255,255,255,.6)",background:"rgba(255,255,255,.18)",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>{checkinDone===null?T.openCheckin:checkinDone?"✓ "+T.done+" · 修改":"✗ "+T.notDone+" · 修改"}</button>
        </div>
        <Card style={{textAlign:"center",padding:"20px 16px"}}>
          <div style={{fontSize:34}}>🔷</div><div style={{color:TH.sub,fontSize:13,marginTop:6}}>{T.streak}</div>
          <div style={{fontSize:52,fontWeight:800,color:ORANGE,lineHeight:1.1}}>{streak}</div>
          <div style={{color:TH.sub,fontSize:13,marginTop:4}}>{T.days}</div>
          <div style={{fontSize:11,color:TH.sub,marginTop:8}}>允许1天宽限，偶尔忘记不会中断连胜</div>
        </Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <StatCard icon="📅" label="累计完成" value={streak+1} unit={T.days} bg={ORANGE}/>
          <StatCard icon="🏆" label="最长连续" value={streak+1} unit={T.days} bg={YELLOW}/>
          <StatCard icon="💪" label="节省卡路里" value={4500} unit="千卡" bg="#FF8A65"/>
          <StatCard icon="🍽" label="节省餐数" value={streak+1} unit="顿" bg={BLUE}/>
        </div>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:14,fontWeight:600}}>{T.water}</span><span style={{color:TH.sub,fontSize:12,cursor:"pointer"}} onClick={()=>setShowWaterGoal(true)}><span style={{fontWeight:600,color:P}}>{waterMl}</span> ml / {waterGoal}ml ✏️</span></div>
          <div style={{height:6,background:TH.border,borderRadius:3,marginBottom:12,overflow:"hidden"}}><div style={{height:6,background:BLUE,borderRadius:3,width:`${Math.min(waterMl/waterGoal*100,100)}%`,transition:"width .4s"}}/></div>
          <button onClick={()=>setWaterMl(w=>Math.min(w+250,waterGoal))} style={{width:"100%",padding:12,borderRadius:10,border:"none",background:BLUE,color:"#fff",fontWeight:600,fontSize:14,cursor:"pointer"}}>+ 250ml</button>
        </Card>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:14,fontWeight:600,color:ORANGE}}>今日卡路里</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:22,fontWeight:700,color:ORANGE}}>{totalCal}</span><span style={{color:TH.sub,fontSize:13}}>/ {calGoal} kcal</span><span style={{cursor:"pointer",fontSize:14}} onClick={()=>setShowCalGoal(true)}>✏️</span></div>
          <div style={{height:4,background:TH.border,borderRadius:2,marginTop:8,overflow:"hidden"}}><div style={{height:4,background:ORANGE,borderRadius:2,width:`${Math.min(totalCal/calGoal*100,100)}%`,transition:"width .4s"}}/></div>
        </Card>
        <button onClick={()=>setShowAddFood(true)} style={{width:"100%",padding:12,borderRadius:10,border:`1px solid ${TH.border}`,background:"transparent",color:P,fontWeight:600,fontSize:14,cursor:"pointer",marginBottom:12,position:"relative",zIndex:1}}>{T.addFoodBtn}</button>
      </>}

      {/* FASTING */}
      {tab===1&&<>
        <Card style={{textAlign:"center"}}>
          {fastActive?(<>
            <div style={{position:"relative",width:160,height:160,margin:"0 auto 16px"}}>
              <svg width={160} height={160} style={{transform:"rotate(-90deg)"}}><circle cx={80} cy={80} r={68} fill="none" stroke={TH.border} strokeWidth={10}/><circle cx={80} cy={80} r={68} fill="none" stroke={P} strokeWidth={10} strokeLinecap="round" strokeDasharray={2*Math.PI*68} strokeDashoffset={2*Math.PI*68*(1-Math.min(fastSec/(fastDur*3600),1))} style={{transition:"stroke-dashoffset 1s"}}/></svg>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:24,fontWeight:800,color:P}}>{fmt(fastSec)}</div><div style={{fontSize:11,color:TH.sub}}>目标 {fastDur}h</div></div>
            </div>
            <div style={{fontSize:13,color:TH.sub,marginBottom:16}}>禁食进行中 🔥 {Math.round(Math.min(fastSec/(fastDur*3600),1)*100)}%</div>
            <button onClick={()=>{setFastActive(false);setFastSec(0);setFastHistory(h=>[{date:dateStr(),dur:fmt(fastSec),kcal:Math.round(fastSec/3600*32)},...h]);}} style={{width:"100%",padding:14,borderRadius:12,border:"none",background:RED,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>{T.stopFasting}</button>
          </>):(<div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Btn onClick={()=>{setTmpDur(fastDur);setAgreed(false);setShowDurModal(true);}}>{T.startFasting}</Btn>
            <button onClick={()=>{setFastDur(8);setFastActive(true);}} style={{width:"100%",padding:14,borderRadius:12,border:"none",background:GREEN,color:"#fff",fontWeight:600,fontSize:14,cursor:"pointer"}}>{T.quickStart}</button>
          </div>)}
        </Card>
        <LinkWorldBtn label="看看全球谁在禁食" onClick={()=>setShowGlobalMap(true)}/>
        <div style={{fontWeight:600,fontSize:15,marginBottom:10}}>你的统计</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <StatCard icon="⏳" label="总次数" value={12} unit="次" bg="#EF9A9A"/>
          <StatCard icon="⏰" label={T.totalFasting} value={48} unit="小时" bg={GREEN}/>
          <StatCard icon="🔥" label="连续天数" value={streak} unit={T.days} bg="#FF8A65"/>
          <StatCard icon="🏆" label="最长连续" value={12} unit={T.days} bg="#9C27B0"/>
        </div>
        {/* Extra stat cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <div style={{background:ORANGE,borderRadius:14,padding:"16px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <div style={{fontSize:26}}>🔥</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.85)",textAlign:"center"}}>节省卡路里</div>
            <div style={{fontWeight:700,color:"#fff",fontSize:18}}>{Math.round(fastSec/3600*32)} <span style={{fontSize:13,fontWeight:400}}>kcal</span></div>
          </div>
          <div style={{background:GREEN,borderRadius:14,padding:"16px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <div style={{fontSize:26}}>⚖️</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.85)",textAlign:"center"}}>预计减重</div>
            <div style={{fontWeight:700,color:"#fff",fontSize:18}}>{(fastSec/3600*32/7700).toFixed(2)} <span style={{fontSize:13,fontWeight:400}}>公斤</span></div>
          </div>
        </div>

        {/* Health tips */}
        <Card style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:18}}>⚠️</span>
            <span style={{fontWeight:700,fontSize:15,color:YELLOW}}>健康提示</span>
          </div>
          {["禁食期间多喝水","感到不适请立即停止","建议从短时间开始","禁食前后避免暴饮暴食"].map((tip,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:i<3?8:0}}>
              <span style={{color:TH.sub,fontSize:13,marginTop:1}}>•</span>
              <span style={{fontSize:13,color:TH.sub,lineHeight:1.5}}>{tip}</span>
            </div>
          ))}
        </Card>

        {/* Fasting history BELOW stats */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontWeight:600,fontSize:15}}>{T.fastingHistory}</div>
          <button onClick={()=>setShowFastHistory(v=>!v)} style={{background:"transparent",border:"none",color:P,fontSize:12,cursor:"pointer"}}>{showFastHistory?"收起":"展开"} ›</button>
        </div>
        {showFastHistory&&<Card style={{padding:"8px 16px"}}>{fastHistory.map((f,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:i<fastHistory.length-1?`1px solid ${TH.border}`:"none"}}><div><div style={{fontSize:14,fontWeight:600}}>{f.date}</div><div style={{fontSize:12,color:TH.sub,marginTop:2}}>约 {f.kcal} kcal</div></div><div style={{fontWeight:700,color:P,fontSize:15}}>{f.dur}</div></div>))}</Card>}
        {showDurModal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:TH.cardSolid,borderRadius:20,padding:24,width:"100%",maxWidth:340}}>
            <div style={{fontWeight:700,fontSize:18,textAlign:"center",marginBottom:20}}>选择时长</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",marginBottom:20}}>{[1,2,4,6,8,10,12].map(d=>(<button key={d} onClick={()=>setTmpDur(d)} style={{width:72,padding:"12px 0",borderRadius:12,border:"none",cursor:"pointer",fontWeight:700,fontSize:16,background:tmpDur===d?P:TH.card,color:tmpDur===d?"#fff":TH.text}}>{d}h</button>))}</div>
            <div style={{background:"rgba(255,248,200,.08)",borderRadius:12,padding:12,marginBottom:16,display:"flex",gap:8}}><span>⚠️</span><div><div style={{fontWeight:600,fontSize:13,color:"#FCD34D",marginBottom:4}}>温馨提示</div><div style={{fontSize:12,color:TH.sub}}>请听从身体的声音，感到不适请立即停止。</div></div></div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,cursor:"pointer"}} onClick={()=>setAgreed(v=>!v)}><div style={{width:18,height:18,border:`2px solid ${agreed?P:TH.border}`,borderRadius:4,background:agreed?P:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{agreed&&<span style={{color:"#fff",fontSize:12}}>✓</span>}</div><span style={{fontSize:13}}>我已了解</span></div>
            <div style={{display:"flex",gap:10}}><button onClick={()=>setShowDurModal(false)} style={{flex:1,padding:12,borderRadius:12,border:`1px solid ${TH.border}`,background:"transparent",color:TH.sub,fontSize:14,cursor:"pointer"}}>{T.cancel}</button><button disabled={!agreed} onClick={()=>{setFastDur(tmpDur);setFastActive(true);setShowDurModal(false);}} style={{flex:1,padding:12,borderRadius:12,border:"none",cursor:agreed?"pointer":"not-allowed",background:agreed?P:"rgba(128,128,128,.2)",color:"#fff",fontWeight:600,fontSize:14}}>⏰ 开始</button></div>
          </div>
        </div>)}
      </>}

      {/* MEDITATION */}
      {tab===2&&<>
        <Card style={{textAlign:"center",padding:"20px 16px"}}><div style={{fontSize:36,fontWeight:800,color:P}}>{totalMed}</div><div style={{color:TH.sub,fontSize:13}}>{T.accMed}</div></Card>
        <Card>
          {medActive?(<div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{background:`${P}18`,borderRadius:20,padding:"28px 20px",marginBottom:20}}><div style={{fontSize:50,fontWeight:800,color:P,letterSpacing:2}}>{fmtMS(medDur-medSec)}</div><div style={{color:TH.sub,fontSize:13,marginTop:6}}>打坐中...</div></div>
            <button onClick={()=>setMedActive(false)} style={{padding:"12px 48px",borderRadius:12,border:"none",background:RED,color:"#fff",fontWeight:600,fontSize:15,cursor:"pointer"}}>{T.stopMed}</button>
          </div>):(<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${TH.border}`,marginBottom:12}}><span style={{fontSize:13,color:TH.sub}}>{T.bgMusic}</span><div style={{display:"flex",alignItems:"center",gap:4,color:P,cursor:"pointer",fontSize:13}}>🌊 {sound} ›</div></div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{["海潮","雨声","钵声","森林","无"].map(s=>(<button key={s} onClick={()=>setSound(s)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${sound===s?P:TH.border}`,background:sound===s?`${P}30`:"transparent",color:sound===s?"#fff":TH.sub,fontSize:12,cursor:"pointer"}}>{s}</button>))}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>{[1,5,10,15,30,60,120,180,300].map(d=>(<button key={d} onClick={()=>setMedDur(d*60)} style={{padding:"10px 0",borderRadius:10,border:`1px solid ${medDur===d*60?P:TH.border}`,background:medDur===d*60?P:"transparent",color:medDur===d*60?"#fff":TH.sub,fontWeight:medDur===d*60?700:400,fontSize:13,cursor:"pointer"}}>{d}分钟</button>))}</div>
            <Btn onClick={()=>setMedActive(true)}>{T.startMed}</Btn>
          </>)}
        </Card>
        {/* 今日打坐 then 全球脉动 */}
        <Card><div style={{display:"flex",justifyContent:"space-between"}}><span>今日打坐</span><span style={{color:P,fontWeight:600}}>{totalMed} 分钟</span></div></Card>
        <LinkWorldBtn label="查看全球冥想者" onClick={()=>setShowGlobalMap(true)}/>
        {/* history */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontWeight:600,fontSize:15}}>{T.meditationHistory}</div><button onClick={()=>setShowMedHistory(v=>!v)} style={{background:"transparent",border:"none",color:P,fontSize:12,cursor:"pointer"}}>{showMedHistory?"收起":"展开"} ›</button></div>
        {showMedHistory&&<Card style={{padding:"8px 16px"}}>{medHistory.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:i<medHistory.length-1?`1px solid ${TH.border}`:"none"}}><div><div style={{fontSize:14,fontWeight:600}}>{m.date}</div><div style={{fontSize:12,color:TH.sub,marginTop:2}}>{m.mood}</div></div><div style={{fontWeight:700,color:P,fontSize:15}}>{m.dur}</div></div>))}</Card>}
        <Btn style={{marginBottom:8}}>{T.shareMed}</Btn>
        <div style={{textAlign:"center",fontSize:11,color:TH.sub}}>部分音效来源：Pixabay (royalty-free)</div>
      </>}

      {/* REFLECTIONS */}
      {tab===3&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:15,fontWeight:600}}>{T.mindPulse}</div><button onClick={()=>setShowNewMind(true)} style={{padding:"6px 16px",borderRadius:20,border:"none",background:P,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ {T.newReflection}</button></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{[{t:"全部",active:!filterTag,fn:()=>setFilterTag("")},...allTags.map(t=>({t,active:filterTag===t,fn:()=>setFilterTag(f=>f===t?"":t)}))].map(({t,active,fn})=>(<button key={t} onClick={fn} style={{padding:"4px 12px",borderRadius:20,fontSize:12,cursor:"pointer",border:"1px solid",background:active?P:"transparent",color:active?"#fff":P,borderColor:P}}>{t}</button>))}</div>
        <Card style={{padding:"12px 16px",marginBottom:12}}><div style={{display:"flex",justifyContent:"space-around",textAlign:"center"}}><div><div style={{fontWeight:700,fontSize:18,color:P}}>{reflections.length}</div><div style={{fontSize:11,color:TH.sub}}>感念总数</div></div><div><div style={{fontWeight:700,fontSize:14,color:P}}>{allTags[0]||"--"}</div><div style={{fontSize:11,color:TH.sub}}>最高频标签</div></div><div><div style={{fontWeight:700,fontSize:18,color:P}}>3</div><div style={{fontSize:11,color:TH.sub}}>连续天数</div></div></div></Card>
        {Object.entries(mindByDay).map(([day,items])=>(<div key={day}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,marginTop:4}}><div style={{width:10,height:10,borderRadius:5,background:P,flexShrink:0}}/><div style={{fontSize:12,fontWeight:600,color:TH.sub}}>{day}</div><div style={{flex:1,height:1,background:TH.border}}/></div>{items.map(r=>(<div key={r.id} style={{background:`linear-gradient(135deg,${r.colors[0]},${r.colors[1]})`,borderRadius:18,padding:18,marginBottom:10,marginLeft:20,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:0,right:0,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,.05)",transform:"translate(20px,-20px)"}}/><div style={{fontSize:13,lineHeight:1.7,marginBottom:10,color:"#fff"}}>{r.content}</div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{r.tags.map(t=><span key={t} style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(255,255,255,.2)",color:"rgba(255,255,255,.9)"}}>{t}</span>)}</div><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>{r.mood}</span><span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>{new Date(r.ts).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}</span></div></div>))}</div>))}
      </>}

      {/* EXERCISE */}
      {tab===4&&<>
        <div style={{fontWeight:600,fontSize:15,marginBottom:12,color:TH.sub}}>{T.selectExercise}</div>
        {[{icon:"🚶",label:"行走/徒步",sport:"行走"},{icon:"🏃",label:"跑步",sport:"跑步"},{icon:"🚴",label:"骑行",sport:"骑行"}].map(({icon,label,sport})=>(<div key={label} onClick={()=>{setRunSportName(sport);setRunSec(0);setRunActive(false);setShowRunPage(true);}} style={{...cs,display:"flex",alignItems:"center",gap:14,padding:"16px 18px",cursor:"pointer"}}><span style={{fontSize:32}}>{icon}</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:15}}>{label}</div><div style={{fontSize:11,color:TH.sub,marginTop:2}}>GPS 实时轨迹记录</div></div><span style={{color:TH.sub,fontSize:18}}>›</span></div>))}
        <div onClick={()=>setShowOtherList(true)} style={{...cs,display:"flex",alignItems:"center",gap:14,padding:"16px 18px",cursor:"pointer"}}><span style={{fontSize:32}}>🏋</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:15}}>其他运动</div><div style={{fontSize:11,color:TH.sub,marginTop:2}}>跳绳、游泳、球类、瑜伽等</div></div><span style={{color:TH.sub,fontSize:18}}>›</span></div>
        <LinkWorldBtn label="查看全球锻炼者" onClick={()=>setShowGlobalMap(true)}/>
        {/* Other sports list modal */}
        {showOtherList&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
          <div style={{width:"100%",background:TH.cardSolid,borderRadius:"24px 24px 0 0",padding:24,maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{width:40,height:4,borderRadius:2,background:TH.border,margin:"0 auto 16px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontWeight:700,fontSize:20,color:TH.text}}>选择运动类别</div><button onClick={()=>setShowOtherList(false)} style={{width:34,height:34,borderRadius:17,background:TH.card,border:"none",fontSize:16,cursor:"pointer",color:TH.text}}>×</button></div>
            {/* top tags */}
            <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
              {SPORT_GROUPS[0].items.map(s=>(<button key={s.key} onClick={()=>{setSelectedSport(s);setShowOtherList(false);setShowSportPrep(true);}} style={{flexShrink:0,padding:"8px 16px",borderRadius:20,border:`1px solid ${s.color}`,background:"transparent",color:s.color,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span>{s.icon}</span>{s.key}</button>))}
            </div>
            {SPORT_GROUPS.map(g=>(<div key={g.group}>
              <div style={{fontSize:12,color:TH.sub,fontWeight:600,padding:"12px 0 6px"}}>{g.group}</div>
              {g.items.map((s,i)=>(<div key={s.key} onClick={()=>{setSelectedSport(s);setShowOtherList(false);setShowSportPrep(true);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 0",borderBottom:`1px solid ${TH.border}`,cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:24,width:36,textAlign:"center"}}>{s.icon}</span><span style={{fontSize:16,color:TH.text}}>{s.key}</span></div>
                <div style={{width:24,height:24,borderRadius:12,border:`2px solid ${i===0&&g.group==="我的运动"?GREEN:TH.border}`,background:i===0&&g.group==="我的运动"?GREEN:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{i===0&&g.group==="我的运动"&&<div style={{width:8,height:8,borderRadius:4,background:"#fff"}}/>}</div>
              </div>))}
            </div>))}
          </div>
        </div>)}
      </>}

      {/* HABITS */}
      {tab===5&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:15,fontWeight:600}}>{T.myHabits}</div><button onClick={()=>{setEditingHabit(null);setHabitForm(emptyForm);setShowAddHabit(true);}} style={{padding:"6px 16px",borderRadius:20,border:"none",background:P,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>{T.addHabit}</button></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{[["all",T.allStatus],["notStarted",T.notStarted],["inProgress",T.inProgress],["paused",T.paused],["abandoned",T.abandoned],["completed",T.completed]].map(([v,l])=>(<button key={v} onClick={()=>setHabitFilter(v)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,cursor:"pointer",border:"1px solid",background:habitFilter===v?P:"transparent",color:habitFilter===v?"#fff":P,borderColor:P}}>{l}</button>))}</div>
        {filteredHabits.map(h=>{const canEdit=h.status==="notStarted"||h.status==="inProgress";return(<Card key={h.id} style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{flex:1,marginRight:10}}><div style={{fontWeight:700,fontSize:16}}>{h.name}</div><div style={{fontSize:11,color:TH.sub,marginTop:3}}>开始 {h.startDate} · 目标 {h.targetDays} 天</div>{h.goal&&<div style={{fontSize:11,color:TH.sub,marginTop:2}}>🎯 {h.goal}</div>}{h.insight&&<div style={{fontSize:11,color:TH.sub,marginTop:2,fontStyle:"italic"}}>"{h.insight}"</div>}{h.createTag&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${P}30`,color:P,marginTop:4,display:"inline-block"}}>#{h.name}</span>}{h.pauseReason&&<div style={{fontSize:11,color:YELLOW,marginTop:4}}>暂停：{h.pauseReason}</div>}{h.abandonReason&&<div style={{fontSize:11,color:RED,marginTop:4}}>废弃：{h.abandonReason}</div>}</div>
            <span style={{fontSize:11,padding:"3px 8px",borderRadius:8,background:`${STATUS_COLORS[h.status]}20`,color:STATUS_COLORS[h.status],fontWeight:600,flexShrink:0}}>{STATUS_LABELS[h.status]}</span>
          </div>
          <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:TH.sub,marginBottom:4}}><span>{h.doneDays}/{h.targetDays} {T.days}</span><span>{Math.round(h.doneDays/h.targetDays*100)}%</span></div><div style={{height:6,background:TH.border,borderRadius:3}}><div style={{height:6,background:P,borderRadius:3,width:`${Math.min(h.doneDays/h.targetDays*100,100)}%`}}/></div></div>
          <div style={{display:"flex",gap:14,marginBottom:12}}>{[{v:h.doneDays,l:"累计天数",c:P,cal:true},{v:h.streak,l:"连续天数",c:ORANGE},{v:h.interrupted,l:T.interrupted,c:RED},{v:Math.max(0,h.targetDays-h.doneDays),l:"剩余天数",c:GREEN}].map(({v,l,c,cal})=>(<div key={l} style={{textAlign:"center",cursor:cal?"pointer":"default"}} onClick={cal?()=>setCalendarHabit(h):null}><div style={{fontSize:18,fontWeight:800,color:c,textDecoration:cal?"underline":"none"}}>{v}</div><div style={{fontSize:10,color:TH.sub}}>{l}</div></div>))}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {canEdit&&<button onClick={()=>openEditHabit(h)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${BLUE}`,background:"transparent",color:BLUE,fontSize:11,cursor:"pointer"}}>✏️ {T.editHabit}</button>}
            {h.status==="notStarted"&&<button onClick={()=>deleteHabit(h.id)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${RED}`,background:"transparent",color:RED,fontSize:11,cursor:"pointer"}}>🗑 删除</button>}
            {["notStarted","paused"].includes(h.status)&&<button onClick={()=>changeHabitStatus(h.id,"inProgress")} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${GREEN}`,background:"transparent",color:GREEN,fontSize:11,cursor:"pointer"}}>▶ 开始</button>}
            {h.status==="inProgress"&&<><button onClick={()=>changeHabitStatus(h.id,"paused")} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${YELLOW}`,background:"transparent",color:YELLOW,fontSize:11,cursor:"pointer"}}>⏸ 暂停</button><button onClick={()=>setShowGlobalMap(true)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${P}`,background:"transparent",color:P,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><GlobeIcon size={12} color={P}/>{T.linkWorld}</button></>}
            {["inProgress","paused"].includes(h.status)&&<button onClick={()=>changeHabitStatus(h.id,"abandoned")} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${RED}`,background:"transparent",color:RED,fontSize:11,cursor:"pointer"}}>✕ 废弃</button>}
          </div>
        </Card>);})}
        {filteredHabits.length===0&&<div style={{textAlign:"center",color:TH.sub,padding:"40px 0",fontSize:13}}>暂无习惯记录</div>}
        {showAddHabit&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:200,display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",background:TH.cardSolid,borderRadius:"24px 24px 0 0",padding:24,maxHeight:"92vh",overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><div style={{fontWeight:700,fontSize:18,color:TH.text}}>{editingHabit?T.editHabit:T.addHabit}</div><button onClick={()=>{setShowAddHabit(false);setEditingHabit(null);}} style={{background:"transparent",border:"none",fontSize:22,color:TH.sub,cursor:"pointer"}}>×</button></div>{[{label:T.habitName,key:"name",ph:"例：每日冥想"},{label:T.habitGoal,key:"goal",ph:"每天打坐5分钟"},{label:T.habitInsight,key:"insight",ph:"每天进步一点点..."}].map(({label,key,ph})=>(<div key={key} style={{marginBottom:14}}><div style={{fontSize:12,color:TH.sub,marginBottom:6}}>{label}</div><input value={habitForm[key]} onChange={e=>setHabitForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} style={inp}/></div>))}<div style={{marginBottom:14}}><div style={{fontSize:12,color:TH.sub,marginBottom:6}}>{T.startDate}</div><input type="date" value={habitForm.startDate} onChange={e=>setHabitForm(f=>({...f,startDate:e.target.value}))} style={inp}/></div><div style={{marginBottom:14}}><div style={{fontSize:12,color:TH.sub,marginBottom:6}}>{T.targetDays}</div><input type="number" value={habitForm.targetDays} onChange={e=>setHabitForm(f=>({...f,targetDays:e.target.value}))} style={inp}/></div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderTop:`1px solid ${TH.border}`,marginBottom:20}}><div><div style={{fontSize:14,color:TH.text}}>{T.createTag}</div><div style={{fontSize:11,color:TH.sub,marginTop:2}}>将习惯名称添加为感念标签</div></div><Toggle on={habitForm.createTag} onChange={()=>setHabitForm(f=>({...f,createTag:!f.createTag}))}/></div><Btn onClick={saveHabit}>{T.createHabit}</Btn></div></div>)}
        {showStatusModal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div style={{background:TH.cardSolid,borderRadius:20,padding:24,width:"100%",maxWidth:340}}><div style={{fontWeight:700,fontSize:16,marginBottom:12,color:TH.text}}>{showStatusModal.newStatus==="paused"?"暂停原因":"废弃原因"}</div><textarea value={statusReason} onChange={e=>setStatusReason(e.target.value)} placeholder="请填写原因..." rows={3} style={{width:"100%",background:TH.card,border:`1px solid ${TH.border}`,borderRadius:10,padding:"10px 12px",color:TH.text,fontSize:14,resize:"none",outline:"none",boxSizing:"border-box",marginBottom:14}}/><div style={{display:"flex",gap:10}}><button onClick={()=>setShowStatusModal(null)} style={{flex:1,padding:12,borderRadius:12,border:`1px solid ${TH.border}`,background:"transparent",color:TH.sub,fontSize:14,cursor:"pointer"}}>{T.cancel}</button><Btn onClick={confirmStatusChange} style={{flex:1,padding:12}}>{T.save}</Btn></div></div></div>)}
        {calendarHabit&&<HabitCalendar habit={calendarHabit} onClose={()=>setCalendarHabit(null)} TH={TH} P={P}/>}
      </>}

      {/* STATS */}
      {tab===6&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>{[{label:T.streak,value:`${streak} ${T.days}`,icon:"🔥"},{label:"感念总数",value:`${reflections.length} 条`,icon:"✦"},{label:T.totalFasting,value:"48h",icon:"⏱"},{label:T.totalExercise,value:"5 次",icon:"🏃"},{label:"冥想时长",value:`${totalMed} 分`,icon:"☯"},{label:"活跃习惯",value:`${habits.filter(h=>h.status==="inProgress").length} 个`,icon:"◇"}].map((s,i)=>(<Card key={i} style={{padding:14}}><div style={{fontSize:20}}>{s.icon}</div><div style={{fontSize:20,fontWeight:700,marginTop:4}}>{s.value}</div><div style={{fontSize:11,color:TH.sub,marginTop:2}}>{s.label}</div></Card>))}</div>
        <Card><div style={{fontSize:13,color:TH.sub,marginBottom:12}}>本周完成情况</div><div style={{display:"flex",gap:6,alignItems:"flex-end",height:60}}>{[0.8,1,0.6,1,0.9,0.4,0.7].map((v,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:"100%",background:v===1?P:`${P}40`,height:v*50,borderRadius:4}}/><span style={{fontSize:9,color:TH.sub}}>{"一二三四五六日"[i]}</span></div>))}</div></Card>
        <div style={{background:`linear-gradient(135deg,#4C1D95,${P})`,borderRadius:16,padding:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:600}}>{T.premiumTitle}</div><div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:2}}>{T.premiumSub}</div></div><button style={{padding:"8px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,.3)",background:"rgba(255,255,255,.15)",color:"#fff",fontSize:12,cursor:"pointer"}}>{T.learnMore}</button></div>
      </>}

      {/* SETTINGS */}
      {tab===7&&<>
        {[
          {title:"打卡提醒",rows:[{label:T.remindOn,right:<Toggle on={remindOn} onChange={()=>setRemindOn(v=>!v)}/>},{label:T.remindTime,right:<span style={{color:TH.sub}}>21:00</span>,last:true}]},
          {title:"数据记录",rows:[{label:T.statsData,icon:"📊",right:<span style={{color:TH.sub}}>›</span>,onClick:()=>setTab(6)},{label:T.history,icon:"📅",right:<span style={{color:TH.sub}}>›</span>,onClick:()=>setShowHistoryPage(true)},{label:T.foodLog,icon:"🍽",right:<span style={{color:TH.sub}}>›</span>,onClick:()=>setShowFoodLogPage(true),last:true}]},
          {title:"通用设置",rows:[{label:T.language,right:<span style={{color:TH.sub}}>🇨🇳 简体中文 ›</span>,onClick:()=>setShowLangPicker(true)},{label:T.theme,right:<span style={{color:TH.sub}}>{THEMES[themeName].name} ›</span>,onClick:()=>setShowThemePicker(true)},{label:"体重单位",right:<span style={{color:TH.sub}}>公斤 ›</span>,last:true}]},
          {title:"数据同步",rows:[{label:T.appleHealth,sub:"未启用",right:<Toggle on={healthSync} onChange={()=>setHealthSync(v=>!v)}/>,last:true}]},
          {title:"关于",rows:[{label:T.shareApp,icon:"🧘",right:<span style={{color:TH.sub}}>›</span>},{label:T.version,right:<span style={{color:TH.sub}}>1.0.0</span>},{label:T.privacy,right:<span style={{color:TH.sub}}>›</span>},{label:T.resetWelcome,icon:"🔄",sub:"重新显示用户协议",right:<span style={{color:TH.sub}}>›</span>,last:true}]},
          {title:T.devTest,rows:[{label:"冰冻火苗",icon:"❄️",sub:"今天和昨天都没打卡",right:<span style={{color:TH.sub}}>›</span>},{label:T.graceRestore,icon:"🛡",sub:"昨天没打卡，今天补卡",right:<span style={{color:TH.sub}}>›</span>,onClick:()=>setShowGrace(true)},{label:"连胜中断",icon:"❤️",sub:"连续两天未打卡",right:<span style={{color:TH.sub}}>›</span>},{label:"清除数据",icon:"🗑",sub:"删除所有打卡记录",right:<span style={{color:TH.sub}}>›</span>,last:true}]},
        ].map(({title,rows})=>(<div key={title} style={{marginBottom:4}}><div style={{padding:"14px 0 6px",fontSize:13,color:TH.sub,fontWeight:600}}>{title}</div><Card style={{padding:"0 16px"}}>{rows.map((r,i)=><RowItem key={i} {...r}/>)}</Card></div>))}

      </>}
    </div>

    {/* BOTTOM NAV */}
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:390,background:TH.navBg,backdropFilter:"blur(20px)",borderTop:`1px solid ${TH.border}`,display:"flex",padding:"8px 0 18px",zIndex:50}}>
      {B_TABS.map((t,i)=>(<button key={i} onClick={()=>setTab(t.h)} style={{flex:1,border:"none",background:"transparent",cursor:"pointer",color:tab===t.h?P:TH.sub,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 0"}}><span style={{fontSize:18}}>{t.i}</span><span style={{fontSize:10}}>{t.l}</span></button>))}
    </div>
    <FAB/>

    {/* CHECKIN MODAL */}
    {showCheckin&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:200,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowCheckin(false)}>
      <div style={{width:"100%",background:TH.cardSolid,borderRadius:"24px 24px 0 0",padding:24,maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{fontWeight:700,fontSize:18,color:TH.text}}>{T.todayCheckin}</div><button onClick={()=>setShowCheckin(false)} style={{background:"transparent",border:"none",fontSize:22,color:TH.sub,cursor:"pointer"}}>×</button></div>
        <div style={{color:TH.sub,fontSize:12,textAlign:"center",marginBottom:18}}>诚实记录，养成习惯</div>
        <div style={{marginBottom:14}}><div style={{fontSize:12,color:TH.sub,marginBottom:6}}>今日体重</div><div style={{display:"flex",alignItems:"center",gap:8,border:`1px solid ${TH.border}`,borderRadius:10,padding:"8px 12px",background:TH.card}}><input type="number" value={weight} onChange={e=>setWeight(+e.target.value)} style={{border:"none",outline:"none",fontSize:16,fontWeight:600,width:60,background:"transparent",color:TH.text}}/><span style={{color:TH.sub,fontSize:13}}>公斤</span><span style={{marginLeft:"auto",color:TH.sub}}>▼</span></div></div>
        <RowItem label="今日禁欲" icon="🙏" right={<Toggle on={fasted} onChange={()=>setFasted(v=>!v)}/>}/>
        <div style={{padding:"13px 0",borderBottom:`1px solid ${TH.border}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:18}}>💧</span><span>今日饮水</span></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["500ml","1000ml","1500ml","2000ml",">2000ml"].map(v=>(<button key={v} onClick={()=>setWater(v)} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${water===v?P:TH.border}`,background:water===v?`${P}30`:"transparent",color:water===v?"#fff":TH.sub,fontSize:12,cursor:"pointer"}}>{v}</button>))}</div></div>
        <div style={{padding:"13px 0",borderBottom:`1px solid ${TH.border}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:18}}>⭐</span><span style={{fontWeight:600}}>修行记录</span></div>{[{key:"sit",icon:"🧘",label:"打坐"},{key:"stand",icon:"🧍",label:"站桩"},{key:"chant",icon:"📿",label:"诵经"}].map(({key,icon,label},i,arr)=>(<RowItem key={key} icon={icon} label={label} last={i===arr.length-1} right={<Toggle on={practices[key]} onChange={()=>setPractices(p=>({...p,[key]:!p[key]}))}/>}/>))}</div>
        {habits.filter(h=>h.status==="inProgress").length>0&&(<div style={{padding:"13px 0",borderBottom:`1px solid ${TH.border}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:18}}>◇</span><span style={{fontWeight:600}}>习惯打卡</span></div>{habits.filter(h=>h.status==="inProgress").map((h,i,arr)=>(<div key={h.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:i===arr.length-1?"none":`1px solid ${TH.border}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>◇</span><div><div style={{fontSize:14,color:TH.text}}>{h.name}</div><div style={{fontSize:11,color:TH.sub}}>连续 {h.streak} 天</div></div></div><Toggle on={!!habitCheckins[h.id]} onChange={()=>setHabitCheckins(c=>({...c,[h.id]:!c[h.id]}))}/></div>))}</div>)}
        <div style={{padding:"13px 0",borderBottom:`1px solid ${TH.border}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>✎</span><span style={{fontWeight:600}}>{T.freeCheckin}</span></div><button onClick={()=>setFreeItems(f=>[...f,{id:Date.now(),name:""}])} style={{width:28,height:28,borderRadius:14,border:"none",background:P,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button></div>{freeItems.map((item,i)=>(<div key={item.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><Toggle on={freeCheckins[item.id]||false} onChange={()=>setFreeCheckins(c=>({...c,[item.id]:!c[item.id]}))}/><input value={item.name} onChange={e=>setFreeItems(f=>f.map(x=>x.id===item.id?{...x,name:e.target.value}:x))} placeholder={`自定义项目 ${i+1}`} style={{...inp,flex:1,padding:"7px 10px"}}/><button onClick={()=>setFreeItems(f=>f.filter(x=>x.id!==item.id))} style={{background:"transparent",border:"none",color:RED,fontSize:16,cursor:"pointer"}}>×</button></div>))}</div>
        <div style={{padding:"14px 0"}}><div style={{fontSize:12,color:TH.sub,marginBottom:8}}>{T.note}</div><textarea value={checkinNote} onChange={e=>setCheckinNote(e.target.value)} placeholder="今天有什么想说的..." rows={3} style={{width:"100%",background:TH.card,border:`1px solid ${TH.border}`,borderRadius:12,padding:"10px 12px",color:TH.text,fontSize:14,resize:"none",outline:"none",boxSizing:"border-box"}}/></div>
        <div style={{display:"flex",gap:10,marginBottom:12}}><button onClick={()=>setCheckinDone(false)} style={{flex:1,padding:"13px 0",borderRadius:12,fontWeight:700,fontSize:15,cursor:"pointer",border:"2px solid",borderColor:checkinDone===false?RED:TH.border,background:checkinDone===false?"rgba(239,68,68,.15)":"transparent",color:checkinDone===false?RED:TH.sub}}>✗ {T.notDone}</button><button onClick={()=>setCheckinDone(true)} style={{flex:1,padding:"13px 0",borderRadius:12,fontWeight:700,fontSize:15,cursor:"pointer",border:"2px solid",borderColor:checkinDone===true?GREEN:TH.border,background:checkinDone===true?"rgba(16,185,129,.15)":"transparent",color:checkinDone===true?GREEN:TH.sub}}>✓ {T.done}</button></div>
        <button onClick={submitCheckin} style={{width:"100%",padding:14,borderRadius:12,border:"none",marginBottom:10,background:checkinDone===true?GREEN:checkinDone===false?RED:P,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>{checkinDone===true?T.submit:checkinDone===false?T.save:"请选择完成状态"}</button>
        <button onClick={()=>setShowCheckin(false)} style={{width:"100%",padding:12,borderRadius:12,border:`1px solid ${TH.border}`,background:"transparent",color:TH.sub,fontSize:14,cursor:"pointer"}}>{T.cancel}</button>
      </div>
    </div>)}

    {/* NEW MIND MODAL */}
    {showNewMind&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:300,display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",background:TH.cardSolid,borderRadius:"24px 24px 0 0",padding:24,maxHeight:"88vh",overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><div style={{fontWeight:700,fontSize:18,color:TH.text}}>{T.newReflection}</div><button onClick={()=>setShowNewMind(false)} style={{background:"transparent",border:"none",fontSize:22,color:TH.sub,cursor:"pointer"}}>×</button></div><div style={{display:"flex",gap:8,marginBottom:14}}>{MIND_COLORS.map((c,i)=>(<div key={i} onClick={()=>setMindColorIdx(i)} style={{width:26,height:26,borderRadius:13,background:`linear-gradient(135deg,${c[0]},${c[1]})`,cursor:"pointer",border:mindColorIdx===i?"3px solid #fff":"3px solid transparent",flexShrink:0}}/>))}</div><textarea value={mindContent} onChange={e=>setMindContent(e.target.value)} placeholder="记录此刻的感悟与灵感..." style={{width:"100%",minHeight:90,background:TH.card,border:`1px solid ${TH.border}`,borderRadius:12,padding:12,color:TH.text,fontSize:14,resize:"none",outline:"none",boxSizing:"border-box",marginBottom:14}}/><div style={{fontSize:12,color:TH.sub,marginBottom:8}}>添加标签</div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{[...TAGS_PRESET,...habits.filter(h=>h.createTag).map(h=>`#${h.name}`)].map(t=>(<button key={t} onClick={()=>setMindTags(ts=>ts.includes(t)?ts.filter(x=>x!==t):[...ts,t])} style={{padding:"4px 12px",borderRadius:20,fontSize:12,cursor:"pointer",border:"1px solid",background:mindTags.includes(t)?P:"transparent",color:mindTags.includes(t)?"#fff":P,borderColor:P}}>{t}</button>))}</div><div style={{fontSize:12,color:TH.sub,marginBottom:8}}>心情</div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>{MOODS.map(m=>(<button key={m} onClick={()=>setMindMood(m)} style={{padding:"5px 12px",borderRadius:16,fontSize:12,cursor:"pointer",border:"1px solid",background:mindMood===m?`${P}30`:"transparent",borderColor:mindMood===m?P:TH.border,color:mindMood===m?"#fff":TH.sub}}>{m}</button>))}</div><Btn onClick={addMind}>{T.saveReflection}</Btn></div></div>)}

    {/* ADD FOOD */}
    {showAddFood&&<FoodModal TH={TH} P={P} inp={inp} name={fn2} setName={setFn2} cal={fc2} setCal={setFc2} note={fno2} setNote={setFno2} onAdd={addFoodItem} onClose={()=>setShowAddFood(false)}/>}

    {/* WATER GOAL */}
    {showWaterGoal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div style={{background:TH.cardSolid,borderRadius:20,padding:24,width:"100%",maxWidth:320,textAlign:"center"}}><div style={{fontWeight:700,fontSize:17,marginBottom:6,color:TH.text}}>设置每日饮水目标</div><div style={{fontSize:12,color:TH.sub,marginBottom:16}}>请输入500-3000之间的数值</div><input type="number" value={waterGoalInput} onChange={e=>setWaterGoalInput(e.target.value)} style={{...inp,fontSize:22,fontWeight:700,textAlign:"center",marginBottom:20,border:`2px solid ${BLUE}`,width:"100%",boxSizing:"border-box"}}/><div style={{display:"flex",gap:10}}><button onClick={()=>setShowWaterGoal(false)} style={{flex:1,padding:12,borderRadius:12,border:`1px solid ${TH.border}`,background:"transparent",color:TH.sub,fontSize:14,cursor:"pointer"}}>取消</button><button onClick={()=>{setWaterGoal(Math.max(500,Math.min(3000,+waterGoalInput||2000)));setShowWaterGoal(false);}} style={{flex:1,padding:12,borderRadius:12,border:"none",background:BLUE,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>保存</button></div></div></div>)}

    {/* CAL GOAL */}
    {showCalGoal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div style={{background:TH.cardSolid,borderRadius:20,padding:24,width:"100%",maxWidth:320,textAlign:"center"}}><div style={{fontWeight:700,fontSize:17,marginBottom:6,color:TH.text}}>设置每日卡路里目标</div><div style={{fontSize:12,color:TH.sub,marginBottom:16}}>请输入500-10000之间的数值</div><input type="number" value={calGoalInput} onChange={e=>setCalGoalInput(e.target.value)} style={{...inp,fontSize:22,fontWeight:700,textAlign:"center",marginBottom:20,border:`2px solid ${GREEN}`,width:"100%",boxSizing:"border-box"}}/><div style={{display:"flex",gap:10}}><button onClick={()=>setShowCalGoal(false)} style={{flex:1,padding:12,borderRadius:12,border:`1px solid ${TH.border}`,background:"transparent",color:TH.sub,fontSize:14,cursor:"pointer"}}>取消</button><button onClick={()=>{setCalGoal(Math.max(500,Math.min(10000,+calGoalInput||2000)));setShowCalGoal(false);}} style={{flex:1,padding:12,borderRadius:12,border:"none",background:GREEN,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>保存</button></div></div></div>)}

    {/* LANG PICKER */}
    {showLangPicker&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:300,display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",background:TH.cardSolid,borderRadius:"24px 24px 0 0",padding:24,maxHeight:"70vh",overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><div style={{fontWeight:700,fontSize:18,color:TH.text}}>{T.language}</div><button onClick={()=>setShowLangPicker(false)} style={{background:"transparent",border:"none",fontSize:22,color:TH.sub,cursor:"pointer"}}>×</button></div>{LANG_LIST.map(l=>(<div key={l.code} onClick={()=>setShowLangPicker(false)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 0",borderBottom:`1px solid ${TH.border}`,cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:22}}>{l.flag}</span><span style={{fontSize:15,color:TH.text}}>{l.name}</span></div>{l.code==="zh"&&<span style={{color:P,fontSize:18}}>✓</span>}</div>))}</div></div>)}

    {/* THEME PICKER */}
    {showThemePicker&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:300,display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",background:TH.cardSolid,borderRadius:"24px 24px 0 0",padding:24}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><div style={{fontWeight:700,fontSize:18,color:TH.text}}>{T.theme}</div><button onClick={()=>setShowThemePicker(false)} style={{background:"transparent",border:"none",fontSize:22,color:TH.sub,cursor:"pointer"}}>×</button></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>{Object.entries(THEMES).map(([key,th])=>(<div key={key} onClick={()=>{setThemeName(key);setShowThemePicker(false);}} style={{borderRadius:14,overflow:"hidden",cursor:"pointer",border:`2px solid ${themeName===key?th.primary:"transparent"}`}}><div style={{background:th.bg,height:56,display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:8,position:"relative"}}>{th.starfield&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{["★","·","✦","·","★"].map((s,i)=><span key={i} style={{fontSize:i===2?14:10,color:`rgba(200,210,255,${i===2?.9:.4})`,marginRight:2}}>{s}</span>)}</div>}<div style={{width:"60%",height:5,borderRadius:3,background:th.primary,marginBottom:3,position:"relative",zIndex:1}}/><div style={{width:"40%",height:3,borderRadius:2,background:th.card,position:"relative",zIndex:1}}/></div><div style={{background:TH.card,padding:"5px 8px",fontSize:10,color:TH.text,textAlign:"center"}}>{th.name}</div></div>))}</div></div></div>)}
  </div>);
}
