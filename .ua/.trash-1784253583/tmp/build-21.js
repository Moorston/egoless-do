const fs = require("fs");
const extract = JSON.parse(fs.readFileSync(".ua/tmp/ua-file-extract-results-21.json","utf8"));
const input = JSON.parse(fs.readFileSync(".ua/tmp/ua-file-analyzer-input-21.json","utf8"));

const byPath = {};
for (const r of extract.results) byPath[r.path] = r;

const FILE_META = {
  "apps/mobile/src/features/meditation/MeditationScreen.tsx": {
    s:"冥想主页面，包含倒计时、实时会话心跳、背景音乐选择、钟声音效、完成感悟记录与分享卡片等完整冥想流程。",
    t:["meditation","screen","timer","audio","sharing"]
  },
  "apps/mobile/src/features/music/components/CategoryCard.tsx": {
    s:"音乐分类卡片组件，渐变背景展示分类图标、名称与曲目数量，用于音乐馆网格入口。",
    t:["music","component","card","gradient"]
  },
  "apps/mobile/src/features/music/components/FavoriteButton.tsx": {
    s:"心形收藏按钮，带缩放心跳动画，用于切换曲目收藏状态。",
    t:["music","component","favorite","animation"]
  },
  "apps/mobile/src/features/music/components/ImportMusicButton.tsx": {
    s:"导入本地音频按钮，调用 DocumentPicker 选择音频并加入用户曲库。",
    t:["music","component","import","document-picker"]
  },
  "apps/mobile/src/features/music/components/MusicMiniBar.tsx": {
    s:"迷你音乐控制条，显示当前曲目、播放/暂停与循环模式切换及进度条，供冥想页内嵌。",
    t:["music","component","mini-player","progress"]
  },
  "apps/mobile/src/features/music/components/MusicPickerModal.tsx": {
    s:"音乐选择弹窗，按分类分组展示内置与用户曲目，支持试听、收藏与确认选择背景音乐。",
    t:["music","component","modal","picker","flatlist"]
  },
  "apps/mobile/src/features/music/components/PlayerBar.tsx": {
    s:"底部播放器控制条，含播放/暂停、上下曲、音量、循环模式、睡眠定时器弹窗与波形进度条。",
    t:["music","component","player","sleep-timer","seekbar"]
  },
  "apps/mobile/src/features/music/components/TrackListItem.tsx": {
    s:"曲目列表项，展示曲目名、分类、收藏状态、动画图标、波形进度及用户曲删除操作。",
    t:["music","component","track","list-item"]
  },
  "apps/mobile/src/features/music/components/WaveformBar.tsx": {
    s:"音频波形条组件，按分类预设轮廓或种子随机生成柱状波形，支持进度高亮与点击定位。",
    t:["music","component","waveform","visualization"]
  },
  "apps/mobile/src/features/music/screens/MusicCategoryScreen.tsx": {
    s:"音乐分类页，按分类加载曲目列表，支持播放、收藏、设置播放队列并显示底部播放器。",
    t:["music","screen","category","queue"]
  },
  "apps/mobile/src/features/music/screens/MusicScreen.tsx": {
    s:"音乐馆主页，展示正在播放卡片、分类卡片网格，并挂载分类元数据计算与底部播放器。",
    t:["music","screen","library","category-grid"]
  },
  "apps/mobile/src/features/music/services/AudioEngineProvider.tsx": {
    s:"全局音频引擎 Provider，监听音乐 store 控制 expo-audio 播放器，同步进度、处理切曲与音频会话设置。",
    t:["music","service","audio-engine","provider","expo-audio"]
  },
  "apps/mobile/src/features/music/services/AudioSessionManager.ts": {
    s:"音频会话管理器（music feature 版），以单例管理音乐与环境音的优先级抢占与恢复。",
    t:["music","service","audio-session","singleton","priority"]
  },
  "apps/mobile/src/features/music/services/audioPlayerRef.ts": {
    s:"全局音频播放器共享引用，由 AudioEngineProvider 赋值，供 PlayerBar 等跨组件操作播放器。",
    t:["music","service","ref","audio-player"]
  },
  "apps/mobile/src/features/music/useMusicStore.ts": {
    s:"音乐 Zustand store，管理库/用户曲/收藏/队列/播放状态/睡眠定时器，并以文件系统持久化。",
    t:["music","store","zustand","persistence","queue"]
  },
  "apps/mobile/src/features/zhiguan/SessionComplete.tsx": {
    s:"禅修结束卡片，展示时长/日期、八触记录、自评禅定阶段、结行笔记与回向，完成或放弃。",
    t:["zhiguan","screen","session-complete","eight-tactile","sam-stage"]
  },
  "apps/mobile/src/features/zhiguan/ZhiguanScreen.tsx": {
    s:"止观主控页，三层渐进式（idle/practicing/complete）架构，整合呼吸环、计数、vipassana、计时器与会话生命周期。",
    t:["zhiguan","screen","breath","timer","session-lifecycle"]
  },
  "apps/mobile/src/features/zhiguan/ZhiguanSettingsSheet.tsx": {
    s:"止观设置弹窗，配置呼吸节奏、目标时长、背景音、修行法、五盖强度与发愿文。",
    t:["zhiguan","component","settings","modal","sankalpa"]
  },
  "apps/mobile/src/features/zhiguan/components/BreathRing.tsx": {
    s:"呼吸圆环动画组件，按吸气-屏-呼气节奏膨胀收缩，跟随呼吸模式循环。",
    t:["zhiguan","component","breath","animated","ring"]
  },
  "apps/mobile/src/features/zhiguan/components/CountingRound.tsx": {
    s:"十珠计数环，每呼吸一次点亮一颗珠子，显示轮次与总呼吸数。",
    t:["zhiguan","component","counting","beads","breath"]
  },
  "apps/mobile/src/features/zhiguan/components/VipassanaPanel.tsx": {
    s:"四念处指引面板，滑入式显示身/受/心/法的观照修行引导文。",
    t:["zhiguan","component","vipassana","modal","guides"]
  },
  "apps/mobile/src/features/zhiguan/hooks/useZhiguanTimer.ts": {
    s:"止观计时器 Hook，基于 requestAnimationFrame 计时，处理后台暂停补偿与阶段提示。",
    t:["zhiguan","hook","timer","raf","app-state"]
  },
  "apps/mobile/src/services/AudioSessionManager.ts": {
    s:"音频会话管理器（全局服务版），以单例管理音乐与环境音的优先级抢占与恢复。",
    t:["service","audio-session","singleton","priority"]
  }
};

const FUNC_META = {};
function fmeta(path, name, s, t){ FUNC_META[path+"::"+name] = {s,t}; }
fmeta("apps/mobile/src/features/meditation/MeditationScreen.tsx","MeditationScreen","冥想主页组件，串联倒计时、心跳会话、音乐选择、钟声音效、感悟记录与分享卡片。",["meditation","screen","timer","audio","sharing"]);
fmeta("apps/mobile/src/features/music/components/FavoriteButton.tsx","FavoriteButton","收藏按钮组件，点击触发心跳缩放动画并切换收藏状态。",["music","favorite","animation"]);
fmeta("apps/mobile/src/features/music/components/ImportMusicButton.tsx","ImportMusicButton","导入音乐按钮，调用 DocumentPicker 选曲并写入用户曲库。",["music","import","document-picker"]);
fmeta("apps/mobile/src/features/music/components/MusicMiniBar.tsx","MusicMiniBar","迷你播放控制条，显示曲目、播放/暂停与循环模式及进度。",["music","mini-player","progress"]);
fmeta("apps/mobile/src/features/music/components/MusicPickerModal.tsx","MusicPickerModal","音乐选择弹窗，按分类展示曲目，支持试听、收藏与确认。",["music","modal","picker","flatlist"]);
fmeta("apps/mobile/src/features/music/components/PlayerBar.tsx","PlayerBar","底部播放器控制条，含上下曲、音量、循环、睡眠定时与波形进度。",["music","player","sleep-timer","seekbar"]);
fmeta("apps/mobile/src/features/music/components/PlayerBar.tsx","formatTime","格式化为 mm:ss 时间字符串的工具函数。",["music","util","time","format"]);
fmeta("apps/mobile/src/features/music/components/TrackListItem.tsx","TrackListItem","曲目列表项，展示曲目详情、收藏、动画图标、波形进度与删除。",["music","track","list-item"]);
fmeta("apps/mobile/src/features/music/components/WaveformBar.tsx","WaveformBar","波形条渲染组件，按进度高亮并支持点击定位。",["music","waveform","visualization"]);
fmeta("apps/mobile/src/features/music/components/WaveformBar.tsx","generateWaveform","按分类预设轮廓或种子随机生成波形柱状数据数组。",["music","waveform","generator","seeded-random"]);
fmeta("apps/mobile/src/features/music/screens/MusicCategoryScreen.tsx","MusicCategoryScreen","音乐分类页组件，加载分类曲目、播放、收藏与队列设置。",["music","screen","category","queue"]);
fmeta("apps/mobile/src/features/music/screens/MusicScreen.tsx","MusicScreen","音乐馆主页组件，展示正在播放卡片与分类卡片网格。",["music","screen","library","category-grid"]);
fmeta("apps/mobile/src/features/music/services/AudioEngineProvider.tsx","AudioEngineProvider","音频引擎 Provider，桥接音乐 store 与 expo-audio 播放器。",["music","audio-engine","provider","expo-audio"]);
fmeta("apps/mobile/src/features/music/services/AudioSessionManager.ts","AudioSessionManager","音频会话管理器类（feature 版），以优先级规则调度音乐与环境音。",["music","audio-session","singleton","class"]);
fmeta("apps/mobile/src/features/music/useMusicStore.ts","useMusicStore","音乐 Zustand store hook，含播放、队列、收藏、睡眠定时与文件持久化逻辑。",["music","store","zustand","persistence"]);
fmeta("apps/mobile/src/features/music/useMusicStore.ts","setMusicSyncCallback","注册音乐变更回调，供 useAppStore 触发 profile 同步。",["music","store","sync","callback"]);
fmeta("apps/mobile/src/features/music/useMusicStore.ts","computeTracksByCategory","纯函数，按分类筛选内置与用户曲目并返回列表。",["music","selector","pure","category"]);
fmeta("apps/mobile/src/features/music/useMusicStore.ts","computeCategoryMeta","纯函数，计算各分类元数据（名称、图标、数量）。",["music","selector","pure","category-meta"]);
fmeta("apps/mobile/src/features/zhiguan/SessionComplete.tsx","SessionComplete","禅修结束卡片组件，采集八触、禅定阶段、结行笔记与回向。",["zhiguan","session-complete","eight-tactile","sam-stage"]);
fmeta("apps/mobile/src/features/zhiguan/ZhiguanScreen.tsx","ZhiguanScreen","止观主控组件，三态切换并整合呼吸环、计数、vipassana 与会话生命周期。",["zhiguan","screen","breath","session-lifecycle"]);
fmeta("apps/mobile/src/features/zhiguan/ZhiguanSettingsSheet.tsx","ZhiguanSettingsSheet","止观设置弹窗组件，配置呼吸、时长、背景音、法门、五盖与发愿。",["zhiguan","settings","modal","sankalpa"]);
fmeta("apps/mobile/src/features/zhiguan/components/BreathRing.tsx","BreathRing","呼吸圆环动画组件，按呼吸模式循环膨胀收缩。",["zhiguan","breath","animated","ring"]);
fmeta("apps/mobile/src/features/zhiguan/components/CountingRound.tsx","CountingRound","十珠计数环组件，按呼吸点亮珠子并显示轮次。",["zhiguan","counting","beads"]);
fmeta("apps/mobile/src/features/zhiguan/components/VipassanaPanel.tsx","VipassanaPanel","四念处指引面板组件，展示身/受/心/法观照引导。",["zhiguan","vipassana","modal","guides"]);
fmeta("apps/mobile/src/features/zhiguan/hooks/useZhiguanTimer.ts","useZhiguanTimer","止观计时器 Hook，基于 requestAnimationFrame 并处理后台补偿。",["zhiguan","timer","raf","app-state"]);
fmeta("apps/mobile/src/features/zhiguan/hooks/useZhiguanTimer.ts","usePracticeElapseHints","监听坐禅时长并在 5/30/60 分钟触发阶段提示回调。",["zhiguan","hook","hints","elapsed"]);
fmeta("apps/mobile/src/services/AudioSessionManager.ts","AudioSessionManager","音频会话管理器类（全局版），以优先级规则调度音乐与环境音。",["service","audio-session","singleton","class"]);

function ncComp(n){ return n<50?"simple":n<=200?"moderate":"complex"; }

const nodes = [];
const edges = [];
const funcNodeId = {};

for (const f of input.batchFiles){
  const r = byPath[f.path];
  const ne = r?r.nonEmptyLines:50;
  const meta = FILE_META[f.path]||{s:"模块文件。",t:["module"]};
  nodes.push({id:"file:"+f.path,type:"file",name:f.path.split("/").pop(),summary:meta.s,tags:meta.t,complexity:ncComp(ne),filePath:f.path});
}

for (const f of input.batchFiles){
  const r = byPath[f.path];
  if(!r) continue;
  for(const fn of (r.functions||[])){
    const span=fn.endLine-fn.startLine;
    const isExp=(r.exports||[]).some(e=>e.name===fn.name);
    if(span<10 && !isExp) continue;
    const id="file:"+f.path+":"+fn.name;
    funcNodeId[id]=true;
    const m=FUNC_META[f.path+"::"+fn.name]||{s:("函数 "+fn.name+"。"),t:["function"]};
    nodes.push({id,type:"function",name:fn.name,summary:m.s,tags:m.t,complexity:ncComp(span),filePath:f.path,lineRange:[fn.startLine,fn.endLine]});
  }
  for(const cl of (r.classes||[])){
    const id="file:"+f.path+":"+cl.name;
    funcNodeId[id]=true;
    const m=FUNC_META[f.path+"::"+cl.name]||{s:("类 "+cl.name+"。"),t:["class"]};
    nodes.push({id,type:"function",name:cl.name,summary:m.s,tags:m.t,complexity:ncComp(cl.endLine-cl.startLine),filePath:f.path,lineRange:[cl.startLine,cl.endLine]});
  }
}

let importCount=0;
for(const [file,targets] of Object.entries(input.batchImportData)){
  for(const t of targets){
    edges.push({source:"file:"+file,target:"file:"+t,type:"imports",weight:0.7});
    importCount++;
  }
}

const expNamesByFile={};
for(const r of extract.results) expNamesByFile[r.path]=new Set((r.exports||[]).map(e=>e.name));
let containsCount=0, exportsCount=0;
for(const f of input.batchFiles){
  const r=byPath[f.path]; if(!r) continue;
  const es=expNamesByFile[f.path]||new Set();
  for(const fn of (r.functions||[])){
    const id="file:"+f.path+":"+fn.name;
    if(!funcNodeId[id]) continue;
    edges.push({source:"file:"+f.path,target:id,type:"contains",weight:1.0}); containsCount++;
    if(es.has(fn.name)){edges.push({source:"file:"+f.path,target:id,type:"exports",weight:0.8}); exportsCount++;}
  }
  for(const cl of (r.classes||[])){
    const id="file:"+f.path+":"+cl.name;
    if(!funcNodeId[id]) continue;
    edges.push({source:"file:"+f.path,target:id,type:"contains",weight:1.0}); containsCount++;
    if(es.has(cl.name)){edges.push({source:"file:"+f.path,target:id,type:"exports",weight:0.8}); exportsCount++;}
  }
}

const funcNamesByFile={};
for(const f of input.batchFiles){
  const r=byPath[f.path]; const s=new Set();
  if(r){ for(const fn of (r.functions||[])) s.add(fn.name); for(const cl of (r.classes||[])) s.add(cl.name);}
  funcNamesByFile[f.path]=s;
}
let callsCount=0;
for(const f of input.batchFiles){
  const r=byPath[f.path]; if(!r) continue;
  for(const cg of (r.callGraph||[])){
    if(!funcNamesByFile[f.path].has(cg.caller)) continue;
    let calFile=null,calName=null;
    if(funcNamesByFile[f.path].has(cg.callee)){calFile=f.path;calName=cg.callee;}
    else{for(const f2 of input.batchFiles){if(f2.path===f.path)continue;if(funcNamesByFile[f2.path].has(cg.callee)){calFile=f2.path;calName=cg.callee;break;}}}
    if(!calFile) continue;
    const src="file:"+f.path+":"+cg.caller, tgt="file:"+calFile+":"+calName;
    if(funcNodeId[src]&&funcNodeId[tgt]&&src!==tgt){edges.push({source:src,target:tgt,type:"calls",weight:0.8});callsCount++;}
  }
}

fs.writeFileSync(".ua/intermediate/batch-21.json", JSON.stringify({nodes,edges},null,2));
console.log("nodes:",nodes.length,"edges:",edges.length,"imports:",importCount,"contains:",containsCount,"exports:",exportsCount,"calls:",callsCount);
