// Checked primitive format! lowering; format strings are parsed, never evaluated.
// https://doc.rust-lang.org/std/fmt/index.html
// https://doc.rust-lang.org/std/fmt/trait.LowerHex.html
import {TupleRustParser,TupleChecker,TupleEmitter} from './tuples.mjs';
import {STRING} from '../checked-types.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {capturedRustTokenSource} from './lexical.mjs';
import {loadSourceFormatTemplateControl,executeSourceFormatTemplate,checkedSourceFormatPieces} from '../source-format-template.mjs';
import {metadataDigest} from './source-links.mjs';
import {captureSourceDisplayScope,sourceNominalDisplayClosure,sourceNominalDisplayClosureFacts} from '../format-display-source.mjs';
const span=(first,last)=>({start:first.start,end:last.end});
const control=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue'].includes(node.k)||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(control):control(value))));
const identifier=/^(?:[\p{L}_][\p{L}\p{N}_]*)$/u;

function formatParts(template,args,path,resolve) {
  const positional=args.map((arg,index)=>({...arg,index})),named=new Map(args.map((arg,index)=>[arg.name,index]).filter(([name])=>name));
  const used=new Set(),pieces=[];let text='',next=0;
  const flush=()=>{if(text){pieces.push({text});text='';}};
  for(let at=0;at<template.value.length;at++) {
    const character=template.value[at];
    if((character==='{'||character==='}')&&template.value[at+1]===character){text+=character;at++;continue;}
    if(character==='}')throw typeError('unmatched closing format brace',template.span);
    if(character!=='{'){text+=character;continue;}
    const end=template.value.indexOf('}',at+1);if(end<0)throw typeError('unclosed format placeholder',template.span);
    const placeholder=template.value.slice(at+1,end),colon=placeholder.indexOf(':'),owner=colon<0?placeholder:placeholder.slice(0,colon),spec=colon<0?'':placeholder.slice(colon+1);
    let argument,capture;
    if(owner==='')argument=positional[next++]?.index;
    else if(/^\d+$/u.test(owner))argument=positional[Number(owner)]?.index;
    else if(identifier.test(owner)&&owner!=='_'){if(named.has(owner))argument=named.get(owner);else capture={name:owner,path:resolve([owner],path)};}
    else throw unsupported('format argument','requires a checked argument index or lexical identifier',template.span);
    if(argument===undefined&&!capture)throw typeError('missing format argument',template.span);
    if(argument!==undefined)used.add(argument);
    flush();pieces.push({argument,capture,spec});at=end;
  }
  flush();
  if(used.size!==args.length)throw typeError('format arguments must all be used',template.span);
  return pieces;
}

export class FormatRustParser extends TupleRustParser {
  primary(path,options) {
    const c=this.cursor,owned=c.is('String')&&c.is('::',1)&&c.is('new',2)&&c.is('(',3)&&c.is(')',4)&&!this.builtinShadow('String',path);
    const value=super.primary(path,options);
    return owned&&value.k==='str'?{k:'routerOwnedString',value,span:value.span}:value;
  }
  expressionMacro(token,path) {
    if(token.value!=='format')return super.expressionMacro(token,path);
    const c=this.cursor,closing=c.peek().kind==='punct'?{'(':')','[':']','{':'}'}[c.peek().value]:null;
    if(!closing)throw this.fail('expected format macro delimiter');c.next();
    if(c.peek().kind!=='string')throw unsupported('format template syntax','requires a direct source string literal; expansion and grouped expressions remain unproven',c.peek());
    const template=this.expr(path);if(template.k!=='str')throw unsupported('format template','requires an actual string literal',template.span);
    const args=[],names=new Set();let hasNamed=false;
    if(c.eat(','))while(!c.is(closing)) {
      let name;
      if(c.peek().kind==='identifier'&&c.is('=',1)){name=c.next().value;c.next();if(names.has(name))throw typeError('duplicate named format argument',token);names.add(name);hasNamed=true;}
      else if(hasNamed)throw typeError('positional format arguments must precede named arguments',c.peek());
      args.push({name,value:this.expr(path)});if(!c.eat(','))break;
    }
    const close=c.expect(closing,'format macro');
    let pieces,sourceTemplateControl;
    const original=capturedRustTokenSource(c.tokens);
    if(!args.length&&original){
      const program=loadSourceFormatTemplateControl();
      try{
        const execution=executeSourceFormatTemplate(program,original.source.slice(template.span.start,template.span.end),template.value);
        pieces=checkedSourceFormatPieces(execution,name=>this.resolve([name],path),template.span);sourceTemplateControl=execution;
      }catch(error){if(!(error instanceof TypeError))throw error;}
    }
    let sourceDisplayScope;if(sourceTemplateControl){try{sourceDisplayScope=captureSourceDisplayScope(this,span(token,close),pieces.flatMap(piece=>piece.capture?[piece.capture.name]:[]));}catch(error){if(!(error instanceof TypeError))throw error;}}
    return {k:'routerFormat',args,pieces:pieces??formatParts(template,args,path,(segments,owner)=>this.resolve(segments,owner)),...(sourceTemplateControl?{sourceTemplateControl}:{}),...(sourceDisplayScope?{sourceDisplayScope}:{}),templateProvenance:{span:template.span},span:span(token,close)};
  }
}

export class FormatChecker extends TupleChecker {
  expr(node,env,path,expected,allowLiteral=false) {
    if(node.k==='routerOwnedString'){const value=this.expr(node.value,env,path,expected,allowLiteral);return {...value,type:{...value.type,patternOwnershipRefusal:'owned String construction'}};}
    if(node.k!=='routerFormat')return super.expr(node,env,path,expected,allowLiteral);
    env=this.contextEnvironment(node,env,expected);
    if(node.sourceTemplateControl){
      // Parse IR is copied during original source relocation. Its literal
      // receipt supplies inputs only: run the pinned helpers again to obtain a
      // fresh private execution identity, and compare the entire result.
      const receipt=node.sourceTemplateControl,execution=executeSourceFormatTemplate(loadSourceFormatTemplateControl(),receipt.raw,receipt.value);
      const pieces=checkedSourceFormatPieces(execution,name=>node.pieces.find(piece=>piece.capture?.name===name)?.capture.path,node.templateProvenance.span);
      if(metadataDigest(execution)!==metadataDigest(receipt)||metadataDigest(pieces)!==metadataDigest(node.pieces)||node.args.length)throw unsupported('source format template proof','requires the original executed capture pieces',node.span);
    }
    const bindings=[],captures=new Map(),displayClosures=[];
    const bind=value=>{let name;do{name=this.freshName('ml_fmt_');}while(env.has(name));bindings.push({name,value});return {k:'var',name,type:value.type,span:node.span};};
    const arguments_=node.args.map(arg=>{if(control(arg.value))throw unsupported('format argument control','nonlocal exits require statement lowering',arg.value.span);return bind(this.expr(arg.value,env,path));});
    const values=node.pieces.map(piece=>{
      if(Object.hasOwn(piece,'text'))return {k:'lit',value:piece.text,type:STRING,span:node.span};
      let value=arguments_[piece.argument];
      if(piece.capture){const {name,path:resolved}=piece.capture;if(!captures.has(name))captures.set(name,bind(this.expr({k:'name',path:env.has(name)?[name]:resolved,span:piece.sourcePosition?.span??node.span},env,path)));value=captures.get(name);}
      if(value.type.kind==='data'&&node.sourceTemplateControl&&node.sourceDisplayScope&&!piece.spec&&!value.type.rustReference){
        let closure;
        try{closure=sourceNominalDisplayClosure(node.sourceDisplayScope,['crate',...value.type.name.split('.')]);sourceNominalDisplayClosureFacts(closure);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('source Display closure',error.message,node.span);}
        const method=this.resolvedMethod?.(value.type,closure.inherentMethod,'shared');
        if(!method||method.generated!=='router-checked-inherent-method'||!method.sourceMethodProof)throw unsupported('source Display inherent method','requires the checked original source method for this exact nominal owner',node.span);
        const methodEnv=new Map(env);methodEnv.set(value.name,value.type);
        const checked=this.methodCall(method,{k:'name',path:[value.name],span:value.span},[],methodEnv,path,undefined,node.span);
        if(checked.type.kind!=='string'||checked.type.rustReference||checked.type.rustOwnership?.kind!=='borrowed'||checked.type.rustOwnership.source!=='str')throw unsupported('source Display string result','requires the original method checked as a borrowed str result',node.span);
        value=bind(checked);
        displayClosures.push({nominal:closure.nominal,implementation:closure.implementation,originalMethod:closure.method,standardSourceDigest:metadataDigest(closure.standard),sourceProgramDigest:metadataDigest(closure.forwarder),inherentMethod:method.fullName,formatterControlTrace:closure.execution.formatterControlTrace,allocatorEffectsVerified:false,ioEffectsVerified:false,runtimeParity:false});
      }
      if(!['fixed','bool','string'].includes(value.type.kind))throw unsupported('format trait','requires an actual checked primitive Display implementation',node.span);
      if(!piece.spec)return {k:'toString',arg:value,type:STRING,span:node.span};
      if(value.type.kind==='string') {
        const match=/^(?:([^{}])?([<^>]))?(\d*)(?:\.(\d+))?$/u.exec(piece.spec);
        if(!match)throw unsupported('string format options','only scalar fill, alignment and bounded literal width/precision are checked',node.span);
        const width=Number(match[3]||0),precision=match[4]===undefined?null:Number(match[4]);
        if(!Number.isSafeInteger(width)||width>2048||precision!==null&&(!Number.isSafeInteger(precision)||precision>2048))throw unsupported('format allocation width','literal width or precision exceeds the checked 2048-character profile',node.span);
        return {k:'routerFormatString',value,fill:match[1]??' ',align:match[2]??'<',width,precision,type:STRING,span:node.span};
      }
      if(value.type.kind!=='fixed')throw unsupported('primitive format options','noninteger options require a separate formatting contract',node.span);
      const match=/^(\+?)(#?)(0?)(\d*)([xXob]?)$/u.exec(piece.spec);
      if(!match)throw unsupported('format options','only fixed integer sign, alternate radix and bounded literal width are checked',node.span);
      const width=Number(match[4]||0);if(!Number.isSafeInteger(width)||width>2048)throw unsupported('format allocation width','literal width exceeds the checked 2048-character profile',node.span);
      return {k:'routerFormatInteger',value,plus:Boolean(match[1]),alternate:Boolean(match[2]),zero:Boolean(match[3]),width,radix:{x:16,X:16,o:8,b:2}[match[5]]??10,upper:match[5]==='X',type:STRING,span:node.span};
    });
    const body=values.length?values.reduce((left,right)=>({k:'binary',op:'concat',left,right,type:STRING,span:node.span})):{k:'lit',value:'',type:STRING,span:node.span};
    const type={...STRING,patternOwnershipRefusal:'owned String formatting'};
    const checked=bindings.reduceRight((body,binding)=>({k:'let',...binding,body,mutable:false,type,span:node.span}),{...body,type});
    return {...checked,formatProvenance:{sourceTemplateSpan:node.templateProvenance.span,sourceMacroSpan:node.span,profile:'checked-primitive-format-v1',explicitArgumentCount:node.args.length,...(displayClosures.length?{sourceDisplayClosures:displayClosures}:{}),...(node.sourceTemplateControl?{sourceControl:{schema:node.sourceTemplateControl.schema,originRanges:node.sourceTemplateControl.originRanges,argPlaces:node.sourceTemplateControl.argPlaces,helperTrace:node.sourceTemplateControl.trace,namespaceAuthority:false,traitSelectionVerified:false}}:{})}};
  }
}

export class FormatEmitter extends TupleEmitter {
  expr(node) {
    if(node.k==='routerFormatString') {
      let text=this.expr(node.value);if(node.precision!==null)text=`Array.from(${text}).slice(0,${node.precision}).join("")`;
      const count=`Math.max(0,${node.width}-Array.from(${text}).length)`,fill=JSON.stringify(node.fill);
      if(node.align==='<')return `(${text}+${fill}.repeat(${count}))`;
      if(node.align==='>')return `(${fill}.repeat(${count})+${text})`;
      return `(${fill}.repeat(Math.floor(${count}/2))+${text}+${fill}.repeat(${count}-Math.floor(${count}/2)))`;
    }
    if(node.k!=='routerFormatInteger')return super.expr(node);
    const value=this.expr(node.value),decimal=node.radix===10;
    const magnitude=decimal?`(${value}<0n?-${value}:${value})`:`BigInt.asUintN(${node.value.type.bits},${value})`;
    let digits=`(${magnitude}).toString(${node.radix})`;if(node.upper)digits+='.toUpperCase()';
    const positive=node.plus?'+':'',sign=decimal?`(${value}<0n?"-":${JSON.stringify(positive)})`:JSON.stringify(positive);
    const prefix=node.alternate?{16:'0x',8:'0o',2:'0b'}[node.radix]??'':'';
    if(node.zero&&node.width)digits+=`.padStart(Math.max(0,${node.width}-${sign}.length-${prefix.length}),"0")`;
    const rendered=`(${sign}+${JSON.stringify(prefix)}+${digits})`;
    return !node.zero&&node.width?`${rendered}.padStart(${node.width}," ")`:rendered;
  }
}
