// Primitive immutable JS strings represent actual owned native String values.
// Reuse the existing unbounded Unicode-scalar validator; no coercion or cache.
export {requireScalarString as vectorTextInput} from './string-iterator-runtime.mjs';
