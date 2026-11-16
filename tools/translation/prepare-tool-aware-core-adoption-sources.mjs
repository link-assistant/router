import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareSourceBoundCoreAdoptionSources} from './prepare-source-bound-core-adoption-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareToolAwareCoreAdoptionSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/tool-aware-core-adoption/complete-originals-and-rules.json.gz',pin:'5f2ee4813bb8372308230d6c63bbc903c91c431b7201dfbdad4b6576645a756a',id:'router:tool-aware-core-adoption-complete-source-substitutions-v1',laterPlans:[prepareSourceBoundCoreAdoptionSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareToolAwareCoreAdoptionSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Tool aware core adoption source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
