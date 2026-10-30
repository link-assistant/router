import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareFixedTypeCarrierSources} from './prepare-fixed-type-carrier-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareFixedTypeDeclarationSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/fixed-type-declarations/complete-originals-and-rules.json.gz',pin:'8b6fd045c8cb189f89dba6009ac8fe43496c5d4df45a8b1716db7d59f36eaa97',id:'router:fixed-type-declarations-complete-source-substitutions-v1',laterPlans:[prepareFixedTypeCarrierSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareFixedTypeDeclarationSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Fixed type declaration source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
