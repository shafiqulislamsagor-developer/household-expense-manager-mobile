/**
 * React Native / Expo Crypto Polyfill
 * Fixes "crypto.getRandomValues() not supported" error in Hermes and React Native runtime
 */
const g = globalThis as any;

if (typeof g.crypto !== 'object') {
  g.crypto = {};
}

if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
    if (!array) return array;
    const uint8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < uint8.length; i++) {
      uint8[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

export {};
