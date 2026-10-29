import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareUnitHelperCallsSources} from './prepare-unit-helper-calls-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareFreshStandardCopySources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/fresh-standard-copy/complete-originals-and-rules.json.gz',pin:'7e70afeef081baeb268115deb782532e03ae24a8ab3bab9caed555c82888c7cc',id:'router:fresh-standard-copy-complete-source-substitutions-v1',laterPlans:[prepareUnitHelperCallsSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareFreshStandardCopySources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Fresh standard Copy source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
