'use client';

import React from 'react';
import { THEMES, FONT_BODY } from '@egoless-do/core';

export const BREAKPOINT_MOBILE = 390;
export const BREAKPOINT_TABLET = 768;
export const BREAKPOINT_DESKTOP = 1024;
export const BREAKPOINT_WIDE = 1200;

export const cs = (TH: (typeof THEMES)[keyof typeof THEMES]): React.CSSProperties => ({
  background: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${TH.border}`, position: 'relative', zIndex: 1,
});

export const inp = (TH: (typeof THEMES)[keyof typeof THEMES]): React.CSSProperties => ({
  width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: FONT_BODY, outline: 'none', boxSizing: 'border-box',
});
