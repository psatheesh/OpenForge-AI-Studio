# OpenForge AI Studio 0.1 — runnable development workbench

This repository contains a real, dependency-free Node.js software-building **starter workbench** plus an Eclipse Theia-compatible extension starter. The bundled web workbench is **not itself the Eclipse Theia IDE**. For a Theia-native product, follow `docs/THEIA_INTEGRATION.md` to add the bridge to the official Theia IDE and extend its views.

## Start locally (offline-capable)

1. Install Node.js 20+ and Python 3 (Python is used for project ZIP export and Python-template tests).
2. Extract this project. On Windows, double-click `scripts/start-windows.cmd` or run `node server.js` from its root. On Linux/macOS, run `./scripts/start-linux-macos.sh`.
3. Open <http://127.0.0.1:4343>.
4. Open **Universal Prompt Builder**, paste a prompt, select a project template and mode, and click **Create project**. This generates a runnable starter project and retains the entire original prompt in `REQUIREMENTS.md`.
5. In the code workspace, edit files, save, run starter tests, initialize Git and export a source ZIP.

### Configure local AI (offline)

Install Ollama and download a coding model **while connected**:

```sh
ollama pull qwen2.5-coder:7b
```

In local shell, set `OLLAMA_MODEL=qwen2.5-coder:7b`, optionally `OLLAMA_URL=http://127.0.0.1:11434/api/chat`, and start `node server.js`. Open the Code Workspace → **AI GENERATION** to generate a proposed set of files. Inspect proposals before explicitly applying them. Ollama model quality, memory and prompt context determine the completeness of the proposed files.

### Configure cloud AI (online)

Set the server-side environment variables `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` for an **OpenAI-compatible `/chat/completions` endpoint**, then start the server. No particular provider is hard-coded. Online mode requires a configured cloud endpoint; Hybrid prefers the cloud endpoint if set and otherwise uses Ollama. Editing, scaffolding and tests work without any AI provider.

### Expose to a network / host online

The server binds to **127.0.0.1** by default. Network mode requires `HOST=0.0.0.0` and a long `OPENFORGE_TOKEN`. Use a TLS reverse proxy and appropriate authentication for internet exposure. Docker Compose maps the service to local loopback by default. Exposing this development server directly to the public internet is unsupported. The browser prompts for the token and stores it locally, but authenticated project ZIP download and iframe preview require a separate client with the auth header in this initial release.

```sh
OPENFORGE_TOKEN=use-a-long-unique-random-value docker compose up --build
```

### Current capabilities

- Responsive browser workbench and persistent project dashboard
- Import prompts from any source (paste text), heuristic requirement extraction, unmodified original prompt saved to each project
- Three actual development-mode settings: offline (local Ollama), online (configured cloud model), hybrid (cloud preference/local fallback if no cloud configured)
- Working web, Python and Node.js API project scaffolds
- File explorer and source editor, create files, save edits, starter test commands, local Git initialization, ZIP source export
- Optional AI code proposals with explicit human approval before files are changed
- Isolated sandboxed web starter preview (not a full arbitrary server preview)
- Docker/container packaging example, Windows and Unix launch scripts
- Theia-compatible extension **source** to expose OpenForge commands within a Theia IDE

### What this release does NOT claim

- Theia IDE itself is not bundled or built; see integration guide.
- It does not fully implement arbitrary pasted prompts without suitable AI output, developer review and iterative work. The immediate deterministic result is a working **scaffold**, not a finished arbitrary application.
- Visual drag-and-drop design, real Windows/macOS/iOS installers, unattended autonomous engineering validation, multi-user cloud hosting, live code collaboration and cross-device sync are future work.
- Project build/test execution is limited to built-in known template commands with resource timeouts. AI model generation is constrained by provider output/context and project resources.
- No claim of production security or external audit.

### Tests

```sh
npm test
npm run check
```

## License

OpenForge starter source: MIT. Eclipse Theia and third-party components retain their original separate licenses; verify upstream licensing before redistribution.

## Native Theia AI agent extension

The new `theia-ai-builder-extension/` directory contains the initial native `@OpenForgeBuilder` agent and three Theia AI workspace tools, plus prompt-import commands. It is **not** a drop-in compiled VSIX and has not yet undergone a build against a complete upstream Theia host. Run its self-contained unit tests with `cd theia-ai-builder-extension && npm test`; see its README for installation instructions and compatible versions.
