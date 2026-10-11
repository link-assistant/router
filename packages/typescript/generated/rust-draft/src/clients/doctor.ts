type MLData_72705f35323666373537343635373235343735373036633635356633333566373533363334356633333566373533363334356633333566373533363334 = Readonly<{ readonly "$": "Tuple"; readonly "field0": bigint; readonly "field1": bigint; readonly "field2": bigint }>;
// Generated draft from src/clients/doctor.rs; sha256=d207b5ac258cf30de157d85598e8263c9a9d50395901efb67bea0f5d498fc09e
// Carried constructs are data, never runtime parity evidence.
function rp_636c69656e74732e646f63746f722e444f43544f525f45564944454e43455f484541444552(): string {
  return "x-link-assistant-client-check";
}

function rp_636c69656e74732e646f63746f722e444f43544f525f45564944454e43455f56414c5545(): string {
  return "reachability";
}

function rp_636c69656e74732e646f63746f722e4d494e494d554d5f434c415544455f474154455741595f56455253494f4e(): Readonly<{ readonly "$": "Tuple"; readonly "field0": bigint; readonly "field1": bigint; readonly "field2": bigint }> {
  return Object.freeze({ $: 'Tuple', field0: 2n, field1: 1n, field2: 255n });
}

export const translated: { "DOCTOR_EVIDENCE_HEADER": string; "DOCTOR_EVIDENCE_VALUE": string; "MINIMUM_CLAUDE_GATEWAY_VERSION": Readonly<{ readonly "$": "Tuple"; readonly "field0": bigint; readonly "field1": bigint; readonly "field2": bigint }> } = { ["DOCTOR_EVIDENCE_HEADER"]: rp_636c69656e74732e646f63746f722e444f43544f525f45564944454e43455f484541444552(), ["DOCTOR_EVIDENCE_VALUE"]: rp_636c69656e74732e646f63746f722e444f43544f525f45564944454e43455f56414c5545(), ["MINIMUM_CLAUDE_GATEWAY_VERSION"]: rp_636c69656e74732e646f63746f722e4d494e494d554d5f434c415544455f474154455741595f56455253494f4e() };
export const provenance = {"sourcePath":"src/clients/doctor.rs","sourceSha256":"d207b5ac258cf30de157d85598e8263c9a9d50395901efb67bea0f5d498fc09e","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":10,"preserved":14,"runtimeParity":false};
