# OpenForge Windows production release process

**The current archive is a release candidate SOURCE tree, NOT an approved production binary.**

- Build on Windows x64 with Visual Studio 2022 C++ build tools, Python 3, internet access to npm/Electron, and sufficient disk space.
- Run `BUILD-WINDOWS-INSTALLER.cmd`; check that native Theia desktop and built-in OpenForge module compile. `npm test` tests the existing workbench and source manifests but does not prove this native build succeeds.
- Generate a committed `yarn.lock` using a reviewed dependency graph and use `--frozen-lockfile` for subsequent deterministic release builds.
- Run `installer/windows/smoke-installer.ps1` on an isolated CLEAN Windows VM. Verify install/uninstall, first run, IDE window, terminal, source editor, AI Chat, OpenForgeBuilder agent, prompt import, compile and release packaging. Capture browser/Electron E2E evidence.
- Carry out an independent security assessment of the local AI service and AI tools, an SBOM and dependency review, and code-sign the setup executable. Add JSON evidence documents only after the checks really pass.
- Run `installer/windows/verify-production.ps1 -Installer path/to/setup.exe`; this script fails unless signing and the required evidence exist.

The Go executable `OpenForge-AI-Studio-Build-Bootstrap-0.5.0-x64.exe` is a **compiled WINDOWS BUILD BOOTSTRAPPER**, not the final Theia desktop installer. It unpacks source and invokes the Windows builder; native compilation and the production acceptance checks still run on the target Windows host. Do not label its output production-ready without completing the release gates.
