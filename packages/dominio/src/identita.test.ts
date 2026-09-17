import { describe, expect, it } from 'vitest';

import { NAMESPACE_CONTICINI, uuidv5 } from './identita.js';

describe('uuidv5', () => {
  const namespaceDns = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  it.each([
    ['python.org', namespaceDns, '886313e1-3b8a-5372-9b90-0c9aee199e5d'],
    ['hello.example.com', namespaceDns, 'fdda765f-fc57-5604-a269-52a7df8164ec'],
    ['www.example.com', namespaceDns, '2ed6657d-e927-568b-95e1-2665a8aea6a2'],
    [
      'test-conticini',
      NAMESPACE_CONTICINI,
      '290b995d-8a59-5b20-8acc-6c6c123e76fc',
    ],
  ])('restituisce il valore noto per %s', (name, namespace, expected) => {
    expect(uuidv5(name, namespace)).toBe(expected);
  });

  it('e deterministico', () => {
    const first = uuidv5('test-conticini', NAMESPACE_CONTICINI);
    const second = uuidv5('test-conticini', NAMESPACE_CONTICINI);

    expect(first).toBe(second);
  });

  it('cambia al variare del nome o del namespace', () => {
    const original = uuidv5('test-conticini', NAMESPACE_CONTICINI);

    expect(uuidv5('un-altro-nome', NAMESPACE_CONTICINI)).not.toBe(original);
    expect(uuidv5('test-conticini', namespaceDns)).not.toBe(original);
  });

  it('imposta la versione 5 e la variante RFC', () => {
    const uuid = uuidv5('test-conticini', NAMESPACE_CONTICINI);

    expect(uuid[14]).toBe('5');
    expect(['8', '9', 'a', 'b']).toContain(uuid[19]);
  });
});
