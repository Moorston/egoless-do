'use client';

import { THEMES, FONT_BODY, FONT_TITLE, FONT_SUB } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicyPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();

  const Section = ({ title, body }: { title: string; body: string }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: FONT_BODY, fontWeight: 700, color: P, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: FONT_BODY, color: TH.sub, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{body}</div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BODY, cursor: 'pointer' }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('privacyTitle')}</div>
        </div>
        <div style={{ padding: '0 16px 40px' }}>
          <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 20 }}>{T('privacyLastUpdated')}</div>
            <Section title={T('privacyIntroTitle')} body={T('privacyIntro')} />
            <Section title={T('privacyCollectTitle')} body={T('privacyCollect')} />
            <Section title={T('privacyStorageTitle')} body={T('privacyStorage')} />
            <Section title={T('privacyThirdPartyTitle')} body={T('privacyThirdParty')} />
            <Section title={T('privacyRightsTitle')} body={T('privacyRights')} />
            <Section title={T('privacyContactTitle')} body={T('privacyContact')} />
          </div>
        </div>
      </div>
    </div>
  );
}
