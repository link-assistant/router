import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareSelectedNativeBodySources} from './prepare-selected-native-body-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeProjectOperationSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-project-operation/complete-originals-and-rules.json.gz',pin:'e4919c98ac958f1ffe22ec9407d505e423576698133d1d4d8db5b959ffdc79b2',id:'router:native-project-operation-complete-source-substitutions-v1',laterPlans:[prepareSelectedNativeBodySources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeProjectOperationSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native project operation source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
