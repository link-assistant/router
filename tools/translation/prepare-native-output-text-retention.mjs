#!/usr/bin/env node
// A distinct storage DATA contract; original modules/APIs remain unchanged.
import {readFileSync,lstatSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {nativeOutputImports,nativeOutputHost,nativeOutputEncode,nativeOutputDecode} from './native-output-text-kernels.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url)),P='tools/translation/';
const fail=message=>{throw new TypeError('Native output retention source: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const one=(rows,label)=>{if(rows.length!==1)fail('one actual native '+label+' required');return rows[0];};
function syntax(ts,source,path){if(typeof source!=='string'||Buffer.byteLength(source)>1048576)fail('bounded whole source required');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('whole native grammar differs: '+path);const nodes=[];function walk(node){nodes.push(node);ts.forEachChild(node,walk);}walk(file);return {ts,file,nodes};}
function selection(file,node,replacement,id){return {id,span:[node.getStart(file),node.end],expected:node.getText(file),replacement};}
function concrete(source){const meta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);if(transportConcreteSyntaxMeta(meta).source!==source)fail('full CST reconstruction differs');return meta;}
function phase(ts,before,path,name,choose){
 const native=syntax(ts,before,path),edits=choose(native).sort((a,b)=>a.span[0]-b.span[0]);let delta=0,end=0,after=before;
 for(const row of edits){if(row.span[0]<end||before.slice(...row.span)!==row.expected)fail('native selections overlap or differ');row.afterSpan=[row.span[0]+delta,row.span[0]+delta+row.replacement.length];delta+=row.replacement.length-row.expected.length;end=row.span[1];}
 for(let at=edits.length-1;at>=0;at--){const row=edits[at];after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);}
 // Native selections retain every exact edit below. Whole-phase CST transport
 // also preserves merged trivia at inserted-source boundaries in its inverse.
 syntax(ts,after,path);const beforeMeta=concrete(before),rules={languageRules:[],repositoryRules:[]};rules[name+'Rules']=[{id:'native-output:'+name,edits:before===after?[]:[{span:[0,before.length],expected:before,replacement:after}]}];
 const changed=applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(beforeMeta).document,rules),afterMeta=serializeConcreteSyntaxMeta(changed.value);if(transportConcreteSyntaxMeta(afterMeta).source!==after)fail('actual native/CST substitution differs');
 let nativeInverse=after;for(const row of [...edits].reverse()){if(nativeInverse.slice(...row.afterSpan)!==row.replacement)fail('native inverse selection differs');nativeInverse=nativeInverse.slice(0,row.afterSpan[0])+row.expected+nativeInverse.slice(row.afterSpan[1]);}if(nativeInverse!==before)fail('whole native inverse differs');
 rules[name+'Rules']=[{id:'native-output:'+name+':inverse',edits:before===after?[]:[{span:[0,after.length],expected:after,replacement:before}]}];
 const inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(afterMeta).document,rules).value)).source;if(inverse!==before)fail('whole native/CST inverse differs');
 return {phase:name,before,after,beforeMeta,afterMeta,edits,inverse,trace:changed.trace,completeInverse:true};
}
function copied(ts,source,path){
 const {file}=syntax(ts,source,path),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};
 const statements=file.statements.map(node=>{const result=ts.getSynthesizedDeepClone(node);detach(result);return result;}),copy=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed}).printFile(ts.factory.updateSourceFile(file,statements));
 const shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 if(JSON.stringify(shape(file))!==JSON.stringify(shape(syntax(ts,copy,path).file)))fail('complete detached native AST differs');return {source,copy,completeNativeAstCopy:true};
}
function derive(ts,before,path,language,repository){
 const stages=[],result=createRulePipeline([{phase:'language',rules:[{id:'native-output:checked-kernels-or-preserved-bodies',apply:source=>{const row=phase(ts,source,path,'language',language);stages.push(row);return row.after;}}]},{phase:'repository',rules:[{id:'native-output:explicit-private-routes',apply:source=>{const row=phase(ts,source,path,'repository',repository);stages.push(row);return row.after;}}]}]).run(before),after=result.value;
 if(stages[0].before!==before||stages[1].before!==stages[0].after||stages[1].after!==after)fail('whole phase join differs');
 return {path,before,language:stages[0].after,after,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:stages[0].beforeMeta,afterMeta:stages[1].afterMeta,stages,trace:result.trace,inverse:before,nativeBindings:verifyNativeCopiedSourceBindings(ts,path,after),nativeCopies:[copied(ts,before,path),copied(ts,after,path)],semanticAuthority:false};
}
const empty=()=>[];
export function deriveNativeOutputTextRetention(source){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 const path=P+'private-native-output-text.mjs',original=syntax(ts,source,path),functions=original.file.statements.filter(ts.isFunctionDeclaration),selected={};
 const declarations=original.file.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]);for(const [name,expected]of [['CHUNK','65536'],['THRESHOLD','16384'],['PACKED_BUDGET','134217728']]){const declaration=one(declarations.filter(node=>ts.isIdentifier(node.name)&&node.name.text===name),'original '+name+' bound');if(!declaration.initializer||!ts.isNumericLiteral(declaration.initializer)||declaration.initializer.getText(original.file)!==expected)fail('original retention bound changed: '+name);}
 for(const [name,parameters]of [['encode',['source','start','end']],['decode',['packed','units']]]){const node=one(functions.filter(node=>node.name?.text===name),name);if(JSON.stringify(node.parameters.map(row=>row.name.getText(original.file)))!==JSON.stringify(parameters)||!node.body)fail('actual original codec signature differs');selected[name]=node;}
 const row=derive(ts,source,path,({file})=>[selection(file,selected.encode.body,nativeOutputEncode,'codec:encode-body'),selection(file,selected.decode.body,nativeOutputDecode,'codec:decode-body')],({file})=>{
  const at=one(file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='node:util'),'original util import').getStart(file);
  const encode=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='encode'),'adapted encode declaration').getStart(file);
  return [{id:'repository:trusted-native-imports',span:[at,at],expected:'',replacement:nativeOutputImports},{id:'repository:trusted-native-host',span:[encode,encode],expected:'',replacement:nativeOutputHost}];
 });
 row.copiedFrom=P+'private-output-text.mjs';return row;
}
function route(ts,source,path,mapping,extra=empty){return derive(ts,source,path,empty,native=>{
 const edits=[];for(const [before,after]of Object.entries(mapping)){const nodes=native.nodes.filter(node=>ts.isStringLiteral(node)&&node.text===before);if(!nodes.length)fail('required native route missing: '+before);for(const node of nodes)edits.push(selection(native.file,node,JSON.stringify(after),'route:'+before));}return [...edits,...extra(native)];
});}
const consumers=[
 ['retained-owned-field-bulk.mjs','native-retained-owned-field-bulk.mjs',{'./private-output-text.mjs':'./private-native-output-text.mjs'}],
 ['retained-owned-field-matrix-bulk.mjs','native-retained-owned-field-matrix-bulk.mjs',{'./retained-owned-field-bulk.mjs':'./native-retained-owned-field-bulk.mjs'}],
 ['isolated-retained-owned-field-matrix-bulk.mjs','isolated-native-retained-owned-field-matrix-bulk.mjs',{'retained-owned-field-bulk.mjs':'native-retained-owned-field-bulk.mjs','./owned-field-isolated-matrix-session.mjs':'./native-owned-field-isolated-matrix-session.mjs'}],
 ['owned-field-isolated-matrix-session.mjs','native-owned-field-isolated-matrix-session.mjs',{'./owned-field-isolated-matrix-profile.mjs':'./native-owned-field-isolated-matrix-profile.mjs'}],
 ['owned-field-isolated-matrix-profile.mjs','native-owned-field-isolated-matrix-profile.mjs',{}],
];
function admission({ts,file,nodes}){const declaration=one(nodes.filter(node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='allowed'),'original private planner admission');if(!ts.isNewExpression(declaration.initializer)||declaration.initializer.expression.getText(file)!=='Set'||declaration.initializer.arguments.length!==1)fail('actual original admission constructor differs');const list=declaration.initializer.arguments[0];if(!ts.isArrayLiteralExpression(list)||JSON.stringify(list.elements.map(row=>row.text))!==JSON.stringify(['owned-field-bulk.mjs','retained-owned-field-bulk.mjs']))fail('actual original two-planner boundary differs');return [selection(file,list,'["native-retained-owned-field-bulk.mjs"]','repository:native-only-private-planner')];}
export async function prepareNativeOutputTextRetention({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');const inputs=[],read=path=>{const full=resolve(root,path),stat=lstatSync(full);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)fail('whole regular source input required: '+path);const raw=readFileSync(full),source=raw.toString('utf8');if(!Buffer.from(source).equals(raw))fail('source UTF8 differs');inputs.push({path,source,bytes:raw.length,sha256:hash(raw)});return source;};
 const priorSource=read(P+'prepare-owned-field-bulk.mjs');const {prepareOwnedFieldBulkSources,assertOwnedFieldBulkInputsFresh}=await import(pathToFileURL(resolve(root,P+'prepare-owned-field-bulk.mjs')));
 const prior=prepareOwnedFieldBulkSources({root});if(prior.files.length!==9)fail('all nine original owned-field equations required');for(const row of prior.files)if(read(row.path)!==row.text)fail('actual owned-field prerequisite stale: '+row.path);
 if(readFileSync(resolve(root,P+'prepare-owned-field-bulk.mjs'),'utf8')!==priorSource)fail('original producer changed during import');
 const files=[deriveNativeOutputTextRetention(read(P+'private-output-text.mjs'))];
 for(const [before,after,mapping]of consumers)files.push(route(ts,read(P+before),P+after,mapping,before.includes('-session.')||before.includes('-profile.')?admission:empty));
 const cli='scripts/translate-router-owned-field-meta.mjs';files.push(route(ts,read(cli),'scripts/translate-router-native-owned-field-meta.mjs',{
  'isolated-retained-owned-field-matrix-bulk.mjs':'isolated-native-retained-owned-field-matrix-bulk.mjs',
  '../tools/translation/retained-owned-field-bulk.mjs':'../tools/translation/native-retained-owned-field-bulk.mjs',
  '../tools/translation/retained-owned-field-matrix-bulk.mjs':'../tools/translation/native-retained-owned-field-matrix-bulk.mjs',
 },({file,nodes})=>{const marker=one(file.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>ts.isIdentifier(row.name)&&row.name.text==='progressStarted')),'post-argument original boundary');return [{id:'repository:explicit-native-cli-contract',span:[marker.getStart(file),marker.getStart(file)],expected:'',replacement:"if(!retainOutputText||ownedCoreDefinitions)throw new TypeError('Native owned-field CLI requires --retain-output-text and does not support --owned-core-definitions');\n"}];}));
 for(const row of files){try{const path=resolve(root,row.path),stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)fail('regular bounded current native source required: '+row.path);row.current=readFileSync(path,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;row.current='';}if(row.current!==''&&row.current!==row.after)fail('unknown existing native output: '+row.path);}
 for(const name of ['prepare-native-output-text-retention.mjs','native-output-text-kernels.mjs','source-copy-native-bindings.mjs','rule-pipeline.mjs','concrete-syntax-meta.mjs','js-to-rust/vendor/module-syntax.mjs'])read(P+name);
 const plan={schema:'native-output-retention-source-proposal-v1',root,files,inputs,prerequisites:{ownedField:prior},typescriptVersion:ts.version,originalAPIsUnchanged:true,arbitraryObserverEquivalent:false,compressionObservationsEquivalent:false,storageLimitsUnchanged:true,semanticAuthority:false,performanceQualified:false};assertOwnedFieldBulkInputsFresh(prior);assertNativeOutputTextInputsFresh(plan);return plan;
}
export function assertNativeOutputTextInputsFresh({root,inputs,prerequisites,files=[]}){for(const row of [...inputs,...(prerequisites?.ownedField?.inputs??[])]){const path=resolve(root,row.path),stat=lstatSync(path),bytes=readFileSync(path);if(!stat.isFile()||stat.isSymbolicLink()||bytes.length!==row.bytes||hash(bytes)!==row.sha256||bytes.toString('utf8')!==row.source)fail('complete source input changed: '+row.path);}for(const row of files){let current='';try{const path=resolve(root,row.path),stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink())fail('current source output changed: '+row.path);current=readFileSync(path,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}if(current!==row.current)fail('current source output changed: '+row.path);}return true;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(!(args.length===1&&args[0]==='--check'||args.length===2&&args[0]==='--emit'))fail('Use --check | --emit FRESH_OUTSIDE_DIRECTORY');const proposal=await prepareNativeOutputTextRetention();
 if(args[0]==='--check'){for(const row of proposal.files)if(row.current!==row.after)fail('native output stale: '+row.path);assertNativeOutputTextInputsFresh(proposal);console.log(JSON.stringify({fresh:true,files:proposal.files.map(({path,afterSha256})=>({path,sha256:afterSha256})),qualified:false}));}
 else{const folder=resolve(args[1]);if(!relative(ROOT,folder).startsWith('..'+sep)||!relative(folder,ROOT).startsWith('..'+sep))fail('fresh external source proposal directory required');mkdirSync(folder);const raw=Buffer.from(JSON.stringify(proposal)+'\n');if(raw.length>64*1024*1024)fail('complete source proposal byte bound');const path=resolve(folder,'complete-native-output-retention-source-proposal.json.gz');assertNativeOutputTextInputsFresh(proposal);writeFileSync(path,gzipSync(raw),{flag:'wx'});if(!gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024}).equals(raw))fail('full source proposal readback differs');assertNativeOutputTextInputsFresh(proposal);console.log(JSON.stringify({proposal:path,installed:false,qualified:false,files:proposal.files.map(({path,afterSha256})=>({path,sha256:afterSha256}))}));}
}
