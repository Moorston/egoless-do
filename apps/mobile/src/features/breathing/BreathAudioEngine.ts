// ─── Breathing Audio Engine ──────────────────────────────────
// Manages phase sounds, count speech, and background audio ducking.
// Uses a single clock source for audio-visual sync.
// iOS: AudioContext-equivalent must be initialized in user gesture.

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { createLogger } from '@egoless-do/core';

const log = createLogger('BreathAudio');

// Pre-load phase sound (reuse temple bell at low volume)
const BELL_FILE = require('../../../assets/sounds/temple_bell.mp3');

export interface BreathAudioOptions {
  voiceEnabled: boolean;    // 语音计数
  cueEnabled: boolean;      // 阶段提示音
  bgTrackUri?: string;      // 背景音乐 URI
}

export class BreathAudioEngine {
  private phaseSound: Audio.Sound | null = null;
  private bgSound: Audio.Sound | null = null;
  private _voiceEnabled = true;
  private _cueEnabled = true;
  private _initialized = false;
  private _lastCountNum = -1;

  /** Must be called from a synchronous user gesture handler (iOS requirement) */
  async init(opts: BreathAudioOptions): Promise<void> {
    if (this._initialized) return;

    try {
      // Set audio mode for mixing with other audio
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Pre-load phase cue sound
      if (opts.cueEnabled) {
        const { sound } = await Audio.Sound.createAsync(BELL_FILE, { volume: 0.3 });
        this.phaseSound = sound;
      }

      // Pre-load background track
      if (opts.bgTrackUri) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: opts.bgTrackUri },
          { isLooping: true, volume: 0.4 }
        );
        this.bgSound = sound;
        await this.bgSound.playAsync();
      }

      this._voiceEnabled = opts.voiceEnabled;
      this._cueEnabled = opts.cueEnabled;
      this._initialized = true;
    } catch (e) {
      log.error(e, { message: 'BreathAudio init failed' });
    }
  }

  setVoiceEnabled(v: boolean) { this._voiceEnabled = v; }
  setCueEnabled(v: boolean) { this._cueEnabled = v; }

  /** Play phase transition sound (inhale/hold/exhale start) */
  async playPhaseSound(): Promise<void> {
    if (!this._cueEnabled || !this.phaseSound) return;
    try {
      await this.phaseSound.setPositionAsync(0);
      await this.phaseSound.playAsync();
    } catch (e) {
      log.warn('Phase sound failed', e);
    }
  }

  /** Speak count number. Debounced to avoid duplicate calls. */
  speakCount(num: number): void {
    if (!this._voiceEnabled) return;
    if (num === this._lastCountNum) return;
    this._lastCountNum = num;

    const text = String(num);
    Speech.speak(text, {
      language: 'zh-CN',
      rate: 0.9,
      pitch: 1.0,
    });
  }

  /** Speak phase name (inhale/hold/exhale) */
  speakPhase(phaseType: string): void {
    if (!this._voiceEnabled) return;
    const labels: Record<string, string> = {
      inhale: '吸气',
      hold: '闭气',
      exhale: '呼气',
    };
    const label = labels[phaseType];
    if (label) {
      Speech.speak(label, { language: 'zh-CN', rate: 0.7 });
    }
  }

  /** Duck background audio (lower volume during phase transition) */
  async duckBackground(): Promise<void> {
    if (!this.bgSound) return;
    try {
      await this.bgSound.setVolumeAsync(0.15);
    } catch {}
  }

  /** Restore background audio volume */
  async unduckBackground(): Promise<void> {
    if (!this.bgSound) return;
    try {
      await this.bgSound.setVolumeAsync(0.4);
    } catch {}
  }

  /** Reset count tracking for new phase */
  resetCount(): void {
    this._lastCountNum = -1;
  }

  /** Cleanup all audio resources */
  async destroy(): Promise<void> {
    try {
      Speech.stop();
      if (this.phaseSound) {
        await this.phaseSound.unloadAsync();
        this.phaseSound = null;
      }
      if (this.bgSound) {
        await this.bgSound.stopAsync();
        await this.bgSound.unloadAsync();
        this.bgSound = null;
      }
      this._initialized = false;
    } catch (e) {
      log.warn('BreathAudio destroy error', e);
    }
  }
}
