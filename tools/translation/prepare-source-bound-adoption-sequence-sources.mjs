import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareSourceBoundOwnedCoreBulkSources} from './prepare-source-bound-owned-core-bulk-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareSourceBoundAdoptionSequenceSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/source-bound-adoption-sequence/complete-originals-and-rules.json.gz',pin:'6345e68f3064bfb4181b76ae332316dc197ed40fabf9bab9717a9b824ead5de1',id:'router:source-bound-adoption-sequence-complete-source-substitutions-v1',laterPlans:[prepareSourceBoundOwnedCoreBulkSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareSourceBoundAdoptionSequenceSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Source bound adoption sequence source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
