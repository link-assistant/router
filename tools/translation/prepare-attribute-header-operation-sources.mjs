import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareParsedBuiltinCallerSources} from './prepare-parsed-builtin-caller-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareAttributeHeaderOperationSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/attribute-header-operation/complete-originals-and-rules.json.gz',pin:'4107d9fc56d6fd66b1d9c2d198867c411703204822bede1d1addc2a639582776',id:'router:attribute-header-operation-complete-source-substitutions-v1',laterPlans:[prepareParsedBuiltinCallerSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareAttributeHeaderOperationSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Attribute header operation source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
