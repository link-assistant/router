// Source substitution DATA only. No class, source, body or runtime permit.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {encodeRegisteredJsonProgram,decodeRegisteredJsonProgram} from './registered-json-storage.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const fail=message=>{throw new TypeError('Class program storage: '+message);};
const hash=source=>createHash('sha256').update(source).digest('hex');
function parse(ts,source){const file=ts.createSourceFile('class-program.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native syntax required');return file;}
function decoderSource(ts){
 const source=readFileSync(new URL('./registered-json-storage.mjs',import.meta.url),'utf8'),file=parse(ts,source),selected=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='decodeRegisteredJsonProgram');
 if(selected.length!==1)fail('one actual decoder declaration required');
 const actual=selected[0].getText(file);if(!actual.startsWith('export function '))fail('actual named exported decoder required');
 return {source,declaration:actual.slice('export '.length)+'\n',span:[selected[0].getStart(file),selected[0].end]};
}
function programDeclaration(ts,file){
 const rows=[];for(const statement of file.statements)if(ts.isVariableStatement(statement))for(const node of statement.declarationList.declarations)if(ts.isIdentifier(node.name)&&node.name.text==='PROGRAM')rows.push(node);
 if(rows.length!==1||!rows[0].initializer)fail('one complete PROGRAM initializer required');return rows[0];
}
function literalProgram(ts,file,node,decoder){
 if(ts.isObjectLiteralExpression(node)){
  const wire=node.getText(file);let value;try{value=JSON.parse(wire);}catch{fail('complete JSON object literal required');}
  function keys(value){if(value&&typeof value==='object'){if(Object.hasOwn(value,'__proto__'))fail('prototype-initializing literal is outside this storage rule');for(const key of Object.keys(value))keys(value[key]);}}keys(value);
  if(JSON.stringify(value)!==wire)fail('canonical complete original JSON required');return wire;
 }
 if(!ts.isConditionalExpression(node)||!['initial','initial&&decodeNative'].includes(node.condition.getText(file))||node.whenFalse.kind!==ts.SyntaxKind.NullKeyword||!ts.isCallExpression(node.whenTrue)||!ts.isIdentifier(node.whenTrue.expression)||node.whenTrue.expression.text!=='decodeRegisteredJsonProgram')fail('unrecognized PROGRAM source representation');
 const definitions=file.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text==='decodeRegisteredJsonProgram');if(definitions.length!==1||definitions[0].getText(file)+'\n'!==decoder.declaration)fail('current fixed decoder source differs');
 const args=node.whenTrue.arguments;if(args.length!==4||!ts.isStringLiteral(args[0])||args.slice(1).some(arg=>!ts.isNumericLiteral(arg)))fail('own primitive fixed storage arguments required');
 return JSON.stringify(decodeRegisteredJsonProgram(args[0].text,...args.slice(1).map(arg=>Number(arg.text))));
}
/** Fixed existing leaf representation. Supplying DATA grants no authority. */
export function renderClassProgramStorage({source,programText}={}){
 if(typeof source!=='string'||Buffer.byteLength(source)>262144||programText!==undefined&&typeof programText!=='string')fail('bounded complete source and optional program JSON required');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');const file=parse(ts,source),decoder=decoderSource(ts),binding=programDeclaration(ts,file),initializers=[];
 for(const statement of file.statements)if(ts.isVariableStatement(statement))for(const node of statement.declarationList.declarations)if(ts.isIdentifier(node.name)&&node.name.text==='initial')initializers.push(node);
 if(initializers.length!==1||initializers[0].initializer?.getText(file)!=='common()&&privateParserHostAvailable()')fail('original fixed guarded host initializer required');
 for(const name of ['checked','fail','decode'])if(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name).length!==1)fail('original private decoder helper missing or ambiguous');
 const beforeWire=literalProgram(ts,file,binding.initializer,decoder),wire=programText??beforeWire;let storage;
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'registered-json:encode-complete-canonical-DATA-with-identical-values',apply:()=>{
   storage=encodeRegisteredJsonProgram(wire);if(JSON.stringify(decodeRegisteredJsonProgram(storage.encoded,storage.expandedBytes,storage.blockBytes,storage.storageBytes))!==wire)fail('whole program storage inverse differs');return source;
  }}]},
  {phase:'repository',rules:[{id:'class-birth:fixed-private-guarded-storage-and-native-decoder-copy',apply:source=>{
   const replacement='initial&&decodeNative?decodeRegisteredJsonProgram('+JSON.stringify(storage.encoded)+','+storage.expandedBytes+','+storage.blockBytes+','+storage.storageBytes+'):null',edits=[{span:[binding.initializer.getStart(file),binding.initializer.end],expected:binding.initializer.getText(file),replacement}];
   const declarations=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='decodeRegisteredJsonProgram');if(declarations.length>1)fail('duplicate private decoder');
   if(declarations.length){const node=declarations[0];edits.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:decoder.declaration.trimEnd()});}else edits.push({span:[source.length,source.length],expected:'',replacement:'\n'+decoder.declaration});
   let text=source,end=source.length;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(edit.span[1]>end||source.slice(...edit.span)!==edit.expected)fail('native edit preimage differs or overlaps');text=text.slice(0,edit.span[0])+edit.replacement+text.slice(edit.span[1]);end=edit.span[0];}
   if(Buffer.byteLength(text)>262144)fail('original complete leaf source-authentication bound');parse(ts,text);
   const first=transportConcreteSyntaxSource(source,{language:'JavaScript'}),beforeMeta=serializeConcreteSyntaxMeta(first.document),run=applyConcreteSyntaxSubstitutions(first.document,{languageRules:[{id:'javascript:retain-complete-original-source-and-native-spans',edits:[]}],repositoryRules:[{id:'class-birth:whole-source-storage-substitution',edits:[{span:[0,source.length],expected:source,replacement:text}]}]}),afterMeta=serializeConcreteSyntaxMeta(run.value);if(transportConcreteSyntaxMeta(afterMeta).source!==text)fail('complete reparsed source differs');
   const inverse=applyConcreteSyntaxSubstitutions(run.value,{languageRules:[],repositoryRules:[{id:'class-birth:restore-complete-source',edits:[{span:[0,text.length],expected:text,replacement:source}]}]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)fail('complete source inverse differs');
   return {source,text,beforeMeta,afterMeta,inverse:source,nativeEdits:edits,decoderSource:decoder,beforeProgramJson:beforeWire,programJson:wire,storage,sourceSha256:hash(source),sha256:hash(text),sourceAuthority:false,runtimeAuthority:false};
  }}]},
 ]);const result=pipeline.run(null);return {...result.value,trace:result.trace};
}
