import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveChoiceDomainsSources} from './prepare-primitive-choice-domains-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareExactPrimitiveLiteralsSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/exact-primitive-literals/complete-originals-and-rules.json.gz',pin:'a52f950e6652571361efe0ee85bcc2305743cfb95c920f894817278e519a0aa7',id:'router:exact-primitive-literals-complete-source-substitutions-v1',laterPlans:[preparePrimitiveChoiceDomainsSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareExactPrimitiveLiteralsSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Exact primitive literal source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
