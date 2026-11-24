// Complete native CASE source history only; not an executable compiler profile.
// The closed existing dynamic target already includes the generalized oracle.
// This successor adds a sibling case module without another Cargo invocation.
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readBoundedTrackedSourceBytes, withBoundedTrackedSourceOperation}
  from './forward-output-ownership-20261101-bounded-bytes.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {requireSynchronousSourceCallback, withCompleteSourceClosingFence}
  from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData}
  from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ARCHIVE = 'tools/translation/source-profiles/native-profile-oracles-20261101/json-oracle-integration.json.gz';
const PIN = 'd79b39e0fbb3e0d21a2f270fde9f5c777102e3a96f670ed6b71398265f1e4b19';
const PATHS = Object.freeze([
  'rust/tests/oracles/generalized_primitive_output_20261101.rs',
  'rust/tests/oracles/owned_json_output_20261101.rs',
]);
const APPEND = '\n// Additional independently authored helper/JSON-borrow cases; same native binary.\n' +
  '#[path = "owned_json_output_20261101.rs"]\nmod owned_json_output_20261101;\n';
const fail = message => { throw new TypeError('Native JSON oracle history: ' + message); };

/** Re-read complete original/current case sources; all results are DATA. */
export function visitNativeJsonOutputOracleSourceEquations(consume) {
  requireSynchronousSourceCallback(consume);
  return withBoundedTrackedSourceOperation(ROOT, () => {
    const bytes = readBoundedTrackedSourceBytes(ROOT, ARCHIVE, {maxBytes: 2097152});
    if (createHash('sha256').update(bytes).digest('hex') !== PIN) fail('whole immutable archive differs');
    const packet = JSON.parse(new TextDecoder('utf8', {fatal: true, ignoreBOM: true}).decode(
      gunzipSync(bytes, {maxOutputLength: 4194304})));
    accountData(packet);
    if (packet.schema !== 'native-json-output-oracle-complete-source-history-v1' ||
        !Array.isArray(packet.rows) || packet.rows.length !== PATHS.length) {
      fail('both complete native case sources required');
    }
    for (let index = 0; index < PATHS.length; index++) {
      const row = packet.rows[index];
      if (!row || row.path !== PATHS[index] || row.language !== 'Rust' ||
          typeof row.before !== 'string' || typeof row.after !== 'string' ||
          Buffer.byteLength(row.before) > 2097152 || Buffer.byteLength(row.after) > 2097152) {
        fail('complete ordered case history required');
      }
      const current = readBoundedTrackedSourceBytes(ROOT, row.path, {maxBytes: 2097152});
      if (!current.equals(Buffer.from(row.after))) fail('actual whole native case source differs');
    }
    if (packet.rows[0].after !== packet.rows[0].before + APPEND ||
        packet.rows[1].before !== packet.rows[1].after ||
        packet.rows[0].before.includes('mod owned_json_output_20261101;')) {
      fail('one additive sibling include and whole independent oracle required');
    }
    const delivered = [];
    for (const row of packet.rows) {
      const history = transportConcreteSourceEquations([
        {before: row.before, after: row.after, language: row.language},
      ])[0];
      if (history.before !== row.before || history.after !== row.after ||
          history.inverse !== row.before ||
          transportConcreteSyntaxMeta(history.beforeMeta).source !== row.before ||
          transportConcreteSyntaxMeta(history.afterMeta).source !== row.after ||
          history.trace.map(item => item.phase).join('|') !== 'language|repository') {
        fail('complete Rust CST, both sequences and whole inverse required');
      }
      const event = Object.freeze({path: row.path, language: row.language, history,
        semanticAuthority: false, rustAuthority: false, caseSourceOnly: true});
      accountData({packet, delivered, event});
      withCompleteSourceClosingFence(() => {
        const answer = consume(event);
        accountData({packet, delivered, event, answer});
      }, []);
      delivered.push(Object.freeze({path: row.path,
        completeOriginalSourceRetained: true, completeInverseDelivered: true}));
    }
    const result = Object.freeze({schema: 'native-json-output-oracle-history-receipt-v1',
      delivered: Object.freeze(delivered), existingNativeBinary: true,
      additionalCargoInvocations: 0, allWholeSourcesDelivered: true,
      semanticAuthority: false, rustAuthority: false, execution: 'UNRUN'});
    accountData(result);
    return result;
  });
}
