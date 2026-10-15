import { describe, expect, it } from 'vitest';
import { installMode, isIos } from './platform';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126.0 Mobile Safari/537.36';

describe('plataforma', () => {
  it('reconoce iPhone y iPadOS', () => {
    expect(isIos({ userAgent: IPHONE })).toBe(true);
    expect(isIos({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
    expect(isIos({ userAgent: ANDROID })).toBe(false);
  });
  it('elige el modo de instalación', () => {
    const base = { displayModeStandalone: false, hasPrompt: false };
    expect(installMode({ ...base, nav: { userAgent: IPHONE } })).toBe('ios');
    expect(installMode({ ...base, nav: { userAgent: IPHONE, standalone: true } })).toBe(
      'installed',
    );
    expect(installMode({ ...base, displayModeStandalone: true, nav: { userAgent: ANDROID } })).toBe(
      'installed',
    );
    expect(installMode({ ...base, hasPrompt: true, nav: { userAgent: ANDROID } })).toBe('prompt');
    expect(installMode({ ...base, nav: { userAgent: ANDROID } })).toBe('manual');
  });
});
