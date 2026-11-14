// Preparation DATA for fresh private lexer records; no compiler authority.
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const PATH='tools/translation/source-module-views.mjs';
const PIN='cf6b4bb324cb616451400f16da77da5b7203f558e7fc258dc4e09aabe875fa42';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Private module item freeze source: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one exact '+label+' required');return rows[0];};
function apply(source,edits){
 let result=source,end=source.length+1;
 for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(row.span[1]>end||result.slice(...row.span)!==row.expected)fail('native source spans differ');
  end=row.span[0];result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);
 }
 return result;
}
const FREEZE=`\nfunction freezePrivateModuleItems(items,ordinaryTokens){
  if(!ordinaryTokens||!originalStaticSourceIntrinsicsUnchanged())return freeze(items);
  // These fresh native lexer records contain only four scalar token fields.
  // Customized operations retain the complete original recursive freeze route.
  for(const item of items){
    for(const token of item.tokens)Object.freeze(token);
    Object.freeze(item.tokens);Object.freeze(item);
  }
  return Object.freeze(items);
}`;
export function deriveModuleItemNativeFreeze(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>1048576||hash(source)!==PIN)fail('complete original source pin differs');
 const original=transportConcreteSyntaxSource(source,{language:'JavaScript'}),reparsed=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(original.document));
 if(reparsed.source!==source)fail('complete original CST reconstruction differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const file=ts.createSourceFile(PATH,reparsed.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('complete original native grammar differs');
 const absolute=resolve(PATH),host={getSourceFile:name=>name===absolute?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>resolve('/'),getDirectories:()=>[],fileExists:name=>name===absolute,readFile:name=>name===absolute?source:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 const checker=ts.createProgram([absolute],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker();
 const owner=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='originalItems'),'original item owner');
 const declarations=[],captures=[],stores=[];
 function visit(node){
  if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='items'&&node.initializer)declarations.push(node);
  if(ts.isVariableDeclaration(node)&&node.getText(file)==='items=originalItems(source,bodySpan,budget)')captures.push(node);
  if(ts.isPropertyAssignment(node)&&node.getText(file)==='items:freeze(items)')stores.push(node);
  ts.forEachChild(node,visit);
 }
 visit(file);
 const items=one(declarations.filter(node=>node.pos>=owner.pos&&node.end<=owner.end),'fresh private items declaration');
 const result=one(owner.body.statements.filter(ts.isReturnStatement),'original items return');
 if(result.getText(file)!=='return items;'||checker.getSymbolAtLocation(result.expression)!==checker.getSymbolAtLocation(items.name))fail('genuine private items binding differs');
 const capture=one(captures,'original visit capture'),store=one(stores,'original private item storage');
 if(!ts.isCallExpression(capture.initializer)||checker.getSymbolAtLocation(capture.initializer.expression)!==checker.getSymbolAtLocation(owner.name))fail('genuine private item call differs');
 const edits=[
  {span:[result.getStart(file),result.end],expected:result.getText(file),replacement:'return {items,ordinaryTokens};'},
  {span:[owner.end,owner.end],expected:'',replacement:FREEZE},
  {span:[capture.getStart(file),capture.end],expected:capture.getText(file),replacement:'{items,ordinaryTokens}=originalItems(source,bodySpan,budget)'},
  {span:[store.getStart(file),store.end],expected:store.getText(file),replacement:'items:freezePrivateModuleItems(items,ordinaryTokens)'},
 ];
 const after=apply(source,edits);let delta=0;
 const inverseEdits=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{const start=row.span[0]+delta;delta+=row.replacement.length-row.expected.length;return {span:[start,start+row.replacement.length],expected:row.replacement,replacement:row.expected};});
 if(apply(after,inverseEdits)!==source)fail('complete native source inverse differs');
 const fresh=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(after,{language:'JavaScript'}).document));
 if(fresh.source!==after||ts.createSourceFile(PATH,fresh.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)fail('complete proposed native grammar differs');
 return {schema:'private-module-item-native-freeze-source-v1',source,sourceSha256:PIN,after,afterSha256:hash(after),edits,inverseEdits,inverse:source,nativeVersion:ts.version,nativePrivateItemBinding:true,nativePrivateCallBinding:true,sourceAuthority:false,runtimeAuthority:false};
}
