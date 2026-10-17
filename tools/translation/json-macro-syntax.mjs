// Original token-tree syntax only. Opaque interpolation is not evaluated or
// treated as a Serialize implementation, and no caller macro is authorized.
import {createHash} from 'node:crypto';
import {originalMacroInvocation,originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
const sources=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('JSON macro syntax: '+message);};
function literal(tree) {
  if(tree?.kind!=='token'||tree.type!=='string'||!(tree.text.startsWith('"')||/^r#*"/u.test(tree.text)))return fail('requires an original Rust string literal');
  const tokens=tokenizeRust(tree.text).filter(token=>token.kind!=='eof');
  if(tokens.length!==1||tokens[0].kind!=='string')return fail('string literal requires the actual lexical decoder');
  return tokens[0].value;
}
export function parseJsonMacroSyntax(source,{maxBytes=65536,maxDepth=16,maxNodes=256}={}) {
  if(!Number.isInteger(maxBytes)||maxBytes<=0||maxBytes>65536||!Number.isInteger(maxDepth)||maxDepth<=0||maxDepth>24||!Number.isInteger(maxNodes)||maxNodes<=0||maxNodes>1024)fail('invalid source budgets');
  if(typeof source!=='string'||Buffer.byteLength(source)>maxBytes)fail('original invocation exceeds its source budget');
  const invocation=originalMacroInvocation(source),leaves=[];let nodes=0;
  const interval=trees=>({start:trees[0].span.start,end:trees.at(-1).span.end});
  function value(trees,depth) {
    if(!trees.length||++nodes>maxNodes||depth>maxDepth)fail('value or nesting budget exceeded');
    const span=interval(trees);
    if(trees.length===1&&trees[0].kind==='group') {
      const group=trees[0];
      if(group.delimiter==='[')return {kind:'array',items:sequences(group.children,depth+1,false),span};
      if(group.delimiter==='{')return {kind:'object',entries:sequences(group.children,depth+1,true),span};
    }
    if(trees.length===1&&trees[0].kind==='token') {
      const token=trees[0];
      if(['null','true','false'].includes(token.text))return {kind:token.text==='null'?'null':'bool',...(token.text!=='null'?{value:token.text==='true'}:{}),span};
      if(token.type==='string')return {kind:'string',value:literal(token),span};
    }
    let requiresQuestionMarkFlow=false;
    const inspect=items=>{
      let operand=true,prefix=true;
      for(let at=0;at<items.length;at++){
        const tree=items[at];
        if(tree.kind==='group'){if(tree.delimiter!=='(')fail('interpolation block, array/index or record syntax requires another checked profile');inspect(tree.children);operand=false;prefix=false;continue;}
        if(tree.kind!=='token'||['#',';','=','+=','-=','|','&mut'].includes(tree.text)||['unsafe','async','await','return','break','continue','loop','while','for','move','mut','let','fn','impl','use','yield'].includes(tree.text))fail('macro, mutation, closure or effectful interpolation requires separate checking');
        // Prefix ! is ordinary Rust syntax; a bang after a completed path,
        // member or operand is not. Leading || still denotes a closure.
        if(tree.text==='!'){if(!operand||!prefix||at+1===items.length)fail('macro, mutation, closure or effectful interpolation requires separate checking');continue;}
        if(tree.text==='||'){if(operand||at+1===items.length)fail('macro, mutation, closure or effectful interpolation requires separate checking');operand=true;prefix=true;continue;}
        if(tree.text==='?')requiresQuestionMarkFlow=true;
        if(['::','.','as'].includes(tree.text)){operand=true;prefix=false;}
        else if([',','&&','==','!=','<','<=','>','>=','+','-','*','/','%','&','^','<<','>>'].includes(tree.text)){operand=true;prefix=true;}
        else{operand=false;prefix=false;}
      }
    };
    inspect(trees);
    const leaf={kind:'expression',index:leaves.length,span,source:source.slice(span.start,span.end),trees,requiresQuestionMarkFlow};
    leaves.push(leaf);return leaf;
  }
  function sequences(trees,depth,object) {
    const result=[],keys=new Set();let start=0;
    for(let end=0;end<=trees.length;end++) {
      if(end<trees.length&&trees[end].text!==',')continue;
      const part=trees.slice(start,end);start=end+1;
      if(!part.length){if(end===trees.length)break;fail('unexpected empty element');}
      if(object) {
        if(part[0]?.type!=='string'||part[1]?.text!==':')fail('object keys must be a single actual string literal');
        const key=literal(part[0]);if(keys.has(key))fail('duplicate literal object keys remain unsupported');keys.add(key);
        result.push({key,keySource:part[0],value:value(part.slice(2),depth)});
      } else result.push(value(part,depth));
    }
    return result;
  }
  const syntax=freezeMacroTree({kind:'original-json-macro-syntax',path:invocation.path,sourceSha256:hash(source),source,value:value(invocation.trees,0),leaves,originalTrees:invocation.trees,ownerResolved:false,namespaceAuthority:false,expansionAuthority:false,runtimeParity:false});
  sources.set(syntax,{source,sourceSha256:hash(source)});return syntax;
}
export function isOriginalJsonMacroSyntax(value){return !!value&&sources.has(value);}
export function jsonMacroSyntaxSource(value) {
  const source=sources.get(value);if(!source)throw new TypeError('Unsealed original JSON macro syntax');return Object.freeze({...source});
}
export function captureOriginalJsonMacroInvocations(source) {
  const trees=originalMacroTrees(source),result=[];
  function visit(items) {
    for(let at=0;at<items.length;at++) {
      let end=at;
      if(items[at]?.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(items[at].text)) {
        while(items[end+1]?.text==='::'&&items[end+2]?.kind==='token')end+=2;
        if(items[end]?.text==='json'&&items[end+1]?.text==='!'&&items[end+2]?.kind==='group') {
          const span={start:items[at].span.start,end:items[end+2].span.end};
          const original=source.slice(span.start,span.end);
          try{result.push({span,source:original,syntax:parseJsonMacroSyntax(original)});}
          catch(error){if(!(error instanceof TypeError))throw error;result.push({span,source:original,syntax:null,diagnostic:error.message,namespaceAuthority:false,expansionAuthority:false,runtimeParity:false});}
          at=end+2;continue;
        }
      }
      if(items[at]?.kind==='group')visit(items[at].children);
    }
  }
  visit(trees);return freezeMacroTree(result);
}
