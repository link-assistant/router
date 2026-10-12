// Exact lexical caller frames for original compiler callback syntax. Unknown
// patterns/control joins remain source-bearing obligations, never empty slots.
import {createHash} from 'node:crypto';
import {builtinAstCallbackInventoryOriginal,builtinAstFunctionSourceParameters} from './builtin-ast-builder-meta.mjs';
import {astSyntaxText} from './builtin-derive-ast-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const frames=new WeakMap();
const ident=node=>node?.kind==='token'&&/^[_\p{L}][_\p{L}\p{N}]*$/u.test(node.text);
const span=nodes=>({start:nodes[0].span.start,end:nodes.at(-1).span.end});
export function splitBuiltinCallerSyntax(nodes){
  const rows=[];let start=0,angle=0,closureHeader=false;
  for(let at=0;at<=nodes.length;at++){
    if(nodes[at]?.text==='|'&&(closureHeader||at===start||at===start+1&&nodes[start]?.text==='move'))closureHeader=!closureHeader;
    if(nodes[at]?.text==='<')angle++;if(nodes[at]?.text==='>')angle--;
    if(angle<0)throw new TypeError('Caller argument angle syntax remains unproved');
    if(at===nodes.length||nodes[at]?.text===','&&!angle&&!closureHeader){if(at>start)rows.push(nodes.slice(start,at));start=at+1;}
  }
  if(angle||closureHeader)throw new TypeError('Caller argument generic/closure syntax remains unproved');return rows;
}
export function createBuiltinAstCallerEnvironments(compiler,profile,inventory){
  const fragment=builtinAstCallbackInventoryOriginal(compiler,inventory),parameters=builtinAstFunctionSourceParameters(profile,fragment);
  const declarations=[],calls=new Map(),controls=[],obligations=[];let count=0;
  const source=nodes=>({source:fragment.source,sourceSha256:fragment.sourceSha256,span:span(nodes),syntax:nodes});
  const receiverType=astSyntaxText(inventory.receiver.parameter.typeSyntax).replace(/\s/gu,'');
  function binding(name,nodes,kind,typeSyntax=[],initializer=null,mutable=false){
    const value={id:fragment.digest+':'+nodes[0].span.start+':'+name,name,kind,...source(nodes),typeSyntax,initializer,mutable,receiverOwner:!mutable&&astSyntaxText(typeSyntax).replace(/\s/gu,'')===receiverType?inventory.receiver.import:null};
    declarations.push(value);return value;
  }
  const root=new Map(parameters.map(value=>[value.name,binding(value.name,value.syntax,'function-parameter',value.typeSyntax,null,value.mutable)]));
  const callLocations=new Map(inventory.calls.map(value=>[value.span.start,value]));
  function patternBindings(nodes,environment,kind){
    const child=new Map(environment);
    // These are intentionally opaque pattern-name obligations. No constant vs
    // binding resolution or enclosing name capture is fabricated.
    for(const node of nodes)if(ident(node)&&!['mut','ref','in','let'].includes(node.text))child.set(node.text,binding(node.text,[node],kind));
    function nested(list){for(const node of list)if(node.kind==='group'){for(const childNode of node.children)if(ident(childNode)&&!['mut','ref'].includes(childNode.text))child.set(childNode.text,binding(childNode.text,[childNode],kind));nested(node.children);}}
    nested(nodes);obligations.push({kind,source:source(nodes)});return child;
  }
  function visitExpression(nodes,environment,path,depth){
    const first=nodes.findIndex(node=>node.text==='|');
    if(first>=0){
      const last=nodes.findIndex((node,index)=>index>first&&node.text==='|');
      if(last<0){obligations.push({kind:'unproved-closure-header',source:source(nodes)});visit(nodes,environment,path,depth+1);return;}
      const child=new Map(environment);
      for(const row of splitBuiltinCallerSyntax(nodes.slice(first+1,last))){
        const colon=row.findIndex(node=>node.text===':'),name=row.find(ident);
        if(!name||row.slice(0,colon<0?row.length:colon).filter(ident).length!==1)throw new TypeError('Original closure parameter pattern remains unproved');
        const value=binding(name.text,row,'closure-parameter',colon<0?[]:row.slice(colon+1));child.set(name.text,value);
      }
      visit(nodes.slice(last+1),child,[...path,{kind:'source-closure',source:source(nodes.slice(first,last+1))}],depth+1);return;
    }
    visit(nodes,environment,path,depth+1);
  }
  function visit(nodes,environment,path=[],depth=0){
    if(depth>64)throw new TypeError('Caller environment depth budget exceeded');
    for(let at=0;at<nodes.length;at++){
      const node=nodes[at];if(++count>16000)throw new TypeError('Caller environment node budget exceeded');
      if(node.text==='let'&&(at===0||nodes[at-1].text===';')){
        let end=at+1;while(end<nodes.length&&nodes[end].text!==';')end++;
        if(end===nodes.length){obligations.push({kind:'unterminated-source-let',source:source(nodes.slice(at))});continue;}
        const row=nodes.slice(at+1,end),equal=row.findIndex(node=>node.text==='='),left=equal<0?row:row.slice(0,equal),colon=left.findIndex(node=>node.text===':'),names=(colon<0?left:left.slice(0,colon)).filter(ident);
        if(equal>=0)visitExpression(row.slice(equal+1),environment,path,depth);
        const name=names.find(node=>node.text!=='mut');
        if(name&&names.filter(node=>node.text!=='mut').length===1){
          const value=binding(name.text,nodes.slice(at,end+1),'source-let',colon<0?[]:left.slice(colon+1),equal<0?null:source(row.slice(equal+1)),left.some(node=>node.text==='mut'));
          environment.set(name.text,value);
        }else{
          const child=patternBindings(left,environment,'unproved-let-pattern');for(const [name,value] of child)environment.set(name,value);
        }
        at=end;continue;
      }
      if(node.text==='fn'&&ident(nodes[at+1])){
        let args=at+2;while(args<nodes.length&&!(nodes[args].kind==='group'&&nodes[args].delimiter==='('))args++;
        let body=args+1;while(body<nodes.length&&!(nodes[body].kind==='group'&&nodes[body].delimiter==='{')&&nodes[body].text!==';')body++;
        if(nodes[args]&&nodes[body]?.delimiter==='{'){
          // A named local function does not capture its enclosing function.
          const child=new Map();
          for(const row of splitBuiltinCallerSyntax(nodes[args].children)){
            const colon=row.findIndex(value=>value.text===':'),name=row.slice(0,colon).find(ident);
            if(colon<1||!name||row.slice(0,colon).filter(ident).length!==1)throw new TypeError('Original nested function parameter pattern remains unproved');
            child.set(name.text,binding(name.text,row,'nested-function-parameter',row.slice(colon+1)));
          }
          const control={kind:'source-nested-function',source:source(nodes.slice(at,body+1))};controls.push(control);
          visit(nodes[body].children,child,[control],depth+1);at=body;continue;
        }
      }
      if(node.text==='for'){
        let body=at+1;while(body<nodes.length&&!(nodes[body].kind==='group'&&nodes[body].delimiter==='{'))body++;
        const head=nodes.slice(at+1,body),inAt=head.findIndex(node=>node.text==='in');
        if(inAt>=0&&nodes[body]){
          visit(head.slice(inAt+1),environment,path,depth+1);
          const child=patternBindings(head.slice(0,inAt),environment,'unproved-iteration-item'),control={kind:'source-for',source:source(nodes.slice(at,body+1))};controls.push(control);
          visit(nodes[body].children,child,[...path,control],depth+1);at=body;continue;
        }
      }
      if(node.text==='if'){
        let body=at+1;while(body<nodes.length&&!(nodes[body].kind==='group'&&nodes[body].delimiter==='{'))body++;
        if(nodes[body]){
          const condition=nodes.slice(at+1,body),letAt=condition.findIndex(value=>value.text==='let'),equal=condition.findIndex(value=>value.text==='=');
          visit(condition,environment,path,depth+1);
          const child=letAt>=0&&equal>letAt?patternBindings(condition.slice(letAt+1,equal),environment,'unproved-condition-pattern'):new Map(environment);
          const control={kind:'source-if',source:source(condition),branch:'then',selection:'unproved'};controls.push(control);
          visit(nodes[body].children,child,[...path,control],depth+1);
          if(nodes[body+1]?.text==='else'&&nodes[body+2]?.delimiter==='{'){
            const alternative={...control,branch:'else'};controls.push(alternative);visit(nodes[body+2].children,new Map(environment),[...path,alternative],depth+1);at=body+2;
          }else{if(nodes[body+1]?.text==='else')obligations.push({kind:'unproved-else-if-join',source:source(nodes.slice(body+1,body+3))});at=body;}
          continue;
        }
      }
      if(node.text==='match'){
        let body=at+1;while(body<nodes.length&&!(nodes[body].kind==='group'&&nodes[body].delimiter==='{'))body++;
        if(nodes[body]){
          visit(nodes.slice(at+1,body),environment,path,depth+1);
          const arms=nodes[body].children;let begin=0;
          for(let arrow=0;arrow<arms.length;arrow++)if(arms[arrow].text==='=>'){
            const pattern=arms.slice(begin,arrow);let end=arrow+1;
            if(arms[end]?.delimiter==='{')end++;
            else while(end<arms.length&&arms[end].text!==','&&arms[end].text!=='=>')end++;
            if(end<arms.length&&arms[end].text==='=>'){obligations.push({kind:'unproved-arm-boundary',source:source(arms.slice(begin,end+1))});break;}
            const control={kind:'source-match-arm',source:source(pattern),selection:'unproved'};controls.push(control);
            visit(arms.slice(arrow+1,end),patternBindings(pattern,environment,'unproved-arm-pattern'),[...path,control],depth+1);begin=arms[end]?.text===','?end+1:end;arrow=end-1;
          }
          at=body;continue;
        }
      }
      const actual=callLocations.get(node.span.start);
      if(actual&&node.text===inventory.receiver.parameter.name){
        const receiver=environment.get(node.text),argumentsSyntax=actual.syntax.at(-1).children;
        const {contract,...call}=actual;
        calls.set(actual.span.start,{call,receiverId:receiver?.id??null,environment:[...environment.values()].map(value=>value.id),controlPath:path,argumentsSyntax:splitBuiltinCallerSyntax(argumentsSyntax),receiverSourceOwner:receiver?.receiverOwner??null});
      }
      if(node.kind==='group'){
        const child=new Map(environment);
        // Actual iterator-call arguments can begin with their own closure.
        // Activate its lexical parameters before visiting that original body.
        if(node.delimiter==='('&&node.children[0]?.text==='|')visitExpression(node.children,child,path,depth+1);
        else visit(node.children,child,path,depth+1);
      }
    }
  }
  visit(fragment.syntax.at(-1).children,root);
  for(const actual of inventory.calls)if(!calls.has(actual.span.start)){
    const {contract,...call}=actual;
    calls.set(actual.span.start,{call,receiverId:null,environment:[],controlPath:[],argumentsSyntax:splitBuiltinCallerSyntax(actual.syntax.at(-1).children),receiverSourceOwner:null,unproved:'original control/binding syntax prevents a caller frame'});
    obligations.push({kind:'unproved-call-frame',source:actual.source,span:actual.span});
  }
  const evidence={schema:'original-builtin-caller-environments-v1',callbackDigest:fragment.digest,source:fragment.source,sourceSha256:fragment.sourceSha256,declarations,controls,calls:[...calls.values()],obligations,selectedOwnerBangComplete:false,generatedImplBehavior:false};
  const encoded=JSON.stringify(evidence);if(Buffer.byteLength(encoded)>524288)throw new TypeError('Caller environment metadata byte budget exceeded');
  const result=freeze({...JSON.parse(encoded),digest:hash(encoded)});frames.set(result,{compiler,profile,inventory,fragment});return result;
}
export function assertBuiltinAstCallerEnvironments(value,compiler,inventory){const state=frames.get(value);if(!state||state.compiler!==compiler||state.inventory!==inventory)throw new TypeError('Caller frames require their original private callback');return value;}
export const isBuiltinAstCallerEnvironments=value=>!!value&&frames.has(value);
