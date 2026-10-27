import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareOptionEagerErrorSources} from './prepare-option-eager-error-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCallbackCallRoleSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/callback-call-role-source/complete-originals-and-rules.json.gz',pin:'8848df45c1d3b1d3d73edb309e2b5e68c0121a464cd21e75def96ce3ed20be72',id:'router:callback-call-role-source-complete-source-substitutions-v1',laterPlans:[prepareOptionEagerErrorSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCallbackCallRoleSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Callback call role source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
