// Keep the entire archived parent. This equation only joins the reviewed
// geolocation module declaration; source metadata supplies no execution proof.
import {createHash} from 'node:crypto';
import {transportConcreteSourcePhases} from '../../concrete-phased-equations.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const original='7ec5955c5ea7d8fb8d27b243626fcc1af5a13f4cf0fdc180ffd83f3d293e90a5';
const current='de421977929eeddd60e396cea2b22647e9b47fa1378b8d357f2ba56934a25835';
export function composeGeolocationModuleSource(before){
 if(typeof before!=='string'||hash(before)!==original)throw Error('Complete pinned Router root required');
 const anchor='pub mod generated_js_first;\n';
 if(before.split(anchor).length!==2)throw Error('Unique whole module declaration required');
 const after=before.replace(anchor,anchor+'mod geolocation;\n');
 if(hash(after)!==current)throw Error('Complete reviewed geolocation root differs');
 const [equation]=transportConcreteSourcePhases([{before,middle:before,after,language:'Rust'}]);
 if(equation.inverse!==before)throw Error('Complete archived Router root inverse differs');
 return {before,after,equation,semanticAuthority:false};
}
