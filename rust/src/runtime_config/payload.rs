use std::collections::BTreeMap;

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::pointer;

const MAX_PATH_STEPS: usize = 32;
const MAX_TARGETS: usize = 1024;
const MAX_RULES: usize = 256;
pub(crate) const FAILURE: &str = "an applicable runtime payload rule could not be applied";

#[derive(Clone, Debug, Default, Deserialize, JsonSchema)]
#[serde(default, deny_unknown_fields, rename_all = "kebab-case")]
pub(super) struct Payload {
    default: Vec<Rule<BTreeMap<String, Value>>>,
    default_raw: Vec<Rule<BTreeMap<String, Value>>>,
    #[serde(rename = "override")]
    overrides: Vec<Rule<BTreeMap<String, Value>>>,
    override_raw: Vec<Rule<BTreeMap<String, Value>>>,
    filter: Vec<Rule<Vec<String>>>,
}

#[derive(Clone, Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
struct Rule<T> {
    models: Vec<Selector>,
    params: T,
}

#[derive(Clone, Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields, rename_all = "kebab-case")]
struct Selector {
    name: String,
    #[serde(default)]
    protocol: String,
    #[serde(default)]
    from_protocol: String,
    #[serde(default)]
    token: String,
    #[serde(default, rename = "match")]
    equal: Vec<BTreeMap<String, Value>>,
    #[serde(default, rename = "not-match")]
    unequal: Vec<BTreeMap<String, Value>>,
    #[serde(default)]
    exist: Vec<String>,
    #[serde(default)]
    not_exist: Vec<String>,
}

#[derive(Debug)]
pub(super) enum Step {
    Key(String),
    Query {
        key: Vec<String>,
        expected: Value,
        all: bool,
    },
}

#[derive(Clone, Copy, Debug)]
enum Stage {
    Default,
    DefaultRaw,
    Override,
    OverrideRaw,
    Filter,
}

impl Stage {
    const fn name(self) -> &'static str {
        match self {
            Self::Default => "default",
            Self::DefaultRaw => "default-raw",
            Self::Override => "override",
            Self::OverrideRaw => "override-raw",
            Self::Filter => "filter",
        }
    }
}

#[derive(Debug, Default)]
pub(crate) struct Rules {
    rules: Vec<CompiledRule>,
}

#[derive(Debug)]
struct CompiledRule {
    stage: Stage,
    models: Vec<CompiledSelector>,
    params: Vec<(Vec<Step>, Option<Value>)>,
}

#[derive(Debug)]
struct CompiledSelector {
    name: String,
    protocol: String,
    from_protocol: String,
    token: String,
    equality: Vec<(Vec<Step>, Value, bool)>,
    presence: Vec<(Vec<Step>, bool)>,
}

pub(crate) struct Context<'a> {
    pub protocol: &'a str,
    pub from_protocol: &'a str,
    pub model: &'a str,
    pub token_id: Option<&'a str>,
    pub token_label: Option<&'a str>,
}

#[derive(Debug, Serialize)]
pub(crate) struct Applied {
    stage: &'static str,
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    value: Option<Value>,
}

impl Payload {
    pub(super) fn compile(self) -> Result<Rules, &'static str> {
        let mut rules = Vec::new();
        for (stage, entries) in [
            (Stage::Default, self.default),
            (Stage::DefaultRaw, self.default_raw),
            (Stage::Override, self.overrides),
            (Stage::OverrideRaw, self.override_raw),
        ] {
            for rule in entries {
                let values = rule.params.into_iter().map(|(path, value)| {
                    if matches!(stage, Stage::DefaultRaw | Stage::OverrideRaw)
                        && let Some(json) = value.as_str()
                    {
                        let parsed = serde_json::from_str(json)
                            .map_err(|_| "invalid raw JSON in payload rule")?;
                        return Ok((path, Some(parsed)));
                    }
                    Ok((path, Some(value)))
                });
                rules.push(compile_rule(stage, rule.models, values)?);
            }
        }
        for rule in self.filter {
            let values = rule.params.into_iter().map(|path| Ok((path, None)));
            rules.push(compile_rule(Stage::Filter, rule.models, values)?);
        }
        if rules.len() > MAX_RULES {
            return Err("too many payload rules");
        }
        Ok(Rules { rules })
    }
}

fn compile_rule(
    stage: Stage,
    models: Vec<Selector>,
    values: impl Iterator<Item = Result<(String, Option<Value>), &'static str>>,
) -> Result<CompiledRule, &'static str> {
    if models.is_empty() {
        return Err("payload rule requires at least one model selector");
    }
    let models = models
        .into_iter()
        .map(CompiledSelector::try_from)
        .collect::<Result<Vec<_>, _>>()?;
    let params = values
        .map(|value| {
            let (path, value) = value?;
            let steps = parse_path(&path)?;
            match &steps[0] {
                Step::Key(key)
                    if key == "previous_response_id"
                        && (!matches!(stage, Stage::Filter) || steps.len() != 1) =>
                {
                    return Err("payload rules may only remove a continuation ID");
                }
                Step::Key(key)
                    if matches!(
                        key.as_str(),
                        "model" | "modelId" | "stream" | "type" | "stream_id" | "conversation"
                    ) =>
                {
                    return Err("payload rule changes a protected routing or transport field");
                }
                Step::Query { .. } => return Err("payload rule must start at an object member"),
                Step::Key(_) => {}
            }
            Ok((steps, value))
        })
        .collect::<Result<Vec<_>, _>>()?;
    if params.is_empty() {
        return Err("payload rule requires at least one parameter");
    }
    Ok(CompiledRule {
        stage,
        models,
        params,
    })
}

impl TryFrom<Selector> for CompiledSelector {
    type Error = &'static str;

    fn try_from(selector: Selector) -> Result<Self, Self::Error> {
        if selector.name.is_empty() {
            return Err("payload model selector requires a name or *");
        }
        let mut equality = Vec::new();
        for (checks, positive) in [(selector.equal, true), (selector.unequal, false)] {
            for check in checks {
                for (key, value) in check {
                    equality.push((parse_path(&key)?, value, positive));
                }
            }
        }
        let mut presence = Vec::new();
        for (checks, positive) in [(selector.exist, true), (selector.not_exist, false)] {
            for key in checks {
                presence.push((parse_path(&key)?, positive));
            }
        }
        Ok(Self {
            name: selector.name,
            protocol: selector.protocol,
            from_protocol: selector.from_protocol,
            token: selector.token,
            equality,
            presence,
        })
    }
}

impl CompiledSelector {
    fn selects(&self, context: &Context<'_>) -> bool {
        glob(&self.name, context.model) && self.selects_scope(context)
    }

    fn selects_scope(&self, context: &Context<'_>) -> bool {
        (self.protocol.is_empty() || canonical_protocol(&self.protocol) == context.protocol)
            && (self.from_protocol.is_empty()
                || canonical_protocol(&self.from_protocol) == context.from_protocol)
            && (self.token.is_empty()
                || Some(self.token.as_str()) == context.token_id
                || Some(self.token.as_str()) == context.token_label)
    }

    fn conditions_match(&self, body: &Value) -> Result<bool, &'static str> {
        for (steps, expected, positive) in &self.equality {
            let matches = resolve(body, steps)?
                .iter()
                .any(|path| pointer::get(body, path) == Some(expected));
            if matches != *positive {
                return Ok(false);
            }
        }
        for (steps, positive) in &self.presence {
            let exists = resolve(body, steps)?
                .iter()
                .any(|path| pointer::get(body, path).is_some_and(|value| !value.is_null()));
            if exists != *positive {
                return Ok(false);
            }
        }
        Ok(true)
    }
}

fn canonical_protocol(protocol: &str) -> &str {
    match protocol {
        "anthropic" => "claude",
        other => other,
    }
}

fn glob(pattern: &str, value: &str) -> bool {
    let Some((start, tail)) = pattern.split_once('*') else {
        return pattern == value;
    };
    let Some(mut remaining) = value.strip_prefix(start) else {
        return false;
    };
    let mut pieces = tail.split('*').peekable();
    while let Some(piece) = pieces.next() {
        if pieces.peek().is_none() {
            return remaining.ends_with(piece);
        }
        let Some((_, suffix)) = remaining.split_once(piece) else {
            return false;
        };
        remaining = suffix;
    }
    false
}

impl Rules {
    pub(crate) fn is_empty(&self) -> bool {
        self.rules.is_empty()
    }

    pub(super) fn could_apply(&self, context: &Context<'_>) -> bool {
        self.rules.iter().any(|rule| {
            rule.models.iter().any(|selector| {
                if context.model.is_empty() {
                    selector.selects_scope(context)
                } else {
                    selector.selects(context)
                }
            })
        })
    }

    pub(crate) fn apply(
        &self,
        body: &mut Value,
        context: &Context<'_>,
    ) -> Result<Vec<Applied>, &'static str> {
        let protected = |root: &Value| {
            [
                "/request/model",
                "/request/modelId",
                "/request/stream",
                "/object/model",
                "/response/model",
                "/session/model",
                "/object/context",
                "/object/attributedTo",
                "/object/type",
                "/actor",
                "/target",
                "/response/previous_response_id",
                "/response/conversation",
                "/@context",
                "/id",
            ]
            .map(|path| root.pointer(path).cloned())
        };
        let original = protected(body);
        let mut applied = Vec::new();
        let mut sampling = false;
        for rule in &self.rules {
            let mut applies = false;
            for selector in &rule.models {
                if selector.selects(context) && selector.conditions_match(body)? {
                    applies = true;
                    break;
                }
            }
            if !applies {
                continue;
            }
            if !body.is_object() {
                return Err(FAILURE);
            }
            for (steps, value) in &rule.params {
                let paths = resolve(body, steps)?;
                if value.is_some() && paths.is_empty() {
                    return Err(FAILURE);
                }
                for path in paths.into_iter().rev() {
                    let before = pointer::get(body, &path);
                    let skip = match rule.stage {
                        Stage::Default | Stage::DefaultRaw => before.is_some(),
                        Stage::Filter => before.is_none(),
                        Stage::Override | Stage::OverrideRaw => false,
                    };
                    if skip {
                        continue;
                    }
                    pointer::edit(body, &path, value.clone(), true).map_err(|_| FAILURE)?;
                    if applied.len() >= MAX_TARGETS {
                        return Err(FAILURE);
                    }
                    sampling |= matches!(path[0].as_str(), "temperature" | "top_p");
                    applied.push(Applied {
                        stage: rule.stage.name(),
                        path: render_pointer(&path),
                        value: value
                            .as_ref()
                            .map(|value| super::redaction::applied(&path, value)),
                    });
                }
            }
        }
        if !applied.is_empty() && protected(body) != original {
            return Err("runtime payload rules changed a protected routing or transport field");
        }
        if matches!(context.protocol, "claude" | "bedrock" | "vertex")
            && sampling
            && !body["temperature"].is_null()
            && !body["top_p"].is_null()
        {
            return Err("runtime payload rules left incompatible Claude sampling parameters");
        }
        Ok(applied)
    }
}

fn render_pointer(path: &[String]) -> String {
    let mut pointer = String::new();
    for part in path {
        pointer.push('/');
        pointer.push_str(&part.replace('~', "~0").replace('/', "~1"));
    }
    pointer
}

fn parse_path(path: &str) -> Result<Vec<Step>, &'static str> {
    let parts = if path.starts_with('/') {
        pointer::segments(path).map_err(|_| "invalid payload JSON Pointer")?
    } else {
        split_path(path)?
    };
    if parts.is_empty() || parts.len() > MAX_PATH_STEPS || parts.iter().any(String::is_empty) {
        return Err("invalid payload path");
    }
    parts
        .into_iter()
        .map(|part| {
            if let Some(query) = part.strip_prefix("#(") {
                let all = query.ends_with('#');
                let query = query.strip_suffix('#').unwrap_or(query);
                let (key, literal) = query
                    .strip_suffix(')')
                    .and_then(|query| query.split_once("=="))
                    .ok_or("invalid payload array selector")?;
                let key: Vec<_> = key
                    .split('.')
                    .map(str::trim)
                    .map(ToOwned::to_owned)
                    .collect();
                if key.iter().any(String::is_empty) {
                    return Err("invalid payload array selector");
                }
                let expected = serde_json::from_str(literal.trim())
                    .map_err(|_| "invalid payload array selector")?;
                Ok(Step::Query { key, expected, all })
            } else {
                Ok(Step::Key(part))
            }
        })
        .collect()
}

fn split_path(path: &str) -> Result<Vec<String>, &'static str> {
    let mut parts = Vec::new();
    let mut start = 0;
    let mut selector = false;
    let mut quoted = false;
    let mut escaped = false;
    for (offset, character) in path.char_indices() {
        if selector {
            if escaped {
                escaped = false;
            } else if quoted && character == '\\' {
                escaped = true;
            } else if character == '"' {
                quoted = !quoted;
            } else if !quoted && character == ')' {
                selector = false;
            }
        } else if offset == start && path[offset..].starts_with("#(") {
            selector = true;
        } else if character == '.' {
            parts.push(path[start..offset].to_owned());
            start = offset + 1;
        }
    }
    if selector {
        return Err("invalid payload array selector");
    }
    parts.push(path[start..].to_owned());
    Ok(parts)
}

fn resolve(body: &Value, steps: &[Step]) -> Result<Vec<Vec<String>>, &'static str> {
    fn visit(
        value: Option<&Value>,
        steps: &[Step],
        path: &mut Vec<String>,
        output: &mut Vec<Vec<String>>,
    ) -> Result<(), &'static str> {
        let Some((step, tail)) = steps.split_first() else {
            if output.len() >= MAX_TARGETS {
                return Err(FAILURE);
            }
            output.push(path.clone());
            return Ok(());
        };
        match step {
            Step::Key(key) => {
                path.push(key.clone());
                visit(
                    value.and_then(|value| pointer::child(value, key)),
                    tail,
                    path,
                    output,
                )?;
                path.pop();
            }
            Step::Query { key, expected, all } => {
                if let Some(array) = value.and_then(Value::as_array) {
                    for (index, value) in array.iter().enumerate() {
                        if pointer::get(value, key) == Some(expected) {
                            path.push(index.to_string());
                            visit(Some(value), tail, path, output)?;
                            path.pop();
                            if !all {
                                break;
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    let mut output = Vec::new();
    visit(Some(body), steps, &mut Vec::new(), &mut output)?;
    Ok(output)
}
