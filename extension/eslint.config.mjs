import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import wxtAutoImports from './.wxt/eslint-auto-imports.mjs';

export default tseslint.config(
  { ignores: ['.output/**', '.wxt/**', 'node_modules/**', 'public/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  wxtAutoImports,
  {
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        MutationObserver: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        Element: 'readonly',
        ShadowRoot: 'readonly',
        SVGSVGElement: 'readonly',
        SVGGElement: 'readonly',
        SVGPolygonElement: 'readonly',
        SVGLineElement: 'readonly',
        HTMLElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLDivElement: 'readonly',
        Node: 'readonly',
        DOMRectReadOnly: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
);
