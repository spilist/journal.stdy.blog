// 설정은 최소로. 값이 나오는 곳은 Svelte 템플릿이다 — 미사용 `$props`, 룬 모드
// 반응성 실수, a11y. 그 셋은 eslint-plugin-svelte의 권장 설정이 이미 잡아준다.
//
// 하지 않는 것: 포맷팅 규칙(Prettier 안 씀) · 스타일 취향 규칙. 린터가 취향을
// 다투기 시작하면 신호가 잡음에 묻힌다.

import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'node_modules/**', '.wrangler/**', 'public/**'] },

  js.configs.recommended,
  ...svelte.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
    },
  },

  {
    files: ['scripts/**', '**/*.test.js', '*.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
]
