export const NAMESPACE_CONTICINI = '2fbb0d49-54c5-4e89-9eb1-43b1d7eacdd9';

function ruotaSinistra(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function sha1(bytes: Uint8Array): Uint8Array {
  const paddingLength = (56 - ((bytes.length + 1) % 64) + 64) % 64;
  const padded = new Uint8Array(bytes.length + 1 + paddingLength + 8);
  const bitLength = bytes.length * 8;
  const bitLengthHigh = Math.floor(bitLength / 0x1_0000_0000);
  const bitLengthLow = bitLength >>> 0;

  padded.set(bytes);
  padded[bytes.length] = 0x80;
  padded[padded.length - 8] = (bitLengthHigh >>> 24) & 0xff;
  padded[padded.length - 7] = (bitLengthHigh >>> 16) & 0xff;
  padded[padded.length - 6] = (bitLengthHigh >>> 8) & 0xff;
  padded[padded.length - 5] = bitLengthHigh & 0xff;
  padded[padded.length - 4] = (bitLengthLow >>> 24) & 0xff;
  padded[padded.length - 3] = (bitLengthLow >>> 16) & 0xff;
  padded[padded.length - 2] = (bitLengthLow >>> 8) & 0xff;
  padded[padded.length - 1] = bitLengthLow & 0xff;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Uint32Array(80);

    for (let index = 0; index < 16; index += 1) {
      const byteOffset = offset + index * 4;
      words[index] =
        (padded[byteOffset]! << 24) |
        (padded[byteOffset + 1]! << 16) |
        (padded[byteOffset + 2]! << 8) |
        padded[byteOffset + 3]!;
    }

    for (let index = 16; index < 80; index += 1) {
      words[index] = ruotaSinistra(
        words[index - 3]! ^
          words[index - 8]! ^
          words[index - 14]! ^
          words[index - 16]!,
        1,
      );
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let index = 0; index < 80; index += 1) {
      let f: number;
      let k: number;

      if (index < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (index < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (index < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (ruotaSinistra(a, 5) + f + e + k + words[index]!) >>> 0;
      e = d;
      d = c;
      c = ruotaSinistra(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const digest = new Uint8Array(20);
  const hashes = [h0, h1, h2, h3, h4];

  for (let index = 0; index < hashes.length; index += 1) {
    const hash = hashes[index]!;
    const byteOffset = index * 4;
    digest[byteOffset] = (hash >>> 24) & 0xff;
    digest[byteOffset + 1] = (hash >>> 16) & 0xff;
    digest[byteOffset + 2] = (hash >>> 8) & 0xff;
    digest[byteOffset + 3] = hash & 0xff;
  }

  return digest;
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replaceAll('-', '');
  const bytes = new Uint8Array(16);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function uuidv5(name: string, namespace: string): string {
  const namespaceBytes = uuidToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const input = new Uint8Array(namespaceBytes.length + nameBytes.length);

  input.set(namespaceBytes);
  input.set(nameBytes, namespaceBytes.length);

  const bytes = sha1(input).slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  return formatUuid(bytes);
}
