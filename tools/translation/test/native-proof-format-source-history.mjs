// Historical comparison DATA only. The current runtime fixture remains active.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';

const path=fileURLToPath(new URL('./fixtures/native-proof-json-format.mjs',import.meta.url));
const originalPin='00fb351cb0831fd61ccf62c6c50f30a9f77935732e9affb90a110962b2b0056a';
const currentPin='748a4552033baae437c3b3c0c219253f1eecf98bc5fedfccc51d37de56fb0649';
const added=" if(typeof source==='string'&&source.includes('export function proveBuiltinCloneEnclosingNamespace('))source=restoreReceivingSourceHistory(source,'clone-enclosing-extension',retain);\n";
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Native proof format source history: '+message);};

export function deriveNativeProofFormatSourceHistory(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>131072)fail('bounded complete primitive fixture required');
 const pin=hash(source);
 if(pin===originalPin)return {before:source,after:source,inverse:source,adopted:false,
  sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false};
 if(pin!==currentPin)fail('complete physical fixture pin differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('complete native fixture grammar differs');
 const owners=file.statements.filter(node=>ts.isFunctionDeclaration(node)
  &&node.name?.text==='restoreCurrentEnclosingNamespaceSource');
 if(owners.length!==1||!ts.isIfStatement(owners[0].body.statements[0]))fail('one complete native fixture owner required');
 const statement=owners[0].body.statements[0],start=statement.getStart(file)-1,end=statement.end+1;
 if(source.slice(start,end)!==added||source.split(added).length!==2)fail('complete original Clone history call differs');
 const before=source.slice(0,start)+source.slice(end);
 if(hash(before)!==originalPin||before.slice(0,start)+added+before.slice(start)!==source)
  fail('complete native fixture inverse differs');
 return {before,after:source,inverse:before,adopted:true,
  edit:{span:[start,start],expected:'',replacement:added},
  sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false};
}

export function readNativeProofFormatSourceHistory(...args){
 const source=readFileSync(...args),input=args[0];
 const actual=input instanceof URL?fileURLToPath(input):typeof input==='string'?resolve(input):null;
 return actual===path&&typeof source==='string'?deriveNativeProofFormatSourceHistory(source).before:source;
}
