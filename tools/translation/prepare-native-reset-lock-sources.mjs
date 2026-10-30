import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceHistory} from './native-source-history.mjs';
import {prepareCodexBridgeTrustSources} from './prepare-codex-bridge-trust-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeResetLockSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const native=prepareNativeSourceHistory({root}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-reset-lock/complete-originals-and-rules.json.gz',pin:'890f200a1aa8eadf7d732347f13865bb5346a9e0a07a0fa292fa4c90dc00e136',id:'router:native-reset-lock-complete-source-substitutions-v1',laterPlans:[prepareCodexBridgeTrustSources({root})]}),current=prepareNativeSourceHistory({root});if(JSON.stringify(native)!==JSON.stringify(current))throw new TypeError('Complete native history changed during source construction');return {...plan,nativeInputs:native,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeResetLockSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native reset lock source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
