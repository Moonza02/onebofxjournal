import { describe, expect, it } from 'vitest';
import { aiEnabled, aiModel, DEFAULT_MODEL, looksLikeSecret, validModelName } from '../src/lib/ai';

const KEY = 'sk-ant-api03-' + 'x'.repeat(80);

describe('looksLikeSecret', () => {
  it('Anthropic kaliti — ha', () => {
    expect(looksLikeSecret(KEY)).toBe(true);
    expect(looksLikeSecret('SK-ant-123')).toBe(true);
  });

  it('juda uzun satr — ha', () => {
    expect(looksLikeSecret('a'.repeat(61))).toBe(true);
  });

  it('model nomi — yo‘q', () => {
    expect(looksLikeSecret('claude-sonnet-5')).toBe(false);
    expect(looksLikeSecret('')).toBe(false);
  });
});

describe('aiModel', () => {
  // Aynan shu xato bo'lgan: kalit model o'zgaruvchisiga tushgan va
  // provayder javobida qaytib, ekranga chiqqan.
  it('kalit model sifatida ishlatilmaydi', () => {
    expect(aiModel({ ANTHROPIC_MODEL: KEY })).toBe(DEFAULT_MODEL);
  });

  it('yaroqsiz nom — standart model', () => {
    expect(aiModel({ ANTHROPIC_MODEL: 'model nomi emas!' })).toBe(DEFAULT_MODEL);
    expect(aiModel({ ANTHROPIC_MODEL: '   ' })).toBe(DEFAULT_MODEL);
    expect(aiModel({})).toBe(DEFAULT_MODEL);
  });

  it('to‘g‘ri nom o‘tadi', () => {
    expect(aiModel({ ANTHROPIC_MODEL: 'claude-opus-4-1' })).toBe('claude-opus-4-1');
  });
});

describe('validModelName', () => {
  it('bo‘shliqli yoki bo‘sh — yaroqsiz', () => {
    expect(validModelName('a b')).toBe(false);
    expect(validModelName('')).toBe(false);
  });
});

describe('aiEnabled', () => {
  it('kalit bor-yo‘qligiga qarab', () => {
    expect(aiEnabled({})).toBe(false);
    expect(aiEnabled({ ANTHROPIC_API_KEY: '  ' })).toBe(false);
    expect(aiEnabled({ ANTHROPIC_API_KEY: KEY })).toBe(true);
  });
});
