/** Check represented host containers without invoking accessors or iterator overrides. */
export function checkOwnedProgramContainers(root, { acceptContainer, fail, selectedFields }) {
  const visited = new WeakSet();
  let selected = false;
  let defect;
  let visits = 0;
  const reject = detail => { defect ??= detail; };
  function visit(value, depth = 0) {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    if (depth > 256 || ++visits > 100_000) {
      reject('the owned container graph exceeds its resource limit');
      return;
    }
    visited.add(value);
    const keys = Reflect.ownKeys(value);
    if (keys.some(key => selectedFields.includes(key))) selected = true;
    if (value instanceof Map) {
      if (!acceptContainer('map', true, keys.length > 0 || Object.getPrototypeOf(value) !== Map.prototype)) reject('a declaration Map has unrepresented own fields');
      for (const [key, child] of Map.prototype.entries.call(value)) { visit(key, depth + 1); visit(child, depth + 1); }
    } else if (Array.isArray(value)) {
      const length = Object.getOwnPropertyDescriptor(value, 'length').value;
      const dense = keys.length === length + 1 && keys.every(key => key === 'length' || typeof key === 'string'
        && /^(?:0|[1-9][0-9]*)$/u.test(key) && Number(key) < length && String(Number(key)) === key);
      const unrepresented = Object.getPrototypeOf(value) !== Array.prototype || keys.some(key => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return !Object.hasOwn(descriptor, 'value') || key !== 'length' && !descriptor.enumerable;
      });
      if (!acceptContainer('array', dense, unrepresented)) reject('an ordered container has unrepresented own fields or sparse positions');
      for (const key of keys) if (key !== 'length') {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (Object.hasOwn(descriptor, 'value')) visit(descriptor.value, depth + 1);
      }
    } else {
      const unrepresented = ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || keys.some(key => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value');
      });
      if (!acceptContainer('record', true, unrepresented)) reject('an owned record has unrepresented own fields or a prototype');
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (Object.hasOwn(descriptor, 'value')) visit(descriptor.value, depth + 1);
      }
    }
  }
  visit(root);
  if (selected && defect) fail(defect);
  return selected;
}
