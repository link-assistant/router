// Native-selected source extraction. This constructs code, never semantic authority.
import {readFileSync} from 'node:fs';
import {resolve,isAbsolute,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
const need=(value,message)=>{if(!value)throw new TypeError('Derived inverse module: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
function local(root,path){need(typeof path==='string'&&path.length>0&&!isAbsolute(path)&&!/[\\:\0\r\n]/u.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'),'canonical relative source path');const full=resolve(root,path),name=relative(root,full);need(name&&!name.startsWith('../')&&!isAbsolute(name),'source remains within root');return full;}
function read(path,missing=false){try{const bytes=readFileSync(path),source=bytes.toString('utf8');need(bytes.length<=8388608&&Buffer.from(source).equals(bytes),'bounded lossless complete source');return source;}catch(error){if(missing&&error.code==='ENOENT')return null;throw error;}}
function parsed(ts,path,source){need(typeof source==='string'&&Buffer.byteLength(source)<=8388608&&source.split('\n').length-(source.endsWith('\n')?1:0)<1000,'bounded repository source module');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);need(!file.parseDiagnostics.length,'complete original/derived native grammar');return file;}
export function prepareDerivedInverseModule({root,archive,pin,id}={}){
 root=resolve(root);const archivePath=local(root,archive),packed=readFileSync(archivePath);need(packed.length<=8388608&&hash(packed)===pin,'complete pinned source recipe');const recipe=JSON.parse(gunzipSync(packed,{maxOutputLength:16777216}));need(recipe.schema==='derived-inverse-module-v1'&&recipe.id===id&&Array.isArray(recipe.parts)&&recipe.parts.length>0&&recipe.parts.length<=8&&typeof recipe.prefix==='string'&&Buffer.byteLength(recipe.prefix)<=16384,'complete bounded derivation recipe');
 const originalPath=local(root,recipe.originalPath),path=local(root,recipe.path),before=read(originalPath),current=read(path,true);need(before===recipe.source&&Buffer.byteLength(before)===recipe.bytes&&hash(before)===recipe.sha256,'complete original source differs');const ts=ownershipCompiler();need(ts.version==='5.9.3','lockfile TypeScript 5.9.3');const original=parsed(ts,originalPath,before),seen=new Set(),parts=[],selections=[];
 const result=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:extract-and-substitute-actual-original-inverse-functions',apply:()=>{
   for(const part of recipe.parts){need(typeof part.name==='string'&&!seen.has(part.name)&&typeof part.before==='string'&&typeof part.after==='string'&&typeof part.afterName==='string','unique complete function source substitution');seen.add(part.name);const matches=original.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===part.name);need(matches.length===1,'unique native-selected original function');const node=matches[0],span=[node.getStart(original),node.end];need(before.slice(...span)===part.before,'whole original native-selected function source');const changed=parsed(ts,recipe.path,part.after);need(changed.statements.length===1&&ts.isFunctionDeclaration(changed.statements[0])&&changed.statements[0].name?.text===part.afterName,'one complete substituted function');parts.push(part.after);selections.push({kind:'function',name:part.name,span,afterName:part.afterName,sourceAuthority:false});}
   return parts.join('\n\n')+'\n';
  }}]},
  {phase:'repository',rules:[{id:id+':shared-support-imports-and-small-module-layout',apply:language=>{const after=recipe.prefix+language;parsed(ts,path,after);return {language,after};}}]},
 ]).run(null);const {language,after}=result.value;need(current===null||current===before||current===after,'unknown physical derived module');
 const stages=transportConcreteSourceEquations([{before,after:language,language:'JavaScript'},{before:language,after,language:'JavaScript'}]).map((row,index)=>({...row,phase:index?'repository':'language'}));need(stages[0].inverse===before&&stages[1].inverse===language,'complete derived source inverses');const nativeBindings=verifyNativeCopiedSourceBindingBatch(ts,[{path,source:after}])[0];need(read(originalPath)===before&&read(path,true)===current&&readFileSync(archivePath).equals(packed),'complete derivation inputs changed');
 return {schema:'native-substitution-source-copy-plan-v1',id,files:[{path:recipe.path,originalPath:recipe.originalPath,before,language,after,current,currentAfter:after,inverse:before,stages,trace:result.trace,nativeSelections:{language:selections,repository:[]},nativeBindings,laterHistories:[]}],originalInputs:[recipe],sourceAuthority:false,semanticAuthority:false,receivingExecuted:false};
}
