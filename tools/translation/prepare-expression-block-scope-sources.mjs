import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareTextOwnedCopySources} from './prepare-text-owned-copy-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareExpressionBlockScopeSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/expression-block-scopes/complete-originals-and-rules.json.gz',pin:'fb67fd4684d30a51d1b5cb76aa2909c3afa51916f9f3292ed0fa86eb4a2ccf2e',id:'router:expression-block-scopes-complete-source-substitutions-v1',laterPlans:[prepareTextOwnedCopySources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareExpressionBlockScopeSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Expression block scopes source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
