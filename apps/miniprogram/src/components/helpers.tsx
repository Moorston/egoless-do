import { View, Text } from '@tarojs/components';
import { useAppStore, THEMES, t } from '@egoless/core';
import type { CSSProperties, ReactNode } from 'react';

export function useTheme() {
  const themeName = useAppStore((s) => s.themeName);
  return { TH: THEMES[themeName] || THEMES.dark, themeName };
}

export function useT() {
  const lang = useAppStore((s) => s.lang);
  return (key: string) => t(key, lang);
}

const colors = ['#E0E0E0', 'rgba(255,255,255,.45)', 'rgba(255,255,255,.2)'];

export function RowItem({ label, value, onClick, bold }: { label: string; value?: string; onClick?: () => void; bold?: boolean }) {
  return (
    <View style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,.06)',
    }} onClick={onClick}>
      <Text style={{ fontSize: 14, color: colors[0], fontWeight: bold ? '600' : '400' }}>{label}</Text>
      <View style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {value !== undefined && <Text style={{ fontSize: 13, color: colors[1] }}>{value}</Text>}
        {onClick && <Text style={{ fontSize: 12, color: colors[2] }}>{'>'}</Text>}
      </View>
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, padding: 2,
        background: value ? '#7C3AED' : 'rgba(255,255,255,.15)',
      }}
    >
      <View style={{
        width: 20, height: 20, borderRadius: 10, background: '#fff',
        marginLeft: value ? 20 : 0,
      }} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <View style={{
      background: 'rgba(255,255,255,.05)',
      borderRadius: 12, padding: 14, marginBottom: 12,
      ...style,
    }}>
      {children}
    </View>
  );
}

export function Btn({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  return (
    <View
      onClick={onClick}
      style={{
        width: '100%', height: 48, borderRadius: 24,
        background: '#7C3AED', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: '600', marginBottom: 10,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

export function Modal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!show) return null;
  return (
    <View style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 1000, background: 'rgba(0,0,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <View
        style={{
          width: '85%', maxWidth: 340,
          background: '#1a1a2e', borderRadius: 16, padding: 20,
          maxHeight: '80vh', overflowY: 'auto',
        }}
        onClick={(e: any) => e.stopPropagation()}
      >
        {title && (
          <Text style={{
            display: 'block', textAlign: 'center', fontSize: 17,
            fontWeight: '600', color: '#E0E0E0', marginBottom: 16,
          }}>{title}</Text>
        )}
        {children}
      </View>
    </View>
  );
}
