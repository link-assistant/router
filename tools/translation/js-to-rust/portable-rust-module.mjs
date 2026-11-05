// Inverse source selection for the exact emitted portable module envelope.
// Complete fresh semantic checks and outer Rust reemission remain mandatory.
import {sourceItems} from '../rust-structure.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {camelFromSnake} from './vendor/ir.mjs';
import {packagePortableModuleAPI} from './module-public-api.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Canonical portable Rust module: '+message);};
const NAME='__router_portable_project',primitives=new Map([['f64','number'],['String','string'],['bool','boolean'],['JsNull','null'],['JsUndefined','undefined']]);
const words=item=>item.tokens.filter(token=>token.type!=='comment').map(token=>token.text);
const identifier=value=>typeof value==='string'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value);
function scalarType(tokens){
 if(tokens.length===1&&primitives.has(tokens[0]))return primitives.get(tokens[0]);
 if(tokens.length===4&&['JsNullable','JsOptional'].includes(tokens[0])&&tokens[1]==='<'&&tokens[3]==='>'&&['f64','String','bool'].includes(tokens[2]))return primitives.get(tokens[2])+'|'+(tokens[0]==='JsNullable'?'null':'undefined');
 fail('public type alias is outside the actual closed scalar emission');
}
export function portableRustModuleEnvelope(source){
 if(typeof source!=='string'||source.length>2097152)fail('bounded complete Rust source required');
 const items=sourceItems(source).filter(item=>!item.comment);if(items[0]?.term!=='mod'||items[0].name!==NAME)return null;
 if(items.length>8193)fail('bounded complete public item census required');
 const module=items[0],tokens=module.tokens.filter(token=>token.type!=='comment');
 if(tokens[0]?.text!=='mod'||tokens[1]?.text!==NAME||tokens[2]?.text!=='{'||tokens.at(-1)?.text!=='}')fail('complete private implementation module header required');
 const body=source.slice(tokens[2].end,tokens.at(-1).start),uses=[],types=[];
 for(const item of items.slice(1)){
  const cells=words(item);
  if(item.term==='use'){
   if(cells.length!==8&&cells.length!==10||cells.slice(0,6).join(' ')!=='pub use self :: '+NAME+' ::'||!identifier(cells[6])||cells.at(-1)!==';'||cells.length===10&&(cells[7]!=='as'||!identifier(cells[8])))fail('exact named public reexport required');
   uses.push({internalName:cells[6],publicName:cells.length===10?cells[8]:cells[6],span:[item.start,item.end],source:source.slice(item.start,item.end)});
  }else if(item.term==='type'){
   if(cells[0]!=='pub'||cells[1]!=='type'||!identifier(cells[2])||cells[3]!=='='||cells.at(-1)!==';')fail('exact public closed scalar alias required');
   const domain=scalarType(cells.slice(4,-1));types.push({name:cells[2],domain,span:[item.start,item.end],source:source.slice(item.start,item.end),typescript:'type '+cells[2]+' = '+domain+';'});
  }else fail('additional outer application items require a separate module rule');
 }
 if(uses.length>4096||types.length>4096||new Set(uses.map(row=>row.publicName)).size!==uses.length||new Set(types.map(row=>row.name)).size!==types.length)fail('unique bounded public names required');
 return {body,uses,types,span:[module.start,module.end],sourceAuthority:false,semanticAuthority:false};
}
export function translatePortableRustModule(source,envelope,options,translateInner){
 let original,inner,packaged;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'rust:transport-complete-module-CST-and-select-actual-public-envelope',apply:()=>{original=transportConcreteSyntaxSource(source,{language:'Rust'});if(original.source!==source)fail('complete original source differs');const fresh=portableRustModuleEnvelope(original.source);if(!fresh||fresh.body!==envelope.body)fail('complete fresh module selection differs');envelope=fresh;return envelope;}},
   {id:'meta:check-complete-inner-program-and-its-canonical-source',apply:value=>{inner=translateInner(value.body,options,true);return inner;}},
  ]},
  {phase:'repository',rules:[{id:'router:reconstruct-public-aliases-and-require-complete-Rust-reemission',apply:value=>{
   const publicExports=[],support=sourceItems(value.rust).filter(item=>['struct','enum','type'].includes(item.term));
   for(const row of envelope.uses){
    const declarations=value.program.filter(item=>['function','constant'].includes(item.kind)&&item.name===row.internalName);
    if(declarations.length===1&&declarations[0].exported===true)publicExports.push({publicName:camelFromSnake(row.publicName),internalName:camelFromSnake(row.internalName),kind:'value',source:'original-Rust-module',span:row.span,sourceAuthority:false,semanticAuthority:false});
    else if(row.publicName!==row.internalName||!support.some(item=>item.name===row.internalName)){
     // Helpers required only by public type aliases may be absent from the
     // checked inner normal form. The outer fresh emitter must restore them.
     if(row.publicName!==row.internalName||!['JsNull','JsUndefined','JsNullable','JsOptional'].includes(row.internalName))fail('reexport has no actual checked runtime/support declaration');
    }
   }
   for(const row of envelope.types)publicExports.push({publicName:row.name,internalName:row.name,kind:'type',source:'original-Rust-module',span:row.span,sourceAuthority:false,semanticAuthority:false});
   const linkedSource=envelope.types.map(row=>row.typescript).join('\n')+'\n'+value.typescript;
   packaged=packagePortableModuleAPI(value,{publicExports,linkedSource,language:'TypeScript'});
   if(!sameRustSourceSyntax(source,packaged.rust))fail('complete outer Rust module, helpers, visibility, aliases or type API differs');
   const equations=transportConcreteSourceEquations([{before:source,after:packaged.rust,language:'Rust'}]);if(equations[0].inverse!==source)fail('complete outer Rust inverse differs');
   return {...packaged,rust:source,portableRustModuleHistory:{originalConcreteSyntax:original.meta,envelope,equations,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false},runtimeParity:false,wholeRouterSynchronization:false};
  }}]},
 ]).run(null);return {...run.value,portableRustModuleRuleTrace:run.trace};
}
