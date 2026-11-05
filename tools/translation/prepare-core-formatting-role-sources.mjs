import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareCallbackCallRoleSources} from './prepare-callback-call-role-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCoreFormattingRoleSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/core-formatting-role-source/complete-originals-and-rules.json.gz',pin:'6dd2121560273b1acdc21ac0bf47aa749fa79fe5e087fa291cf717e60db133a1',id:'router:core-formatting-role-source-complete-source-substitutions-v1',laterPlans:[prepareCallbackCallRoleSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCoreFormattingRoleSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Core formatting role source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
