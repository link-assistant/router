// Rust binary64 classification and exact integral rounding. This adapter reads
// no caller properties and cannot invent NaN sign/payload observability.
function number(value) {
  if(typeof value!=='number')throw new TypeError('argument outside supported Rust f64 domain');
  return value;
}
export function rust_f64_is_nan(value) {return Number.isNaN(number(value));}
export function rust_f64_is_finite(value) {return Number.isFinite(number(value));}
export function rust_f64_floor(value) {return Math.floor(number(value));}
