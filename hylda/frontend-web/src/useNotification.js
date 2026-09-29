import { useState, useEffect, useRef, useCallback } from 'react';

// Beep curto via Web Audio API
function playBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

export function useNotification() {
  const [toasts, setToasts] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const originalTitle = useRef(document.title);

  // Badge no título
  useEffect(() => {
    if (naoLidas > 0) {
      document.title = `(${naoLidas}) ${originalTitle.current}`;
    } else {
      document.title = originalTitle.current;
    }
  }, [naoLidas]);

  // Limpa não-lidas ao voltar para a aba
  useEffect(() => {
    const handleVis = () => {
      if (!document.hidden) {
        setNaoLidas(0);
        document.title = originalTitle.current;
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  const notificar = useCallback(() => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);

    if (document.hidden) {
      playBeep();
      setNaoLidas(prev => prev + 1);
    }
  }, []);

  return { toasts, notificar };
}
