import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareForwardOwnedFormatSources} from './prepare-forward-owned-format-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareForwardGuardPrefixSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/forward-guard-prefix-source/complete-originals-and-rules.json.gz',pin:'e56dc3db053ccc22b5875f55db5c9060de95641df5718d4d077827bafeadfeee',id:'router:forward-guard-prefix-source-complete-source-substitutions-v1',laterPlans:[prepareForwardOwnedFormatSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareForwardGuardPrefixSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Forward fixed guard prefix source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
