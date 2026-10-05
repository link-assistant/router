//! Minimal reproducer for global clap defaults overriding deploy config.
use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
struct Cli {
    #[arg(long, global = true, default_value = "8080")]
    port: u16,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    Deploy {
        #[arg(long)]
        port: Option<u16>,
    },
}

fn main() {
    let cli = Cli::parse_from(["router", "deploy"]);
    let Command::Deploy { port } = cli.command;
    println!("omitted deploy port: {port:?}");
    println!(
        "after config overlay with 18080: {:?}",
        port.or(Some(18080))
    );
    assert_eq!(port, Some(8080), "reproduce clap default propagation");
}
