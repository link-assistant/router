// Exact later SOURCE composition only. The private parser keeps all authority.
import {readFileSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {prepareConcreteEquationTransaction} from './prepare-concrete-equation-transaction.mjs';
const EXECUTOR='tools/translation/private-parser-execution.mjs';
const INPUTS=['tools/translation/private-parser-equation-source-history.mjs','tools/translation/prepare-concrete-equation-transaction.mjs','tools/translation/source-profiles/concrete-equation-transaction/complete-originals.json.gz'];
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Later private parser source: '+message);};
function physical(root,path){
 const stat=lstatSync(resolve(root,path));if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)fail('bounded regular complete source required');const bytes=readFileSync(resolve(root,path)),encoding=path.endsWith('.gz')?'base64':'utf8';
 return {path,encoding,source:bytes.toString(encoding),bytes:bytes.length,sha256:hash(bytes),identity:{dev:stat.dev,ino:stat.ino,mode:stat.mode,size:stat.size,mtimeMs:stat.mtimeMs,ctimeMs:stat.ctimeMs}};
}
export function composePrivateParserEquationSourceHistory(row,input,{root}){
 if(row.path!==EXECUTOR||input.path!==EXECUTOR)fail('one exact original executor required');
 const inputs=INPUTS.map(path=>physical(root,path)),proposal=prepareConcreteEquationTransaction({root}),equations=proposal.files.filter(value=>value.path===EXECUTOR);if(equations.length!==1)fail('one complete generated equation required');const equation=equations[0];
 if(equation.before!==row.after||equation.current!==input.source||equation.after!==input.source||!equation.after.startsWith(equation.before)||equation.inverse!==equation.before)fail('complete original/later source equation differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('TypeScript5.9.3 required');const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,row.path),equation.after);
 const verify=()=>{for(const input of inputs){const fresh=physical(root,input.path);if(fresh.source!==input.source||fresh.sha256!==input.sha256||JSON.stringify(fresh.identity)!==JSON.stringify(input.identity))fail('complete later producer input changed');}};
 verify();return {row:{...row,dataAdoptionAfter:row.after,after:equation.after,sha256:hash(equation.after),nativeBindings,laterSourceEquation:equation},evidence:{equation,inputs,sourceAuthority:false,runtimeAuthority:false},verify};
}
