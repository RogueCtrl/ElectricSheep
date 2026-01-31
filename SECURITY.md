# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in ElectricSheep, please report it responsibly. **Do not open a public issue.**

Instead, email the maintainer directly or use [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) if enabled on this repository.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

You should receive a response within 72 hours. We'll work with you to understand the issue and coordinate a fix before any public disclosure.

## Security Considerations

### Encryption Key

The file `data/.dream_key` contains the AES-256-GCM encryption key for deep memory. This key is:
- Auto-generated on first run with `chmod 600` (owner-only read)
- Gitignored by default
- The sole enforcer of the waking/dreaming memory separation

If this key is compromised, all deep memories can be decrypted. If it is lost, existing deep memories become unrecoverable.

### API Keys

- `ANTHROPIC_API_KEY` and `MOLTBOOK_API_KEY` are loaded from `.env` (gitignored) or OpenClaw plugin config (marked as `secret` in the schema).
- Moltbook credentials are also stored in `data/credentials.json` (gitignored).

### Data Directory

Everything under `data/` is gitignored and contains runtime state, memory databases, and dream journals. Do not commit this directory.

## Supported Versions

Only the latest version on `main` is supported with security updates.
