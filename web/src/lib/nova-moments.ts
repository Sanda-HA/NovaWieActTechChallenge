import {useEffect, useRef, useState} from 'react';
import type {MascotMood} from '../ui/Mascot';

const MILESTONES = new Set([3, 7, 14, 30]);

function claim(key: string): boolean {
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Nova's welcome on home: a wave the first time on this device, and a cheer at the moment the streak rises to a
 * new stage (a finished session raising it while home is open). The first value seen is only a baseline.
 */
export function useGreetingMood(streakDays: number | undefined): MascotMood {
  const [mood, setMood] = useState<MascotMood>('idle');
  const seen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (streakDays === undefined) return;
    const before = seen.current;
    seen.current = streakDays;
    if (before === undefined) {
      if (claim('ednova.nova-hello')) setMood('wave');
    } else if (streakDays > before && MILESTONES.has(streakDays) && claim(`ednova.nova-streak-${streakDays}`)) {
      setMood('cheer');
    }
  }, [streakDays]);
  return mood;
}
