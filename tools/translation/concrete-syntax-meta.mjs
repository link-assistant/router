// Concrete syntax is a lossless representation level, not a semantic proof.
// Existing semantic frontends must independently check reconstructed source.
import {types} from 'node:util';
import {assertPrivateParserExecution,privateParserHostAvailable,lexPrivateConcreteSource,transportPrivateConcreteSource,transportPrivateConcreteMeta,transportPrivateConcreteSources} from './private-parser-execution.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,
  originalCapturedFunctionSource,throwOriginalCapturedTypeError,originalPrivateParserIngressUnchanged} from './original-json-intrinsics.mjs';

export const CONCRETE_SYNTAX_SCHEMA='meta-language-concrete-syntax-v1';
// Exact RepresentationLevel.ConcreteSyntax value from the pinned vendored
// language-support.js schema; importing its unrelated capability table would
// add unqualified freeze/collection work before this reader's ingress guard.
const CONCRETE_REPRESENTATION='concrete-syntax';
const SOURCE_LIMIT=2097152,BYTE_LIMIT=8388608,NODE_LIMIT=200000,DEPTH_LIMIT=256;
const SERIAL_LIMIT=33554432,RULE_LIMIT=256,EDIT_LIMIT=4096,TOTAL_EDIT_LIMIT=16384;
const initial=originalPrivateParserIngressUnchanged()&&privateParserHostAvailable()&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
let pins=null,descriptor=null,ownKeys=null,prototype=null,isArray=null,isProxy=null,freeze=null;
let stringify=null,parse=null,define=null,numberValue=null,bigIntValue=null,fromCodePoint=null,errorPrototype=null,errorConstructor=null,functionPrototype=null;
// Optional capture has no observable reflection work when common ingress fails.
if(initial){
  descriptor=Object.getOwnPropertyDescriptor;ownKeys=Reflect.ownKeys;prototype=Object.getPrototypeOf;
  isArray=Array.isArray;isProxy=types.isProxy;freeze=Object.freeze;define=Object.defineProperty;
  const candidates=[[globalThis,'Number','Number'],[globalThis,'BigInt','BigInt'],
    [JSON,'parse','parse'],[String,'fromCodePoint','fromCodePoint'],[globalThis,'Error','Error'],[Array,'from','from']];
  const selected=[];let valid=true;
  for(let at=0;at<candidates.length;at++){
    const [owner,key,name]=candidates[at],field=descriptor(owner,key);
    if(!field||!Object.hasOwn(field,'value')||!native(field.value,name)){valid=false;break;}
    selected.push({owner,key,field});
  }
  if(valid){
    const math=descriptor(globalThis,'Math');
    if(!math||!Object.hasOwn(math,'value')||math.value===null||typeof math.value!=='object'||isProxy(math.value))valid=false;
    else{
      const min=descriptor(math.value,'min');
      if(!min||!Object.hasOwn(min,'value')||!native(min.value,'min'))valid=false;
      else selected.push({owner:globalThis,key:'Math',field:math},{owner:math.value,key:'min',field:min});
    }
  }
  if(valid){
    const error=selected[4].field.value,field=descriptor(error,'prototype'),parent=field?.value;
    if(!field||!Object.hasOwn(field,'value')||parent===null||typeof parent!=='object'||isProxy(parent)||prototype(parent)!==Object.prototype)valid=false;
    else{
      errorPrototype=parent;errorConstructor=error;functionPrototype=prototype(function syntaxCapture(){});
      selected.push({owner:error,key:'prototype',field});
      for(const key of ['name','message']){
        const item=descriptor(parent,key);
        if(!item||!Object.hasOwn(item,'value')||typeof item.value!=='string'||item.writable!==true){valid=false;break;}
        selected.push({owner:parent,key,field:item});
      }
    }
  }
  if(valid&&!errorLimitSafe())valid=false;
  if(valid){
    const big=selected[1].field.value,bigPrototype=descriptor(big,'prototype');
    const method=bigPrototype&&Object.hasOwn(bigPrototype,'value')&&!isProxy(bigPrototype.value)?descriptor(bigPrototype.value,'toString'):null;
    if(!method||!Object.hasOwn(method,'value')||!native(method.value,'toString'))valid=false;
    else selected.push({owner:bigPrototype.value,key:'toString',field:method});
  }
  if(valid){
    numberValue=selected[0].field.value;bigIntValue=selected[1].field.value;
    parse=selected[2].field.value;fromCodePoint=selected[3].field.value;stringify=JSON.stringify;
    try{valid=numberValue('1.5')===1.5&&bigIntValue('19').toString()==='19'&&
      fromCodePoint(128512)==='😀'&&parse('{"a":1}').a===1&&Math.min(7,3)===3&&
      isArray(Array.from({length:2},(_,at)=>at));}catch{valid=false;}
    if(valid)pins=selected;
  }
}
function native(value,name){
  const text=originalCapturedFunctionSource(value);
  return typeof text==='string'&&text.replace(/\s/gu,'')==='function'+name+'(){[nativecode]}';
}
function guard(){
  if(!originalPrivateParserIngressUnchanged()||!pins||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())return false;
  if(prototype(errorPrototype)!==Object.prototype||!errorLimitSafe())return false;
  // The pinned JavaScript lexer uses single-character escape lookup records.
  // Unknown inherited escape slots must not execute a user getter.
  const inherited=ownKeys(Object.prototype);
  for(let at=0;at<inherited.length;at++)if(typeof inherited[at]==='string'&&inherited[at].length===1)return false;
  for(const key of ['kind','reason','span','details'])if(descriptor(errorPrototype,key)||descriptor(Object.prototype,key))return false;
  for(let at=0;at<pins.length;at++){
    const pin=pins[at],now=descriptor(pin.owner,pin.key),old=pin.field;
    if(!now||!Object.hasOwn(now,'value')||now.value!==old.value||now.enumerable!==old.enumerable||
      now.configurable!==old.configurable||now.writable!==old.writable)return false;
  }
  return true;
}
function errorLimitSafe(){
  // Providers construct native Error subclasses on lexical refusal. Do not
  // assume a host reads a custom limit without invoking its accessor/coercion.
  if(!errorConstructor||prototype(errorConstructor)!==functionPrototype||prototype(functionPrototype)!==Object.prototype)return false;
  for(let owner=errorConstructor;owner!==null;owner=prototype(owner)){
    const field=descriptor(owner,'stackTraceLimit');
    if(field)return Object.hasOwn(field,'value')&&typeof field.value==='number';
  }
  return true;
}
function fail(reason){throwOriginalCapturedTypeError('Concrete syntax meta: '+reason);}
function checked(){assertPrivateParserExecution();if(!guard())fail('native syntax operations changed');}
const integer=value=>typeof value==='number'&&value>=0&&value<=9007199254740991&&value%1===0;
function text(value,limit,label){if(typeof value!=='string'||value.length>limit)fail(label+' requires bounded primitive text');return value;}
function record(value,names,label){
  if(value===null||typeof value!=='object'||isProxy(value)||isArray(value))fail(label+' requires own data');
  const parent=prototype(value);if(parent!==Object.prototype&&parent!==null)fail(label+' has foreign prototype');
  const keys=ownKeys(value);if(keys.length!==names.length)fail(label+' has unexpected fields');
  // Reject unknown keys before any descriptor: a lazy stack must never format.
  for(let at=0;at<keys.length;at++)if(typeof keys[at]!=='string'||!names.includes(keys[at]))fail(label+' has unexpected fields');
  const result={};
  for(let at=0;at<names.length;at++){
    const key=names[at],field=descriptor(value,key);
    if(!field||!Object.hasOwn(field,'value')||field.enumerable!==true)fail(label+' requires enumerable own data');
    define(result,key,{__proto__:null,value:field.value,enumerable:true,writable:true,configurable:true});
  }
  return result;
}
function dense(value,limit,label){
  if(value===null||typeof value!=='object'||isProxy(value)||!isArray(value)||prototype(value)!==Array.prototype)fail(label+' requires a dense array');
  const keys=ownKeys(value),length=descriptor(value,'length');
  if(!length||!Object.hasOwn(length,'value')||!integer(length.value)||length.value>limit||keys.length!==length.value+1)fail(label+' requires a bounded dense array');
  for(let at=0;at<keys.length;at++)if(keys[at]!=='length'&&keys[at]!==''+at)fail(label+' requires ordered array fields');
  const out=[];
  for(let at=0;at<length.value;at++){
    const field=descriptor(value,''+at);
    if(!field||!Object.hasOwn(field,'value')||field.enumerable!==true)fail(label+' requires enumerable own data');
    out.push(field.value);
  }
  return out;
}
function freezeDocument(doc){
  for(let at=0;at<doc.nodes.length;at++)freeze(doc.nodes[at]);
  for(let at=0;at<doc.diagnostics.length;at++)freeze(doc.diagnostics[at]);
  freeze(doc.nodes);freeze(doc.diagnostics);freeze(doc.sourceEncoding);freeze(doc.authority);return freeze(doc);
}
function byteCursor(source){
  let at=0,bytes=0,wellFormed=true;
  return {to(end){
    while(at<end){
      const unit=source.charCodeAt(at);
      if(unit>=55296&&unit<=56319&&at+1<source.length){
        const next=source.charCodeAt(at+1);
        if(next>=56320&&next<=57343){if(at+2>end)throw 'split-surrogate';bytes+=4;at+=2;continue;}
      }
      if(unit>=55296&&unit<=57343)wellFormed=false;
      bytes+=unit<=127?1:unit<=2047?2:3;at++;
    }
    if(at!==end)throw 'nonmonotonic-boundary';return bytes;
  },encoding(){return {utf16CodeUnits:source.length,utf8Bytes:bytes,wellFormedUnicode:wellFormed,
    utf8BytePreservation:wellFormed,utf8Mapping:wellFormed?'unicode-scalar-boundaries':'unicode-replacement'};}};
}
const roles={ident:'identifier',identifier:'identifier',macro:'macro',number:'number',string:'string',
  template:'template',regex:'regex',char:'char',punct:'punct',comment:'comment'};
function candidates(source,language){
  const rows=[];
  if(language==='Rust'){
    const tokens=lexPrivateConcreteSource(source,'Rust');
    for(let at=0;at<tokens.length;at++){
      const token=tokens[at];rows.push([token.start,token.end,roles[token.type],token.text]);
    }
  }else{
    const result=lexPrivateConcreteSource(source,'JavaScript');
    for(let at=0;at<result.tokens.length;at++){
      const token=result.tokens[at];if(token.kind==='eof')continue;
      rows.push([token.start,token.end,roles[token.kind],token.raw]);
    }
    for(let at=0;at<result.comments.length;at++){
      const token=result.comments[at];rows.push([token.start,token.end,'comment',token.text]);
    }
    rows.sort((left,right)=>left[0]-right[0]);
  }
  return rows;
}
function opaque(source,language,status,reason){
  const cursor=byteCursor(source),end=cursor.to(source.length),nodes=[['root','file',0,source.length,0,end,-1]];
  if(source.length)nodes.push([status,'whole-source',0,source.length,0,end,0]);
  return finish(source,language,status,nodes,[[reason,0,source.length]],cursor.encoding());
}
function finish(source,language,status,nodes,diagnostics,sourceEncoding){
  if(sourceEncoding.utf8Bytes>BYTE_LIMIT)fail('UTF8 byte budget exceeded');
  return freezeDocument({schema:CONCRETE_SYNTAX_SCHEMA,representationLevel:CONCRETE_REPRESENTATION,
    language,source,sourceEncoding,status,nodes,diagnostics,
    authority:{type:false,owner:false,executable:false}});
}
function build(source,language){
  let rows;
  try{rows=candidates(source,language);}catch{checked();return opaque(source,language,'error','lexer-refused');}
  checked();
  if(rows.length>=NODE_LIMIT)return opaque(source,language,'opaque','node-budget');
  // A division token may instead start a regex in grammar contexts outside
  // this provider's portable frontend. Do not call its braces structural.
  if(language!=='Rust'&&rows.some(row=>row[2]==='punct'&&(row[3]==='/'||row[3]==='/=')))
    return opaque(source,language,'opaque','slash-context');
  const nodes=[['root','file',0,source.length,0,0,-1]],stack=[0],cursor=byteCursor(source);
  const pairs={'{':['}','brace'],'(':[')','paren'],'[':[']','bracket']};
  let at=0;
  function leaf(kind,role,start,end){
    if(nodes.length>=NODE_LIMIT)throw 'node-budget';
    const begin=cursor.to(start),stop=cursor.to(end);nodes.push([kind,role,start,end,begin,stop,stack[stack.length-1]]);
  }
  try{
    for(let index=0;index<rows.length;index++){
      const [start,end,role,raw]=rows[index];
      if(!integer(start)||!integer(end)||start<at||end<=start||end>source.length||!role||raw!==source.slice(start,end))throw 'provider-partition';
      if(start>at){const gap=source.slice(at,start);if(!/^\s+$/u.test(gap))throw 'unclassified-source';leaf('trivia',gap==='\ufeff'?'bom':'whitespace',at,start);}
      const spelling=source.slice(start,end),pair=role==='punct'?pairs[spelling]:null;
      if(pair){
        if(stack.length>=DEPTH_LIMIT)throw 'delimiter-depth';
        const group=nodes.length;nodes.push(['group',pair[1],start,0,cursor.to(start),0,stack[stack.length-1]]);
        stack.push(group);leaf('token','delimiter',start,end);
      }else if(role==='punct'&&(spelling==='}'||spelling===')'||spelling===']')){
        const group=nodes[stack[stack.length-1]],wanted=group[1]==='brace'?'}':group[1]==='paren'?')':group[1]==='bracket'?']':null;
        if(wanted!==spelling)throw 'delimiter-mismatch';
        leaf('token','delimiter',start,end);group[3]=end;group[5]=cursor.to(end);stack.pop();
      }else leaf(role==='comment'?'trivia':'token',role,start,end);
      at=end;
    }
    if(at<source.length){if(!/^\s+$/u.test(source.slice(at)))throw 'unclassified-source';leaf('trivia',source.slice(at)==='\ufeff'?'bom':'whitespace',at,source.length);}
    if(stack.length!==1)throw 'delimiter-unclosed';
    nodes[0][5]=cursor.to(source.length);
    return finish(source,language,'lexical',nodes,[],cursor.encoding());
  }catch(reason){
    checked();
    return opaque(source,language,reason==='delimiter-mismatch'||reason==='delimiter-unclosed'?'error':'opaque',
      ['node-budget','delimiter-depth','delimiter-mismatch','delimiter-unclosed','provider-partition','unclassified-source','split-surrogate'].includes(reason)?reason:'provider-boundary');
  }
}
function languageName(value){if(value!=='Rust'&&value!=='JavaScript'&&value!=='TypeScript')fail('unsupported language');return value;}

/** Create the concrete-syntax representation of a complete primitive source. */
export function createConcreteSyntaxMeta(source,options){
  checked();text(source,SOURCE_LIMIT,'source');
  const selected=record(options,['language'],'options'),language=languageName(selected.language);
  const doc=build(source,language);checked();return doc;
}

/** One fixed source transaction; public standalone validators remain complete. */
export function transportConcreteSyntaxSource(source,options){
  checked();text(source,SOURCE_LIMIT,'source');
  const selected=record(options,['language'],'options'),language=languageName(selected.language);
  const result=transportPrivateConcreteSource(source,language);checked();return result;
}
/** Freshly consume canonical edited input through the same two-build boundary. */
export function transportConcreteSyntaxMeta(serialized){
  checked();text(serialized,SERIAL_LIMIT,'serialized CST');
  const result=transportPrivateConcreteMeta(serialized);checked();return result;
}
function inspected(value){
  const row=record(value,['schema','representationLevel','language','source','sourceEncoding','status','nodes','diagnostics','authority'],'document');
  if(row.schema!==CONCRETE_SYNTAX_SCHEMA||row.representationLevel!==CONCRETE_REPRESENTATION)fail('representation schema changed');
  text(row.source,SOURCE_LIMIT,'source');languageName(row.language);
  if(!['lexical','opaque','error'].includes(row.status))fail('invalid lexical status');
  const encoding=record(row.sourceEncoding,['utf16CodeUnits','utf8Bytes','wellFormedUnicode','utf8BytePreservation','utf8Mapping'],'source encoding');
  if(!integer(encoding.utf16CodeUnits)||encoding.utf16CodeUnits!==row.source.length||!integer(encoding.utf8Bytes)||encoding.utf8Bytes>BYTE_LIMIT||
    typeof encoding.wellFormedUnicode!=='boolean'||typeof encoding.utf8BytePreservation!=='boolean'||
    !['unicode-scalar-boundaries','unicode-replacement'].includes(encoding.utf8Mapping))fail('invalid source encoding');
  const authority=record(row.authority,['type','owner','executable'],'authority');
  if(authority.type!==false||authority.owner!==false||authority.executable!==false)fail('fidelity cannot grant semantic authority');
  const nodes=dense(row.nodes,NODE_LIMIT,'nodes');if(!nodes.length)fail('root node missing');
  for(let at=0;at<nodes.length;at++){
    const node=dense(nodes[at],7,'node');if(node.length!==7)fail('invalid node shape');
    if(!['root','group','token','trivia','opaque','error'].includes(node[0])||typeof node[1]!=='string'||node[1].length>40)fail('invalid node classification');
    for(let field=2;field<=5;field++)if(!integer(node[field]))fail('invalid node coordinate');
    if(node[2]>node[3]||node[3]>row.source.length||node[4]>node[5]||node[5]>encoding.utf8Bytes||
      !(at===0?node[6]===-1:integer(node[6])&&node[6]<at))fail('invalid node span or parent');
    nodes[at]=node;
  }
  const diagnostics=dense(row.diagnostics,NODE_LIMIT,'diagnostics');
  for(let at=0;at<diagnostics.length;at++){
    const item=dense(diagnostics[at],3,'diagnostic');
    if(item.length!==3||typeof item[0]!=='string'||item[0].length>80||!integer(item[1])||!integer(item[2])||item[1]>item[2]||item[2]>row.source.length)fail('invalid diagnostic');
    diagnostics[at]=item;
  }
  return {...row,sourceEncoding:encoding,nodes,diagnostics,authority};
}
function validated(value){
  const snapshot=inspected(value),expected=build(snapshot.source,snapshot.language);
  // Every primitive, coordinate, partition and classification must match the
  // deterministic pinned adapter; copied labels never become owner authority.
  if(stringify(snapshot)!==stringify(expected))fail('concrete source partition or classification changed');
  checked();return expected;
}
function serializedPreflight(source){
  // Native parse must not allocate an arbitrarily deep or wide foreign tree
  // before the schema validator can see it. Canonical CST needs depth three.
  let depth=0,arrays=0,cells=0,strings=0;
  for(let at=0;at<source.length;at++){
    const unit=source[at];
    if(unit==='"'){
      if(++strings>NODE_LIMIT*3+100)fail('serialized string-count budget exceeded');
      for(at++;at<source.length;at++){if(source[at]==='\\')at++;else if(source[at]==='"')break;}
    }else if(unit==='['||unit==='{'){
      if(++depth>4)fail('serialized nesting budget exceeded');
      if(unit==='['&&++arrays>NODE_LIMIT*2+16)fail('serialized array-count budget exceeded');
    }else if(unit===']'||unit==='}'){
      if(--depth<0)fail('invalid serialized delimiters');
    }else if((unit===','||unit===':')&&++cells>NODE_LIMIT*10+100)fail('serialized cell budget exceeded');
  }
  if(depth!==0)fail('invalid serialized delimiters');
}
/** Serialize a fully checked CST using its one canonical encoding. */
export function serializeConcreteSyntaxMeta(value){
  checked();const result=stringify(validated(value));if(result.length>SERIAL_LIMIT)fail('serialized budget exceeded');checked();return result;
}
/** Parse canonical CST text, then independently rebuild and check its partition. */
export function parseConcreteSyntaxMeta(serialized){
  checked();text(serialized,SERIAL_LIMIT,'serialized CST');
  serializedPreflight(serialized);
  let input;try{input=parse(serialized);}catch{fail('invalid serialized JSON');}
  const value=validated(input);if(stringify(value)!==serialized)fail('noncanonical serialized CST');checked();return value;
}
/** Reconstruct every original UTF16 code unit from the validated leaf partition. */
export function reconstructConcreteSyntax(value){
  checked();const doc=validated(value),pieces=[];
  for(let at=1;at<doc.nodes.length;at++){
    const node=doc.nodes[at];if(node[0]!=='group')pieces.push(doc.source.slice(node[2],node[3]));
  }
  const source=pieces.join('');if(source!==doc.source)fail('leaf partition does not reconstruct source');checked();return source;
}
function editSnapshot(value){
  if(value===null||typeof value!=='object'||isProxy(value)||isArray(value))fail('edit requires own data');
  const keys=ownKeys(value),node=keys.includes('node'),span=keys.includes('span');
  if(node===span)fail('edit requires one node or span selector');
  const row=record(value,[node?'node':'span','expected','replacement'],'edit');
  text(row.expected,SOURCE_LIMIT,'expected');text(row.replacement,SOURCE_LIMIT,'replacement');
  if(node){if(!integer(row.node))fail('invalid selected node');}
  else{row.span=dense(row.span,2,'edit span');if(row.span.length!==2||!integer(row.span[0])||!integer(row.span[1]))fail('invalid edit span');}
  return row;
}
function rulesSnapshot(value){
  const phases=record(value,['languageRules','repositoryRules'],'rule sequences'),seen=new Set();let total=0;
  for(const field of ['languageRules','repositoryRules']){
    const rules=dense(phases[field],RULE_LIMIT,'rules');
    for(let at=0;at<rules.length;at++){
      const row=record(rules[at],['id','edits'],'rule');text(row.id,160,'rule ID');
      if(!row.id.length||seen.has(row.id))fail('rule IDs must be unique and nonempty');seen.add(row.id);
      const edits=dense(row.edits,EDIT_LIMIT,'edits');total+=edits.length;if(total>TOTAL_EDIT_LIMIT)fail('edit budget exceeded');
      for(let index=0;index<edits.length;index++)edits[index]=editSnapshot(edits[index]);
      rules[at]={id:row.id,edits};
    }
    phases[field]=rules;
  }
  if(phases.languageRules.length+phases.repositoryRules.length>RULE_LIMIT)fail('rule budget exceeded');return phases;
}
/** Apply declarative exact substitutions in language, then repository order. */
export function applyConcreteSyntaxSubstitutions(value,sequences){
  checked();let doc=validated(value);const phases=rulesSnapshot(sequences),trace=[];
  const phaseRows=[['language','languageRules'],['repository','repositoryRules']];
  for(let phaseIndex=0;phaseIndex<phaseRows.length;phaseIndex++){
    const phase=phaseRows[phaseIndex][0],field=phaseRows[phaseIndex][1];
    const applied=[];
    for(let at=0;at<phases[field].length;at++){
      const rule=phases[field][at],boundaries=new Set([0,doc.source.length]),edits=[];
      for(let index=0;index<doc.nodes.length;index++){boundaries.add(doc.nodes[index][2]);boundaries.add(doc.nodes[index][3]);}
      for(let index=0;index<rule.edits.length;index++){
        const edit=rule.edits[index];let start,end;
        if(Object.hasOwn(edit,'node')){if(edit.node>=doc.nodes.length)fail('selected node missing');start=doc.nodes[edit.node][2];end=doc.nodes[edit.node][3];}
        else [start,end]=edit.span;
        if(start>end||end>doc.source.length||!boundaries.has(start)||!boundaries.has(end)||doc.source.slice(start,end)!==edit.expected)fail('exact edit span or expected text changed');
        edits.push({start,end,replacement:edit.replacement});
      }
      edits.sort((left,right)=>left.start-right.start||left.end-right.end);
      let end=0,length=doc.source.length;const pieces=[];
      for(let index=0;index<edits.length;index++){
        const edit=edits[index];if(edit.start<end||(index&&edit.start===edits[index-1].start))fail('overlapping edit spans');
        length+=edit.replacement.length-(edit.end-edit.start);
        pieces.push(doc.source.slice(end,edit.start),edit.replacement);end=edit.end;
      }
      if(length>SOURCE_LIMIT)fail('substitution source budget exceeded');
      pieces.push(doc.source.slice(end));const beforeCodeUnits=doc.source.length;
      doc=parseConcreteSyntaxMeta(serializeConcreteSyntaxMeta(build(pieces.join(''),doc.language)));
      applied.push({id:rule.id,edits:edits.map(edit=>[edit.start,edit.end]),beforeCodeUnits,afterCodeUnits:doc.source.length});
    }
    trace.push({phase,rules:applied});
  }
  checked();return {value:doc,trace};
}

/** Explicit bounded data-only batch; its rows grant no semantic authority. */
export function transportConcreteSyntaxSources(rows){
  checked();const result=transportPrivateConcreteSources(rows);checked();return result;
}

/** Live host qualification only, never source/grammar/type authority. */
export function assertConcreteSyntaxHost(){checked();}


import {transportPrivateConcreteChunks} from './private-parser-execution.mjs';
/** Explicit corpus fidelity contract, without changing single/batch ingress. */
export function transportConcreteSyntaxChunks(chunks){checked();const result=transportPrivateConcreteChunks(chunks);checked();return result;}

import {transportPrivateConcreteParsedChunks} from './private-parser-execution.mjs';
/** Fixed private source-origin corpus transport, never a caller document mode. */
export function transportConcreteSyntaxParsedChunks(chunks){
 checked();const result=transportPrivateConcreteParsedChunks(chunks);checked();return result;
}


import {transportPrivateConcreteMetaChunks} from './private-parser-execution.mjs';
/** Import complete stored/edited canonical CST chunks; never semantic facts. */
export function transportConcreteSyntaxMetaChunks(chunks){checked();const result=transportPrivateConcreteMetaChunks(chunks);checked();return result;}
