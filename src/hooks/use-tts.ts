'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDiscussionStore } from '@/stores/discussion-store';

/**
 * 浏览器原生 Web Speech API TTS hook
 * 句子级切分，逐句朗读，避免长文本一次性合成
 */
export function useTTS() {
  const { ttsEnabled, setTtsEnabled } = useDiscussionStore();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  // Load available voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      // Auto-select a good default: prefer Chinese voice, then system default
      if (!selectedVoice && available.length > 0) {
        const zhVoice = available.find(v => v.lang.startsWith('zh'));
        setSelectedVoice(zhVoice || available[0]);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice]);

  // Split text into sentences for smoother TTS
  const splitIntoSentences = useCallback((text: string): string[] => {
    // Remove markdown formatting
    const cleaned = text
      .replace(/\*\*(.*?)\*\*/g, '$1')   // bold
      .replace(/\*(.*?)\*/g, '$1')        // italic / action descriptions
      .replace(/#{1,6}\s/g, '')           // headings
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/```[\s\S]*?```/g, '')     // code blocks
      .replace(/`([^`]+)`/g, '$1')        // inline code
      .replace(/>\s*/g, '')               // blockquotes
      .replace(/[-*]\s/g, '')             // list markers
      .replace(/\|[^|]*\|/g, '')          // table cells
      .replace(/---+/g, '')              // horizontal rules
      .trim();

    if (!cleaned) return [];

    // Split by sentence-ending punctuation (Chinese and English)
    const sentences = cleaned
      .split(/(?<=[。！？.!?])\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // If no sentence breaks found, split by newlines or return as-is
    if (sentences.length <= 1 && cleaned.length > 200) {
      return cleaned
        .split(/\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    return sentences;
  }, []);

  // Speak next sentence from queue
  const speakNext = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (queueRef.current.length === 0) {
      speakingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    const sentence = queueRef.current.shift()!;
    const utterance = new SpeechSynthesisUtterance(sentence);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      speakNext();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.error('[TTS] 朗读错误:', e.error);
      }
      // Don't continue queue on cancel/interrupted — it means we're stopping
      if (e.error === 'canceled' || e.error === 'interrupted') {
        return;
      }
      speakNext();
    };

    window.speechSynthesis.speak(utterance);
  }, [selectedVoice]);

  // Main speak function
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return;

    // Stop any ongoing speech first
    window.speechSynthesis.cancel();
    queueRef.current = sentences;
    speakingRef.current = true;
    setIsSpeaking(true);
    speakNext();
  }, [splitIntoSentences, speakNext]);

  // Stop speaking
  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    queueRef.current = [];
    speakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  // Toggle TTS on/off
  const toggle = useCallback(() => {
    const newEnabled = !ttsEnabled;
    setTtsEnabled(newEnabled);
    if (!newEnabled) {
      stop();
    }
  }, [ttsEnabled, setTtsEnabled, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    enabled: ttsEnabled,
    setEnabled: setTtsEnabled,
    voices,
    selectedVoice,
    setSelectedVoice,
  };
}
