//! Basic usage example for Link.Assistant.Router token management.
//!
//! Demonstrates issuing and validating custom tokens.
//!
//! Run with: `cargo run --example basic_usage`

use link_assistant_router::token::TokenManager;

fn main() {
    let manager = TokenManager::new("example-secret-key");

    // Issue a token
    let token = manager
        .issue_token(24, "demo-user")
        .expect("Failed to issue token");
    println!("Issued token: {token}");

    // Validate the token
    let claims = manager
        .validate_token(&token)
        .expect("Token should be valid");
    println!("Token ID: {}", claims.sub);
    println!("Label: {}", claims.label);
    println!("Expires at: {}", claims.exp);

    // Revoke the token
    manager.revoke_token(&claims.sub).expect("Should revoke");
    println!("Token revoked.");

    // Try to validate again
    match manager.validate_token(&token) {
        Ok(_) => println!("Token still valid (unexpected)"),
        Err(e) => println!("Token rejected: {e}"),
    }
}
