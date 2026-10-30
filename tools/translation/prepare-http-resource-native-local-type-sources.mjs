import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareHttpResourceNativeControlSources} from './prepare-http-resource-native-control-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareHttpResourceNativeLocalTypeSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/http-resource-native-local-types/complete-originals-and-rules.json.gz',pin:'fd7e86a1e6ca9eb6265d8502769ce210b46eb9fc6ab2e74d6a805687fae450ef',id:'router:http-resource-native-local-types-complete-source-substitutions-v1',laterPlans:[prepareHttpResourceNativeControlSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareHttpResourceNativeLocalTypeSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('HTTP resource native local type source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
