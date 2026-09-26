# OpenForge AI Studio 0.6.0 — Integrated AI build, repair, test and release pipeline

**Status:** functional local pipeline for the acceptance fixture and web ZIP, plus a Windows Electron/NSIS build and separate fresh-runner acceptance workflow. The full native Theia IDE and signed Windows setup have **not** been built/verified in this environment. Do not represent this source release as a finished production installer.

## New in 0.6.0

* Universal Prompt Builder → `Prompt → Working Application` panel showing requirement analysis, AI generation, dependency installation, compilation, automated repair, tests, packaging and acceptance status.
* Configurable online (OpenAI-compatible), offline (local Ollama) and hybrid AI generation, partitioned by requirement batches with persisted logs and traceability.
* Approval-gated execution in a trusted/isolated worker, persistent run JSON and downloadable build artifacts.
* Deterministic offline Notes acceptance app, actual Node tests, runnable web bundle, and Electron Windows standalone package definition.
* Verified portable Node/npm **staging logic** for OpenForge's end-user Windows setup generation. End users of a successfully built installer do not separately install Node or Yarn; optional coding models, remote API keys and language-specific SDKs remain deployment-specific.
* Windows GitHub Actions workflow with two separate build/install runner jobs and SHA256-checked acceptance attestation; **not yet executed** on Windows in this environment.

**Source entry points:** `packages/openforge-workbench/pipeline/`, `packages/openforge-workbench/server.js`, `packages/openforge-workbench/public/`, `.github/workflows/generated-app-acceptance.yml`, `installer/windows/accept-generated-app.ps1`. Detailed instructions and an evidence matrix: [`docs/PIPELINE_AND_WINDOWS_ACCEPTANCE.md`](docs/PIPELINE_AND_WINDOWS_ACCEPTANCE.md).

### Verify immediately (Node 22 already installed in developer environment)

```bash
npm test
node packages/openforge-workbench/pipeline/cli.js sample --target web --approve-execution
npm run start:builder
```

Open `http://127.0.0.1:4343`, create a sample from Code Workspace, then run the Web pipeline. For Windows `.exe` generation, use the included Windows runner workflow or the build machine instructions. **Only Web and static-Web-to-Windows packaging adapters are implemented in this release.** Packaging other project frameworks needs additional adapters.

---

# OpenForge AI Studio Unified — integrated Eclipse Theia + Theia AI source distribution

This is **one source distribution / one branded IDE product** built on official Eclipse Theia 1.75.0. The custom `@OpenForgeBuilder` agent is installed **as a built-in product dependency**, not a VSIX or separately distributed extension. Theia's native IDE, Monaco, debugging, Git, tasks, terminals, Open VSX, AI Chat, AI agents, Ollama and cloud provider integrations live in the same Theia application. The original OpenForge prompt builder is shipped as a **bundled first-party local service** shown inside a native workbench view (command `OpenForge: Open AI Software Builder`). It is not a second downloadable product.

## What is included

- `applications/browser` — branded full Theia browser application, native IDE and AI package dependencies.
- `applications/desktop` — branded Electron desktop application with the same package set.
- `packages/openforge-product` — internally linked first-party Theia product capabilities: AI chat agent, AI workspace tools, prompt commands and the embedded software-builder view.
- `packages/openforge-workbench` — existing real local project-generation service, prompt requirements extraction, project templates, editor, AI proposals, test launcher and source ZIP export.
- `scripts/launch.js` — one start command supervising both Theia and the bundled OpenForge service.

## Prerequisites

Node.js 22+, Yarn Classic 1.22.x, Python 3 for starter ZIP output and tests, C++ native build prerequisites required by Theia/Electron. Online dependency installation is required for the **initial build**, after which the local IDE can run without internet using a previously installed compiler and local Ollama model. No dependencies, binaries, or pretrained model weights are contained in this source ZIP.

## Build and run: browser

```bash
corepack enable
yarn install
yarn build:browser
yarn start:browser
```

Open http://127.0.0.1:3000. Use **F1 → OpenForge: Open AI Software Builder** for the first-party prompt builder, and **AI Chat → @OpenForgeBuilder** for the built-in AI agent. The prompt builder companion service listens only on 127.0.0.1:4343, running with the same launch command.

## Build and run: desktop

```bash
yarn install
yarn build:desktop
yarn start:desktop
```

Configure the AI provider in Theia AI preferences. For offline operation install Ollama and download a compatible model first. For the classic builder companion use OLLAMA_MODEL (offline), or AI_BASE_URL, AI_MODEL and AI_API_KEY (cloud). It is a first-party view but remains a separate internal local process. Native integration of its data model and AI agent execution into Theia is future work.

## Verification and current limits

Run `npm test` and `npm run check` to test the existing builder and package manifests. A full Theia compile, desktop launch and Windows/macOS installation tests must be performed in an environment that can fetch the pinned dependency packages; they were not available in the artifact-generation environment. A distributable signed Windows EXE / MSI and offline bundled dependency archive are **not included**. The Electron packaging config is an illustrative integration recipe, not a tested installer manifest. The `electron-builder.yml` file is a *packaging starting point* and requires host-specific build/release verification and correct sidecar launch paths.

Do not expose the built-in development services to the public internet without implementing proxy authentication, access controls, resource isolation and TLS. The built-in sidecar and embedded view are intended for loopback/self-hosted development. All upstream packages retain their own license terms.

## One-click installer build (Windows)

For a Windows build machine double-click `BUILD-WINDOWS-INSTALLER.cmd` (see `installer/windows/INSTALLATION.md`). It automatically provisions a verified private Node.js 22 and Yarn Classic, installs build dependencies, compiles the desktop IDE and packages an NSIS setup EXE. End users install the resulting EXE without separately installing Node or Yarn. The desktop bootstrap includes the first-party project-builder service. A prebuilt EXE is **not included** in this source archive; Windows build, install tests, platform signing and production acceptance remain pending.

The local project ZIP export now uses built-in Node.js ZIP generation and no longer requires Python. Python is still needed to run **user-created Python projects** and their tests.

## One-click desktop installer (0.4.0 source release)

**End-user installation:** run the generated `OpenForge-AI-Studio-Setup-<version>-x64.exe` on Windows. The NSIS installer is now configured for one-click, per-user installation, shortcuts and launch on completion. No separate system Node.js or Yarn installation is needed because Electron contains Node and Yarn is only used on the build host. On the first run OpenForge automatically creates its project, log, model and configuration directories under `%APPDATA%\\OpenForge AI Studio`. The built-in local project service starts with the IDE.

**Create the installer:** on Windows, double-click `BUILD-WINDOWS-INSTALLER.cmd`. The script obtains and verifies a private Node.js 22 archive, installs private Yarn Classic, compiles the Theia desktop distribution and generates an NSIS setup executable under `dist`. The GitHub Actions workflow also builds the installer on Windows and verifies its checksum and silent installation.

**Offline AI edition:** the default source release does not contain an AI model. To produce a fully offline edition, prepare an approved local Ollama model cache and binary with `installer/windows/prepare-offline-bundle.ps1`, supplying the Ollama binary SHA256. Rebuild the installer. The package will include the Ollama binary and pre-downloaded model cache and auto-start Ollama on first run. Check each model's redistribution terms before packaging. A normal installation works without offline AI and offers cloud-model configuration when connected.

**Important:** this source ZIP is not the compiled Windows EXE. An actual native Theia build, a Windows packaging run, signing, UI tests, local-model integration tests and independent security review are required before distributing it as production-ready. The current build environment cannot verify those platform-dependent steps.

## 0.5.0 release-candidate build helper (Windows EXE)

A compiled Windows x64 **build bootstrapper** is provided separately. It embeds this source distribution and runs the automated Windows installer builder, then opens the generated setup EXE if successful. **It is not a compiled Theia IDE or a production-ready installer.** A first build needs internet, Windows C++ native build tools and Python. It is offered to reduce manual setup, not to claim any native Theia compilation or production acceptance has occurred in this environment.

Run `node scripts/release-gates.cjs` to see current release blockers. Signed production releases must pass `installer/windows/verify-production.ps1` and independent UI/security verification.
