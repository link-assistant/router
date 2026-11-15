// Runs each closed native profile's portable JavaScript source visitor (no Rust)
// and prints whether it accepts the current working tree. Usage: node <this>
import {NATIVE_PROFILE_ORACLES} from '../tools/translation/native-profile-oracles-20261101-control.mjs';
await import('../tools/translation/native-profile-oracles-20261101-materialize.mjs');
for(const p of NATIVE_PROFILE_ORACLES){
  const m=await import(new URL(p.nativeSourceModule,new URL('../tools/translation/',import.meta.url)).href);
  try{m[p.nativeSourceVisitor](()=>null);console.log(p.id,'ACCEPTS current tree');}
  catch(e){console.log(p.id,'REFUSES:',e?.name,e?.message);}
}
