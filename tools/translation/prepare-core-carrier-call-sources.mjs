import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareOptionalTextCallbackSources} from './prepare-optional-text-callback-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCoreCarrierCallSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/core-carrier-call-source/complete-originals-and-rules.json.gz',pin:'cc9d2704e9a2f2cb8b5c1475e52f999c6878e10c2e8f166d2b005cf8554f9a99',id:'router:core-carrier-call-source-complete-source-substitutions-v1',laterPlans:[prepareOptionalTextCallbackSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCoreCarrierCallSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Core carrier call source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
