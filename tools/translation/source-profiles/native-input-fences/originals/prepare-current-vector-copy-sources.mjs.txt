import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {readPinnedNativeSourceProvenanceInputs,assertNativeSourceProvenanceCurrent} from './native-source-history.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCurrentVectorCopySources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const inputs=readPinnedNativeSourceProvenanceInputs(root,{path:'tools/translation/source-profiles/current-vector-copy/native-inputs.json',pin:'18ab5d2217f842b44b37acb929d1e519dd0f1e43d30953e5dd7e9b14cbb1e6d9'}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/current-vector-copy/complete-originals-and-rules.json.gz',pin:'151671773d727474d4f1723e8b0da362e19d69145c4d2863c9356ace450f4590',id:'router:current-vector-copy-complete-source-substitutions-v1'});for(const row of inputs)assertNativeSourceProvenanceCurrent(root,row);return {...plan,nativeInputs:inputs,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCurrentVectorCopySources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Current vector private source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
