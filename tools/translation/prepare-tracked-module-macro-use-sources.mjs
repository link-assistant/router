import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareConfiguredTrackedTextualSources} from './prepare-configured-tracked-textual-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTrackedModuleMacroUseSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/tracked-module-macro-use/complete-originals-and-rules.json.gz',pin:'cf70453b4a08bd97ed0e2564ba3c27f9a989dd41eb6edb0dbaf09f534e2a96bc',id:'router:tracked-module-macro-use-complete-source-substitutions-v1',laterPlans:[prepareConfiguredTrackedTextualSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTrackedModuleMacroUseSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Tracked module macro-use source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
