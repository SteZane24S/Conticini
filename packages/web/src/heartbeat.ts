const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

export function inviaHeartbeat(): void {
  void fetch('/api/heartbeat', { method: 'POST' }).catch(() => {
    // Il prossimo heartbeat pianificato riprova.
  });
}

export function avviaHeartbeat(
  intervalMs: number = HEARTBEAT_INTERVAL_MS,
  invia: () => void = inviaHeartbeat,
): () => void {
  invia();
  const id = setInterval(invia, intervalMs);
  return () => clearInterval(id);
}
