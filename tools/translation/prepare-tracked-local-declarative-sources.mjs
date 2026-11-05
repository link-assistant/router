import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareTrackedModuleMacroUseSources} from './prepare-tracked-module-macro-use-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTrackedLocalDeclarativeSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/tracked-local-declarative/complete-originals-and-rules.json.gz',pin:'bb81ba584f8ef152bb8d550cb9f78832c16c2ef68c7156f9a003c1bf423e29b3',id:'router:tracked-local-declarative-complete-source-substitutions-v1',laterPlans:[prepareTrackedModuleMacroUseSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTrackedLocalDeclarativeSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Tracked external textual inheritance source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
