import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareSourceBoundOwnedReadbackSources} from './prepare-source-bound-owned-readback-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareSourceBoundOwnedPacketSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/source-bound-owned-packets/complete-originals-and-rules.json.gz',pin:'17f3207577ce6c7443c8b59cf81755e4eac0ecaf37353fd9cb6e632af729aa43',id:'router:source-bound-owned-packets-complete-source-substitutions-v1',laterPlans:[prepareSourceBoundOwnedReadbackSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareSourceBoundOwnedPacketSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Source bound owned packet source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
