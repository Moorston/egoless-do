'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@egoless/core';
import { useTheme, useT, cs, LinkWorldBtn } from './helpers';

const SOUNDS = [
  { label: '海浪声', file: 'ocean.mp3' },
  { label: '雨声', file: 'rain.mp3' },
  { label: '钵声', file: 'bowl.mp3' },
  { label: '鸟叫声', file: 'birds.mp3' },
  { label: '流水声', file: 'flowing-stream.mp3' },
  { label: '风铃声', file: 'wind-chimes.mp3' },
  { label: '无', file: '' },
];

function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const buffers = useRef<Record<string, AudioBuffer>>({});
  const bgGain = useRef<GainNode | null>(null);
  const bgSource = useRef<AudioBufferSourceNode | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const loadBuffer = useCallback(async (url: string): Promise<AudioBuffer | null> => {
    if (buffers.current[url]) return buffers.current[url];
    try {
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      const buf = await getCtx().decodeAudioData(ab);
      buffers.current[url] = buf;
      return buf;
    } catch { return null; }
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

  return { playBg, stopBg, playBell };
}

export default function MeditateTab({ onOpenGlobalMap, onOpenMedHistory }: { onOpenGlobalMap?: () => void; onOpenMedHistory?: () => void }) {
  const totalMedMin = useAppStore((s) => s.totalMedMin);
  const medHistory = useAppStore((s) => s.medHistory);
  const addMedSession = useAppStore((s) => s.addMedSession);
  const { TH, P } = useTheme();
  const T = useT();
  const [dur, setDur] = useState(5);
  const [soundIdx, setSoundIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [remain, setRemain] = useState(300);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playBg, stopBg, playBell } = useAudio();

  useEffect(() => { setRemain(dur * 60); }, [dur]);

  useEffect(() => {
    if (running) {
      playBg(SOUNDS[soundIdx].file);
      ref.current = setInterval(() => setRemain((r) => {
        if (r <= 1) {
          clearInterval(ref.current);
          setRunning(false);
          addMedSession(dur);
          stopBg();
          playBell();
          return 0;
        }
        return r - 1;
      }), 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => {
      clearInterval(ref.current);
      stopBg();
    };
  }, [running, dur, soundIdx, addMedSession, playBg, stopBg, playBell]);

  const handleStop = () => {
    setRunning(false);
    stopBg();
    playBell();
    addMedSession(dur);
  };

  const currentSound = SOUNDS[soundIdx];

  return (
    <>
      <div style={{ ...cs(TH), textAlign: 'center', padding: '20px 16px' } as React.CSSProperties}>
        <div style={{ fontSize: 36, fontWeight: 800, color: P }}>{totalMedMin}</div>
        <div style={{ color: TH.sub, fontSize: 13 }}>{T('accMed')}</div>
      </div>
      <div style={cs(TH)}>
        {running ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ background: `${P}18`, borderRadius: 20, padding: '28px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 50, fontWeight: 800, color: P, letterSpacing: 2 }}>{Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')}</div>
              <div style={{ color: TH.sub, fontSize: 13, marginTop: 6 }}>打坐中... {currentSound.label !== '无' ? `🎵 ${currentSound.label}` : ''}</div>
            </div>
            <button onClick={handleStop} style={{ padding: '12px 48px', borderRadius: 12, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>{T('stopMed')}</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${TH.border}`, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: TH.sub }}>{T('bgMusic')}</span>
              <span style={{ color: P, cursor: 'pointer', fontSize: 13 }}>🎵 {currentSound.label} ›</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {SOUNDS.map((s, i) => (
                <button key={s.label} onClick={() => setSoundIdx(i)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${soundIdx === i ? P : TH.border}`, background: soundIdx === i ? `${P}30` : 'transparent', color: soundIdx === i ? '#fff' : TH.sub, fontSize: 12, cursor: 'pointer' }}>{s.label}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[1, 5, 10, 15, 30, 60, 120, 180, 300].map((d) => (
                <button key={d} onClick={() => setDur(d)}
                  style={{ padding: '10px 0', borderRadius: 10, border: `1px solid ${dur === d ? P : TH.border}`, background: dur === d ? P : 'transparent', color: dur === d ? '#fff' : TH.sub, fontWeight: dur === d ? 700 : 400, fontSize: 13, cursor: 'pointer' }}>{d}分钟</button>
              ))}
            </div>
            <button onClick={() => { setRemain(dur * 60); setRunning(true); }} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{T('startMed')}</button>
          </>
        )}
      </div>

      <div style={cs(TH)}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: TH.text }}>今日打坐</span>
          <span style={{ color: P, fontWeight: 600 }}>{totalMedMin} 分钟</span>
        </div>
      </div>

      <LinkWorldBtn label="查看全球冥想者" onClick={() => onOpenGlobalMap?.()} />

      <div onClick={onOpenMedHistory} style={{ background: TH.card, borderRadius: 16, marginBottom: 12, border: `1px solid ${TH.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <span style={{ fontSize: 18 }}>☯</span>
        <span style={{ fontSize: 13, color: TH.text }}>{T('meditationHistory')}</span>
        <span style={{ marginLeft: 'auto', color: TH.sub }}>›</span>
      </div>

      <button style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 8 }}>{T('shareMed')}</button>
      <div style={{ textAlign: 'center', fontSize: 13, color: TH.sub }}>部分音效来源：Pixabay (royalty-free)</div>
    </>
  );
}
