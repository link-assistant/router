// Validate the Rust str domain at the boundary. Iteration encodes one Unicode
// scalar at a time and exposes each byte as a by-value u8.
const encoder=new TextEncoder();
export function stringBytes(value) {
  if(typeof value!=='string'||/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))throw new TypeError('str Bytes requires a Unicode scalar string');
  return (function*(){for(const scalar of value)for(const byte of encoder.encode(scalar))yield BigInt(byte);})();
}
