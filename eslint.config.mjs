// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      'no-relative-import-paths': noRelativeImportPaths,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      // Bắt buộc dùng alias thay vì relative path từ 2 cấp trở lên (../../)
      'no-relative-import-paths/no-relative-import-paths': [
        'error',
        {
          allowSameFolder: true, // Cho phép './same-file' cùng thư mục
          rootDir: 'src',
          prefix: '@',
        },
      ],
    },
  },
);
