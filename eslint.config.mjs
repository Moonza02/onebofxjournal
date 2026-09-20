import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

/** Lint qoidalari (flat config).
 *
 *  `eslint-config-next` hali eski formatda ishlaydi va ESLint 9 bilan
 *  yiqiladi, shuning uchun uning plagini to'g'ridan-to'g'ri ulangan —
 *  natija bir xil, oradagi moslashtiruvchi qatlamsiz.
 */
export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '*.config.mjs'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,

      // Ishlatilmagan import va o'zgaruvchi — refaktordan keyin qoladigan iz.
      // `_` bilan boshlanadiganlar ataylab qoldirilgan (server action'dagi
      // `_prev` kabi), shuning uchun ular hisobga olinmaydi.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // `any` tipni yashiradi — bu loyihada hamma narsa tipli.
      '@typescript-eslint/no-explicit-any': 'error',

      // `==` tip o'girib solishtiradi, `===` esa yo'q.
      eqeqeq: ['error', 'always'],

      // Serverda `console.log` qolib ketmasin; ogohlantirish va xato mumkin.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  {
    // Testlarda konsol va bo'shroq tiplar normal.
    files: ['tests/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    // Prisma seed — bir martalik skript, konsolga yozishi tabiiy.
    files: ['prisma/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
