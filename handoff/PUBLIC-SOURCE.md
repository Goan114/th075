# Public source snapshot

Source: TH075-1.0.4-development-20261012, inner directory containing
`FILE-SHA256.json`. Publication follows the source/assets separation in
`YomotsuHisami/th15` (`main`, `fe113b6f9cbcb676b15dfd95cfd5916c4d5de95e`).

Game, platform, shared renderer, launcher, test, and reference source files
retain their delivery bytes. `.gitattributes` disables text conversion because
the production build verifies source and header SHA-256 hashes against the
original acceptance records. Historical evidence is not a fresh test run.

Original executables/data, extracted resources, generated game fonts, music,
replays, artifacts, and downloaded tools are intentionally omitted. Asset
JSON metadata and the existing launcher artwork/site fonts are retained.
The external reference's original title-screen image is excluded as a game
asset; its README remains the original upstream reference document.

Run the importer from the repository root:

```powershell
python tools/import-local-inputs.py "D:/path/to/TH075-1.0.4-development-20261012" --include-toolchain
$env:PATH = "$PWD/tools/python;$PWD/th10_web/tools;" + $env:PATH
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/tools/playwright-browsers"
python tools/prepare-toolchain.py
node th075_web/scripts/build-sdl.mjs --release
node th075_web/scripts/package-release.mjs
```

`--dry-run` verifies all selected file hashes without copying. Without
`--include-toolchain`, the importer omits Emscripten and Playwright browsers;
`tools/download-emscripten.py` provides the same pinned Emscripten 6.0.9 SDK
installer used by upstream TH15. This Windows toolchain does not make the
native comparison scripts portable to other operating systems.

The default importer restores original game inputs, prepared game assets,
reference assets and native Wasm helpers, comparison analysis artifacts,
dependency modules, bundled Python, Node/WASI tools, and TypeScript. Everything
it restores is covered by `.gitignore`; public source files are never replaced.

The delivery-only launch/verify command files and its full file manifest are
not included: they describe the complete binary development package. The
original build/handoff documents remain available for context. Rebuild and
package the site locally before starting `node deploy/server.mjs`.
