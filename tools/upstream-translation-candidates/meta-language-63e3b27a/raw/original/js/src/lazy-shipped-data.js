// Frozen array shape is available before its shipped values are read. Actual
// arrays retain native cloning and iteration, unlike proxy-backed registers.
export function createLazyFrozenArray(length, load) {
  if (!Number.isSafeInteger(length) || length < 0 || length > 1_000_000 || typeof load !== 'function') {
    throw new TypeError('a lazy shipped array needs a valid length and loader');
  }
  let values;
  let loading = false;
  const read = () => {
    if (values) return values;
    if (loading) throw new TypeError('a lazy shipped array loader is recursive');
    loading = true;
    try {
      const result = load();
      if (!Array.isArray(result) || result.length !== length) {
        throw new TypeError('a lazy shipped array differs from its declared length');
      }
      const visited = new WeakSet();
      const freeze = (value) => {
        if (value && typeof value === 'object' && !visited.has(value)) {
          visited.add(value);
          Object.values(value).forEach(freeze);
          Object.freeze(value);
        }
        return value;
      };
      values = freeze(result);
      return values;
    } finally {
      loading = false;
    }
  };
  const array = Array(length);
  for (let index = 0; index < length; index += 1) {
    Object.defineProperty(array, index, { enumerable: true, get: () => read()[index] });
  }
  return Object.freeze(array);
}
