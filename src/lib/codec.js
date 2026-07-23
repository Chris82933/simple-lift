// Shared gzip + base64url codec for portable copy-paste codes — the whole-app
// backup snapshot and, now, single shared programs both ride on it.
//
// base64url (no + / =) so a code survives being pasted into a chat app, a URL,
// or a notes field without getting mangled or line-wrapped into junk.

export const hasCompression = () =>
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

export const toB64Url = (bytes) => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const fromB64Url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// Push bytes through a Compression/DecompressionStream. Written against the raw
// reader/writer rather than Blob+Response so it works anywhere the stream itself
// exists. The write is deliberately not awaited before reading starts — waiting
// on both ends at once deadlocks on backpressure for larger payloads.
export async function pipeThrough(bytes, stream) {
  const writer = stream.writable.getWriter()
  writer.write(bytes).then(() => writer.close(), () => {})
  const reader = stream.readable.getReader()
  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const c of chunks) { out.set(c, at); at += c.length }
  return out
}

// Object → gzipped base64url string (no prefix — the caller adds its own).
export async function encodeGzip(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  const gz = await pipeThrough(bytes, new CompressionStream('gzip'))
  return toB64Url(gz)
}

// Gzipped base64url string → object.
export async function decodeGzip(b64url) {
  const json = await pipeThrough(fromB64Url(b64url), new DecompressionStream('gzip'))
  return JSON.parse(new TextDecoder().decode(json))
}
