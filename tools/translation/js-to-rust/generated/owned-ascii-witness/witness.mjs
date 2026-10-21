// GENERATED: actual checked reverse ASCII receiving witness.
import {router_core_ascii_chars_in as ascii} from './runtime/string-iterator-runtime.mjs';
/**
 * @param {Parameters<typeof ascii>[0]} value
 * @param {Parameters<typeof ascii>[1]} alphabet
 * @returns {ReturnType<typeof ascii>}
 */
export function accepted(value,alphabet){return ascii(value,alphabet);}
/** @param {string} value */
export function hexadecimal(value){const alphabet='0123456789ABCDEFabcdef';return ascii(value,alphabet);}
/**
 * @param {string} value
 * @param {string} alphabet
 * @param {boolean} yes
 */
export function lazy(value,alphabet,yes){return yes&&ascii(value,alphabet);}
/**
 * @param {string} value
 * @param {string} alphabet
 */
export function guard(value,alphabet){if(ascii(value,alphabet)){return value;}else{return '';}}
