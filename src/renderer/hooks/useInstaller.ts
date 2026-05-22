import { useEffect, useRef, useState } from 'react';
import type { InstallerEvent, InstallerState } from '@shared/ipc/contract.js';
import type { StepName } from '@shared/constants.js';

export interface StepStream {
  step: StepName;
  percent: number | null;
  message: string;
  lines: string[];
  error: string | null;
  complete: boolean;
}

export interface InstallerView {
  state: InstallerState | null;
  events: InstallerEvent[];
  streams: Partial<Record<StepName, StepStream>>;
  current: StepName | null;
  done: boolean;
  cancelled: boolean;
  start: (from?: StepName) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => Promise<void>;
  setByoPython: (path: string | null) => Promise<void>;
  refreshState: () => Promise<void>;
}

const MAX_LOG_LINES = 400;

export function useInstaller(): InstallerView {
  const [state, setState] = useState<InstallerState | null>(null);
  const [streams, setStreams] = useState<Partial<Record<StepName, StepStream>>>({});
  const [current, setCurrent] = useState<StepName | null>(null);
  const [done, setDone] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const eventsRef = useRef<InstallerEvent[]>([]);

  useEffect(() => {
    void window.forge.installer.state().then(setState);
    const off = window.forge.installer.onEvent((event) => {
      eventsRef.current = [...eventsRef.current.slice(-200), event];
      setStreams((prev) => reduce(prev, event));
      if (event.kind === 'step-start') {
        setCurrent(event.step);
        setDone(false);
        setCancelled(false);
      } else if (event.kind === 'done') {
        setCurrent(null);
        setDone(true);
        void window.forge.installer.state().then(setState);
      } else if (event.kind === 'cancelled') {
        setCurrent(null);
        setCancelled(true);
      } else if (event.kind === 'step-complete') {
        void window.forge.installer.state().then(setState);
      }
    });
    return off;
  }, []);

  return {
    state,
    events: eventsRef.current,
    streams,
    current,
    done,
    cancelled,
    start: async (from) => {
      eventsRef.current = [];
      setStreams({});
      setDone(false);
      setCancelled(false);
      await window.forge.installer.runFrom(from);
    },
    cancel: () => window.forge.installer.cancel(),
    reset: async () => {
      await window.forge.installer.reset();
      eventsRef.current = [];
      setStreams({});
      setDone(false);
      setCancelled(false);
      const next = await window.forge.installer.state();
      setState(next);
    },
    setByoPython: async (path) => {
      await window.forge.installer.setByoPython(path);
      const next = await window.forge.installer.state();
      setState(next);
    },
    refreshState: async () => {
      const next = await window.forge.installer.state();
      setState(next);
    },
  };
}

function reduce(
  prev: Partial<Record<StepName, StepStream>>,
  event: InstallerEvent,
): Partial<Record<StepName, StepStream>> {
  if (event.kind === 'done' || event.kind === 'cancelled') return prev;
  const step = event.step;
  const cur = prev[step] ?? {
    step,
    percent: null,
    message: '',
    lines: [],
    error: null,
    complete: false,
  };
  switch (event.kind) {
    case 'step-start':
      return { ...prev, [step]: { ...cur, message: 'starting', error: null, complete: false } };
    case 'progress':
      return { ...prev, [step]: { ...cur, percent: event.percent, message: event.message } };
    case 'log':
      return {
        ...prev,
        [step]: {
          ...cur,
          lines: [...cur.lines, event.line].slice(-MAX_LOG_LINES),
        },
      };
    case 'step-failed':
      return { ...prev, [step]: { ...cur, error: event.error, complete: false } };
    case 'step-complete':
      return { ...prev, [step]: { ...cur, percent: 100, complete: true } };
  }
}
