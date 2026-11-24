// Reuse the original exact binary64 decoder to propose ordinary Rust decimals.
// Fresh complete native and target checking remains the only admission path.
import {decodeRustFloat,RUST_FLOAT_LITERAL_PROFILE} from './extensions/rust-float.mjs';
const need=(value,message)=>{if(!value)throw new TypeError('Floating literal source: '+message);};
export function floatingLiteralSource(raw){
 need(typeof raw==='string'&&raw.length<=RUST_FLOAT_LITERAL_PROFILE.maxTokenBytes,'bounded original decimal token required');let text=raw.replace(/_/gu,'');need(/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/u.test(text),'ordinary decimal numeric token required');if(text.startsWith('.'))text='0'+text;if(text.endsWith('.'))text+='0';if(!/[.eE]/u.test(text))text+='.0';const rust=text+'_f64',decoded=decodeRustFloat(rust,{start:0,end:raw.length});return {rust,value:decoded.value,floatBits:decoded.floatBits,profile:RUST_FLOAT_LITERAL_PROFILE.id,sourceAuthority:false,semanticAuthority:false};
}
