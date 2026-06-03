'use client';

import { useState, useMemo, useCallback } from 'react';
import { FOOD_PRESETS } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils, Star } from 'lucide-react';

export const FOOD_ICON_MAP: Record<string, React.ComponentType<any>> = { Wheat, Beef, Leaf, Apple, CupSoda, Cookie, Utensils, Star };

export function useFoodSearch(language: string) {
  const T = useT();
  const customFoodPresets = useWebStore((s) => s.customFoodPresets);

  const [fn, setFn] = useState('');
  const [fc, setFc] = useState('');
  const [fnote, setFnote] = useState('');
  const [foodTab, setFoodTab] = useState(0);
  const [foodSearch, setFoodSearch] = useState('');
  const [showManual, setShowManual] = useState(false);

  const allTabs = useMemo(() => [
    ...FOOD_PRESETS.map(c => ({ key: c.key, label: language === 'en' ? c.labelEn : c.label, icon: c.icon, items: c.items })),
    { key: 'my', label: T('foodMyPresets'), icon: 'Star', items: [] as { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] },
  ], [T, language]);

  const getFilteredItems = useCallback(() => {
    const tab = allTabs[foodTab];
    if (!tab) return [];
    let items: { name: string; nameEn: string; cal: number; unit: string; unitEn: string }[] = [];
    if (tab.key === 'my') {
      items = (customFoodPresets ?? []).map(p => ({ name: p.name, nameEn: p.name, cal: p.calories, unit: '份', unitEn: 'serving' }));
    } else {
      items = tab.items;
    }
    if (foodSearch.trim()) {
      const q = foodSearch.trim().toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q));
    }
    return items;
  }, [allTabs, foodTab, foodSearch, customFoodPresets]);

  const filteredItems = useMemo(() => getFilteredItems(), [getFilteredItems]);

  const resetFoodForm = useCallback(() => { setFn(''); setFc(''); setFnote(''); setShowManual(false); setFoodSearch(''); setFoodTab(0); }, []);

  return {
    fn, setFn,
    fc, setFc,
    fnote, setFnote,
    foodTab, setFoodTab,
    foodSearch, setFoodSearch,
    showManual, setShowManual,
    allTabs,
    getFilteredItems,
    filteredItems,
    resetFoodForm,
  };
}
