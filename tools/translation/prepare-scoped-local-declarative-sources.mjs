import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareScopedLocalDeclarativeSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/scoped-local-declarative/complete-originals-and-rules.json.gz',pin:'f7eb7e6d82719372bc99dce3bf5ad6feb6de2bc7d0ef73b85e49a772fe6258a4',id:'router:scoped-local-declarative-complete-source-substitutions-v1'}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareScopedLocalDeclarativeSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Scoped local declarative source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
