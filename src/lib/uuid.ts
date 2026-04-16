/** UUID v4 sem depender de libs. Usa crypto quando disponível. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback manual baseado em Math.random (apenas para ambientes muito antigos).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEVICE_KEY = 'cbsi.deviceId';
export function getDeviceId(): string {
  try {
    const cached = localStorage.getItem(DEVICE_KEY);
    if (cached) return cached;
    const id = uuid();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return 'unknown-device';
  }
}
