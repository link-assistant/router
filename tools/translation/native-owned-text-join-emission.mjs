// Exact canonical source candidate and target text only. Neither function
// mints native source/type/ownership permission. Private caller/source/body
// replay remains in router-core-json-updates.mjs before these helpers are used.
import {JOIN_NATIVE_HELPER_SOURCE} from './owned-text-vector-join-contracts.mjs';
import {withOriginalOwnedTextVectorJoinSourceOperation,
  requireCurrentOwnedTextVectorJoinOriginalOperationSource} from './current-owned-text-vector-join-source.mjs';

const operation = 'router_owned_text_vec_join';
export function nativeOwnedTextJoinSourceMatches(source, name) {
  if (typeof source !== 'string' || typeof name !== 'string' ||
      !/^[A-Za-z_][A-Za-z0-9_]{0,159}$/u.test(name)) return false;
  return source === JOIN_NATIVE_HELPER_SOURCE.replace(
    'fn router_rule_owned_text_join(', 'fn ' + name + '(').trimEnd();
}

export function nativeOwnedTextJoinStatements(params) {
  if (!Array.isArray(params) || params.length !== 2 || params.some(param =>
    !param || typeof param.name !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(param.name))) {
    throw new TypeError('Native owned text join requires exact renamed parameters');
  }
  return withOriginalOwnedTextVectorJoinSourceOperation(() => {
    requireCurrentOwnedTextVectorJoinOriginalOperationSource(operation);
    return ['return ml_host_router_owned_text_vec_join(' + params.map(param => param.name).join(', ') + ');'];
  });
}

export function nativeOwnedTextJoinForwardImports(enabled, runtimeModule = './runtime/effects.mjs') {
  if (!enabled) return [];
  if (typeof runtimeModule !== 'string' || !runtimeModule.endsWith('effects.mjs')) {
    throw new TypeError('Native owned text join requires the existing effects runtime path');
  }
  return ['import { router_owned_text_vec_join as ml_host_router_owned_text_vec_join } from ' +
    JSON.stringify(runtimeModule.replace(/effects\.mjs$/u, 'owned-text-vector-join-runtime.mjs')) + ';'];
}
