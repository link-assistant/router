import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareHttpResourceInverseSources} from './prepare-http-resource-inverse-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareHttpResourceCallerSources({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/http-resource-callers/complete-originals-and-rules.json.gz',pin:'e050d159b36810362799a72f2628218107c3e89429647d13d3a1adbd68dae62a',id:'router:http-resource-callers-complete-source-substitutions-v1',laterPlans:[prepareHttpResourceInverseSources({root})]});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareHttpResourceCallerSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('HTTP resource caller source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
