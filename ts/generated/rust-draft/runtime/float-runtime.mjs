// Rust binary64 classification and exact integral rounding. This adapter reads
// no caller properties and cannot invent NaN sign/payload observability.
function number(value) {
  if(typeof value!=='number')throw new TypeError('argument outside supported Rust f64 domain');
  return value;
}
export function rust_f64_is_nan(value) {return Number.isNaN(number(value));}
export function rust_f64_is_finite(value) {return Number.isFinite(number(value));}
export function rust_f64_floor(value) {return Math.floor(number(value));}
function nonNaN(value) {
  number(value);
  if(Number.isNaN(value))throw new TypeError('Rust f64 sign requires checked non-NaN source refinement');
  return value;
}
export function rust_f64_is_sign_negative(value) {nonNaN(value);return value<0||Object.is(value,-0);}
export function rust_f64_is_sign_positive(value) {return !rust_f64_is_sign_negative(value);}

// Explicit Router compatibility operation; the Rust library remains untranslated.
export function router_core_f64_inclusive_contains(lower,upper,value) {
  number(lower);number(upper);number(value);
  return lower<=value&&value<=upper;
}
