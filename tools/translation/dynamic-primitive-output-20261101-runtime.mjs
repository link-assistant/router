// Actual existing owned Text transport: no literal/emptyDrop marker or carrier.
// Native and target both format eagerly BEFORE capture/quiet/channel routing.
import * as output from './output-literal-core-20261101-runtime.mjs';
function dispatch(mode,stderr,value){
 if(typeof stderr!=='boolean'||typeof value!=='string'||value.length>2097152||/\p{Surrogate}/u.test(value)||Buffer.byteLength(value)>2097152)throw new TypeError('Owned dynamic output requires bool and bounded scalar-valid owned text');
 const run=output.output_text_dispatch_rendered;if(typeof run!=='function')throw new TypeError('Complete same-private-backend owned-text successor is not installed');return run(mode,stderr,value);
}
export function output_text_write(stderr,value){if(arguments.length!==2)throw new TypeError('Owned text write takes bool and Text');return dispatch('write',stderr,value);}
export function output_text_result(stderr,value){if(arguments.length!==2)throw new TypeError('Owned text result takes bool and Text');return dispatch('result',stderr,value);}
export function output_text_passthrough(stderr,value){if(arguments.length!==2)throw new TypeError('Owned text passthrough takes bool and Text');return dispatch('passthrough',stderr,value);}
