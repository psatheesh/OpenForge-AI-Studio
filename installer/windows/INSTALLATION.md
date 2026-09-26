# One-click Windows installation and automated build

## End users
When the installer has been compiled and verified on a Windows build host, run
`OpenForge-AI-Studio-Setup-<version>-x64.exe`. It includes Electron's Node.js
runtime and the compiled Theia/OpenForge application. **Do not require users to
install Node.js or Yarn.** The bundled OpenForge backend runs locally on
127.0.0.1:4343 and stores projects in `%APPDATA%/OpenForge AI Studio/projects`.

AI generation needs either an installed Ollama service and a downloaded coding
model, or configured cloud API access. Optional languages such as Python, C++
and mobile SDKs need installed toolchains for compiling the user's projects.
A desktop application package does not automatically supply all development SDKs.

## Maintainers / software builders
On a supported Windows x64 machine, double click `BUILD-WINDOWS-INSTALLER.cmd`.
The script downloads a pinned Node.js ZIP, verifies its SHA256 against Node's
published checksums, uses its bundled npm to install an isolated Yarn Classic,
installs project dependencies, runs source checks and tests, builds Theia and
invokes electron-builder to produce an NSIS setup executable in `dist/`.

For fully air-gapped builds, pre-populate `installer/cache` with the matching
Node ZIP, Node SHASUMS file and warmed npm and Yarn package caches, and obtain
an Electron distribution matching the version/build tooling. Run
`powershell -File installer/windows/build-installer.ps1 -Offline`. A first-time
build with no cached dependencies cannot be run offline.

**Verification boundary:** This source distribution provides a build pipeline,
not a precompiled or security-certified installer. A complete native build and
fresh Windows installation smoke test must pass before claiming production
readiness. Code signing requires a certificate and publisher-specific setup.

## What the setup actually installs
The NSIS installer contains the Electron runtime (including Node), compiled Theia IDE, OpenForge AI Builder UI and local project service. It does not install or update machine-wide Node/Yarn. It does not silently download or install third-party AI models, language SDKs, Git, Python or compiler toolchains. A separate optional onboarding flow can provision user-selected development tooling with license and disk-space prompts.
