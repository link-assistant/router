import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceHistory,readPinnedNativeSourceProvenanceInputs,assertNativeSourceProvenanceCurrent} from './native-source-history.mjs';
import {prepareBoundedJsonCallSources} from './prepare-bounded-json-call-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareBoundedJsonCoreSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const helpers=readPinnedNativeSourceProvenanceInputs(root,{path:'tools/translation/source-profiles/bounded-json-core/native-inputs.json',pin:'915da4829d312fdbe09b1f03ff3b7d6c12d6770869d494d74894334de7cd3e48'}),native=prepareNativeSourceHistory({root}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/bounded-json-core/complete-originals-and-rules.json.gz',pin:'709cf968ffbe10847dde9010fd6a93c08fa0a4b3ddf467806d2b3ad25065d3a7',id:'router:bounded-json-core-complete-source-substitutions-v1',laterPlans:[prepareBoundedJsonCallSources({root})]});for(const row of helpers)assertNativeSourceProvenanceCurrent(root,row);for(const row of native.files)assertNativeSourceProvenanceCurrent(root,{...row,originalSource:row.before,source:row.current,nativeSourceHistory:row});return {...plan,nativeInputs:native,nativeHelpers:helpers,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareBoundedJsonCoreSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Bounded JSON core source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
