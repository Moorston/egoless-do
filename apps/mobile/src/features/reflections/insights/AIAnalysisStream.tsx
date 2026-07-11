import { FONT_SMALL, FONT_TINY, FONT_BODY , FONT_SUB } from '@egoless-do/core';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';

import { useTheme } from '../../../components/UI';

// ─── Types ───────────────────────────────────────────────────────────

interface ThinkingMessage {
  id: string;
  text: string;
  type: 'thinking' | 'result' | 'error';
  detail?: string;
}

interface Props {
  messages: ThinkingMessage[];
  isAnalyzing: boolean;
  onComplete?: () => void;
}

// ─── Main Component ──────────────────────────────────────────────────

export function AIAnalysisStream({ messages, isAnalyzing, onComplete }: Props) {
  const TH = useTheme();
  const containerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnalyzing || messages.length > 0) {
      Animated.timing(containerFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isAnalyzing, messages.length]);

  useEffect(() => {
    if (!isAnalyzing && messages.length > 0 && messages.every(m => m.type !== 'thinking')) {
      const timer = setTimeout(() => {
        Animated.timing(containerFade, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => onComplete?.());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing, messages]);

  if (messages.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: containerFade }]}>
      {/* AI Avatar + Messages */}
      <View style={styles.chatContainer}>
        {/* AI Avatar */}
        <View style={[styles.avatar, { backgroundColor: `${TH.primary}20` }]}>
          <Text style={styles.avatarText}>AI</Text>
        </View>

        {/* Messages */}
        <View style={[styles.messagesWrapper, { backgroundColor: TH.card, borderColor: TH.border }]}>
          {messages.map((msg, index) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isLast={index === messages.length - 1}
              isAnalyzing={isAnalyzing}
            />
          ))}

          {/* Typing indicator */}
          {isAnalyzing && messages.length > 0 && messages[messages.length - 1].type !== 'thinking' && (
            <TypingIndicator color={TH.primary} />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Chat Message ────────────────────────────────────────────────────

function ChatMessage({
  message,
  isLast,
  isAnalyzing,
}: {
  message: ThinkingMessage;
  isLast: boolean;
  isAnalyzing: boolean;
}) {
  const TH = useTheme();
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(message.type === 'thinking');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  // Animate in
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Typewriter effect for thinking messages
  useEffect(() => {
    if (message.type === 'thinking' && message.text) {
      let currentIndex = 0;
      const text = message.text;
      setDisplayText('');
      setIsTyping(true);

      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          // Show 2-3 characters at a time for faster effect
          const charsToShow = Math.min(3, text.length - currentIndex);
          currentIndex += charsToShow;
          setDisplayText(text.slice(0, currentIndex));
        } else {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 30);

      return () => clearInterval(interval);
    } else {
      setDisplayText(message.text);
      setIsTyping(false);
    }
  }, [message.text, message.type]);

  const icon = {
    thinking: '💭',
    result: '✨',
    error: '⚠️',
  }[message.type];

  const textColor = {
    thinking: TH.text,
    result: '#10B981',
    error: '#EF4444',
  }[message.type];

  return (
    <Animated.View
      style={[
        styles.messageRow,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.messageIcon}>{icon}</Text>
      <View style={styles.messageContent}>
        <Text style={[styles.messageText, { color: textColor }]}>
          {displayText}
          {isTyping && <BlinkingCursor color={TH.primary} />}
        </Text>
        {message.detail && !isTyping && (
          <Animated.Text style={[styles.messageDetail, { color: TH.sub }]}>
            {message.detail}
          </Animated.Text>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Blinking Cursor ─────────────────────────────────────────────────

function BlinkingCursor({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.Text style={[styles.cursor, { color, opacity }]}>|</Animated.Text>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────

function TypingIndicator({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 150),
      animateDot(dot3, 300),
    ]);

    animations.start();
    return () => animations.stop();
  }, []);

  return (
    <View style={styles.typingRow}>
      <Animated.View style={[styles.typingDot, { backgroundColor: color, opacity: dot1 }]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: color, opacity: dot2 }]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: color, opacity: dot3 }]} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  chatContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FONT_TINY(),
    fontWeight: '700',
    color: '#8B5CF6',
  },
  messagesWrapper: {
    flex: 1,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    padding: 12,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  messageIcon: {
    fontSize: FONT_SUB(),
    marginTop: 2,
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    fontSize: FONT_SMALL(),
    lineHeight: 20,
  },
  messageDetail: {
    fontSize: FONT_TINY(),
    marginTop: 4,
    lineHeight: 16,
  },
  cursor: {
    fontSize: FONT_SMALL(),
    fontWeight: '700',
  },
  typingRow: {
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 22,
    marginTop: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

// ─── Helper: Create streaming messages from analysis ─────────────────

export function createAnalysisMessages(
  steps: Array<{
    id: string;
    text: string;
    status: 'pending' | 'loading' | 'done' | 'error';
    detail?: string;
  }>
): ThinkingMessage[] {
  const messages: ThinkingMessage[] = [];

  for (const step of steps) {
    if (step.status === 'loading') {
      messages.push({
        id: step.id,
        text: step.text,
        type: 'thinking',
      });
    } else if (step.status === 'done') {
      messages.push({
        id: step.id,
        text: step.text,
        type: 'result',
        detail: step.detail,
      });
    } else if (step.status === 'error') {
      messages.push({
        id: step.id,
        text: step.text,
        type: 'error',
        detail: step.detail,
      });
    }
  }

  return messages;
}
