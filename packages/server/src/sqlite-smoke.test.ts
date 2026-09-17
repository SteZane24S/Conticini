import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

describe('better-sqlite3', () => {
  it('scrive e rilegge una riga in memoria', () => {
    const database = new Database(':memory:');

    try {
      database.exec(
        'CREATE TABLE elementi (id INTEGER PRIMARY KEY, nome TEXT)',
      );
      database
        .prepare('INSERT INTO elementi (nome) VALUES (?)')
        .run('conticini');

      const row = database
        .prepare('SELECT nome FROM elementi WHERE id = 1')
        .get() as { nome: string };

      expect(row.nome).toBe('conticini');
    } finally {
      database.close();
    }
  });
});
