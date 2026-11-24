// Maps string offsets of a source text to UTF-8 byte offsets and row/column
// coordinates, and UTF-8 byte offsets back to string offsets.
//
// A coordinate per character would cost an object per character (hundreds of
// megabytes for a few megabytes of source), so only every
// `CHECKPOINT_INTERVAL`-th character boundary is stored, in typed arrays. A
// lookup binary-searches the nearest checkpoint at or before the target and
// scans forward from it.

/** Characters between stored checkpoints. */
export const CHECKPOINT_INTERVAL = 64;

/** Returns the boundary index of `text`, built in one pass. */
export function sourceBoundaries(text) {
  return new SourceBoundaries(text);
}

class SourceBoundaries {
  constructor(text) {
    this.text = text;
    const capacity = Math.floor(text.length / CHECKPOINT_INTERVAL) + 2;
    let offsets = new Uint32Array(capacity);
    let bytes = new Float64Array(capacity);
    let rows = new Uint32Array(capacity);
    let columns = new Float64Array(capacity);
    let count = 0;
    let byte = 0;
    let row = 0;
    let column = 0;
    let characters = 0;
    for (let offset = 0; ; ) {
      if (characters % CHECKPOINT_INTERVAL === 0 || offset >= text.length) {
        offsets[count] = offset;
        bytes[count] = byte;
        rows[count] = row;
        columns[count] = column;
        count += 1;
      }
      if (offset >= text.length) break;
      const codePoint = text.codePointAt(offset);
      const byteLength = utf8Length(codePoint);
      byte += byteLength;
      if (codePoint === 0x0a) {
        row += 1;
        column = 0;
      } else {
        column += byteLength;
      }
      offset += codePoint > 0xffff ? 2 : 1;
      characters += 1;
    }
    this.count = count;
    this.offsets = offsets.subarray(0, count);
    this.bytes = bytes.subarray(0, count);
    this.rows = rows.subarray(0, count);
    this.columns = columns.subarray(0, count);
  }

  /** Number of stored checkpoints. */
  get checkpointCount() {
    return this.count;
  }

  /**
   * Returns `{ byte, row, column }` at string offset `offset`, or undefined
   * when `offset` is not a character boundary of the text.
   */
  get(offset) {
    if (!Number.isInteger(offset) || offset < 0 || offset > this.text.length) return undefined;
    const index = lastAtOrBefore(this.offsets, this.count, offset);
    let at = this.offsets[index];
    let byte = this.bytes[index];
    let row = this.rows[index];
    let column = this.columns[index];
    while (at < offset) {
      const codePoint = this.text.codePointAt(at);
      const byteLength = utf8Length(codePoint);
      byte += byteLength;
      if (codePoint === 0x0a) {
        row += 1;
        column = 0;
      } else {
        column += byteLength;
      }
      at += codePoint > 0xffff ? 2 : 1;
    }
    return at === offset ? { byte, row, column } : undefined;
  }

  /**
   * Returns the string offset at UTF-8 byte offset `byte`, or undefined when
   * `byte` is not a character boundary of the text.
   */
  offsetOf(byte) {
    if (!Number.isInteger(byte) || byte < 0 || byte > this.bytes[this.count - 1]) return undefined;
    const index = lastAtOrBefore(this.bytes, this.count, byte);
    let at = this.offsets[index];
    let current = this.bytes[index];
    while (current < byte) {
      const codePoint = this.text.codePointAt(at);
      current += utf8Length(codePoint);
      at += codePoint > 0xffff ? 2 : 1;
    }
    return current === byte ? at : undefined;
  }
}

// Lone surrogates encode as U+FFFD, which is three bytes, like other code
// points below U+10000.
function utf8Length(codePoint) {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

function lastAtOrBefore(values, count, target) {
  let low = 0;
  let high = count - 1;
  while (low < high) {
    const middle = (low + high + 1) >>> 1;
    if (values[middle] <= target) low = middle;
    else high = middle - 1;
  }
  return low;
}
