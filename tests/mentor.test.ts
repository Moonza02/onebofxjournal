import { describe, expect, it } from 'vitest';
import {
  counterpart,
  makeInviteCode,
  normalizeCode,
  roleIn,
  type MentorshipRow,
} from '@/lib/mentor';

function link(patch: Partial<MentorshipRow> = {}): MentorshipRow {
  return {
    id: 'm1',
    inviteCode: 'ABCD-2345',
    inviterRole: 'MENTOR',
    createdById: 'u-mentor',
    mentorId: 'u-mentor',
    studentId: 'u-student',
    status: 'ACTIVE',
    shareTrades: true,
    shareAlerts: true,
    shareJournal: false,
    createdAt: new Date('2026-09-01'),
    acceptedAt: new Date('2026-09-02'),
    endedAt: null,
    mentor: { id: 'u-mentor', name: 'Mentor', email: 'mentor@onebo.uz' },
    student: { id: 'u-student', name: 'O‘quvchi', email: 'student@onebo.uz' },
    ...patch,
  };
}

describe('makeInviteCode', () => {
  it('XXXX-XXXX ko‘rinishida bo‘ladi', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(makeInviteCode()).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
  });

  it('adashtiradigan belgilar ishlatilmaydi', () => {
    // Kod telefon orqali aytiladi: O va 0, I va 1 farqlanmaydi.
    const codes = Array.from({ length: 200 }, () => makeInviteCode()).join('');
    expect(codes).not.toMatch(/[OI01]/);
  });

  it('kodlar takrorlanmaydi', () => {
    const set = new Set(Array.from({ length: 500 }, () => makeInviteCode()));
    expect(set.size).toBe(500);
  });
});

describe('normalizeCode', () => {
  it('defis, probel va registrni tenglashtiradi', () => {
    expect(normalizeCode(' abcd-2345 ')).toBe('ABCD2345');
    expect(normalizeCode('ABCD 2345')).toBe('ABCD2345');
    expect(normalizeCode('abcd2345')).toBe('ABCD2345');
  });

  it('begona belgilarni tashlaydi', () => {
    expect(normalizeCode('ABCD_2345!')).toBe('ABCD2345');
  });
});

describe('roleIn', () => {
  it('mentorni taniydi', () => {
    expect(roleIn(link(), 'u-mentor')).toBe('MENTOR');
  });

  it('o‘quvchini taniydi', () => {
    expect(roleIn(link(), 'u-student')).toBe('STUDENT');
  });

  it('begona odamga rol bermaydi', () => {
    expect(roleIn(link(), 'u-boshqa')).toBeNull();
  });
});

describe('counterpart', () => {
  it('mentorga o‘quvchini qaytaradi', () => {
    expect(counterpart(link(), 'u-mentor')?.name).toBe('O‘quvchi');
  });

  it('o‘quvchiga mentorni qaytaradi', () => {
    expect(counterpart(link(), 'u-student')?.name).toBe('Mentor');
  });
});
