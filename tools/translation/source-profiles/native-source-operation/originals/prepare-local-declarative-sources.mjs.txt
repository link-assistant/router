import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareAsyncControlCallerSources} from './prepare-async-control-caller-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareLocalDeclarativeSources({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/local-declarative/complete-originals-and-rules.json.gz',pin:'4b6ffb3bfddfe1cb841b23e39432bf93d9284758a475203765a64fd76005caff',id:'router:local-declarative-complete-source-substitutions-v1',laterPlans:[prepareAsyncControlCallerSources({root})]});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareLocalDeclarativeSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Local declarative source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
