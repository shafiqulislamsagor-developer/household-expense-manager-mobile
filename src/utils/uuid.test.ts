import './cryptoPolyfill';
import { generateUuid } from './uuid';

describe('UUID & Crypto Polyfill', () => {
  test('crypto.getRandomValues polyfill fills ArrayBufferView with non-zero bytes', () => {
    const g = globalThis as any;
    expect(typeof g.crypto).toBe('object');
    expect(typeof g.crypto.getRandomValues).toBe('function');

    const buffer = new Uint8Array(16);
    g.crypto.getRandomValues(buffer);
    const sum = buffer.reduce((acc: number, val: number) => acc + val, 0);
    expect(sum).toBeGreaterThan(0);
  });

  test('generateUuid returns valid RFC4122 v4 formatted string', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const id1 = generateUuid();
    const id2 = generateUuid();

    expect(id1).toMatch(uuidRegex);
    expect(id2).toMatch(uuidRegex);
    expect(id1).not.toBe(id2);
  });
});
