import tseslint from 'typescript-eslint';

const dominioMessage =
  'packages/dominio non può dipendere da Node, Fastify, SQLite, React o zod';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
  {
    files: ['packages/**/src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['packages/dominio/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'fs', message: dominioMessage },
            { name: 'path', message: dominioMessage },
            { name: 'fastify', message: dominioMessage },
            { name: 'better-sqlite3', message: dominioMessage },
            { name: 'react', message: dominioMessage },
            { name: 'zod', message: dominioMessage },
          ],
          patterns: [
            {
              group: ['node:*', 'node:*/**'],
              message: dominioMessage,
            },
          ],
        },
      ],
    },
  },
);
