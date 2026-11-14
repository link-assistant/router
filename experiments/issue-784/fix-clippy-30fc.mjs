#!/usr/bin/env node
// Applies the hand-written-source repairs for the clippy findings of run
// 43525097825 (Lint job 132231890444). Each replacement must match exactly
// once; any other count aborts before a file is written.
import { readFileSync, writeFileSync } from 'node:fs';

const C = 'crate::translation_core::';
const edits = {
  'rust/src/auth_remote_tests.rs': [[
    `        if let Some(original) = input.get("status").and_then(serde_json::Value::as_str) {
            if !original.is_empty() {
                assert!(std::ptr::eq(actual, original));
            }
        }
`,
    `        if let Some(original) = input.get("status").and_then(serde_json::Value::as_str)
            && !original.is_empty()
        {
            assert!(std::ptr::eq(actual, original));
        }
`]],
  'rust/src/bridge_response.rs': [[
    `    match {
        let __router_json_reader_0 = citation.get("type");
        if let ${C}Maybe::Some(__router_json_reader_1) = __router_json_reader_0
        {
            ${C}Json::as_str(__router_json_reader_1)
        } else {
            ${C}Maybe::None
        }
    } {
        Some("web_search_result_location") => {
            let __router_json_reader_2 = citation.get("url");
            if let ${C}Maybe::Some(__router_json_reader_3) =
                __router_json_reader_2
            {
                ${C}Json::as_str(__router_json_reader_3)
            } else {
                ${C}Maybe::None
            }
        }
        Some("search_result_location") => {
            let __router_json_reader_4 = citation.get("source");
            if let ${C}Maybe::Some(__router_json_reader_5) =
                __router_json_reader_4
            {
                ${C}Json::as_str(__router_json_reader_5)
            } else {
                ${C}Maybe::None
            }
        }
        .filter(|source| source.starts_with("https://") || source.starts_with("http://")),
        _ => None,
    }
}
`,
    `    match json_text(citation, "type") {
        Some("web_search_result_location") => json_text(citation, "url"),
        Some("search_result_location") => json_text(citation, "source")
            .filter(|source| source.starts_with("https://") || source.starts_with("http://")),
        _ => None,
    }
}

/// Read \`key\` from a JSON object as a string; anything else is \`None\`.
fn json_text<'a>(
    value: &'a ${C}Json,
    key: &str,
) -> ${C}Maybe<&'a ${C}Str> {
    value
        .get(key)
        .and_then(${C}Json::as_str)
}
`]],
  'rust/src/geolocation.rs': [[
    `    let bytes = match parsed.native.encode(&parsed.value) {
        Ok(bytes) => bytes,
        Err(_) => {
            return crate::api_error::PresentedError {
                status: StatusCode::INTERNAL_SERVER_ERROR,
                error_type: "api_error",
                message: "could not encode private request",
            }
            .render(crate::api_error::dialect_for_path(parts.uri.path()));
        }
    };
`,
    `    let Ok(bytes) = parsed.native.encode(&parsed.value) else {
        return crate::api_error::PresentedError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            error_type: "api_error",
            message: "could not encode private request",
        }
        .render(crate::api_error::dialect_for_path(parts.uri.path()));
    };
`]],
  'rust/src/native_service_relay.rs': [[
    `                if let Message::Text(text) = &message {
                    if let Ok(mut value) = serde_json::from_slice::<serde_json::Value>(text.as_bytes()) {
                        if crate::geolocation::sanitize(&mut value, share_geolocation) {
                            message = Message::Text(value.to_string().into());
                        }
                    }
                }
`,
    `                if let Message::Text(text) = &message
                    && let Ok(mut value) = serde_json::from_slice::<serde_json::Value>(text.as_bytes())
                    && crate::geolocation::sanitize(&mut value, share_geolocation)
                {
                    message = Message::Text(value.to_string().into());
                }
`]],
  'rust/src/structured_output.rs': [
    [`"name": ${C}json_map_index(&definition, "name"),`, `"name": ${C}json_map_index(definition, "name"),`],
    [`"name": ${C}json_index_str(&format, "name"),`, `"name": ${C}json_index_str(format, "name"),`],
    [`    if {
        let __router_json_reader_0 = name;
        if let ${C}Maybe::Some(__router_json_reader_1) = __router_json_reader_0
        {
            ${C}Json::as_str(__router_json_reader_1)
        } else {
            ${C}Maybe::None
        }
    }
    .is_none_or(str::is_empty)
    {
`,
    `    if name
        .and_then(${C}Json::as_str)
        .is_none_or(str::is_empty)
    {
`]],
  'rust/src/translation_core/primitives.rs': [
    ['/// The serde_json implementation remains', '/// The `serde_json` implementation remains'],
    [`/// Set a string key on an owned object (or promote Null to an object).
/// Non-object, non-null bases panic, matching serde_json string indexing.`,
    `/// Set a string key on an owned object (or promote Null to an object).
///
/// Non-object, non-null bases panic, matching \`serde_json\` string indexing.`],
    ["pub fn json_index_usize<'a>(value: &'a Json, index: usize) -> &'a Json {", 'pub fn json_index_usize(value: &Json, index: usize) -> &Json {'],
    [`/// Decode canonical JSON text, discarding only the native parser's error value.
/// Successful`, `/// Decode canonical JSON text, discarding only the native parser's error value.
///
/// Successful`],
    ['/// native serde_json allocation', '/// native `serde_json` allocation'],
    [`/// Test every UTF-8 byte against an ASCII alphabet, including vacuous empty input.
/// Non-ASCII`, `/// Test every UTF-8 byte against an ASCII alphabet, including vacuous empty input.
///
/// Non-ASCII`],
    ['Rust Unicode White_Space scalars', 'Rust Unicode `White_Space` scalars'],
    ['Rust Unicode General_Category=Cc without', 'Rust Unicode `General_Category=Cc` without'],
  ],
  'rust/src/translation_core/base64.rs': [
    ['call boundary as Engine::encode.', 'call boundary as `Engine::encode`.'],
  ],
};

const out = new Map();
for (const [path, pairs] of Object.entries(edits)) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of pairs) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${path}: expected one match, found ${count}: ${from.slice(0, 80)}`);
    text = text.replace(from, () => to);
  }
  out.set(path, text);
}
for (const [path, text] of out) writeFileSync(path, text);
console.log(`applied ${[...Object.values(edits)].flat().length} edits to ${out.size} files`);
