import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveOperandDomainSources} from './prepare-primitive-operand-domain-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCheckedNegationSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/checked-negation/complete-originals-and-rules.json.gz',pin:'2d3bceeafbd3939b45d8ecbc2a57aee6c0516a8607f655a087a2bf6284e4000f',id:'router:checked-negation-complete-source-substitutions-v1',laterPlans:[preparePrimitiveOperandDomainSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCheckedNegationSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Checked negation source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
