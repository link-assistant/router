import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedPrimitiveVectorLocalCallSources} from './prepare-owned-primitive-vector-local-call-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCurrentPrimitiveOwnedVectorSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/current-primitive-owned-vector-source/complete-originals-and-rules.json.gz',pin:'af720be85578d3264a62478840a600643a2cb6a5505e2a8aa13bca4b676350eb',id:'router:current-primitive-owned-vector-source-complete-source-substitutions-v1',laterPlans:[prepareOwnedPrimitiveVectorLocalCallSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCurrentPrimitiveOwnedVectorSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Current primitive owned vector source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
