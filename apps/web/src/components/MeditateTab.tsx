'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme, useT, cs, LinkWorldBtn, useCachedStyle } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { getTodayMedMinutes, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION } from '@egoless-do/core';
import { useOverlay } from './useOverlay';
import { CircleDot, Music, ChevronRight } from 'lucide-react';

function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const buffers = useRef<Record<string, AudioBuffer>>({});
  const bgGain = useRef<GainNode | null>(null);
  const bgSource = useRef<AudioBufferSourceNode | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const loadBuffer = useCallback(async (url: string): Promise<AudioBuffer | null> => {
    if (buffers.current[url]) return buffers.current[url];
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load audio: ${url}`);
      const ab = await res.arrayBuffer();
      const buf = await getCtx().decodeAudioData(ab);
      buffers.current[url] = buf;
      setAudioError(null);
      return buf;
    } catch (e) {
      console.warn(`Audio load failed: ${url}`, e);
      setAudioError('medLoadError');
      return null;
    }
  }, [getCtx]);

  const playBg = useCallback(async (file: string) => {
    stopBg();
    if (!file) return;
    const ctx = getCtx();
    const buf = await loadBuffer(`/sounds/${file}`);
    if (!buf) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    gain.connect(ctx.destination);
    bgGain.current = gain;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gain);
    src.start(0);
    bgSource.current = src;
  }, [getCtx, loadBuffer]);

  const stopBg = useCallback(() => {
    try { bgSource.current?.stop(); } catch {}
    bgSource.current = null;
    bgGain.current = null;
  }, []);

  const playBell = useCallback(async () => {
    const ctx = getCtx();
    const buf = await loadBuffer('/sounds/temple_bell.mp3');
    if (!buf) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    gain.connect(ctx.destination);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    src.start(0);
  }, [getCtx, loadBuffer]);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  return { playBg, stopBg, playBell, audioError };
}

export default function MeditateTab() {
  const overlay = useOverlay();
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const SOUNDS = useMemo(() => [
    { label: T('soundOcean'), file: 'ocean.mp3' },
    { label: T('soundRain'), file: 'rain.mp3' },
    { label: T('soundBowl'), file: 'bowl.mp3' },
    { label: T('soundBirds'), file: 'birds.mp3' },
    { label: T('soundStream'), file: 'flowing-stream.mp3' },
    { label: T('soundChimes'), file: 'wind-chimes.mp3' },
    { label: T('soundNone'), file: '' },
  ], [T]);
  const [dur, setDur] = useState(5);
  const [soundIdx, setSoundIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [remain, setRemain] = useState(300);
  const ref = useRef<number | null>(null);
  const { playBg, stopBg, playBell, audioError } = useAudio();

  useEffect(() => { setRemain(dur * 60); }, [dur]);

  const durRef = useRef(dur);
  durRef.current = dur;
  const addMedRef = useRef(store.addMedMinutes);
  addMedRef.current = store.addMedMinutes;
  const completedRef = useRef(false);

  // Handle completion when remain reaches 0
  useEffect(() => {
    if (running && remain <= 0) {
      if (ref.current !== null) window.clearInterval(ref.current);
      ref.current = null;
      setRunning(false);
      if (!completedRef.current) {
        completedRef.current = true;
        addMedRef.current(durRef.current);
      }
      stopBg();
      playBell();
    }
  }, [running, remain, stopBg, playBell]);

  useEffect(() => {
    if (running) {
      completedRef.current = false;
      playBg(SOUNDS[soundIdx].file);
      ref.current = window.setInterval(() => setRemain((r) => Math.max(0, r - 1)), 1000);
    } else {
      if (ref.current !== null) window.clearInterval(ref.current);
    }
    return () => {
      if (ref.current !== null) window.clearInterval(ref.current);
      stopBg();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, soundIdx]);

  const handleStop = () => {
    if (running && !completedRef.current) {
      completedRef.current = true;
      const elapsedMin = Math.round((durRef.current * 60 - remain) / 60);
      if (elapsedMin > 0) addMedRef.current(elapsedMin);
    }
    setRunning(false);
    stopBg();
    playBell();
  };

  const currentSound = SOUNDS[soundIdx];
  const cardStyle = useCachedStyle(() => cs(TH), [TH]);
  const timerDisplay = useMemo(() => ({
    background: `${P}18`,
    borderRadius: 20,
    padding: '28px 20px',
    marginBottom: 20
  }), [P]);

  const durationButtons = useMemo(() => [1, 5, 10, 15, 30, 60, 120, 180, 300], []);
  const todayMedMin = useMemo(() => getTodayMedMinutes(store.medHistory || []), [store.medHistory]);

  const handleShare = useCallback(() => {
    const W = 750, H = 1000;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1a1040');
    grad.addColorStop(0.5, '#2d1b69');
    grad.addColorStop(1, '#0f0c29');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Decorative circles
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath(); ctx.arc(600, 150, 200, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6366f1';
    ctx.beginPath(); ctx.arc(150, 800, 180, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Title
    ctx.fillStyle = '#e2d9f3';
    ctx.font = '600 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(T('shareCardTitle'), W / 2, 120);
    // ☯ icon
    ctx.font = '120px sans-serif';
    ctx.fillText('☯', W / 2, 310);
    // Date
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '28px sans-serif';
    ctx.fillText(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }), W / 2, 400);
    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120, 440); ctx.lineTo(W - 120, 440); ctx.stroke();
    // Stats
    const stats = [
      { value: String(store.totalMedMinutes), label: T('accMed').replace(/\s*\(.*\)/, '') },
      { value: String(todayMedMin), label: T('medTitle') },
      { value: String((store.medHistory || []).length), label: T('shareCardSession') },
    ];
    const statY = [530, 680, 830];
    stats.forEach((s, i) => {
      ctx.fillStyle = '#a78bfa';
      ctx.font = '800 72px sans-serif';
      ctx.fillText(s.value, W / 2, statY[i]);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '28px sans-serif';
      ctx.fillText(s.label, W / 2, statY[i] + 45);
    });
    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '22px sans-serif';
    ctx.fillText('egoless-do.app', W / 2, 950);
    // Download
    const a = document.createElement('a');
    a.download = 'meditation-share.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }, [store.totalMedMinutes, store.medHistory, todayMedMin, T]);

  return (
    <>
      {audioError && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#F59E0B', color: '#fff', padding: '12px 24px', borderRadius: 12, zIndex: 400, fontSize: FONT_BODY }}>
          {T(audioError)}
        </div>
      )}
      
      <div style={{ ...cardStyle, textAlign: 'center', padding: '20px 16px' } as React.CSSProperties}>
        <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: P }}>{store.totalMedMinutes}</div>
        <div style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('accMed')}</div>
      </div>
      <div style={cardStyle}>
        {running ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={timerDisplay}>
              <div style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: P, letterSpacing: 2 }}>{Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')}</div>
              <div style={{ color: TH.sub, fontSize: FONT_BODY, marginTop: 6 }}>{T('medActive')} {currentSound.file ? <><Music size={16} style={{verticalAlign:'middle',marginRight:4}} />{currentSound.label}</> : ''}</div>
            </div>
            <button onClick={handleStop} style={{ padding: '12px 48px', borderRadius: 12, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 600, fontSize: FONT_BODY, cursor: 'pointer' }}>{T('stopMed')}</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${TH.border}`, marginBottom: 12 }}>
              <span style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('bgMusic')}</span>
              <span style={{ color: P, cursor: 'pointer', fontSize: FONT_BODY }}><Music size={16} style={{verticalAlign:'middle',marginRight:4}} />{currentSound.label} <ChevronRight size={16} style={{verticalAlign:'middle'}} /></span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {SOUNDS.map((s, i) => (
                <button key={s.label} onClick={() => setSoundIdx(i)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${soundIdx === i ? P : TH.border}`, background: soundIdx === i ? `${P}30` : 'transparent', color: soundIdx === i ? '#fff' : TH.sub, fontSize: FONT_BODY, cursor: 'pointer' }}>{s.label}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {durationButtons.map((d) => (
                <button key={d} onClick={() => setDur(d)}
                  style={{ padding: '10px 0', borderRadius: 10, border: `1px solid ${dur === d ? P : TH.border}`, background: dur === d ? P : 'transparent', color: dur === d ? '#fff' : TH.sub, fontWeight: dur === d ? 700 : 400, fontSize: FONT_BODY, cursor: 'pointer' }}>{d}{T('medMinutes')}</button>
              ))}
            </div>
            <button onClick={() => { setRemain(dur * 60); setRunning(true); }} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BODY, cursor: 'pointer' }}>{T('startMed')}</button>
          </>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: TH.text }}>{T('medTitle')}</span>
          <span style={{ color: P, fontWeight: 600 }}>{todayMedMin} {T('medMinutes')}</span>
        </div>
      </div>

      <LinkWorldBtn label={T('globalMeditators')} onClick={() => overlay.open('globalMap', { globalMapTitle: `${T('linkWorld')} — ${T('globalMeditators')}` })} />

      <div onClick={() => overlay.open('medHistory')} style={{ background: TH.card, borderRadius: 16, marginBottom: 12, border: `1px solid ${TH.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <CircleDot size={18} style={{verticalAlign:'middle'}} />
        <span style={{ fontSize: FONT_BODY, color: TH.text }}>{T('meditationHistory')}</span>
        <ChevronRight size={18} style={{marginLeft:'auto',verticalAlign:'middle'}} color={TH.sub} />
      </div>

      <div style={{ textAlign: 'center', fontSize: FONT_BODY, color: TH.sub }}>{T('medAttribution')}</div>
    </>
  );
}
