import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareFreshStandardCopySources} from './prepare-fresh-standard-copy-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareScalarVectorLocalWiringSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/scalar-vector-local-wiring/complete-originals-and-rules.json.gz',pin:'2fc8e7a71d1ce13651973f79aac86ff62ff8f6fc61d7cd330ba28a613b8e13a8',id:'router:scalar-vector-local-wiring-complete-source-substitutions-v1',laterPlans:[prepareFreshStandardCopySources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareScalarVectorLocalWiringSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Scalar vector local wiring source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
