import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeClientRemoteSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const inputs=readNativeInputs(root),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-client-remote/complete-originals-and-rules.json.gz',pin:'b9cef5f46a321124ba70ad99f82826443a537966f12b9ba6a176bfbaf82cfbec',id:'router:native-client-remote-complete-source-substitutions-v1'});for(const row of inputs)if(readFileSync(resolve(root,row.path),'utf8')!==row.source)throw new TypeError('Current native client implementation input changed');return {...plan,nativeInputs:inputs,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeClientRemoteSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native client remote source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
function readNativeInputs(root){
 const bytes=readFileSync(resolve(root,'tools/translation/source-profiles/native-client-remote/native-inputs.json'));if(createHash('sha256').update(bytes).digest('hex')!=='947f0e3286b9f1cb5cecd6134c4694fbc6bcadc47b3c799e82d744e343ebba66')throw new TypeError('Complete native client source provenance differs');const data=JSON.parse(bytes);return data.files.map(row=>{const source=readFileSync(resolve(root,row.originalPath),'utf8');if(Buffer.byteLength(source)!==row.bytes||createHash('sha256').update(source).digest('hex')!==row.sha256||readFileSync(resolve(root,row.path),'utf8')!==source)throw new TypeError('Actual complete native client input differs');const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)throw new TypeError('Complete native client CST inverse differs');return {...row,source,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false};});
}
