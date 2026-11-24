// Prints each exported intrinsic guard's result on the running Node version.
import * as m from '../../tools/translation/original-json-intrinsics.mjs';
const out={node:process.version};
for(const [k,v] of Object.entries(m))if(typeof v==='function'&&/Unchanged$/.test(k))try{out[k]=v();}catch(e){out[k]='throw '+e.message;}
console.log(JSON.stringify(out,null,1));
