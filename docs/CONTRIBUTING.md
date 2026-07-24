# Contributing to QuantumChat Frontend

Thanks for contributing to the QuantumChat client — where all message encryption happens.

## Before you start

1. Read [`docs/REQUIREMENTS.md`](https://github.com/QuantumLogicsLabs/QuantumChat/blob/main/docs/REQUIREMENTS.md) (E2E X5 rules).
2. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
3. Report vulnerabilities via [SECURITY.md](SECURITY.md), not public issues.

## Development setup

```bash
npm ci
cp .env.example .env   # VITE_API_URL → backend, default http://localhost:5000
npm run dev            # http://localhost:5173
```

You typically also need [QuantumChat-Backend](https://github.com/QuantumLogicsLabs/QuantumChat-Backend) running locally.

## Checks before a PR

```bash
npm run build
```

CI also runs CodeQL, `npm audit`, Gitleaks, and crypto static guards. Do not introduce:

- Plaintext WebRTC SDP/ICE on `call:*` socket emits (use sealed envelopes)
- Logging of private keys / seeds
- Sending message plaintext to the API or QuantumAI without an explicit client opt-in path

## Pull requests

1. Keep changes focused.
2. Preserve client-held keys and X5 sealed-box behavior.
3. Fill out the PR template.
4. Ensure required GitHub Actions checks pass.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](../LICENSE).
