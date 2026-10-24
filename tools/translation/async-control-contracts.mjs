// Interface DATA only. Opaque resource callers need independent native issuers.
const rows=[
 ['cancel_new','router_cancel_new',[], 'cancellation',false],
 ['cancel_clone','router_cancel_clone',['shared-cancellation'],'cancellation',false],
 ['cancel_set','router_cancel_set',['shared-cancellation'],'bool',false],
 ['cancel_is_set','router_cancel_is_set',['shared-cancellation'],'bool',false],
 ['cancel_wait','router_cancel_wait',['shared-cancellation'],'unit',true],
 ['sleep','router_async_sleep',['u64','shared-cancellation'],'control-unit-result',true],
 ['with_deadline','router_async_with_deadline',['u64','shared-cancellation','deferred-callback'],'control-generic-result',true],
 ['channel','router_async_channel',['u64'],'control-channel-result',false],
 ['sender_clone','router_async_sender_clone',['shared-sender'],'sender',false],
 ['send','router_async_send',['shared-sender','str','shared-cancellation'],'control-unit-result',true],
 ['receive','router_async_receive',['exclusive-receiver','shared-cancellation'],'control-optional-text-result',true],
 ['close','router_async_close',['exclusive-receiver'],'unit',false],
 ['dispose','router_async_dispose',['exclusive-receiver'],'unit',false],
];
export const ASYNC_CONTROL_CONTRACTS=Object.freeze(rows.map(([rustName,javascriptName,parameters,returns,async])=>Object.freeze({rustName,javascriptName,parameters:Object.freeze(parameters),returns,async,rustPath:'crate::translation_async_control_core::'+rustName,rustModule:'translation_async_control_core',rustSource:'src/translation_async_control_core.rs',runtimeModule:'async-control-runtime.mjs',sourceAuthority:false,semanticAuthority:false})));
export const asyncControlContract=name=>ASYNC_CONTROL_CONTRACTS.find(row=>row.rustName===name||row.javascriptName===name)??null;

const DECLARATION_HEADER="declare const cancellationBrand:unique symbol,senderBrand:unique symbol,receiverBrand:unique symbol;\nexport interface Cancellation {readonly [cancellationBrand]:true}\nexport interface Sender {readonly [senderBrand]:true}\nexport interface Receiver {readonly [receiverBrand]:true}\nexport type ControlError=Readonly<{$:'Cancelled'|'Timeout'|'Closed'|'Resource'|'InvalidInput'}>;\nexport type ControlResult<T>=Readonly<{$:'Ok';field0:T}>|Readonly<{$:'Err';field0:ControlError}>;\nexport type ControlOption<T>=Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;\nexport interface Deferred<T> extends PromiseLike<T>{}\nexport const ASYNC_CONTROL_LIMITS:Readonly<{bytes:1048576;capacity:32;pending:32;delayMs:86400000n}>;\n",DECLARATION_FOOTER="export const ASYNC_CONTROL_SOURCE_AUTHORITY:Readonly<{sourceAuthority:false;semanticAuthority:false;runtimeParity:false}>;\n";
const DECLARATION_TYPES=Object.freeze({"cancellation":"Cancellation","shared-cancellation":"Cancellation","shared-sender":"Sender","exclusive-receiver":"Receiver","sender":"Sender","bool":"boolean","unit":"null","u64":"bigint","str":"string","control-unit-result":"ControlResult<null>","control-generic-result":"ControlResult<T>","control-channel-result":"ControlResult<readonly [Sender,Receiver]>","control-optional-text-result":"ControlResult<ControlOption<string>>","deferred-callback":"(child:Cancellation)=>T|PromiseLike<T>"});
export function emitAsyncControlDeclarations(){return DECLARATION_HEADER+ASYNC_CONTROL_CONTRACTS.map(row=>'export function '+row.javascriptName+(row.rustName==='with_deadline'?'<T>':'')+'('+row.parameters.map((role,index)=>'argument'+index+':'+DECLARATION_TYPES[role]).join(',')+'): '+(row.async?'Deferred<'+DECLARATION_TYPES[row.returns]+'>':DECLARATION_TYPES[row.returns])+';').join('\n')+'\n'+DECLARATION_FOOTER;}
