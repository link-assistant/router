import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareFixedWrappingErrorExitSources} from './prepare-fixed-wrapping-error-exits-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareAsyncControlComparisonSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/async-control-comparisons/complete-originals-and-rules.json.gz',pin:'4cbe39705389f2d5a59b817814c321ce4c66e2f29886d1f28c59b7bf88e86db3',id:'router:async-control-comparisons-complete-source-substitutions-v1',laterPlans:[prepareFixedWrappingErrorExitSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareAsyncControlComparisonSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Async control comparisons source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
