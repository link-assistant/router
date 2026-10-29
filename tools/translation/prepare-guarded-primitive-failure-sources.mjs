import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareCheckedNegationSources} from './prepare-checked-negation-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareGuardedPrimitiveFailureSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/guarded-primitive-failures/complete-originals-and-rules.json.gz',pin:'463a2d00d28bca1f7e56787b823901f380f8f7f94228592863ef32f2a8a0182f',id:'router:guarded-primitive-failures-complete-source-substitutions-v1',laterPlans:[prepareCheckedNegationSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareGuardedPrimitiveFailureSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Guarded primitive failure source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
