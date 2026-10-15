// Selected complete output syntax, never a caller macro binding or runtime proof.
// Unlike the strict expression observer, this additive lane permits block-local
// use/static declarations while retaining all initializers and type subtrees.
import {types} from 'node:util';
import * as tokenEngine from './declarative-token-macros.mjs';
import * as astEngine from './declarative-macros.mjs';
import {originalMacroFragmentAst,originalMacroFragmentDefinition} from './source-macro-fragments.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';

const issued=new WeakMap(),fail=message=>{throw new TypeError('Local bang output scope: '+message);};
const word=node=>node?.kind==='token'?node.text:null;
const forbidden=new Set('fn impl mod struct enum union trait const extern macro macro_rules pub async unsafe await move yield'.split(' '));
const reserved=new Set('as break continue dyn else false for if in let loop match mut ref return static true use where while abstract become box do final gen override priv try typeof unsized virtual'.split(' '));
const identifier=node=>node?.kind==='token'&&node.type==='ident'&&/^(?:r#)?[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(node.text)&&(!forbidden.has(node.text)&&!reserved.has(node.text)||node.text.startsWith('r#'));
const lifetime=node=>node?.kind==='token'&&node.type==='char'&&/^'[A-Za-z_][A-Za-z0-9_]*$/u.test(node.text);
function options(value,allowed){
  if(!value||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary own-data options required');
  const fields=Object.getOwnPropertyDescriptors(value),out=Object.create(null);
  for(const key of Reflect.ownKeys(fields)){
    if(typeof key!=='string'||!allowed.includes(key)||!Object.hasOwn(fields[key],'value'))fail('unknown option or option accessor');
    Object.defineProperty(out,key,{value:fields[key].value,enumerable:true});
  }
  return out;
}
function dense(value){
  if(!value||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary dense child array required');
  const fields=Object.getOwnPropertyDescriptors(value),length=fields.length;
  if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value>128||Reflect.ownKeys(fields).length!==length.value+1)fail('bounded dense child array required');
  const out=[];
  for(let at=0;at<length.value;at++){
    if(!Object.hasOwn(fields,String(at))||!Object.hasOwn(fields[at],'value'))fail('child accessor or hole');
    out.push(fields[at].value);
  }
  return out;
}
function samePath(a,b){
  if(a.length!==b.length)return false;
  for(let at=0;at<a.length;at++){
    const left=Object.getOwnPropertyDescriptors(a[at]),right=Object.getOwnPropertyDescriptors(b[at]),keys=Reflect.ownKeys(left);
    if(keys.length!==Reflect.ownKeys(right).length)return false;
    for(const key of keys){
      if(typeof key!=='string'||!Object.hasOwn(right,key)||!Object.hasOwn(left[key],'value')||!Object.hasOwn(right[key],'value'))return false;
      const value=left[key].value;if(value!==null&&!['string','number','boolean'].includes(typeof value)||value!==right[key].value)return false;
    }
  }
  return true;
}
function engineFor(expansion){
  if(tokenEngine.isDeclarativeExpansion(expansion))return tokenEngine;
  if(astEngine.isDeclarativeExpansion(expansion))return astEngine;
  fail('genuine original expansion required');
}
// Only transparent singleton nonterminals are unwrapped. Opaque captures retain
// their exact engine-issued sourceAstCapture and are checked independently.
function transparent(tree){
  for(let depth=0;tree?.kind==='fragment'&&['ident','lifetime','tt'].includes(tree.fragment)&&tree.trees.length===1;depth++){
    if(depth>=64)fail('transparent fragment depth bound');tree=tree.trees[0];
  }
  return tree;
}
const binary={'||':1,'&&':2,'==':3,'!=':3,'<':3,'<=':3,'>':3,'>=':3,'|':4,'^':5,'&':6,'+':8,'-':8,'*':9,'/':9,'%':9};
class OutputParser{
  constructor(nodes,state,depth=0){
    if(depth>64)fail('complete grammar depth bound');this.nodes=nodes.map(transparent);this.state=state;this.depth=depth;this.at=0;
  }
  current(){return this.nodes[this.at];}
  take(text){if(word(this.current())===text){this.at++;return true;}return false;}
  need(text){if(!this.take(text))fail('original '+text+' required');}
  group(delimiter){const group=this.nodes[this.at++];if(group?.kind!=='group'||group.delimiter!==delimiter)fail('original '+delimiter+' group required');return group;}
  name(){const node=this.nodes[this.at++];if(!identifier(node))fail('original identifier required');return node.text;}
  child(nodes){return new OutputParser(nodes,this.state,this.depth+1);}
  node(kind,start,fields={}){
    if(++this.state.cells>32000)fail('complete grammar cell bound');
    for(let at=start;at<this.at;at++){
      this.state.retainedSourceCells+=this.state.treeWeights.get(this.nodes[at])??1;
      if(this.state.retainedSourceCells>32000)fail('complete retained source provenance bound');
    }
    return {kind,...fields,originalTrees:this.nodes.slice(start,this.at)};
  }
  all(){if(!this.nodes.length)return {kind:'empty-output'};const value=this.expression();if(this.at!==this.nodes.length)fail('complete expression leaves original output');return value;}
  sequence(delimiter,parse){
    const group=this.group(delimiter),parser=this.child(group.children),items=[];
    while(parser.at<parser.nodes.length){items.push(parse(parser));if(!parser.take(','))break;}
    if(parser.at!==parser.nodes.length)fail('complete separated subtree required');return items;
  }
  path(){
    const start=this.at,first=this.current();let parts,owner=null;
    if(first?.kind==='owner'){this.at++;parts=[...first.target];owner=first;}
    else{const absolute=this.take('::');parts=[this.name()];if(absolute)owner={kind:'unresolved-absolute-path'};}
    while(word(this.current())==='::'&&identifier(this.nodes[this.at+1])){this.at++;parts.push(this.name());if(parts.length>64)fail('original path bound');}
    return this.node('path',start,{parts,owner,ownerResolved:false});
  }
  type(){
    if(++this.state.typeDepth>64)fail('type depth bound');
    try{return this.typeInner();}finally{this.state.typeDepth--;}
  }
  typeInner(){
    const start=this.at;
    if(this.current()?.kind==='fragment')fail('opaque type fragment lacks an original type AST issuer');
    if(this.take('&')){
      let originalLifetime=null;if(lifetime(this.current()))originalLifetime=this.nodes[this.at++];
      const mutable=this.take('mut');return this.node('reference-type',start,{lifetime:originalLifetime,mutable,value:this.type()});
    }
    if(this.take('dyn'))return this.node('dyn-type',start,{value:this.typePath()});
    if(this.current()?.delimiter==='(')return this.node('tuple-type',start,{items:this.sequence('(',parser=>parser.type())});
    if(this.current()?.delimiter==='['){
      const group=this.group('['),parser=this.child(group.children),element=parser.type();let length=null;
      if(parser.take(';')){const token=parser.nodes[parser.at++];if(token?.type!=='number'||!/^\d+$/u.test(word(token)))fail('original literal array type length required');length=token;}
      if(parser.at!==parser.nodes.length)fail('complete array/slice type required');return this.node('array-type',start,{element,length});
    }
    return this.typePath();
  }
  typePath(){
    const start=this.at,path=this.path(),arguments_=[];
    if(this.take('<')){
      if(word(this.current())==='>')fail('empty generic type arguments');
      for(;;){
        if(lifetime(this.current()))arguments_.push({kind:'lifetime-type',original:this.nodes[this.at++]});
        else arguments_.push(this.type());
        if(this.take('>'))break;this.need(',');if(this.take('>'))break;
      }
    }
    return this.node('path-type',start,{path,arguments:arguments_,typeOwnerResolved:false});
  }
  useTree(prefix=[]){
    if(prefix.length>64)fail('use tree depth bound');
    const start=this.at;
    if(this.current()?.delimiter==='{'){
      const branches=this.sequence('{',parser=>parser.useTree(prefix));if(!branches.length)fail('empty use group');return this.node('use-group',start,{prefix,branches});
    }
    const path=[...prefix,this.name()];
    if(this.take('::'))return this.node('use-branch',start,{path,tail:this.useTree(path)});
    let alias=null;if(this.take('as'))alias=this.name();return this.node('use-leaf',start,{path,alias,namespaceResolved:false});
  }
  block(group=this.group('{')){
    const parser=this.child(group.children),statements=[];let tail=null;
    while(parser.at<parser.nodes.length){
      const start=parser.at;
      if(parser.take('use')){const absolute=parser.take('::'),tree=parser.useTree();parser.need(';');statements.push(parser.node('local-use',start,{absolute,tree}));continue;}
      if(parser.take('static')){
        if(word(parser.current())==='mut')fail('mutable static output remains unproved');
        const name=parser.name();parser.need(':');const type=parser.type();parser.need('=');const initializer=parser.expression();parser.need(';');statements.push(parser.node('local-static',start,{name,type,initializer}));continue;
      }
      if(parser.take('let')){
        const mutable=parser.take('mut'),name=parser.name(),type=parser.take(':')?parser.type():null;parser.need('=');const initializer=parser.expression();parser.need(';');statements.push(parser.node('local-let',start,{name,mutable,type,initializer}));continue;
      }
      const value=parser.expression();
      if(parser.take(';'))statements.push(parser.node('expression-statement',start,{value}));
      else if(parser.at===parser.nodes.length){tail=value;break;}
      else if(['if','match','block'].includes(value.kind))statements.push(parser.node('expression-statement',start,{value}));
      else fail('original statement delimiter required');
    }
    return {kind:'block',statements,tail,originalGroup:group};
  }
  pattern(){
    const start=this.at;
    if(this.current()?.kind==='fragment')return this.opaque('pat');
    if(this.take('_'))return this.node('wild-pattern',start);
    const value=this.current();
    if(['true','false'].includes(word(value))||['number','char','string'].includes(value?.type)){this.at++;return this.node('literal-pattern',start,{value});}
    fail('original pattern grammar remains unproved');
  }
  opaque(fragment){
    const start=this.at,node=this.nodes[this.at++];
    if(node?.kind!=='fragment'||node.fragment!==fragment||this.state.engine!==astEngine||!node.sourceAstCapture||!this.state.context)fail('opaque '+fragment+' requires its exact original AST context');
    const ast=originalMacroFragmentAst(this.state.context,node.sourceAstCapture);
    if(node.sourceAstCapture.fragment!==fragment)fail('original AST fragment kind differs');
    this.state.astWalk(ast,fragment);this.state.captures.push(Object.freeze({tree:node,capture:node.sourceAstCapture,ast,context:this.state.context}));
    return this.node('original-ast-slot',start,{fragment,ast,originalCapture:node.sourceAstCapture});
  }
  expression(minimum=0){
    if(++this.state.expressions>64)fail('expression depth bound');
    try{
      const start=this.at;let value=this.primary();
      for(;;){
        if(word(this.current())==='as'&&minimum<=10){this.at++;value=this.node('cast',start,{value,type:this.type(),castSemanticsVerified:false});continue;}
        const operation=word(this.current()),level=Object.hasOwn(binary,operation)?binary[operation]:undefined;if(level===undefined||level<minimum)break;
        if(level===3&&value.kind==='binary'&&Object.hasOwn(binary,value.operation)&&binary[value.operation]===3)fail('comparison chain needs original parentheses');
        this.at++;const right=this.expression(level+1);value=this.node('binary',start,{operation,left:value,right});
      }
      return value;
    }finally{this.state.expressions--;}
  }
  primary(){
    const start=this.at,first=this.current(),text=word(first);let value;
    if(first?.kind==='fragment')return this.opaque('expr');
    if(text==='#'||forbidden.has(text))fail('attribute/item/modifier output remains unproved');
    if(this.take('if')){
      const condition=this.expression(),then=this.block();let otherwise=null;if(this.take('else'))otherwise=word(this.current())==='if'?this.expression():this.block();
      value=this.node('if',start,{condition,then,otherwise});
    }else if(this.take('match')){
      const subject=this.expression(),group=this.group('{'),parser=this.child(group.children),arms=[];
      while(parser.at<parser.nodes.length){const pattern=parser.pattern(),guard=parser.take('if')?parser.expression():null;parser.need('=>');const body=parser.expression();arms.push({pattern,guard,body});if(!parser.take(',')&&parser.at<parser.nodes.length)fail('original match comma required');}
      if(!arms.length)fail('empty match output');value=this.node('match',start,{subject,arms,originalGroup:group});
    }else if(this.take('||'))value=this.node('closure',start,{parameters:[],body:this.expression()});
    else if(this.take('|')){
      const parameters=[];while(!this.take('|')){const name=this.name(),type=this.take(':')?this.type():null;parameters.push({name,type});if(word(this.current())!=='|')this.need(',');}
      value=this.node('closure',start,{parameters,body:this.expression()});
    }else if(['&','!','-','*'].includes(text)){
      this.at++;const mutable=text==='&'&&this.take('mut');value=this.node('unary',start,{operation:text,mutable,value:this.expression(11)});
    }else if(first?.delimiter==='{')value=this.block();
    else if(first?.delimiter==='(')value=this.node('tuple',start,{items:this.sequence('(',parser=>parser.expression())});
    else if(first?.delimiter==='[')value=this.node('array',start,{items:this.sequence('[',parser=>parser.expression())});
    else if(['true','false'].includes(text)||['number','string','char'].includes(first?.type)){this.at++;value=this.node('literal',start,{original:first});}
    else{
      value=this.path();
      if(this.take('!')){
        const arguments_=this.nodes[this.at++];if(arguments_?.kind!=='group')fail('original macro argument group required');
        value=this.node('nested-macro',start,{path:value,arguments:arguments_,child:this.state.child(value,arguments_,this.depth)});
      }
    }
    for(;;){
      if(this.current()?.delimiter==='(')value=this.node('call',start,{callee:value,arguments:this.sequence('(',parser=>parser.expression())});
      else if(this.take('.'))value=this.node('field',start,{object:value,name:this.name()});
      else if(this.current()?.delimiter==='['){const group=this.group('[');value=this.node('index',start,{object:value,index:this.child(group.children).all()});}
      else break;
    }
    return value;
  }
}

/** A private observation of all selected output, including every initializer.
 * Supplied children are output proofs, never substitutions for source or ASTs. */
export function observeLocalBangOutput(expansion,input={}){
  const settings=options(input,['children','sourceFragments']),provided=dense(settings.children??[]),engine=engineFor(expansion),lineage=engine.declarativeExpansionLineage(expansion);
  let definitionProfile=null;
  if(settings.sourceFragments!==undefined){
    if(engine!==astEngine)fail('token-only output cannot consume a Host AST context');
    definitionProfile=originalMacroFragmentDefinition(settings.sourceFragments);
    if(definitionProfile.name!==lineage.definition.name||definitionProfile.edition!=='2024')fail('original AST definition context differs');
  }
  const records=engine.declarativeNestedMacroInvocations(expansion),used=new Set(),links=[],captures=[],state={cells:0,expressions:0,typeDepth:0,retainedSourceCells:0,treeWeights:new WeakMap(),engine,context:settings.sourceFragments,captures};
  let totalDepth=0;
  // The independent complete TT pass also visits opaque token interiors. A
  // supported AST cannot conceal attributes, item declarations or macro input.
  function inspect(nodes,depth=0,opaque=false){
    if(depth>64)fail('complete token depth bound');totalDepth=Math.max(totalDepth,depth);
    let weight=0;
    for(const tree of nodes){
      if(++state.cells>32000)fail('complete token cell bound');
      let subtreeWeight=1;
      if(tree.kind==='token'){
        if(tree.text==='#')fail('output attribute owner/effect remains unproved');
        if(forbidden.has(tree.text))fail('item/modifier output remains unproved: '+tree.text);
        if(opaque&&['!','use','static'].includes(tree.text))fail('opaque AST contains an unobserved declaration or nested macro');
      }else if(tree.kind==='group')subtreeWeight+=inspect(tree.children,depth+1,opaque);
      else if(tree.kind==='fragment')subtreeWeight+=inspect(tree.trees,depth+1,opaque||!['tt','ident','lifetime'].includes(tree.fragment));
      else if(tree.kind!=='owner')fail('unknown original token tree');
      state.treeWeights.set(tree,subtreeWeight);weight+=subtreeWeight;
    }
    return weight;
  }
  state.astWalk=(ast,fragment,depth=0)=>{
    if(depth>64||++state.cells>32000)fail('original AST cell/depth bound');
    const visit=node=>state.astWalk(node,fragment,depth+1);
    if(!ast||typeof ast!=='object'||types.isProxy(ast))fail('missing original AST');
    const fields=Object.getOwnPropertyDescriptors(ast);
    const shape=(required,optional=[])=>{
      for(const key of ['k','span',...required])if(!Object.hasOwn(fields,key)||!Object.hasOwn(fields[key],'value'))fail('missing original AST field: '+key);
      for(const key of Reflect.ownKeys(fields))if(typeof key!=='string'||!['k','span',...required,...optional].includes(key)||!Object.hasOwn(fields[key],'value'))fail('unknown original AST field');
    };
    if(!Object.hasOwn(fields,'k')||!Object.hasOwn(fields.k,'value'))fail('missing original AST variant');
    const kind=fields.k.value;
    if(fragment==='pat'){
      if(kind==='wild'){shape([]);return;}
      if(['boolLit','strLit','numLit'].includes(kind)){shape(['value'],kind==='numLit'?['negative','suffix']:[]);return;}
      if(['bind','bindOrCtor'].includes(kind)){shape(['name'],['registeredGenericOwner']);return;}
      if(kind==='or'){shape(['alternatives']);ast.alternatives.forEach(visit);return;}
      if(kind==='ctor'){shape(['path','args'],['registeredGenericOwner']);ast.args.forEach(visit);return;}
      fail('original pattern AST grammar remains unproved: '+kind);
    }
    if(kind==='name'){shape(['path']);return;}
    if(['bool','str','num'].includes(kind)){shape(['value']);return;}
    if(kind==='binary'){shape(['op','left','right']);visit(ast.left);visit(ast.right);return;}
    if(kind==='unary'){shape(['op','arg']);visit(ast.arg);return;}
    fail('original expression AST grammar remains unproved: '+kind);
  };
  state.child=(path,group,depth)=>{
    const matches=records.filter(record=>engine.declarativeNestedMacroInput(expansion,record)===group.children);
    if(matches.length!==1||used.has(matches[0]))fail('missing or alias-ambiguous original macro occurrence');
    const record=matches[0],candidates=provided.filter(token=>{
      const child=issued.get(token);return child?.engine===engine&&child.lineage.parent===expansion&&samePath(child.lineage.path,record.path);
    });
    if(candidates.length!==1)fail('missing duplicate or foreign exact child proof');
    const token=candidates[0],child=issued.get(token),owner=record.writtenPath.length===1?lineage.definition.owner:record.writtenPath.slice(0,-1);
    if(record.writtenPath.length!==path.parts.length||record.writtenPath.some((part,index)=>part!==path.parts[index])||child.lineage.definition.name!==record.writtenPath.at(-1)||owner.length!==child.lineage.definition.owner.length||owner.some((part,index)=>part!==child.lineage.definition.owner[index]))fail('child definition/path hygiene differs; namespace aliases remain unproved');
    if(links.some(link=>link.token===token))fail('child proof reused for another original occurrence');
    state.cells+=child.cells;if(state.cells>32000)fail('complete transitive cell bound');used.add(record);links.push(Object.freeze({record,group,token,depth}));return token;
  };
  inspect(expansion.trees);const ir=new OutputParser(expansion.trees,state).all();
  if(settings.sourceFragments!==undefined&&!captures.length)fail('supplied original AST context has no genuine issued capture');
  if(used.size!==records.length||links.length!==provided.length)fail('missing or extra child output');
  for(const link of links){totalDepth=Math.max(totalDepth,issued.get(link.token).depth+link.depth+1);if(totalDepth>64)fail('complete transitive depth bound');}
  const token=Object.freeze({schema:'private-complete-local-bang-output-v1'}),facts=Object.freeze({expansion,engine,lineage,ir:freezeMacroTree(ir),children:Object.freeze(links),captures:Object.freeze(captures),cells:state.cells,retainedSourceCells:state.retainedSourceCells,depth:totalDepth,sourceMode:engine===astEngine?'original-host-ast':'original-token-trees',definitionProfile,sourceFragments:settings.sourceFragments??null,callerOwnerResolved:false,namespaceAuthority:false,typeAuthority:false,runtimeAuthority:false,runtimeParity:false});
  issued.set(token,facts);return token;
}
export function localBangOutputFacts(token,input){
  const state=issued.get(token);if(!state)fail('copied proxy or unissued local output token');
  const settings=options(input,['expansion']);if(settings.expansion!==state.expansion)fail('another genuine expansion');
  if(engineFor(state.expansion)!==state.engine)fail('original expansion engine differs');return state;
}
