# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main` (latest) | Yes |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Use [GitHub Private Vulnerability Reporting](https://github.com/QuantumLogicsLabs/QuantumChat-Frontend/security/advisories/new).

Include reproduction steps, affected UI flows, and impact. Prefer non-destructive PoCs.

### What to expect

- Triage acknowledgement
- Coordinated fix and disclosure
- Credit when appropriate and desired

## In scope

- Private key / keyring exposure (logs, exports, storage bugs)
- Plaintext message or call-signaling leakage to the network
- XSS or client bugs that steal session tokens or key material
- Broken seal/unseal or key-import validation
- Dependency issues with a realistic exploit path in this app

## Out of scope

- Users who lose `keys.txt` or clear site data
- Compromised devices / malicious browser extensions (general)
- Backend-only issues (report to QuantumChat-Backend)

## XSS controls

- Content-Security-Policy on the SPA (`script-src 'self'`, no inline scripts)
- Chat text rendered as React text nodes (escaped)
- SVG attachments are not image-previewed; PDF iframes use `sandbox="allow-same-origin"`
- Avatar file picker limited to raster image types

## Safe harbor

Good-faith research that follows this policy and avoids abusing real users’ data
will not be pursued legally by the maintainers.
