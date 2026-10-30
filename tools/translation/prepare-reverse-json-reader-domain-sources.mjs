import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareJsonAliasBindingPatternSources} from './prepare-json-alias-binding-pattern-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareReverseJsonReaderDomainSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/reverse-json-reader-domains/complete-originals-and-rules.json.gz',pin:'05425deb65273c905ae2b4c56001875cd138a6e037d3cd461f9b0769eb1d461d',id:'router:reverse-json-reader-domains-complete-source-substitutions-v1',laterPlans:[prepareJsonAliasBindingPatternSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareReverseJsonReaderDomainSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Reverse JSON reader domains source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
