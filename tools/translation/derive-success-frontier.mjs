// Candidate evidence only: these source inventories do not resolve a macro
// call, lower a generated trait, or change any binder namespace dimension.
import {createHash} from 'node:crypto';
import {deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
import {assertDeriveFootprintCertificate} from './derive-footprints.mjs';
import {sourceItems} from './rust-structure.mjs';
import {originalMacroTrees,originalMacroInvocation} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeDefinitionHeader} from './declarative-macros.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const inventories=new WeakSet(),candidates=new WeakSet();
const identifier=tree=>tree?.kind==='token'&&tree.type==='ident'&&/^[\p{L}_][\p{L}\p{N}_]*$/u.test(tree.text)&&tree.text!=='_';
const quoteKinds=new Set(['quote','quote_spanned','quote_expr','quote_block']);
const dimensions=()=>({typeNamespaceComplete:false,valueNamespaceComplete:false,bangMacroComplete:false,attributeMacroComplete:false});

function actualSpan(origin,offset,span) {
  const original={start:offset+span.start,end:offset+span.end};
  return {source:origin.path,sourceSha256:origin.sha256,span:original,sha256:hash(origin.source.slice(original.start,original.end))};
}

// Inventories ALL literal quote groups in the selected original definition,
// including inactive generator branches. It deliberately does not choose a
// Rust control-flow branch or equate generator calls with emitted bang calls.
export function inventoryPinnedDeriveQuotes({dependencies,packageName,sourcePath,functionName}={}) {
  const origin=deriveDependencySource(dependencies,packageName,sourcePath);
  if(typeof functionName!=='string'||!/^[_\p{L}][_\p{L}\p{N}]*$/u.test(functionName))throw new TypeError('Invalid original derive function name');
  const definitions=sourceItems(origin.source).filter(item=>item.term==='fn'&&item.name===functionName);
  if(!definitions.length||definitions.length>4)throw new TypeError('Original derive definition is absent or exceeds branch inventory budget');
  const rows=[];
  for(const definition of definitions) {
    const text=origin.source.slice(definition.start,definition.end),trees=originalMacroTrees(text),quotes=[];
    function walk(children,path=[]) {
      for(let at=0;at<children.length;at++) {
        const tree=children[at];
        if(identifier(tree)&&quoteKinds.has(tree.text)&&children[at+1]?.text==='!'&&children[at+2]?.kind==='group') {
          const group=children[at+2],sourceSpan={start:tree.span.start,end:group.span.end};
          const splices=[],attributes=[],bangCalls=[];
          function template(nodes,templatePath=[]) {
            for(let index=0;index<nodes.length;index++) {
              const node=nodes[index],next=nodes[index+1];
              if(node.text==='#'&&next?.kind==='group'&&next.delimiter==='[')attributes.push({path:[...templatePath,index],...actualSpan(origin,definition.start,{start:node.span.start,end:next.span.end}),tokens:text.slice(node.span.start,next.span.end),ownerResolved:false});
              else if(node.text==='#'&&(identifier(next)||next?.kind==='group'&&next.delimiter==='('))splices.push({path:[...templatePath,index],kind:next.kind==='group'?'repetition':'value',...actualSpan(origin,definition.start,{start:node.span.start,end:next.span.end}),tokens:text.slice(node.span.start,next.span.end),outputTokensProved:false});
              if(identifier(node)&&next?.text==='!'&&nodes[index+2]?.kind==='group') {
                const body=nodes[index+2];let start=index;
                while(start>=2&&nodes[start-1]?.text==='::'&&identifier(nodes[start-2]))start-=2;
                const span={start:nodes[start].span.start,end:body.span.end};
                bangCalls.push({path:[...templatePath,index],writtenPath:nodes.slice(start,index+1).map(value=>value.text),...actualSpan(origin,definition.start,span),tokens:text.slice(span.start,span.end),ownerResolved:false});
              }
              if(node.kind==='group')template(node.children,[...templatePath,index]);
            }
          }
          template(group.children);
          quotes.push({kind:tree.text,path:[...path,at],...actualSpan(origin,definition.start,sourceSpan),tokens:text.slice(sourceSpan.start,sourceSpan.end),splices,attributes,bangCalls,emittedBranchProved:false,generatorMacroOwnerResolved:false});
          if(quotes.length>128)throw new TypeError('Original derive quote inventory budget exceeded');
        }
        if(tree.kind==='group')walk(tree.children,[...path,at]);
      }
    }
    walk(trees);
    rows.push({name:definition.name,source:sourcePath,sourceSha256:origin.sha256,span:{start:definition.start,end:definition.end},sha256:hash(text),quotes});
  }
  const evidence={schema:'pinned-derive-quote-inventory-v1',dependenciesDigest:dependencies.digest,package:packageName,version:origin.version,source:sourcePath,sourceSha256:origin.sha256,definitions:rows,writtenQuoteInventoryComplete:true,successfulBranchSelectionComplete:false,ownerResolved:false,generatedImplBehavior:false};
  const result=freeze({...evidence,digest:hash(JSON.stringify(evidence))});inventories.add(result);return result;
}
export function isPinnedDeriveQuoteInventory(value){return !!value&&inventories.has(value);}

function unitVariants(source,name) {
  const trees=originalMacroTrees(source);let at=trees.findIndex(tree=>tree.text==='enum');
  if(at<0||trees[at+1]?.text!==name||trees[at+2]?.kind!=='group'||trees[at+2].delimiter!=='{'||at+3!==trees.length)throw new TypeError('Serde frontier requires an actual nongeneric enum header');
  const body=trees[at+2].children,variants=[];at=0;
  while(at<body.length) {
    while(body[at]?.text==='#'&&body[at+1]?.kind==='group'&&body[at+1].delimiter==='[')at+=2;
    const variant=body[at++];if(!identifier(variant)||variants.some(previous=>previous.name===variant.text))throw new TypeError('Serde frontier requires unique original unit variants');
    variants.push({name:variant.text,span:variant.span});
    if(at<body.length&&body[at++]?.text!==',')throw new TypeError('Serde frontier excludes fields, discriminants and variant type splices');
  }
  if(!variants.length||variants.length>128)throw new TypeError('Serde frontier requires one to 128 original unit variants');
  return variants;
}

const generatorRoutes=[
  ['src/dummy.rs',['wrap_in_const']],
  ['src/ser.rs',['expand_derive_serialize','serialize_body','serialize_enum','serialize_variant','serialize_externally_tagged_variant','effective_style']],
  ['src/de.rs',['expand_derive_deserialize','deserialize_body','deserialize_in_place_body']],
  ['src/de/enum_.rs',['deserialize','deserialize_homogeneous_enum','prepare_enum_variant_enum']],
  ['src/de/enum_externally.rs',['deserialize','deserialize_externally_tagged_variant']],
  ['src/de/identifier.rs',['deserialize_generated','deserialize_identifier']],
];

export function createSerdeUnitEnumFrontier(options={}) {
  const descriptors=Object.getOwnPropertyDescriptors(options);
  if(Reflect.ownKeys(descriptors).some(name=>typeof name!=='string'||!['dependencies','certificate','source','offset'].includes(name)||!('value' in descriptors[name])))throw new TypeError('Serde frontier accepts source evidence only, never caller owner or closed-scope assertions');
  const {dependencies,certificate,source,offset=certificate?.span?.start}=options;
  if(!isDeriveDependencyProof(dependencies))throw new TypeError('Serde frontier requires sealed original dependency inputs');
  assertDeriveFootprintCertificate(certificate,source,offset);
  if(certificate.dependenciesDigest!==dependencies.digest||certificate.kind!=='enum'||!certificate.owners.length||certificate.owners.some(owner=>owner.target[0]!=='serde'||!['Serialize','Deserialize'].includes(owner.target[1])))throw new TypeError('Serde frontier requires actual locked Serialize or Deserialize owners only');
  const allowedAttributes=new Set(['derive','serde','doc','allow','warn','deny','forbid','must_use','non_exhaustive']);
  for(const attribute of certificate.attributes) {
    if(!allowedAttributes.has(attribute.name))throw new TypeError('Serde frontier retains unsupported attribute phase: '+attribute.name);
    if(attribute.helpers?.some(helper=>!['rename','rename_all','alias'].includes(helper.key)))throw new TypeError('Serde frontier excludes helper expressions, tag changes, skips, defaults and field metadata');
  }
  const variants=unitVariants(source,certificate.name).map(variant=>({...variant,span:{start:offset+variant.span.start,end:offset+variant.span.end}}));
  const inventory=generatorRoutes.flatMap(([sourcePath,names])=>names.map(functionName=>inventoryPinnedDeriveQuotes({dependencies,packageName:'serde_derive',sourcePath,functionName})));
  const dummy=inventory.find(entry=>entry.source==='src/dummy.rs'),calls=dummy.definitions.flatMap(definition=>definition.quotes.flatMap(quote=>quote.bangCalls));
  const requireCall=calls.filter(call=>call.writtenPath.join('')==='_serde::__require_serde_not_serde_core');
  if(requireCall.length!==1)throw new TypeError('Original Serde wrapper fixed bang call is not uniquely inventoried');
  const library=deriveDependencySource(dependencies,'serde','src/lib.rs');
  const requireItems=sourceItems(library.source).filter(item=>item.term==='macro_rules!'&&item.name==='__require_serde_not_serde_core');
  if(requireItems.length!==1)throw new TypeError('Original Serde empty macro definition is not unique');
  const item=requireItems[0],definition=compileDeclarativeMacro(library.source.slice(item.start,item.end),{name:item.name,owner:['serde']});
  const expansion=expandDeclarativeMacro(definition,originalMacroInvocation(requireCall[0].tokens).trees);
  if(expansion.trees.length!==0)throw new TypeError('Original Serde fixed macro does not expand to empty tokens');
  const evidence={schema:'serde-unit-enum-success-frontier-v1',dependenciesDigest:dependencies.digest,source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,deriveCertificateDigest:certificate.digest,owners:certificate.owners,variants,inventory,
    fixedEmptyMacro:{source:library.path,sourceSha256:library.sha256,span:{start:item.start,end:item.end},sha256:hash(library.source.slice(item.start,item.end)),header:declarativeDefinitionHeader(definition),originalCall:requireCall[0],expansionDigest:expansion.digest,outputTokens:0,callOwnerResolved:false,attributeOwnersResolved:false},
    dimensions:dimensions(),successfulBranchSelectionComplete:false,emittedQuoteClosureComplete:false,generatedImplBehavior:false,macroCallOwnerResolved:false,
    obligations:['generator entry/parameter/identifier/token-emission call graph and every selected branch require semantic proof','default extern serde alias requires actual expansion-phase binding proof','generated doc, allow, automatically_derived and inline attribute owners require actual closed attribute scopes','quote, local fragment wrappers and interpolation helpers are not resolved by their spelling','other derive invocations and error streams retain independent obligations','generated Serialize and Deserialize implementations are not lowered']};
  const result=freeze({...evidence,digest:hash(JSON.stringify(evidence))});candidates.add(result);return result;
}
export function isSerdeUnitEnumFrontier(value){return !!value&&candidates.has(value);}
