import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveSequenceRustInverseSources} from './prepare-primitive-sequence-rust-inverse-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedPrimitiveSequenceCallSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-primitive-sequence-calls/complete-originals-and-rules.json.gz',pin:'82f3a0ea737e12f32e6577cb9b48afce0e03362255b47c92c4058f5af6db51ad',id:'router:owned-primitive-sequence-calls-complete-source-substitutions-v1',laterPlans:[preparePrimitiveSequenceRustInverseSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedPrimitiveSequenceCallSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Owned primitive sequence call source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
