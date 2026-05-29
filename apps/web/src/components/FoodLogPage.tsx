'use client';

import { useState, useMemo, useCallback } from 'react';
import { THEMES, COLORS, FOOD_PRESETS, getTodayFoodLog, dateStr, FONT_TITLE, FONT_SUB, FONT_BACK, FONT_STAT_CARD, FONT_BODY, FONT_BUTTON, FONT_HERO, FONT_STAT_SECTION, FONT_CLOSE, FONT_BADGE, FONT_LABEL, FONT_EMPTY } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft, ChevronDown, ChevronRight, X, Star, Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils } from 'lucide-react';

const FOOD_ICON_MAP: Record<string, React.ComponentType<any>> = { Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils, Star };

export default function FoodLogPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const foodLog = store.foodLog || [];
  const todayLog = getTodayFoodLog(foodLog);
  const totalCal = todayLog.reduce((a, f) => a + f.calories, 0);
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [fn, setFn] = useState('');
  const [fc, setFc] = useState('');
  const [fnote, setFnote] = useState('');
  const [foodTab, setFoodTab] = useState(0);
  const [foodSearch, setFoodSearch] = useState('');
  const [showManual, setShowManual] = useState(false);

  const allTabs = useMemo(() => [
    ...FOOD_PRESETS.map(c => ({ key: c.key, label: c.label, icon: c.icon, items: c.items })),
    { key: 'my', label: T('foodMyPresets'), icon: 'Star', items: [] as { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] },
  ], [T]);

  const getFilteredItems = useCallback(() => {
    const tab = allTabs[foodTab];
    if (!tab) return [];
    let items: { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] = [];
    if (tab.key === 'my') {
      items = (store.customFoodPresets ?? []).map(p => ({ name: p.name, nameEn: p.name, cal: p.calories, unit: '份', unitEn: 'serving' }));
    } else {
      items = tab.items;
    }
    if (foodSearch.trim()) {
      const q = foodSearch.trim().toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q));
    }
    return items;
  }, [allTabs, foodTab, foodSearch, store.customFoodPresets]);

  const resetFoodForm = useCallback(() => { setFn(''); setFc(''); setFnote(''); setShowManual(false); setFoodSearch(''); setFoodTab(0); }, []);

  const historyGroups = useMemo(() => {
    const today = dateStr();
    const past = foodLog.filter(f => dateStr(new Date(f.timestamp)) !== today);
    const groups: Record<string, typeof past> = {};
    for (const f of past) {
      const d = dateStr(new Date(f.timestamp));
      (groups[d] ??= []).push(f);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [foodLog]);

  const totalHistoryCal = useMemo(() => historyGroups.reduce((sum, [, entries]) => sum + entries.reduce((a, f) => a + f.calories, 0), 0), [historyGroups]);
  const totalRecords = useMemo(() => historyGroups.reduce((sum, [, entries]) => sum + entries.length, 0), [historyGroups]);

  function addFoodItem() {
    if (!fn.trim()) return;
    store.addFood({ name: fn, calories: +fc || 0, note: fnote, timestamp: Date.now() });
    setFn(''); setFc(''); setFnote(''); setShowAdd(false);
  }

  function handlePresetAdd(name: string, cal: number) {
    store.addFood({ name, calories: cal, note: '', timestamp: Date.now() });
    setShowAdd(false);
    resetFoodForm();
  }

  function handleSaveAsPreset() {
    if (!fn.trim()) return;
    store.addCustomFoodPreset(fn, +fc || 0, fnote);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
            <div>
              <div style={{ fontWeight: 700, fontSize: FONT_STAT_CARD, color: TH.text }}>{T('foodTitle')}</div>
              <div style={{ fontSize: FONT_BODY, color: TH.sub }}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div style={{
            background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16,
            textAlign: 'center', padding: '20px 16px'
          }}>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('foodTodayKcal')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: FONT_HERO, fontWeight: 800, color: COLORS.ORANGE }}>{totalCal}</span>
              <span style={{ fontSize: FONT_BACK, color: TH.sub }}>/ {store.calGoal}</span>
            </div>
            <div style={{ fontSize: FONT_BODY, color: '#10B981', marginTop: 6 }}>{T('foodRemaining')}: {Math.max(0, store.calGoal - totalCal)} kcal</div>
          </div>

          <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, marginTop: 12 }}>
            {todayLog.length === 0 ? (
              <div style={{ color: TH.sub, fontSize: FONT_EMPTY, textAlign: 'center', padding: 24 }}>{T('foodEmpty')}</div>
            ) : (
              todayLog.map((f, i) => (
                <div key={f.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px',
                  borderBottom: i < todayLog.length - 1 ? `1px solid ${TH.border}` : 'none'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: FONT_BODY, color: TH.text }}>{f.name}</div>
                    {f.note && <div style={{ fontSize: FONT_BODY, color: TH.sub }}>{f.note}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: P }}>{f.calories} kcal</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <button onClick={() => setShowAdd(true)}
            style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 12, border: 'none', background: COLORS.ORANGE, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer' }}>
            {T('foodAdd')}
          </button>

          {/* ── History ── */}
          <div style={{ marginTop: 24, marginBottom: 24 }}>
            <div onClick={() => setShowHistory(v => !v)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: showHistory ? 12 : 0 }}>
              <span style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('foodHistory')} {showHistory ? <ChevronDown size={18} style={{verticalAlign:'middle'}} /> : <ChevronRight size={18} style={{verticalAlign:'middle'}} />}</span>
            </div>
            {showHistory && (
              <>
                {/* Summary stats */}
                {historyGroups.length > 0 && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16,
                    background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 14, padding: '14px 8px',
                  }}>
                    {[
                      { value: String(historyGroups.length), label: '天' },
                      { value: String(totalRecords), label: '条记录' },
                      { value: String(totalHistoryCal), label: 'kcal' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: FONT_STAT_CARD, fontWeight: 800, color: P }}>{s.value}</div>
                        <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {historyGroups.length === 0 ? (
                  <div style={{ color: TH.sub, fontSize: FONT_EMPTY, textAlign: 'center', padding: 24 }}>{T('foodNoHistory')}</div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: 20 }}>
                    {/* Timeline vertical line */}
                    <div style={{
                      position: 'absolute', left: 6, top: 6, bottom: 6,
                      width: 2, background: TH.border, borderRadius: 1,
                    }} />
                    {historyGroups.map(([date, entries]) => {
                      const dayCal = entries.reduce((a, f) => a + f.calories, 0);
                      return (
                        <div key={date} style={{ position: 'relative', marginBottom: 16 }}>
                          {/* Timeline dot */}
                          <div style={{
                            position: 'absolute', left: -17, top: 14,
                            width: 10, height: 10, borderRadius: '50%',
                            background: P, border: `2px solid ${TH.bg}`,
                          }} />
                          {/* Card */}
                          <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '10px 14px', borderBottom: `1px solid ${TH.border}`,
                              background: `${P}08`,
                            }}>
                              <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{date}</span>
                              <span style={{ fontSize: FONT_BODY, color: P, fontWeight: 700 }}>{dayCal} kcal</span>
                            </div>
                            {entries.map((f, i) => (
                              <div key={f.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px',
                                borderTop: i > 0 ? `1px solid ${TH.border}` : 'none',
                              }}>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontWeight: 600, fontSize: FONT_BODY, color: TH.text }}>{f.name}</span>
                                  {f.note && <span style={{ fontSize: FONT_SUB, color: TH.sub, marginLeft: 8 }}>{f.note}</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 700, color: P, fontSize: FONT_BODY }}>{f.calories} kcal</span>
                                  <button onClick={() => { if (confirm(T('foodDeleteConfirm'))) store.deleteFood(f.id); }}
                                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.3)', fontSize: FONT_TITLE, cursor: 'pointer', padding: '0 4px' }}><X size={18} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 400, display: 'flex', flexDirection: 'column', paddingTop: 48 }}>
          <div style={{ flex: 1, background: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 12px' }}>
              <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('foodAddTitle')}</div>
              <button onClick={() => { setShowAdd(false); resetFoodForm(); }}
                style={{ background: 'transparent', border: 'none', color: TH.sub, fontSize: FONT_CLOSE, cursor: 'pointer' }}><X size={26} /></button>
            </div>

            {/* Search bar */}
            <div style={{ padding: '0 20px 12px' }}>
              <input value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)}
                placeholder={T('foodSearch')}
                style={{
                  width: '100%', background: TH.card, borderRadius: 12, padding: 12,
                  fontSize: FONT_BODY, color: TH.text, border: `1px solid ${TH.border}`, outline: 'none', boxSizing: 'border-box',
                }} />
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 6, padding: '0 16px 8px', overflowX: 'auto' }}>
              {allTabs.map((tab, i) => (
                <button key={tab.key} onClick={() => { setFoodTab(i); setFoodSearch(''); }}
                  style={{
                    whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: foodTab === i ? P : TH.card,
                    color: foodTab === i ? '#fff' : TH.sub, fontSize: FONT_SUB, fontWeight: foodTab === i ? 700 : 400,
                  }}>
                  {(() => { const FoodIcon = FOOD_ICON_MAP[tab.icon]; return FoodIcon ? <FoodIcon size={16} style={{verticalAlign:'middle',marginRight:4}} /> : null; })()} {tab.label}
                </button>
              ))}
            </div>

            {/* Food list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', paddingBottom: 12 }}>
              {getFilteredItems().map((f, i) => (
                <button key={`${f.name}-${i}`}
                  onClick={() => handlePresetAdd(f.name, f.cal)}
                  onContextMenu={(e) => { e.preventDefault(); setFn(f.name); setFc(String(f.cal)); setShowManual(true); }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                    padding: '12px 0', borderBottom: `1px solid ${TH.border}`,
                    background: 'transparent', border: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none', cursor: 'pointer', textAlign: 'left',
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: TH.text, fontSize: FONT_BODY }}>{f.name}</div>
                    <div style={{ color: TH.sub, fontSize: FONT_SUB }}>{f.unit}</div>
                  </div>
                  <div style={{ color: P, fontSize: FONT_BODY, fontWeight: 600 }}>{f.cal} kcal</div>
                </button>
              ))}
              {getFilteredItems().length === 0 && (
                <div style={{ color: TH.sub, textAlign: 'center', padding: '32px 0', fontSize: FONT_BODY }}>
                  {foodTab === allTabs.length - 1 ? T('foodEmpty') : T('foodNoHistory')}
                </div>
              )}
            </div>

            {/* Manual input section */}
            {showManual && (
              <div style={{ padding: 20, borderTop: `1px solid ${TH.border}`, background: TH.cardSolid }}>
                <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder={T('foodName')}
                  style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: FONT_LABEL, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                <input type="number" value={fc} onChange={(e) => setFc(e.target.value)} placeholder={T('foodCal')}
                  style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: FONT_LABEL, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                <textarea value={fnote} onChange={(e) => setFnote(e.target.value)} placeholder={T('foodInsight')} rows={2}
                  style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: FONT_LABEL, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addFoodItem}
                    style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: COLORS.ORANGE, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer' }}>
                    {T('foodConfirm')}
                  </button>
                  <button onClick={handleSaveAsPreset}
                    style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${P}`, background: 'transparent', color: P, fontSize: FONT_BODY, cursor: 'pointer' }}>
                    {T('foodSavePreset')}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom bar */}
            {!showManual && (
              <button onClick={() => setShowManual(true)}
                style={{ padding: 16, borderTop: `1px solid ${TH.border}`, background: 'transparent', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ color: P, fontSize: FONT_BODY, fontWeight: 600 }}>{T('foodManualInput')}</div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
