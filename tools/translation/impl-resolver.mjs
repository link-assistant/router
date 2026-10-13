import {sharedReferenceCopyIdentity,SHARED_REFERENCE_COPY_SOURCE,STANDARD_OPTION_COPY_SOURCE} from './shared-reference-copy-source.mjs';
// Source-coordinate implementation extraction for checked method lowering.
// Extraction is structural evidence; only later checked bodies are executable.
import {sourceItems} from './rust-structure.mjs';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {fixedArrayCopyCells,FIXED_ARRAY_PROFILE} from './extensions/fixed-arrays.mjs';
import {fixedArrayLength} from './checked-types.mjs';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';
import {createHash} from 'node:crypto';
import {typeKey} from './checked-types.mjs';
import {nonCopyTraitOwner} from './copy-trait-owners.mjs';
import {proveDefaultOriginalMember,assertDefaultOriginalMember} from './default-trait-source.mjs';

const originalMethodMembers=new WeakMap(),originalMethodLowerings=new WeakMap();
export function originalMethodMember(method){const state=originalMethodMembers.get(method);if(!state||metadataDigest(method)!==state.methodDigest)throw new TypeError('Method source member is unsealed, copied or changed');return state;}
export function originalMethodLowering(lowered){const state=originalMethodLowerings.get(lowered);if(!state||metadataDigest(lowered)!==state.loweredDigest)throw new TypeError('Method token lowering is unsealed, copied or changed');originalMethodMember(state.method);return state;}

const range = tokens => ({start:tokens[0]?.start ?? 0,end:tokens.at(-1)?.end ?? 0});
const significant = tokens => tokens.filter(token=>token.type !== 'comment');
const identifier = token => token?.type === 'ident';
function closing(tokens,start) {
  const pairs={'(':')','[':']','{':'}'},expected=[];
  if (!pairs[tokens[start]?.text]) throw new Error('balanced group must start with an opening delimiter');
  for (let at=start;at<tokens.length;at++) {
    const token=tokens[at];if (token.type !== 'punct') continue;
    if (pairs[token.text]) expected.push(pairs[token.text]);
    else if ([')',']','}'].includes(token.text)) {
      if (expected.pop() !== token.text) throw Object.assign(new Error('mismatched implementation delimiter'),{span:range([token])});
      if (!expected.length) return at;
    }
  }
  throw Object.assign(new Error('unterminated implementation delimiter'),{span:range([tokens[start]])});
}
function genericEnd(tokens,start) {
  let depth=0;
  for (let at=start;at<tokens.length;at++) {
    if (tokens[at].text === '<') depth++;
    if (tokens[at].text === '>') depth--;
    if (tokens[at].text === '>>') depth-=2;
    if (depth <= 0) return at;
  }
  return tokens.length-1;
}
function path(tokens) {
  const value=[];let expectName=true;
  if (tokens[0]?.text === '::') tokens=tokens.slice(1);
  for (const token of tokens) {
    if (expectName && identifier(token)) {value.push(token.text);expectName=false;}
    else if (!expectName && token.text === '::') expectName=true;
    else return null;
  }
  return value.length && !expectName ? value : null;
}
function prefix(tokens,start) {
  let at=start;const attributes=[];
  while (tokens[at]?.text === '#' && tokens[at+1]?.text === '[') {
    const end=closing(tokens,at+1);attributes.push({name:tokens[at+2]?.text,span:range(tokens.slice(at,end+1)),tokens:tokens.slice(at,end+1)});at=end+1;
  }
  if (tokens[at]?.text === 'pub') {at++;if (tokens[at]?.text === '(') at=closing(tokens,at)+1;}
  const modifiers=[];
  while (['async','const','unsafe','extern','default'].includes(tokens[at]?.text)) {
    modifiers.push(tokens[at++].text);if (tokens[at-1].text === 'extern' && tokens[at]?.type === 'string') at++;
  }
  return {at,attributes,modifiers};
}
function nextItem(tokens,start) {
  for (let at=start;at<tokens.length;at++) {
    if (tokens[at].text === ';') return at+1;
    if (['{','(','['].includes(tokens[at].text)) {const end=closing(tokens,at);if (tokens[at].text === '{') return tokens[end+1]?.text === ';' ? end+2 : end+1;at=end;}
  }
  return tokens.length;
}
function receiverOf(tokens) {
  const comma=tokens.findIndex(token=>token.text === ',');const first=comma < 0 ? tokens : tokens.slice(0,comma);
  if (!first.some(token=>token.text === 'self')) return {receiver:null,tokens:[]};
  const spelling=first.map(token=>token.text).join('');
  if (spelling === '&self') return {receiver:'shared',tokens:first};
  if (spelling === 'self') return {receiver:'value',tokens:first};
  if (spelling === '&mutself' || spelling === 'mutself') return {receiver:'mutable',tokens:first};
  return {receiver:spelling.startsWith('&') ? spelling.includes('mut') ? 'mutable' : 'shared' : 'value',tokens:first,unsupported:true};
}
const conditional = attributes => attributes.filter(attribute=>['cfg','cfg_attr','async_trait'].includes(attribute.name));
export function extractImplDeclarations(source,{sourcePath=null,modulePath=[],sourceView,compilationProfile=null}={}) {
  const implementations=[],diagnostics=[];
  const refuse=(message,span,extra={})=>{const value={kind:'unsupported',message,span,sourcePath,...extra};diagnostics.push(value);return value;};
  let items;
  try {items=sourceView===undefined?sourceItems(source):originalSourceModuleItems({source,file:sourcePath,path:modulePath,sourceView,compilationProfile});} catch (error) {return {implementations,diagnostics:[{kind:'syntax',message:error.message,span:error.span ?? null,sourcePath}]};}
  for (const item of items.filter(item=>item.term === 'impl')) {
    const tokens=significant(item.tokens),head=prefix(tokens,0),implAt=tokens.findIndex(token=>token.text === 'impl');
    if (implAt < 0) continue;
    const bodyAt=tokens.findIndex((token,index)=>index > implAt && token.text === '{');
    if (bodyAt < 0) {refuse('implementation has no body',range(tokens));continue;}
    let bodyEnd;
    try {bodyEnd=closing(tokens,bodyAt);} catch (error) {refuse(error.message,error.span ?? range(tokens));continue;}
    let header=tokens.slice(implAt+1,bodyAt),genericParameters=[];
    const obligations=[];
    if (header[0]?.text === '<') {
      const end=genericEnd(header,0);genericParameters=header.slice(1,end).map(token=>token.text);header=header.slice(end+1);
      obligations.push(refuse('generic implementation requires checked monomorphization',range(tokens.slice(implAt,bodyAt))));
    }
    const traitAt=header.findIndex(token=>token.text === 'for'),traitTokens=traitAt >= 0 ? header.slice(0,traitAt) : null,typeTokens=traitAt >= 0 ? header.slice(traitAt+1) : header;
    const typePath=path(typeTokens),traitPath=traitTokens ? path(traitTokens) : null;
    if (!typePath) obligations.push(refuse('implementation target needs a resolved monomorphic named type',range(typeTokens)));
    if (traitTokens && !traitPath) obligations.push(refuse('trait implementation needs resolved generic bounds or qualified trait syntax',range(traitTokens)));
    if (traitTokens) obligations.push(refuse('trait implementation requires declared trait and dispatch checking',range(traitTokens)));
    if (head.modifiers.includes('unsafe')) obligations.push(refuse('unsafe implementation requires a checked ownership and capability contract',range(tokens.slice(0,bodyAt))));
    for (const attribute of conditional(head.attributes)) obligations.push(refuse('conditional implementation requires compilation-condition resolution',attribute.span));
    const implementation={typePath:typePath ?? [],traitPath,genericParameters,modulePath:[...modulePath],span:range(tokens.slice(0,bodyEnd+1)),
      headerSpan:range(tokens.slice(0,bodyAt)),bodySpan:range(tokens.slice(bodyAt,bodyEnd+1)),sourcePath,attributes:head.attributes,methods:[],diagnostics:obligations};
    implementations.push(implementation);
    const members=tokens.slice(bodyAt+1,bodyEnd);
    for (let at=0;at<members.length;) {
      const start=at,methodHead=prefix(members,at);at=methodHead.at;
      if (members[at]?.text !== 'fn') {refuse('associated item needs separate constant, type or macro lowering',range(members.slice(start,nextItem(members,start))),{implementation:implementation.typePath});at=nextItem(members,start);continue;}
      const fnAt=at,nameToken=members[++at];
      if (!identifier(nameToken)) {refuse('method declaration has no identifier',range([nameToken]));at=nextItem(members,start);continue;}
      at++;const methodObligations=[];
      if (members[at]?.text === '<') {const end=genericEnd(members,at);methodObligations.push(refuse('generic method requires checked monomorphization',range(members.slice(at,end+1))));at=end+1;}
      if (members[at]?.text !== '(') {refuse('method declaration has no parameter group',range([members[at]]));at=nextItem(members,start);continue;}
      const paramsAt=at,paramsEnd=closing(members,at),params=members.slice(paramsAt+1,paramsEnd),receiver=receiverOf(params);
      at=paramsEnd+1;const returnStart=at;
      while (at < members.length && !['{',';'].includes(members[at].text)) {
        // A sized return type contains its own semicolon. Only the top-level
        // terminator separates a method declaration from its concrete body.
        if(['(','['].includes(members[at].text))at=closing(members,at)+1;
        else at++;
      }
      if (members[at]?.text !== '{') {refuse('implementation method needs a concrete body',range(members.slice(start,at+1)));at++;continue;}
      const open=at,end=closing(members,at),all=members.slice(start,end+1),bodyTokens=members.slice(open,end+1);
      if (receiver.receiver === 'mutable' || receiver.receiver === 'value') methodObligations.push(refuse('mutable or consuming receiver requires checked ownership and alias semantics',range(receiver.tokens),{method:nameToken.text}));
      if (receiver.unsupported) methodObligations.push(refuse('typed or lifetime receiver requires a resolved receiver signature',range(receiver.tokens),{method:nameToken.text}));
      if (methodHead.modifiers.includes('unsafe') || bodyTokens.some(token=>token.type === 'ident' && token.text === 'unsafe')) methodObligations.push(refuse('unsafe method construct needs a checked ownership and capability contract',range(all),{method:nameToken.text}));
      if (methodHead.modifiers.includes('extern')) methodObligations.push(refuse('foreign method ABI requires a registered effect contract',range(all),{method:nameToken.text}));
      if (members.slice(returnStart,open).some(token=>token.text === 'where')) methodObligations.push(refuse('method where clause needs resolved trait bounds',range(members.slice(returnStart,open)),{method:nameToken.text}));
      for (const attribute of conditional(methodHead.attributes)) methodObligations.push(refuse('conditional method requires compilation-condition resolution',attribute.span,{method:nameToken.text}));
      const method={name:nameToken.text,receiver:receiver.receiver,async:methodHead.modifiers.includes('async'),const:methodHead.modifiers.includes('const'),
        span:range(all),signatureSpan:range(members.slice(start,open)),bodySpan:range(bodyTokens),sourcePath,source:source.slice(all[0].start,all.at(-1).end),
        tokens:all,signatureTokens:members.slice(fnAt,open),bodyTokens,receiverSpan:receiver.tokens.length ? range(receiver.tokens) : null,
        typePath:implementation.typePath,traitPath:implementation.traitPath,modulePath:[...modulePath],attributes:methodHead.attributes,
        diagnostics:[...obligations,...methodObligations],loweringReady:!obligations.length && !methodObligations.length};
      if(sourceView!==undefined)originalMethodMembers.set(method,Object.freeze({source,sourcePath,modulePath:Object.freeze([...modulePath]),sourceView,compilationProfile,implementationSpan:Object.freeze({...implementation.span}),methodDigest:metadataDigest(method)}));
      implementation.methods.push(method);at=end+1;
    }
  }
  return {implementations,diagnostics};
}

/** Token-only self/Self substitution; literal and comment contents never change. */
export function lowerSharedMethodTokens(method,typePath=method.typePath) {
  if (!method.loweringReady || ![null,'shared'].includes(method.receiver)) throw new TranslationError('unsupported','method receiver, trait or capability obligations remain unresolved',method.span);
  return lowerMethodTokens(method,typePath,'shared');
}
// Only a genuine captured original member can discharge the one standard
// Default trait obligation. No other trait/body obligation is removed.
export function proveDefaultMethodAdmission(context,method,typePath){
  return proveDefaultOriginalMember(context,{method,original:originalMethodMember(method),typePath});
}
export function lowerDefaultMethodTokens(method,typePath,proof){
  assertDefaultOriginalMember(proof,method,originalMethodMember(method));
  if(JSON.stringify(typePath)!==JSON.stringify(proof.typePath))throw new TypeError('Original Default resolved target differs from its source proof');
  return lowerMethodTokens(method,typePath,'default');
}
function lowerMethodTokens(method,typePath,mode,certificate=null) {
  if (!Array.isArray(typePath) || !typePath.length || typePath.some(name=>typeof name !== 'string' || !/^(?:r#)?[\p{L}_][\p{L}\p{N}_]*$/u.test(name))) throw new TranslationError('syntax','method lowering requires a resolved type path',method.span);
  let tokens=tokenizeRust(method.source).map(token=>({...token,start:token.start+method.span.start,end:token.end+method.span.start}));
  const rewrites=[];
  const freshName='router_self';
  if (tokens.some(token=>token.kind === 'identifier' && token.value === freshName)) throw new TranslationError('unsupported','receiver lowering name collides with a source identifier',method.span);
  const typeTokens=origin=>typePath.flatMap((value,index)=>[...(index ? [{kind:'punct',value:'::',raw:'::',...origin,generated:true}] : []),{kind:'identifier',value,raw:value,...origin,generated:true}]);
  if (method.receiver === 'shared' || mode === 'copy') {
    const fn=tokens.findIndex(token=>token.value === 'fn'),open=tokens.findIndex((token,index)=>index > fn && token.value === '(');
    const width=mode === 'copy' ? 1 : 2;
    if (mode === 'copy' ? tokens[open+1]?.value !== 'self' || ![',',')'].includes(tokens[open+2]?.value) : tokens[open+1]?.value !== '&' || tokens[open+2]?.value !== 'self') throw new TranslationError('syntax','receiver tokens differ from extracted signature',method.receiverSpan ?? method.span);
    const origin={start:tokens[open+1].start,end:tokens[open+width].end};
    const explicit=[{kind:'identifier',value:freshName,raw:freshName,...origin,generated:true},{kind:'punct',value:':',raw:':',...origin,generated:true},...(mode==='copy'?[]:[{...tokens[open+1]}]),...typeTokens(origin)];
    tokens.splice(open+1,width,...explicit);rewrites.push({kind:mode === 'copy' ? 'copy-receiver' : 'shared-receiver',span:origin,name:freshName,typePath:[...typePath],...(certificate ? {certificate:certificate.digest} : {})});
  }
  tokens=tokens.flatMap((token,index)=>{
    if (token.kind !== 'identifier') return [token];
    if (token.value === 'Self') {rewrites.push({kind:'self-type',span:{start:token.start,end:token.end},typePath:[...typePath]});return typeTokens({start:token.start,end:token.end});}
    if (token.value === 'self' && tokens[index+1]?.value !== '::') return [{...token,value:freshName,raw:freshName,generated:true}];
    return [token];
  });
  const sharedReceiverSource=method.receiver==='shared'?{kind:'shared',span:{...method.receiverSpan},tokens:method.signatureTokens.filter(token=>token.start>=method.receiverSpan.start&&token.end<=method.receiverSpan.end).map(token=>({kind:token.type,value:token.text,span:{start:token.start,end:token.end}}))}:null;
  const lowered={tokens,rewrites,receiver:method.receiver,receiverName:method.receiver ? freshName : null,typePath:[...typePath],...(sharedReceiverSource?{sharedReceiverSource}:{}),
    assumptions:mode === 'copy' ? certificate.obligations : ['Shared receiver syntax and pointee identity remain checked; scalar field reads require Copy evidence, and ownership, mutation, consuming receivers, trait dispatch and unsafe operations retain their own frontend obligations.']};
  if(originalMethodMembers.has(method)){const original=originalMethodMember(method);originalMethodLowerings.set(lowered,Object.freeze({method,original,mode,copyCertificate:certificate?copyMetadata(certificate,{preserveKeyOrder:true}):null,loweredDigest:metadataDigest(lowered)}));}
  return lowered;
}

const frozen=value=>{if(value && typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;};
const seal=value=>{const clone=structuredClone(value);return frozen({...clone,digest:createHash('sha256').update(JSON.stringify(clone)).digest('hex')});};
const consumingReceiver='mutable or consuming receiver requires checked ownership and alias semantics';
const checkedKey=type=>{
  if(!type || typeof type!=='object')return null;
  if(type.rustReference)return sharedReferenceCopyIdentity(type);
  if(['bool','unit','float'].includes(type.kind))return typeKey(type);
  if(type.kind==='fixed' && [8,16,32,64,128].includes(type.bits) && typeof type.signed==='boolean')return typeKey(type);
  if(type.kind==='data' && typeof type.name==='string' && type.name.length)return typeKey(type);
  if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return 'rust-borrowed-str';
  if(type.kind==='array'&&fixedArrayLength(type)!==null&&type.rustOwnership?.kind==='value'&&type.rustOwnership.source==='array')return checkedKey(type.element)?typeKey(type):null;
  return null;
};
export function validCopyCertificate(certificate,type) {
  if(!certificate||certificate.version!==1||certificate.profile!=='checked-rust-copy-layout-v1'||!certificate.verified||certificate.diagnostics?.length||!checkedKey(type)||checkedKey(certificate.type)!==checkedKey(type))return false;
  const {digest,...evidence}=certificate;
  return typeof digest==='string'&&createHash('sha256').update(JSON.stringify(evidence)).digest('hex')===digest;
}
const ownershipSyntax=/^(?:Box|Vec|String|Arc|Rc|Cell|RefCell|UnsafeCell|Mutex|RwLock|Pin|ManuallyDrop|MaybeUninit)$/u;

/**
 * Prove a narrow Rust Copy layout from actual checked declarations and source
 * derives. The caller supplies the complete relevant implementation set with
 * canonical resolvedType targets. This is not an ownership or alias checker.
 */
export function certifyCopyType(type,{declarations,implementations,macroProvenance,nominalTypes=new Map(),span={start:0,end:0}}={}) {
  const diagnostics=[],proofs=[],active=new Set(),done=new Set();
  const refuse=(message,location=span)=>{diagnostics.push({kind:'unsupported',message,span:location});return false;};
  const certificate=()=>seal({version:1,profile:'checked-rust-copy-layout-v1',type:type??null,verified:diagnostics.length===0,proofs,diagnostics,
    obligations:['The frontend must supply canonical type resolution and all relevant implementation evidence.',
      'Copy receivers must use immutable checked values or an equivalent typed value copy; this certificate does not prove JavaScript alias safety.']});
  if(!(declarations instanceof Map) || !Array.isArray(implementations)) {refuse('Copy certification requires checked declarations and complete implementation evidence');return certificate();}
  const provenance=macroProvenance;
  function implementationProof(current) {
    const key=checkedKey(current);let valid=true;
    for(const implementation of implementations) {
      const trait=implementation.traitPath!=null || implementation.diagnostics?.some(diagnostic=>/trait implementation/u.test(diagnostic.message));
      const target=checkedKey(implementation.resolvedType);
      if(trait && !target) {
        const nominal=implementation.resolvedNominalTarget,identity=nominal?.version===1?nominalTypes.get(JSON.stringify(nominal.family)):null;
        const entry=current.kind==='data'?declarations.get(current.name):null;
        const currentFamily=entry?.standardGeneric?.kind==='Option'?['std','option','Option']:entry?.standardGeneric?.kind==='Result'?['std','result','Result']:entry?['crate',...entry.fullName.split('.')]:null;
        if(identity && ['struct','enum','union'].includes(identity.kind) && JSON.stringify(identity.family)===JSON.stringify(nominal.family)){
          if(current.kind!=='data'||currentFamily&&JSON.stringify(currentFamily)!==JSON.stringify(identity.family)){proofs.push({kind:'unequal-nominal-implementation-target',type:current,target:nominal});continue;}
          valid=refuse('matching nominal trait implementation prevents derived Copy certification',implementation.headerSpan??span);continue;
        }
        valid=refuse('unresolved trait implementation target prevents Copy certification',implementation.headerSpan??span);continue;
      }
      if(target!==key)continue;
      if(trait) {
        const owner=nonCopyTraitOwner(implementation);
        if(owner)proofs.push({kind:'non-copy-affecting-standard-trait',type:current,owner});
        else valid=refuse('manual trait or Drop implementation is outside the derived Copy profile',implementation.headerSpan??span);
      }
      if(implementation.attributes?.some(attribute=>['cfg','cfg_attr'].includes(attribute.name)) || implementation.diagnostics?.some(diagnostic=>/unsafe implementation/u.test(diagnostic.message)))valid=refuse('conditional or unsafe implementation prevents Copy certification',implementation.headerSpan??span);
    }
    return valid;
  }
  function visit(current,location=span) {
    const key=checkedKey(current);
    if(!key)return refuse('type has no checked standard primitive or derived Copy profile',location);
    if(done.has(key))return true;
    if(current.rustReference){proofs.push({kind:'original-standard-shared-reference',type:current,source:SHARED_REFERENCE_COPY_SOURCE});done.add(key);return true;}
    if(active.has(key))return refuse('recursive value layout has no finite checked Copy proof',location);
    if(!implementationProof(current))return false;
    if(current.kind==='array') {
      try{fixedArrayCopyCells(current,location);}catch(error){return refuse(error.message,location);}
      if(!visit(current.element,location))return false;
      proofs.push({kind:'standard-fixed-array',type:current,length:fixedArrayLength(current),profile:FIXED_ARRAY_PROFILE});done.add(key);return true;
    }
    if(current.kind!=='data') {proofs.push({kind:'standard-primitive',...(current.kind==='string'&&current.rustOwnership?.kind==='borrowed'&&current.rustOwnership.source==='str'?{source:SHARED_REFERENCE_COPY_SOURCE,referenceDepth:1}:{}),type:current});done.add(key);return true;}
    const entry=declarations.get(current.name);
    if(entry?.k!=='data' || entry.fullName!==current.name || !Array.isArray(entry.modulePath) || !Array.isArray(entry.ctors))return refuse('Copy requires an actual resolved algebraic declaration',location);
    active.add(key);let valid=true,standard=false;
    const generic=entry.standardGeneric;
    if(generic) {
      const names=generic.kind==='Option'?['Some','None']:generic.kind==='Result'?['Ok','Err']:null;
      const arguments_=generic.arguments;
      if(!names || !Array.isArray(arguments_) || arguments_.length!==(generic.kind==='Option'?1:2) || entry.ctors.length!==2 || names.some(name=>entry.ctors.filter(ctor=>ctor.name===name).length!==1))valid=refuse('invalid registered standard Copy generic provenance',location);
      else {
        const fieldTypes=[];
        for(const [index,name] of names.entries()) {
          const fields=entry.ctors.find(ctor=>ctor.name===name).fields,count=generic.kind==='Option' && index===1?0:1;
          if(!Array.isArray(fields) || fields.length!==count || count && (fields[0].name!=='field0' || !checkedKey(fields[0].type) || checkedKey(fields[0].type)!==checkedKey(arguments_[index])))valid=refuse('standard Copy generic arguments disagree with checked fields',location);
          else if(count)fieldTypes.push(fields[0].type);
        }
        if(valid){standard=true;for(const fieldType of fieldTypes)if(!visit(fieldType,location))valid=false;}
      }
    } else {
      if(!provenance || provenance.macroSubnamespace!==undefined&&provenance.macroSubnamespace!=='attribute' || !Array.isArray(provenance.importedNames) || !Array.isArray(provenance.shadowedNames) || provenance.unresolvedImportScope!==false || [...provenance.importedNames,...provenance.shadowedNames].some(name=>['Copy','Clone'].includes(name)))valid=refuse('Copy derive requires resolved unshadowed standard trait provenance',location);
      if(!['Copy','Clone'].every(trait=>entry.deriveTraits?.includes(trait) && entry.rustAttributes?.some(attribute=>attribute.kind==='derive' && attribute.traits?.includes(trait))))valid=refuse('source declaration has no checked Copy and Clone derives',location);
      for(const ctor of entry.ctors) {
        if(!Array.isArray(ctor.fields)){valid=refuse('Copy constructor layout is unchecked',location);continue;}
        for(const field of ctor.fields) {
          const syntax=field.rustTypeSyntax;
          const sized=field.type.kind==='array'&&field.type.rustFixedArray&&syntax?.[0]==='['&&syntax.at(-1)===']';
          const standard=field.type.rustStandardGeneric?.kind==='Option'&&declarations.get(field.type.name)?.standardGeneric?.kind==='Option';
          const shared=(Boolean(sharedReferenceCopyIdentity(field.type))||field.type.kind==='string'&&field.type.rustOwnership?.kind==='borrowed'&&field.type.rustOwnership.source==='str'&&syntax?.at(-1)==='str')&&syntax?.[0]==='&'&&!syntax.includes('mut');
          if(!Array.isArray(syntax) || !syntax.length || !shared&&!standard&&syntax.some(token=>typeof token!=='string' || ownershipSyntax.test(token) || (sized?['*','dyn','impl']:['&','*','[',']','dyn','impl']).includes(token))) {valid=refuse('field ownership syntax has no supported Copy proof',location);continue;}
          if(!visit(field.type,location))valid=false;
        }
      }
    }
    active.delete(key);
    if(valid){proofs.push({kind:standard?'standard-generic':'source-derived',...(standard&&generic.kind==='Option'?{source:STANDARD_OPTION_COPY_SOURCE}:{}),type:current,derive:standard?null:'Copy',...(!standard&&provenance?.macroSubnamespace==='attribute'?{attributeMacroProvenance:structuredClone(provenance)}:{}),constructors:entry.ctors.map(ctor=>({name:ctor.name,fields:ctor.fields.map(field=>({name:field.name,type:field.type,...(field.rustTypeSyntax?{rustTypeSyntax:field.rustTypeSyntax}:{})}))}))});done.add(key);}
    return valid;
  }
  visit(type);return certificate();
}

/** Discharge only the exact plain `self` receiver obligation, using Copy proof. */
export function lowerCopyMethodTokens(method,resolvedType,certificate) {
  const refuse=message=>{throw new TranslationError('unsupported',message,method.span);};
  if(!certificate || certificate.version!==1 || certificate.profile!=='checked-rust-copy-layout-v1' || !certificate.verified || certificate.diagnostics?.length || checkedKey(certificate.type)!==checkedKey(resolvedType) || !checkedKey(resolvedType))refuse('by-value receiver requires a matching checked Copy certificate');
  const {digest,...evidence}=certificate;
  if(createHash('sha256').update(JSON.stringify(evidence)).digest('hex')!==digest)refuse('Copy certificate integrity check failed');
  if(method.receiver!=='value' || method.traitPath!=null || method.resolvedType && checkedKey(method.resolvedType)!==checkedKey(resolvedType))refuse('method requires a resolved plain by-value inherent receiver');
  if(!Array.isArray(method.diagnostics) || method.diagnostics.length!==1 || method.diagnostics[0].message!==consumingReceiver || method.diagnostics[0].kind!=='unsupported' || method.diagnostics[0].span?.start!==method.receiverSpan?.start || method.diagnostics[0].span?.end!==method.receiverSpan?.end)refuse('method obligations remain beyond the checked Copy receiver');
  if(resolvedType.kind!=='data')refuse('inherent by-value lowering currently requires a named algebraic Copy type');
  const lowered=lowerMethodTokens(method,resolvedType.name.split('.'),'copy',certificate);
  const result={...lowered,copyCertificate:certificate,discharged:[method.diagnostics[0]]},original=originalMethodLowerings.get(lowered);
  if(original)originalMethodLowerings.set(result,Object.freeze({...original,loweredDigest:metadataDigest(result)}));
  return result;
}
