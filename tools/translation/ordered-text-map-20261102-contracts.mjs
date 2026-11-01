// Shared operation DATA, never registration of a native type or caller.
const rows=[
 ['new',[],'text-map',[],[],false],
 ['from_pairs',['text-pairs-owned'],'text-map',[0],[],false],
 ['insert',['text-map','text-owned','text-owned'],'text-map',[0,1,2],[],false],
 ['remove',['text-map','str'],'text-map',[0],[1],false],
 ['get',['text-map-ref','str'],'str-option-ref',[],[0,1],true],
 ['contains',['text-map-ref','str'],'bool',[],[0,1],false],
 ['len',['text-map-ref'],'u64',[],[0],false],
 ['copy',['text-map-ref'],'text-map',[],[0],false],
 ['pairs',['text-map-ref'],'text-pairs-owned',[],[0],false],
 ['keys',['text-map-ref'],'text-list-owned',[],[0],false],
];
export const ORDERED_TEXT_MAP_CONTRACTS=Object.freeze(rows.map(([operation,parameters,returns,consumed,shared,returnedLoan])=>Object.freeze({
 id:'ordered-text-map:'+operation,operation,rustName:'text_map_'+operation,javascriptName:'router_text_map_'+operation,
 rustPath:'crate::translation_ordered_text_map_core::text_map_'+operation,
 parameters:Object.freeze(parameters),returns,consumed:Object.freeze(consumed),shared:Object.freeze(shared),
 returnedLoan,loanRoot:returnedLoan?0:null,iteration:'UTF-8-byte-ascending',duplicateInput:'last-value-wins',
 maxEntries:4096,maxUtf8Bytes:1048576,constructionInputAlsoBounded:true,evaluationOrder:'left-to-right-once',
 nativeSource:'rust/src/translation_ordered_text_map_core.rs',runtimeModule:'ordered-text-map-20261102-runtime.mjs',
 declarationModule:'ordered-text-map-20261102-runtime.d.mts',nativeInternalsUntranslated:true,
 sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,privateCallerBindingQualified:false,
 forwardCallerLoweringComplete:false,reverseCallerLoweringComplete:false,receivingExecuted:false,
})));
export const orderedTextMapContract=name=>ORDERED_TEXT_MAP_CONTRACTS.find(row=>row.rustName===name||row.javascriptName===name)??null;
export function emitOrderedTextMapDeclarations(){
 const types={'text-map':'OrderedTextMap','text-map-ref':'OrderedTextMap','text-pairs-owned':'readonly (readonly [string, string])[]','text-list-owned':'readonly string[]','text-owned':'string',str:'string','str-option-ref':'BorrowedTextOption',bool:'boolean',u64:'bigint'};
 const header="declare const orderedTextMap: unique symbol;\n/** Opaque owned ABI. This brand is not a native type or ownership proof. */\nexport type OrderedTextMap = Readonly<{[orderedTextMap]: true; $: 'OrderedTextMap'; entries: readonly (readonly [string, string])[]}>;\nexport type BorrowedTextOption = Readonly<{$: 'None'}> | Readonly<{$: 'Some'; field0: string}>;\n";
 return header+ORDERED_TEXT_MAP_CONTRACTS.map(row=>{
  if(!types[row.returns]||row.parameters.some(role=>!types[role]))throw TypeError('unknown ordered text map declaration role');
  const loan=row.returnedLoan?'/** Source lowering must tie the Some payload loan to map, never to key. */\n':'';
  return loan+'export declare function '+row.javascriptName+'('+row.parameters.map((role,index)=>'argument'+index+': '+types[role]).join(', ')+'): '+types[row.returns]+';';
 }).join('\n')+'\n';
}
export const ORDERED_TEXT_MAP_RULE_SEQUENCES=Object.freeze([
 Object.freeze({phase:'language',rules:Object.freeze(['actual-opaque-native-map-type-and-argument-identities','linear-owned-map-and-text-moves','actual-map-root-returned-loan','bounded-input-and-result-native-order'])}),
 Object.freeze({phase:'repository',rules:Object.freeze(['actual-qualified-owned-facade-source-and-Cargo-bindings','runtime-declarations-and-complete-source-CST-inverses'])}),
]);
