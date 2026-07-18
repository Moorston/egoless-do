/**
 * DbgView — development-only View wrapper that detects raw string/number children.
 * Replace <View> with <DbgView> to find "Text strings must be rendered" root cause.
 */
import React from 'react';
import { View, type ViewProps } from 'react-native';

export function DbgView(props: ViewProps & { label?: string }) {
  const { children, label, ...rest } = props;
  // Check for raw string/number children
  React.Children.forEach(children, (child, idx) => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (typeof child === 'string') {
      console.error(`DbgView["${label ?? '?'}"]#${idx}: RAW STRING = "${child.slice(0, 50)}"`);
    }
    if (typeof child === 'number') {
      console.error(`DbgView["${label ?? '?'}"]#${idx}: RAW NUMBER = ${child}`);
    }
  });
  return <View {...rest}>{children}</View>;
}