// Finite reviewed caller-selection policy; never a callee/Rust bypass input.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
export const DRAFT_SUPPLEMENTS=Object.freeze(['benchmarks.yml','bindings.yml','docker-build.yml','fuzz.yml','macos-keychain.yml','mutants.yml','real-clients.yml','soak.yml','upgrade-matrix.yml']);
export const DRAFT_SUPPLEMENT_CONDITION="${{ github.event_name != 'pull_request' || toJSON(github.event.pull_request.draft) == 'false' }}";
export const DRAFT_SUPPLEMENT_PR_TYPES=Object.freeze(['opened','synchronize','reopened','ready_for_review']);
const ROOT=fileURLToPath(new URL('../',import.meta.url)),ARCHIVE='scripts/ci/fixed-nine-draft-workflow-sources.json.gz',hash=value=>createHash('sha256').update(value).digest('hex');
export function readFixedNineDraftWorkflowSources({root=ROOT}={}){
 const packed=fs.readFileSync(path.resolve(root,ARCHIVE));if(packed.length!==31445||hash(packed)!=='4ec4892f68ded5e4607d3b4731d82db0cde72019e70672a376d589d7fc9ab47e')throw TypeError('Fixed-nine full workflow source archive differs');const raw=gunzipSync(packed,{maxOutputLength:262144});if(raw.length!==199445||hash(raw)!=='f19ad9627a60c141210271a8836ee950c1706fcce13b16ce6609df199b7a2bf4')throw TypeError('Fixed-nine full workflow source packet differs');const packet=JSON.parse(raw.toString('utf8'));
 if(packet.schema!=='fixed-nine-draft-workflow-source-proposal-v1'||packet.publishedSource!=='c6bed6215e157de4381e39e04b4cb1ef02720384'||JSON.stringify(packet.fixedNine)!==JSON.stringify(DRAFT_SUPPLEMENTS)||packet.condition!==DRAFT_SUPPLEMENT_CONDITION||packet.rules.length!==18||packet.files.length!==14)throw TypeError('Fixed-nine reviewed source census differs');
 for(const row of packet.files)if(hash(row.before)!==row.beforeSha256||hash(row.after??row.before)!==row.afterSha256)throw TypeError('Fixed-nine complete workflow before/after pin differs');return packet;
}
