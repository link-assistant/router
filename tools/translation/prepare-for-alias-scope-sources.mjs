import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareExplicitSyncBaselineSources} from './prepare-explicit-sync-baseline-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareForAliasScopeSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/for-alias-scope-source/complete-originals-and-rules.json.gz',pin:'db487b55918f81d661d4623bbc9791ca5cafc2e1e2c023cd2b01db194804c6e4',id:'router:for-alias-scope-source-complete-source-substitutions-v1',laterPlans:[prepareExplicitSyncBaselineSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareForAliasScopeSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('For alias scope source source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
