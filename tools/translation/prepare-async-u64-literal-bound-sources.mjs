import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareAsyncNativeGuardSources} from './prepare-async-native-guard-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareAsyncU64LiteralBoundSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/async-u64-literal-bounds/complete-originals-and-rules.json.gz',pin:'fc5171f95aed5244d9ca74dac0e7cbb234363e1cbe4f9f442aa5f30038a1e61c',id:'router:async-u64-literal-bounds-complete-source-substitutions-v1',laterPlans:[prepareAsyncNativeGuardSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareAsyncU64LiteralBoundSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Async u64 literal bounds source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
