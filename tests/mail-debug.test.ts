import { afterEach, describe, expect, it, vi } from 'vitest';
import { logSecret, secretsToLog } from '../src/lib/mail-debug';

describe('secretsToLog', () => {
  it("qo'yilmagan — o'chiq", () => {
    expect(secretsToLog({})).toBe(false);
  });

  // Railway'da o'zgaruvchi ro'yxatda turib, ichi bo'sh bo'lishi mumkin.
  it("bo'sh qiymat — o'chiq", () => {
    expect(secretsToLog({ SECRETS_TO_LOG: '   ' })).toBe(false);
  });

  it("noto'g'ri qiymat — o'chiq", () => {
    expect(secretsToLog({ SECRETS_TO_LOG: '0' })).toBe(false);
    expect(secretsToLog({ SECRETS_TO_LOG: 'false' })).toBe(false);
    expect(secretsToLog({ SECRETS_TO_LOG: 'yoq' })).toBe(false);
  });

  it('tan olinadigan qiymatlar — yoniq', () => {
    for (const value of ['1', 'true', 'TRUE', 'ha', 'Yes', ' on ']) {
      expect(secretsToLog({ SECRETS_TO_LOG: value })).toBe(true);
    }
  });
});

describe('logSecret', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("kalit o'chiq — hech narsa yozilmaydi", () => {
    vi.stubEnv('SECRETS_TO_LOG', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logSecret('tasdiqlash kodi', 'ibrohim@example.com', '931204');

    expect(warn).not.toHaveBeenCalled();
  });

  it('kalit yoniq — sir log‘ga chiqadi', () => {
    vi.stubEnv('SECRETS_TO_LOG', '1');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logSecret('tasdiqlash kodi', 'ibrohim@example.com', '931204');

    expect(warn).toHaveBeenCalledOnce();
    const line = String(warn.mock.calls[0]?.[0] ?? '');
    expect(line).toContain('[SINOV-KOD]');
    expect(line).toContain('ibrohim@example.com');
    expect(line).toContain('931204');
  });
});
