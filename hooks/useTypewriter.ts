"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTypewriterOptions {
  phrases: string[];
  typeSpeedMs?: number;
  backspaceSpeedMs?: number;
  pauseAfterTypeMs?: number;
  pauseBeforeBackspaceMs?: number;
  onComplete?: () => void;
}

export function useTypewriter({
  phrases,
  typeSpeedMs = 72,
  backspaceSpeedMs = 48,
  pauseAfterTypeMs = 1400,
  pauseBeforeBackspaceMs = 600,
  onComplete,
}: UseTypewriterOptions) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isBackspacing, setIsBackspacing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isComplete) return;
    clearTimer();

    const phrase = phrases[phraseIndex];
    if (!phrase) {
      setIsComplete(true);
      onCompleteRef.current?.();
      return;
    }

    const isLast = phraseIndex === phrases.length - 1;
    let charIndex = 0;
    setDisplayText("");
    setIsBackspacing(false);

    const typeNext = () => {
      if (charIndex <= phrase.length) {
        setDisplayText(phrase.slice(0, charIndex));
        charIndex += 1;
        timeoutRef.current = setTimeout(typeNext, typeSpeedMs);
        return;
      }

      timeoutRef.current = setTimeout(() => {
        if (isLast) {
          timeoutRef.current = setTimeout(() => {
            setIsComplete(true);
            onCompleteRef.current?.();
          }, pauseAfterTypeMs);
          return;
        }

        timeoutRef.current = setTimeout(() => {
          setIsBackspacing(true);
          let backIndex = phrase.length;

          const backspaceNext = () => {
            if (backIndex >= 0) {
              setDisplayText(phrase.slice(0, backIndex));
              backIndex -= 1;
              timeoutRef.current = setTimeout(backspaceNext, backspaceSpeedMs);
              return;
            }

            setIsBackspacing(false);
            setPhraseIndex((i) => i + 1);
          };

          backspaceNext();
        }, pauseBeforeBackspaceMs);
      }, pauseAfterTypeMs);
    };

    typeNext();

    return clearTimer;
  }, [
    phraseIndex,
    phrases,
    typeSpeedMs,
    backspaceSpeedMs,
    pauseAfterTypeMs,
    pauseBeforeBackspaceMs,
    isComplete,
    clearTimer,
  ]);

  return { displayText, isBackspacing, isComplete, phraseIndex };
}
