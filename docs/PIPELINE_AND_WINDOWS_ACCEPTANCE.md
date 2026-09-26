# OpenForge AI Studio v0.6 — Development pipeline and Windows acceptance

## Current implementation

The existing Theia-based product source and built-in OpenForge project workbench are retained. The workbench has a new **Prompt → Working Application** panel and an HTTP job API. New code is first-party application code included in the unified distribution, not a separate plugin to install.

### Stages

1. **Analyze:** retain the complete input prompt, extract headings and explicit requirements, create a requirements-traceability record. Heuristic extraction needs review; unverified requirements remain visible.
2. **Generate:** send requirement batches, source context and original project brief to a configured local Ollama or remote OpenAI-compatible model. Hybrid attempts cloud first, then local. Save generated source and tests; reject unsafe output paths.
3. **Dependencies:** perform project dependency installation only after the user approves code execution on a trusted/isolated worker. The packaged OpenForge distribution is configured to include its own portable Node/npm runtime on Windows.
4. **Compile:** run project-specific build scripts or JavaScript syntax checks; record command, exit code and output.
5. **Repair:** send real compiler/test diagnostics to the coding model and regenerate affected files. The maximum repair attempts is configurable. Failure is recorded rather than hidden.
6. **Test:** execute the generated test suite, store results and retain requirements that lack direct test evidence as unverified.
7. **Package:** web projects can produce offline web ZIPs. Supported static web projects can be wrapped in Electron and built into a standalone Windows NSIS Setup.exe on a Windows runner. Other frameworks and OS targets require additional packaging adapters.
8. **Accept:** require separate Windows installation verification; never treat successful packaging as evidence of a working installer.

## Run from OpenForge UI

Open a project → Prompt → Working Application → choose Web or Windows → configure local/cloud AI → approve command execution only in a trusted isolated worker → Run full pipeline → inspect live phase states and download artifacts. **Create verified notes demo** generates a deterministic demonstration fixture for pipeline verification; it is not evidence that an arbitrary input prompt will produce a complete application.

## Offline local functional verification

Run from the source project root:

```bash
npm test
node packages/openforge-workbench/pipeline/cli.js sample --target web --approve-execution --dir ./build/acceptance-notes
```

The reference app has no external runtime dependencies and works offline in a browser. Source regeneration, compilation, unit tests, and ZIP export run locally. The browser smoke script requires Python Playwright/Chromium as *test tools only*; the generated application does not require them.

## Windows generated-app acceptance

The `.github/workflows/generated-app-acceptance.yml` workflow has two separate Windows jobs:

* `build-generated-app`: generates the Notes application, installs the Electron build dependencies, compiles, runs unit tests and produces a real unsigned NSIS installer. Archives the installer, its SHA256 and build report.
* `clean-install-acceptance`: downloads that actual installer on a **separate fresh Windows CI runner**, installs it silently, excludes Node and Yarn from runtime PATH, exercises the installed executable's bundled-runtime self-test, launches the normal Electron window and verifies it loads local resources. Matches installer SHA256 against build + test evidence and uploads attestation.

On a Windows machine, create the reference installer manually with:

```powershell
node packages/openforge-workbench/pipeline/cli.js sample --target windows --approve-execution --dir build/generated-acceptance-project
./installer/windows/accept-generated-app.ps1 -SetupPath (Get-ChildItem build/generated-acceptance-project/files/dist/*Setup*.exe | Select-Object -First 1).FullName
```

To produce the **OpenForge IDE's own one-click installer**, run `BUILD-WINDOWS-INSTALLER.cmd` on a Windows computer. Its builder downloads/verifies a private Node 22 + Yarn Classic, builds Theia/Electron, stages portable Node/npm into the end-user installer and invokes electron-builder NSIS. These native build and installation steps **have not been completed in the current Linux environment**.

## Acceptance matrix

| Verification gate | Source build evidence in this package | Status |
|---|---|---|
| Prompt extraction and project persistence | HTTP/unit tests | Tested |
| Reference app code generation | Deterministic fixture | Tested |
| Configured model-driven generation | Provider client and mocked repair tests | Model live call not verified |
| Source compilation and automated repair | Local Node unit integration tests | Tested for fixture |
| Generated app offline browser CRUD | Headless DOM/browser smoke | Tested using local test bridge |
| Offline ZIP output | Source ZIP integrity | Tested |
| Real Windows NSIS installer of generated app | Windows GitHub workflow | Not run here |
| Fresh Windows install, no development Node/Yarn | Windows acceptance script | Not run here |
| Full Theia native Windows build/install | Existing build scripts | Not run here |
| Independent security review and Authenticode signing | Release gate requires evidence | Pending |
| Engineering software computational validity | Domain-specific verification required per generated app | Not assessed |

**Do not mark OpenForge AI Studio or arbitrary AI-generated software production-ready without matching build, acceptance, signing and security evidence.** Even a green Notes fixture is proof only for that specific sample and pipeline configuration.
