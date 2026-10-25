import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareLocalDeclarativeSources} from './prepare-local-declarative-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareToolFirstDeriveSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/tool-first-derive/complete-originals-and-rules.json.gz',pin:'6516ae08f84a766e770a2820e9e372a4349f1d56d1f668f5fe25b4a1cdd1c406',id:'router:tool-first-derive-complete-source-substitutions-v1',laterPlans:[prepareLocalDeclarativeSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareToolFirstDeriveSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Tool first derive source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
