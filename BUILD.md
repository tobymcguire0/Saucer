# Building Cookbook as an Executable

## Prerequisites

| Tool | Why | Install |
|---|---|---|
| **Node.js** (>=18) | Frontend build toolchain | https://nodejs.org |
| **Rust** (stable) | Compiles the Tauri desktop shell | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` (macOS/Linux) or https://rustup.rs (Windows) |
| **C/C++ build tools** | Native compilation | **Windows:** Visual Studio Build Tools with "Desktop development with C++" workload. **macOS:** `xcode-select --install`. **Linux:** `sudo apt install build-essential libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev` |
| **WebView2** (Windows only) | Renders the UI | Ships with Windows 10/11. If missing, download from https://developer.microsoft.com/en-us/microsoft-edge/webview2 |

Verify your toolchain:

```
node --version
cargo --version
rustc --version
```

## Step 1 — Install Dependencies

```bash
npm install
cd src-tauri && cargo fetch && cd ..
```

`npm install` pulls the frontend packages. `cargo fetch` downloads Rust crates so the first build is faster.

## Step 2 — Run in Development Mode

```bash
npm run tauri dev
```

This starts Vite on port 1420 and opens a native window connected to it. Hot-reload is active for the frontend; Rust changes trigger an automatic recompile.

## Step 3 — Run Checks Before Building

```bash
npm run typecheck
npm run test
```

Fix any errors before proceeding to a release build.

## Step 4 — Build the Production Executable

```bash
npm run tauri build
```

This will:
1. Run `npm run build` to produce an optimized frontend bundle in `dist/`.
2. Compile the Rust shell in release mode.
3. Bundle everything into platform-specific installers.

## Step 5 — Find the Output

Build artifacts appear in `src-tauri/target/release/bundle/`:

| Platform | Artifacts |
|---|---|
| **Windows** | `nsis/Cookbook_0.1.0_x64-setup.exe`, `msi/Cookbook_0.1.0_x64_en-US.msi` |
| **macOS** | `dmg/Cookbook_0.1.0_aarch64.dmg`, `macos/Cookbook.app` |
| **Linux** | `deb/cookbook_0.1.0_amd64.deb`, `appimage/cookbook_0.1.0_amd64.AppImage` |

The standalone executable (without an installer) is at `src-tauri/target/release/cookbook` (or `cookbook.exe` on Windows).

## Custom Icon

See the "Changing the App Icon and Name" section in `ONBOARDING.md`. In short:

```bash
npx tauri icon path/to/your-icon.png
npm run tauri build
```

## Code Signing (Optional)

For distribution outside your machine, unsigned apps may trigger OS warnings. Tauri supports code signing via environment variables:

- **Windows:** Set `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
- **macOS:** Configure an Apple Developer certificate and set `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID`.

See https://v2.tauri.app/distribute/ for full details.

## Troubleshooting

| Problem | Fix |
|---|---|
| `cargo` not found | Ensure Rust is installed and `~/.cargo/bin` is in your PATH. Restart your terminal after installing. |
| MSVC linker errors (Windows) | Install the "Desktop development with C++" workload in Visual Studio Build Tools. |
| WebView2 missing (Windows) | Download and install the Evergreen Bootstrapper from Microsoft. |
| `webkit2gtk` not found (Linux) | Install `libwebkit2gtk-4.1-dev` and related packages listed in Prerequisites. |
| Build succeeds but app won't launch | Run the executable from a terminal to see error output. Check that `dist/` was populated by the frontend build. |
