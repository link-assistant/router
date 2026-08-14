use std::fs;
use std::io::{self, Read};
use std::path::Path;

use super::{StorageError, TokenRecord};

pub(super) const BIN_MAGIC: &[u8; 8] = b"LARTOK01";

pub(super) fn is_binary(path: &Path) -> Result<bool, StorageError> {
    if fs::metadata(path)?.len() < BIN_MAGIC.len() as u64 {
        return Ok(true);
    }
    let mut file = fs::File::open(path)?;
    let mut magic = [0u8; 8];
    file.read_exact(&mut magic)?;
    Ok(&magic == BIN_MAGIC)
}

pub(super) fn decode_binary(path: &Path) -> Result<Vec<TokenRecord>, StorageError> {
    let mut file = fs::File::open(path)?;
    let mut magic = [0u8; 8];
    if let Err(error) = file.read_exact(&mut magic) {
        if error.kind() == io::ErrorKind::UnexpectedEof {
            return Ok(Vec::new());
        }
        return Err(error.into());
    }
    if &magic != BIN_MAGIC {
        return Err(StorageError::Codec(
            "invalid legacy binary magic header".into(),
        ));
    }
    let mut records = Vec::new();
    loop {
        let mut len = [0u8; 4];
        match file.read_exact(&mut len) {
            Ok(()) => {}
            Err(error) if error.kind() == io::ErrorKind::UnexpectedEof => break,
            Err(error) => return Err(error.into()),
        }
        let mut data = vec![0u8; u32::from_le_bytes(len) as usize];
        file.read_exact(&mut data)?;
        records.push(
            serde_json::from_slice(&data)
                .map_err(|error| StorageError::Codec(error.to_string()))?,
        );
    }
    Ok(records)
}

pub(super) fn decode_text(input: &str) -> Result<Vec<TokenRecord>, String> {
    let mut records = Vec::new();
    for raw in input.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        records.push(parse_record_line(line)?);
    }
    Ok(records)
}

fn parse_record_line(line: &str) -> Result<TokenRecord, String> {
    let inner = line
        .strip_prefix('(')
        .and_then(|value| value.strip_suffix(')'))
        .ok_or_else(|| format!("expected parens around record: {line}"))?
        .trim();
    let mut tokens = LinoTokens::new(inner);
    let kind = tokens
        .next_atom()
        .ok_or_else(|| "missing record kind".to_string())?;
    if kind != "token" {
        return Err(format!("unexpected record kind: {kind}"));
    }
    let id = tokens
        .next_atom()
        .ok_or_else(|| "missing token id".to_string())?
        .to_string();
    let mut record = TokenRecord {
        id,
        label: String::new(),
        issued_at: 0,
        expires_at: 0,
        revoked: false,
        account: None,
        max_requests: None,
        used_requests: 0,
        max_tokens: None,
        used_tokens: 0,
        rate_limit_per_minute: None,
        rate_window_started_at: 0,
        rate_window_requests: 0,
        scope: String::new(),
    };
    while let Some(field) = tokens.next_paren_group() {
        parse_field(&mut record, field)?;
    }
    Ok(record)
}

fn parse_field(record: &mut TokenRecord, field: &str) -> Result<(), String> {
    let mut tokens = LinoTokens::new(field);
    let key = tokens
        .next_atom()
        .ok_or_else(|| "field missing key".to_string())?;
    match key {
        "label" => record.label = required_string(&mut tokens, key)?,
        "issued_at" => record.issued_at = required_number(&mut tokens, key)?,
        "expires_at" => record.expires_at = required_number(&mut tokens, key)?,
        "revoked" => {
            let value = required_atom(&mut tokens, key)?;
            record.revoked = matches!(value, "true" | "1" | "yes");
        }
        "account" => record.account = tokens.next_string(),
        "max_requests" => record.max_requests = Some(required_number(&mut tokens, key)?),
        "used_requests" => record.used_requests = required_number(&mut tokens, key)?,
        "max_tokens" => record.max_tokens = Some(required_number(&mut tokens, key)?),
        "used_tokens" => record.used_tokens = required_number(&mut tokens, key)?,
        "rate_limit_per_minute" => {
            record.rate_limit_per_minute = Some(required_number(&mut tokens, key)?);
        }
        "rate_window_started_at" => {
            record.rate_window_started_at = required_number(&mut tokens, key)?;
        }
        "rate_window_requests" => {
            record.rate_window_requests = required_number(&mut tokens, key)?;
        }
        "scope" => record.scope = tokens.next_string().unwrap_or_default(),
        other => return Err(format!("unknown field: {other}")),
    }
    Ok(())
}

fn required_atom<'a>(tokens: &mut LinoTokens<'a>, name: &str) -> Result<&'a str, String> {
    tokens
        .next_atom()
        .ok_or_else(|| format!("{name} missing value"))
}

fn required_string(tokens: &mut LinoTokens<'_>, name: &str) -> Result<String, String> {
    tokens
        .next_string()
        .ok_or_else(|| format!("{name} missing value"))
}

fn required_number<T>(tokens: &mut LinoTokens<'_>, name: &str) -> Result<T, String>
where
    T: std::str::FromStr,
    T::Err: std::fmt::Display,
{
    required_atom(tokens, name)?
        .parse::<T>()
        .map_err(|error| error.to_string())
}

struct LinoTokens<'a> {
    rest: &'a str,
}

impl<'a> LinoTokens<'a> {
    const fn new(input: &'a str) -> Self {
        Self { rest: input }
    }

    fn skip_ws(&mut self) {
        self.rest = self.rest.trim_start();
    }

    fn next_atom(&mut self) -> Option<&'a str> {
        self.skip_ws();
        if self.rest.is_empty() || self.rest.starts_with('(') || self.rest.starts_with('"') {
            return None;
        }
        let end = self
            .rest
            .find(|character: char| character.is_whitespace() || matches!(character, '(' | ')'))
            .unwrap_or(self.rest.len());
        let (atom, rest) = self.rest.split_at(end);
        self.rest = rest;
        Some(atom)
    }

    fn next_string(&mut self) -> Option<String> {
        self.skip_ws();
        let bytes = self.rest.as_bytes();
        if bytes.first() != Some(&b'"') {
            return None;
        }
        let mut value = String::new();
        let mut index = 1;
        while index < bytes.len() {
            let character = bytes[index];
            if character == b'\\' && index + 1 < bytes.len() {
                value.push(match bytes[index + 1] {
                    b'"' => '"',
                    b'\\' => '\\',
                    b'n' => '\n',
                    b'r' => '\r',
                    b't' => '\t',
                    other => char::from(other),
                });
                index += 2;
            } else if character == b'"' {
                self.rest = &self.rest[index + 1..];
                return Some(value);
            } else {
                value.push(char::from(character));
                index += 1;
            }
        }
        None
    }

    fn next_paren_group(&mut self) -> Option<&'a str> {
        self.skip_ws();
        if !self.rest.starts_with('(') {
            return None;
        }
        let mut depth = 0i32;
        let mut in_string = false;
        let mut escape = false;
        let mut end = 0;
        for (index, &byte) in self.rest.as_bytes().iter().enumerate() {
            if escape {
                escape = false;
                continue;
            }
            if in_string {
                match byte {
                    b'\\' => escape = true,
                    b'"' => in_string = false,
                    _ => {}
                }
                continue;
            }
            match byte {
                b'"' => in_string = true,
                b'(' => depth += 1,
                b')' => {
                    depth -= 1;
                    if depth == 0 {
                        end = index + 1;
                        break;
                    }
                }
                _ => {}
            }
        }
        if end == 0 {
            return None;
        }
        let group = &self.rest[1..end - 1];
        self.rest = &self.rest[end..];
        Some(group)
    }
}
