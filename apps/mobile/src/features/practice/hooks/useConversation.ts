import { useState, useCallback } from 'react';

// Local types (not yet in @egoless-do/core)
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  lastUpdated: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

interface UseConversationOptions {
  initialConversations?: Conversation[];
  onMessageAdded?: (message: Message) => void;
}

export function useConversation(options: UseConversationOptions = {}) {
  const { initialConversations = [], onMessageAdded } = options;

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);

  const addMessage = useCallback((conversationId: string, message: Message) => {
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          messages: [...conv.messages, message],
          lastUpdated: Date.now(),
        };
      })
    );
    onMessageAdded?.(message);
  }, [onMessageAdded]);

  const getConversation = useCallback((id: string) => {
    return conversations.find(conv => conv.id === id);
  }, [conversations]);

  const createConversation = useCallback((title?: string) => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: title || `对话 ${conversations.length + 1}`,
      messages: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };
    setConversations(prev => [...prev, newConv]);
    return newConv;
  }, [conversations.length]);

  return {
    conversations,
    addMessage,
    getConversation,
    createConversation,
  };
}
