import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { THEMES, FONT_HERO, FONT_BACK, FONT_ERROR, FONT_BUTTON, createLogger } from '@egoless-do/core';
import { useT } from './UI';

const log = createLogger('App');

interface Props {
  children: ReactNode;
  theme?: 'dark' | 'light' | 'ocean' | 'rose' | 'cosmos';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Inner class component that catches render errors (class required for getDerivedStateFromError). */
class _ErrorBoundary extends Component<Props & { t: (key: string) => string }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    log.error(error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const TH = THEMES[this.props.theme ?? 'dark'];
      const T = this.props.t;
      return (
        <View style={[styles.container, { backgroundColor: TH.bg }]}>
          <Text style={styles.emoji}> :( </Text>
          <Text style={[styles.title, { color: TH.text }]}>{T('errorTitle')}</Text>
          <Text style={[styles.message, { color: TH.sub }]}>
            {this.state.error?.message ?? T('errorUnknown')}
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: TH.primary }]} onPress={this.handleReset}>
            <Text style={styles.buttonText}>{T('errorRetry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

/** Public ErrorBoundary wrapper that provides translation context. */
export function ErrorBoundary(props: Props) {
  const T = useT();
  return <_ErrorBoundary {...props} t={T} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emoji: { fontSize: FONT_HERO, marginBottom: 16 },
  title: { fontSize: FONT_BACK, fontWeight: '700', marginBottom: 8 },
  message: { fontSize: FONT_ERROR, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  button: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: FONT_BUTTON },
});
