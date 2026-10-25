// Exact original method-token candidates. These observations issue no permits.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {rustTokens} from './rust-structure.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const INPUT=new URL('./extensions/text.mjs',import.meta.url);
const need=(value,message)=>{if(!value)throw new TypeError('Text method inverse source: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const OPS=new Set(['contains','starts_with','ends_with']);
function walk(ts,node,visit){
 let cells=0;const next=(node,depth=0)=>{need(++cells<=200000&&depth<=256,'complete original syntax bound');visit(node);ts.forEachChild(node,child=>next(child,depth+1));};next(node);
}
function sourceOrigins(proof,source,index){
 const origins=new Map(),deltas=new Set([0,proof.span.start-proof.checkedSpan.start]);let cells=0;
 const visit=(node,depth=0)=>{
  if(!node||typeof node!=='object')return;need(++cells<=100000&&depth<=160,'complete actual checked text origin bound');
  if(Array.isArray(node)){for(const child of node)visit(child,depth+1);return;}
  if(typeof node.k!=='string')return;
  if(node.k==='routerTextPattern'&&OPS.has(node.op)&&node.span){
   for(const delta of deltas){const start=node.span.start+delta,end=node.span.end+delta;if(start<proof.span.start||end>proof.span.end||end<=start)continue;const key=start+':'+end+':'+node.op;origins.set(key,{start,end,op:node.op});}
  }
  for(const [key,child]of Object.entries(node))if(!['type','span'].includes(key)&&child&&typeof child==='object'&&(Array.isArray(child)||typeof child.k==='string'))visit(child,depth+1);
 };
 visit(proof.declaration.body);const result=new Map();
 for(const origin of origins.values()){
  const matches=[],tokens=index.get(origin.op)??[];let low=0,high=tokens.length;while(low<high){const middle=(low+high)>>>1;if(tokens[middle].start<origin.start)low=middle+1;else high=middle;}for(let at=low;at<tokens.length&&tokens[at].end<=origin.end;at++)matches.push(tokens[at]);
  if(matches.length!==1)continue;const token=matches[0];result.set(token.start+':'+token.end,{op:origin.op,span:[token.start,token.end],before:source.slice(token.start,token.end),originalCall:{span:[origin.start,origin.end],source:source.slice(origin.start,origin.end)},sourceAuthority:false,semanticAuthority:false});
 }
 return [...result.values()].sort((a,b)=>a.span[0]-b.span[0]);
}
export function captureTextMethodInverseSource(){
 const ts=ownershipCompiler(),bytes=readFileSync(INPUT),source=bytes.toString('utf8');need(bytes.length<=1048576&&Buffer.from(source).equals(bytes),'bounded lossless complete original text emitter');const concrete=transportConcreteSyntaxSource(source,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===source,'complete original text source CST inverse');
 const file=ts.createSourceFile('original-text-emitter.mjs',concrete.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);need(!file.parseDiagnostics.length,'complete actual original emitter grammar');const classes=file.statements.filter(node=>ts.isClassDeclaration(node)&&node.name?.text==='TextEmitter');need(classes.length===1,'actual original TextEmitter declaration');const methods=classes[0].members.filter(node=>ts.isMethodDeclaration(node)&&node.name?.getText(file)==='expr');need(methods.length===1&&methods[0].body,'actual original text expression emitter');const tables=[];
 walk(ts,methods[0].body,node=>{if(!ts.isObjectLiteralExpression(node)||node.properties.length!==3)return;const entries=[];for(const property of node.properties){if(!ts.isPropertyAssignment(property)||!ts.isIdentifier(property.name)||!OPS.has(property.name.text)||!ts.isStringLiteral(property.initializer))return;entries.push([property.name.text,property.initializer.text]);}if(new Set(entries.map(row=>row[0])).size===3&&new Set(entries.map(row=>row[1])).size===3)tables.push({entries,span:[node.getStart(file),node.end],source:node.getText(file)});});
 need(tables.length===1,'unique actual original text predicate emission table');const table=tables[0],forward=new Map(table.entries),reverse=new Map(table.entries.map(([rust,target])=>[target,rust]));
 const calls=row=>{const result=[];walk(ts,row.expression,node=>{if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&reverse.has(node.expression.name.text)){need(!node.questionDotToken&&!node.expression.questionDotToken&&!node.typeArguments?.length&&node.arguments.length===1&&!ts.isSpreadElement(node.arguments[0]),'complete original text predicate call syntax');result.push({method:node.expression.name.text,start:node.expression.name.getStart(row.file),end:node.expression.name.end});}});return result.sort((a,b)=>a.start-b.start);};
 const indexes=new Map(); // Fresh invocation only, never retained across proposals.
 const sourceIndex=source=>{
  if(indexes.has(source))return indexes.get(source);const tokens=rustTokens(source).filter(token=>token.type!=='comment'),index=new Map();
  for(let at=1;at+1<tokens.length;at++){const token=tokens[at];if(token.type==='ident'&&OPS.has(token.text)&&tokens[at-1].text==='.'&&tokens[at+1].text==='('){if(!index.has(token.text))index.set(token.text,[]);index.get(token.text).push(token);}}
  indexes.set(source,index);return index;
 };
 const verify=()=>need(readFileSync(INPUT).equals(bytes),'complete original text emitter changed during proposal');
 return {
  selectEdits(change,proof,source){
   verify();const before=calls(change.before),after=calls(change.after);need(before.length>0&&before.length===after.length&&before.length<=4096,'complete original/requested text predicate membership');let oldEnd=change.before.start,newEnd=change.after.start;const edits=[],origins=sourceOrigins(proof,source,sourceIndex(source)),byOperation=new Map(),counts=new Map();
   for(const origin of origins){if(!byOperation.has(origin.op))byOperation.set(origin.op,[]);byOperation.get(origin.op).push(origin);}
   for(const row of before){const op=reverse.get(row.method);counts.set(op,(counts.get(op)??0)+1);}
   for(const [op,count]of counts)need(byOperation.get(op)?.length===count,'complete checked original text/source predicate multiplicity');const ordinals=new Map();
   for(let index=0;index<before.length;index++){
    const left=before[index],right=after[index];need(change.before.source.slice(oldEnd,left.start)===change.after.source.slice(newEnd,right.start),'only actual text predicate method tokens may change');const op=reverse.get(left.method),ordinal=ordinals.get(op)??0,origin=byOperation.get(op)[ordinal];ordinals.set(op,ordinal+1);
    if(left.method!==right.method)edits.push({...origin,replacement:reverse.get(right.method),kind:'text-predicate-method'});oldEnd=left.end;newEnd=right.end;
   }
   need(change.before.source.slice(oldEnd,change.before.end)===change.after.source.slice(newEnd,change.after.end),'complete text body suffix must remain exact');need(edits.length>0,'an actual text predicate operation change is required');return edits;
  },
  verify,
  evidence:{schema:'original-text-predicate-inverse-source-v1',path:'tools/translation/extensions/text.mjs',source,bytes:bytes.length,sha256:hash(bytes),table,operations:[...forward].map(([rust,target])=>({rust,target})),sourceAuthority:false,semanticAuthority:false},
 };
}
