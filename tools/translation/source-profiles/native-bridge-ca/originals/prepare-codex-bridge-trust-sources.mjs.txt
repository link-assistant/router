import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCodexBridgeTrustSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const inputs=readPinnedNativeSourceProvenanceInputs(root,{path:'tools/translation/source-profiles/codex-bridge-trust/native-inputs.json',pin:'d5b0028df4ae3baa023636247e0859ec362c5b43444f6a71822f08eda2ab7d26'}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/codex-bridge-trust/complete-originals-and-rules.json.gz',pin:'977908e41207a9d66b1f00f127c078dea71bc9585be36e11c7fff6b186125773',id:'router:codex-bridge-trust-complete-source-substitutions-v1'});for(const row of inputs)assertNativeSourceProvenanceCurrent(root,row);return {...plan,nativeInputs:inputs,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCodexBridgeTrustSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Codex bridge trust source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}

import {readPinnedNativeSourceProvenanceInputs,assertNativeSourceProvenanceCurrent} from './native-source-history.mjs';
