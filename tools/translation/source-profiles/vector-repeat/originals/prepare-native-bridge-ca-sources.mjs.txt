import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceHistory,readPinnedNativeSourceProvenanceInputs,assertNativeSourceProvenanceCurrent} from './native-source-history.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeBridgeCASources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const helpers=readPinnedNativeSourceProvenanceInputs(root,{path:'tools/translation/source-profiles/native-bridge-ca/native-inputs.json',pin:'1725b54f8ac1e516aa8ee73be5bf51a0a1426fc184f8054a047437b65344de82'}),native=prepareNativeSourceHistory({root}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-bridge-ca/complete-originals-and-rules.json.gz',pin:'aac21614b507ea8dd11c27c7af1816e0968ae4e34dd91c3baa53dffa84dbab8e',id:'router:native-bridge-ca-complete-source-substitutions-v1'});for(const row of helpers)assertNativeSourceProvenanceCurrent(root,row);for(const row of native.files)assertNativeSourceProvenanceCurrent(root,{...row,originalSource:row.before,source:row.current,nativeSourceHistory:row});return {...plan,nativeInputs:native,nativeHelpers:helpers,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeBridgeCASources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native bridge CA source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
