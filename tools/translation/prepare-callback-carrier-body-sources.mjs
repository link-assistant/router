import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareIntegerMethodChainSources} from './prepare-integer-method-chain-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCallbackCarrierBodySources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/callback-carrier-body-source/complete-originals-and-rules.json.gz',pin:'bdca0aebfbf35dd87331cc36494c174270367f3b85f77bc92a2fb678b37ba486',id:'router:callback-carrier-body-source-complete-source-substitutions-v1',laterPlans:[prepareIntegerMethodChainSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCallbackCarrierBodySources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Callback carrier body source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
