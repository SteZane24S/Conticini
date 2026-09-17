import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { avviaHeartbeat } from './heartbeat.js';

describe('avviaHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('invia subito e poi a ogni intervallo, e si ferma quando richiesto', () => {
    const invia = vi.fn();
    const ferma = avviaHeartbeat(1000, invia);

    expect(invia).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(invia).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(2000);
    expect(invia).toHaveBeenCalledTimes(4);

    ferma();
    vi.advanceTimersByTime(5000);
    expect(invia).toHaveBeenCalledTimes(4);
  });
});
