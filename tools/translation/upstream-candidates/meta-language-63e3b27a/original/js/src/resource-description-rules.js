// Shared RDF 1.1 structural and Unicode admission, automatically ported to Rust.
// IRIs retain exact spelling. Bracketed IP address literals require a separately
// implemented address grammar and are refused by this initial graph adapter.
// https://www.w3.org/TR/rdf11-concepts/#section-Graph-IRI

/** @param {number[]} units @param {number} index @returns {number} */
export function resourceDescriptionUnit(units, index) {
  if (!Number.isSafeInteger(index) || index < 0) return -1;
  return units[index] ?? -1;
}
/** @param {number} unit @returns {boolean} */
export function resourceDescriptionLetter(unit) {
  return unit >= 65 && unit <= 90 || unit >= 97 && unit <= 122;
}
/** @param {number} unit @returns {boolean} */
export function resourceDescriptionDigit(unit) {
  return unit >= 48 && unit <= 57;
}
/** @param {number} unit @returns {boolean} */
export function resourceDescriptionHexadecimal(unit) {
  return resourceDescriptionDigit(unit) || unit >= 65 && unit <= 70 || unit >= 97 && unit <= 102;
}
/** @param {number[]} units @returns {boolean} */
export function acceptResourceDescriptionUnicode(units) {
  for (let index = 0; index < units.length; index += 1) {
    const unit = resourceDescriptionUnit(units, index);
    if (!Number.isSafeInteger(unit) || unit < 0 || unit > 65535) return false;
    if (unit >= 55296 && unit <= 56319) {
      index += 1;
      if (index >= units.length || resourceDescriptionUnit(units, index) < 56320 || resourceDescriptionUnit(units, index) > 57343) return false;
    } else if (unit >= 56320 && unit <= 57343) return false;
  }
  return true;
}
/** @param {number} code @param {boolean} query @returns {boolean} */
export function acceptResourceDescriptionIdentifierCharacter(code, query) {
  if (resourceDescriptionLetter(code) || resourceDescriptionDigit(code)) return true;
  if (code === 45 || code === 46 || code === 95 || code === 126) return true;
  if (code === 33 || code === 36 || code === 38 || code === 39 || code === 40 || code === 41
    || code === 42 || code === 43 || code === 44 || code === 59 || code === 61) return true;
  if (code >= 160 && code <= 55295 || code >= 63744 && code <= 64975 || code >= 65008 && code <= 65519) return true;
  if (code >= 65536 && code <= 983037 && code % 65536 <= 65533) return true;
  return query && (code >= 57344 && code <= 63743 || code >= 983040 && code <= 1114109 && code % 65536 <= 65533);
}
/** @param {number[]} units @returns {boolean} */
export function acceptResourceDescriptionIdentifier(units) {
  if (!acceptResourceDescriptionUnicode(units) || units.length < 2 || !resourceDescriptionLetter(resourceDescriptionUnit(units, 0))) return false;
  let start = 1;
  while (start < units.length && resourceDescriptionUnit(units, start) !== 58) {
    const unit = resourceDescriptionUnit(units, start);
    if (!resourceDescriptionLetter(unit) && !resourceDescriptionDigit(unit) && unit !== 43 && unit !== 45 && unit !== 46) return false;
    start += 1;
  }
  if (start === units.length) return false;
  start += 1;
  let authorityStart = -1;
  let authorityEnd = -1;
  if (start + 1 < units.length && resourceDescriptionUnit(units, start) === 47 && resourceDescriptionUnit(units, start + 1) === 47) {
    authorityStart = start + 2;
    authorityEnd = authorityStart;
    while (authorityEnd < units.length && resourceDescriptionUnit(units, authorityEnd) !== 47 && resourceDescriptionUnit(units, authorityEnd) !== 63 && resourceDescriptionUnit(units, authorityEnd) !== 35) authorityEnd += 1;
    let host = authorityStart;
    let foundUser = false;
    for (let index = authorityStart; index < authorityEnd; index += 1) {
      if (resourceDescriptionUnit(units, index) === 64) {
        if (foundUser) return false;
        foundUser = true;
        host = index + 1;
      }
    }
    let foundPort = false;
    for (let index = host; index < authorityEnd; index += 1) {
      if (resourceDescriptionUnit(units, index) === 58) {
        if (foundPort) return false;
        foundPort = true;
      } else if (foundPort && !resourceDescriptionDigit(resourceDescriptionUnit(units, index))) return false;
    }
  }
  let query = false;
  let fragment = false;
  for (let index = start; index < units.length; index += 1) {
    let code = resourceDescriptionUnit(units, index);
    if (code === 35) {
      if (fragment) return false;
      fragment = true;
      query = false;
      continue;
    }
    if (code === 63) {
      if (!fragment) query = true;
      continue;
    }
    if (code === 37) {
      if (index + 2 >= units.length || !resourceDescriptionHexadecimal(resourceDescriptionUnit(units, index + 1)) || !resourceDescriptionHexadecimal(resourceDescriptionUnit(units, index + 2))) return false;
      index += 2;
      continue;
    }
    if (code >= 55296 && code <= 56319) {
      code = 65536 + (code - 55296) * 1024 + resourceDescriptionUnit(units, index + 1) - 56320;
      index += 1;
    }
    if (code === 47 || code === 58 || code === 64) continue;
    if (!acceptResourceDescriptionIdentifierCharacter(code, query)) return false;
  }
  return true;
}

/** @param {number[]} units @param {boolean} grandfathered @returns {boolean} */
export function acceptResourceDescriptionLanguage(units, grandfathered) {
  if (grandfathered) return true;
  let starts = [0];
  let lengths = [];
  for (let index = 0; index <= units.length; index += 1) {
    if (index === units.length || resourceDescriptionUnit(units, index) === 45) {
      const length = index - resourceDescriptionUnit(starts, starts.length - 1);
      if (length < 1 || length > 8) return false;
      lengths = lengths.concat([length]);
      if (index < units.length) starts = starts.concat([index + 1]);
    } else if (!resourceDescriptionLetter(resourceDescriptionUnit(units, index)) && !resourceDescriptionDigit(resourceDescriptionUnit(units, index))) return false;
  }
  let part = 0;
  if (resourceDescriptionUnit(lengths, 0) === 1 && (resourceDescriptionUnit(units, 0) === 88 || resourceDescriptionUnit(units, 0) === 120)) part = 1;
  else {
    if (resourceDescriptionUnit(lengths, 0) < 2) return false;
    for (let index = 0; index < resourceDescriptionUnit(lengths, 0); index += 1) if (!resourceDescriptionLetter(resourceDescriptionUnit(units, index))) return false;
    part = 1;
    if (resourceDescriptionUnit(lengths, 0) <= 3) {
      let count = 0;
      while (part < starts.length && resourceDescriptionUnit(lengths, part) === 3 && count < 3) {
        let letters = true;
        for (let index = resourceDescriptionUnit(starts, part); index < resourceDescriptionUnit(starts, part) + 3; index += 1) if (!resourceDescriptionLetter(resourceDescriptionUnit(units, index))) letters = false;
        if (!letters) break;
        part += 1;
        count += 1;
      }
    }
    if (part < starts.length && resourceDescriptionUnit(lengths, part) === 4) {
      let letters = true;
      for (let index = resourceDescriptionUnit(starts, part); index < resourceDescriptionUnit(starts, part) + 4; index += 1) if (!resourceDescriptionLetter(resourceDescriptionUnit(units, index))) letters = false;
      if (letters) part += 1;
    }
    if (part < starts.length && ((resourceDescriptionUnit(lengths, part) === 2 && resourceDescriptionLetter(resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part))) && resourceDescriptionLetter(resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part) + 1)))
      || (resourceDescriptionUnit(lengths, part) === 3 && resourceDescriptionDigit(resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part))) && resourceDescriptionDigit(resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part) + 1)) && resourceDescriptionDigit(resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part) + 2))))) part += 1;
    let variants = [];
    while (part < starts.length && (resourceDescriptionUnit(lengths, part) >= 5 || resourceDescriptionUnit(lengths, part) === 4 && resourceDescriptionDigit(resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part))))) {
      for (const earlier of variants) {
        if (resourceDescriptionUnit(lengths, earlier) === resourceDescriptionUnit(lengths, part)) {
          let equal = true;
          for (let offset = 0; offset < resourceDescriptionUnit(lengths, part); offset += 1) {
            let left = resourceDescriptionUnit(units, resourceDescriptionUnit(starts, earlier) + offset);
            let right = resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part) + offset);
            if (left >= 65 && left <= 90) left += 32;
            if (right >= 65 && right <= 90) right += 32;
            if (left !== right) equal = false;
          }
          if (equal) return false;
        }
      }
      variants = variants.concat([part]);
      part += 1;
    }
    let singletons = [];
    while (part < starts.length && resourceDescriptionUnit(lengths, part) === 1 && resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part)) !== 88 && resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part)) !== 120) {
      let singleton = resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part));
      if (singleton >= 65 && singleton <= 90) singleton += 32;
      for (const earlier of singletons) if (earlier === singleton) return false;
      singletons = singletons.concat([singleton]);
      part += 1;
      const beginning = part;
      while (part < starts.length && resourceDescriptionUnit(lengths, part) >= 2) part += 1;
      if (part === beginning) return false;
    }
    if (part === starts.length) return true;
    if (resourceDescriptionUnit(lengths, part) !== 1 || resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part)) !== 88 && resourceDescriptionUnit(units, resourceDescriptionUnit(starts, part)) !== 120) return false;
    part += 1;
  }
  return part < starts.length;
}

/** @param {string} leftKind @param {string[]} leftFields @param {string} rightKind @param {string[]} rightFields @returns {boolean} */
export function sameResourceDescriptionTerm(leftKind, leftFields, rightKind, rightFields) {
  if (leftKind !== rightKind) return false;
  let count = 0;
  if (leftKind === 'identifier') count = 1;
  else if (leftKind === 'blank') count = 2;
  else if (leftKind === 'literal') count = 3;
  else return false;
  if (leftFields.length !== count || rightFields.length !== count) return false;
  for (let index = 0; index < count; index += 1) if (leftFields[index] !== rightFields[index]) return false;
  return true;
}
