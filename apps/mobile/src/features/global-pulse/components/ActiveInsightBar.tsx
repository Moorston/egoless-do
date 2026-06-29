/**
 * 活跃状态感悟输入栏
 * 功能已禁用，保留接口兼容性
 */

import React from 'react';

interface ActiveInsightBarProps {
  type: string;
  insight: string;
  onInsightChange: (text: string) => void;
  goal?: string | null;
}

// Always hidden — feature disabled on activity pages
export const ActiveInsightBar: React.FC<ActiveInsightBarProps> = () => null;

export default ActiveInsightBar;
