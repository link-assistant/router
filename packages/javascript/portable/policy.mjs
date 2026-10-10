// Authoritative JavaScript policy kernels. Both native target languages are
// regenerated from these declarations, never maintained as parallel copies.

/** @param {number} used @param {number} reserved @param {number} reserve @param {number} max @returns {boolean} */
export function tokenBudgetPermits(used, reserved, reserve, max) {
  return max < 0 || used + reserved < max && used + reserved + reserve <= max;
}

/** @param {number} until @param {number} now @returns {boolean} */
export function cooldownActive(until, now) {
  return until > now;
}

/** @param {string} provider @param {string} model @returns {string} */
export function providerModelId(provider, model) {
  return provider + '/' + model;
}

/** @param {number} value @param {number} minimum @param {number} maximum @returns {number} */
export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

/** @param {number} previous @param {number} next @returns {number} */
export function longestCooldown(previous, next) {
  return Math.max(previous, next);
}

/** @param {number} seconds @param {number} now @param {number} maximum @returns {number} */
export function retryAfterDeadline(seconds, now, maximum) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return now;
  }
  return now + clamp(seconds, 0, maximum);
}

/** @param {number} input @param {number} output @param {number} inputPerMillion @param {number} outputPerMillion @returns {number} */
export function tokenCost(input, output, inputPerMillion, outputPerMillion) {
  return (input * inputPerMillion + output * outputPerMillion) / 1000000;
}

/** @param {number} value @returns {boolean} */
export function validTokenCount(value) {
  return Number.isFinite(value) && value >= 0 && Math.floor(value) === value;
}

/** @param {number} total @param {number} reserved @param {number} actual @returns {number} */
export function settledTokenUsage(total, reserved, actual) {
  return Math.max(0, total - reserved) + actual;
}

/** @param {number} used @param {number} reserved @param {number} max @returns {number} */
export function remainingTokenBudget(used, reserved, max) {
  if (max < 0) {
    return -1;
  }
  return Math.max(0, max - used - reserved);
}

/** @param {number} requested @param {number} available @param {number} limit @returns {number} */
export function completionTokenLimit(requested, available, limit) {
  return Math.max(0, Math.floor(Math.min(requested, Math.min(available, limit))));
}

/** @param {number} failures @param {number} base @param {number} maximum @returns {number} */
export function retryBackoff(failures, base, maximum) {
  let delay = base;
  let remaining = Math.max(0, Math.floor(failures));
  while (remaining > 0 && delay < maximum) {
    delay = Math.min(delay * 2, maximum);
    remaining = remaining - 1;
  }
  return Math.min(delay, maximum);
}

/** @param {number} status @returns {boolean} */
export function retryableStatus(status) {
  return status === 408 || status === 429 || status >= 500 && status <= 599;
}

/** @param {number} status @returns {boolean} */
export function successStatus(status) {
  return status >= 200 && status <= 299;
}

/** @param {number} weight @param {number} load @returns {number} */
export function weightedCapacity(weight, load) {
  if (weight <= 0 || !Number.isFinite(weight) || load < 0) {
    return 0;
  }
  return weight / (load + 1);
}

/** @param {number} now @param {number} expires @param {number} skew @returns {boolean} */
export function tokenExpired(now, expires, skew) {
  return now >= expires + skew;
}

/** @param {string} model @returns {boolean} */
export function isQualifiedModel(model) {
  return model.includes('/');
}

/** @param {string} value @param {string} prefix @returns {boolean} */
export function credentialPrefixMatches(value, prefix) {
  return value.startsWith(prefix);
}

/** @param {string} value @returns {number} */
export function utf16Length(value) {
  return value.length;
}

/** @param {string} value @param {number} maximum @returns {boolean} */
export function modelNameLengthPermits(value, maximum) {
  return utf16Length(value) > 0 && utf16Length(value) <= maximum;
}
