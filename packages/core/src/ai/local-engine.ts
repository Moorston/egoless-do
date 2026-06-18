// ─── Local AI Engine (Rule-based) ──────────────────────────────
import type { TagSuggestion, MoodDetection, TrailInsight } from './types';

const MOOD_DICT: Record<string, { mood: string; weight: number }> = {
  '开心': { mood: '开心', weight: 1 },
  '快乐': { mood: '开心', weight: 0.9 },
  '高兴': { mood: '开心', weight: 0.9 },
  '满足': { mood: '开心', weight: 0.8 },
  '兴奋': { mood: '兴奋', weight: 1 },
  '期待': { mood: '兴奋', weight: 0.7 },
  '感恩': { mood: '感恩', weight: 1 },
  '感谢': { mood: '感恩', weight: 0.8 },
  '平静': { mood: '平静', weight: 1 },
  '放松': { mood: '平静', weight: 0.9 },
  '安宁': { mood: '平静', weight: 0.8 },
  '焦虑': { mood: '焦虑', weight: 1 },
  '担心': { mood: '焦虑', weight: 0.8 },
  '紧张': { mood: '焦虑', weight: 0.8 },
  '不安': { mood: '焦虑', weight: 0.7 },
  '难过': { mood: '难过', weight: 1 },
  '伤心': { mood: '难过', weight: 0.9 },
  '失望': { mood: '难过', weight: 0.8 },
  '沮丧': { mood: '难过', weight: 0.7 },
  '生气': { mood: '生气', weight: 1 },
  '愤怒': { mood: '生气', weight: 1 },
  '烦躁': { mood: '生气', weight: 0.8 },
  '疲惫': { mood: '疲惫', weight: 1 },
  '累': { mood: '疲惫', weight: 0.9 },
  '困': { mood: '疲惫', weight: 0.8 },
};

const KEYWORD_PATTERNS: Record<string, string[]> = {
  insight: ['领悟', '明白', '意识到', '发现', '原来', '终于'],
  question: ['为什么', '怎么', '如何', '什么', '是否'],
  decision: ['决定', '准备', '打算', '计划', '要'],
  reflection: ['反思', '回顾', '思考', '琢磨', '想'],
  action: ['做', '执行', '实施', '行动', '开始'],
};

const KEYWORD_TAG_MAP: Record<string, string[]> = {
  '工作': ['#工作', '#职场'],
  '学习': ['#学习', '#成长'],
  '运动': ['#运动', '#健身'],
  '冥想': ['#冥想', '#修行'],
  '读书': ['#阅读', '#学习'],
  '焦虑': ['#焦虑', '#情绪'],
  '开心': ['#开心', '#情绪'],
  '朋友': ['#社交', '#朋友'],
  '家人': ['#家庭', '#亲情'],
};

export class LocalAIEngine {
  detectMood(content: string): MoodDetection {
    const results: Array<{ mood: string; weight: number }> = [];
    
    for (const [keyword, { mood, weight }] of Object.entries(MOOD_DICT)) {
      if (content.includes(keyword)) {
        results.push({ mood, weight });
      }
    }
    
    if (results.length === 0) {
      return { mood: '平静', confidence: 0.5, alternatives: [] };
    }
    
    results.sort((a, b) => b.weight - a.weight);
    
    return {
      mood: results[0].mood,
      confidence: results[0].weight,
      alternatives: [...new Set(results.map(r => r.mood))].slice(1, 4),
    };
  }
  
  suggestTags(content: string, history: string[]): TagSuggestion[] {
    const suggestions: TagSuggestion[] = [];
    const contentLower = content.toLowerCase();
    
    for (const tag of history) {
      const tagClean = tag.replace('#', '').toLowerCase();
      if (tagClean && contentLower.includes(tagClean)) {
        suggestions.push({ tag, confidence: 0.9, reason: '内容包含此标签' });
      }
    }
    
    for (const [keyword, tags] of Object.entries(KEYWORD_TAG_MAP)) {
      if (contentLower.includes(keyword)) {
        for (const tag of tags) {
          if (!suggestions.find(s => s.tag === tag)) {
            suggestions.push({ tag, confidence: 0.7, reason: `包含关键词"${keyword}"` });
          }
        }
      }
    }
    
    return suggestions.slice(0, 5);
  }
  
  suggestContentExpansion(content: string): string[] {
    const suggestions: string[] = [];
    
    if (content.length < 20) {
      suggestions.push('可以描述一下具体的情况吗？');
      suggestions.push('当时你的感受是什么？');
    }
    
    for (const [category, keywords] of Object.entries(KEYWORD_PATTERNS)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          switch (category) {
            case 'insight': suggestions.push('这个领悟是怎么来的？'); break;
            case 'question': suggestions.push('你找到答案了吗？'); break;
            case 'decision': suggestions.push('是什么促使你做这个决定？'); break;
            case 'reflection': suggestions.push('反思后你有什么新的发现？'); break;
            case 'action': suggestions.push('执行后效果如何？'); break;
          }
          break;
        }
      }
    }
    
    return [...new Set(suggestions)].slice(0, 3);
  }
  
  generateTrailInsight(reflections: Array<{ content: string; mood: string }>): TrailInsight {
    const moods = reflections.map(r => r.mood);
    const transitionCount = moods.filter((m, i) => i > 0 && m !== moods[i - 1]).length;

    return {
      summary: `这条脉络包含 ${reflections.length} 条感念，心情经历了 ${transitionCount} 次变化`,
      keyPoints: this.extractKeyPoints(reflections.map(r => r.content)),
      turningPoints: this.findTurningPoints(reflections),
      suggestions: this.generateSuggestions(reflections),
    };
  }
  
  private extractKeyPoints(contents: string[]): string[] {
    const keyPoints: string[] = [];
    
    for (const content of contents) {
      for (const keywords of Object.values(KEYWORD_PATTERNS)) {
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            const sentences = content.split(/[。！？.!?]/);
            for (const sentence of sentences) {
              if (sentence.includes(keyword) && sentence.length > 5) {
                keyPoints.push(sentence.trim());
                break;
              }
            }
          }
        }
      }
    }
    
    return [...new Set(keyPoints)].slice(0, 3);
  }
  
  private findTurningPoints(reflections: Array<{ content: string; mood: string }>): string[] {
    const turningPoints: string[] = [];
    
    for (let i = 1; i < reflections.length; i++) {
      if (reflections[i].mood !== reflections[i - 1].mood) {
        turningPoints.push(`从"${reflections[i - 1].mood}"转变为"${reflections[i].mood}"`);
      }
    }
    
    return turningPoints.slice(0, 3);
  }
  
  private generateSuggestions(reflections: Array<{ content: string; mood: string }>): string[] {
    const suggestions: string[] = [];
    const lastMood = reflections[reflections.length - 1]?.mood;
    
    if (lastMood === '焦虑' || lastMood === '难过') {
      suggestions.push('可以尝试与朋友聊聊，或者做一些放松的活动');
    }
    
    if (lastMood === '开心' || lastMood === '兴奋') {
      suggestions.push('记录下是什么让你开心，以后可以回顾');
    }
    
    return suggestions;
  }
}
