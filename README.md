This repo is uploaded on behalf of [@SteinsGateON](https://space.bilibili.com/34714121).

# th075

A portable C++ / SDL3 / WebAssembly implementation of 東方萃夢想 ～ Immaterial and Missing Power, targeting the Japanese 1.11 executable. Imported from the TH075 WEB 1.0.4 development package dated 2026-10-12.

## Layout

- `th075_web/`: game implementation, SDL platform, browser launcher, documentation, tests, and original-game comparison tools.
- `portable/`: shared GLES renderer and input code.
- `th08_web/`, `th09_web/`, `th10_web/`, `th11_web/`, `th15_web/`: dependency metadata and shared helpers from the development package.
- `th075_web/reference/external/th075/`: separately licensed reconstruction reference, with its original MIT license and provenance preserved. It is not the complete playable implementation.
- `deploy/`, `handoff/`, `tools/`: deployment source, original development instructions, and local input restoration helpers.

## Build

Install Python 3.10+ and Node.js 22+. On Windows, restore inputs from the matching, fully extracted development package:

```powershell
python tools/import-local-inputs.py "D:/path/to/TH075-1.0.4-development-20261012" --include-toolchain
node th075_web/scripts/build-sdl.mjs --release
node th075_web/scripts/package-release.mjs
```

The importer accepts either the outer package directory or the inner directory containing `FILE-SHA256.json`. It checks file hashes before copying. `--include-toolchain` also restores the supplied offline Emscripten SDK and Playwright browsers. The default restores assets, native comparison dependencies, Python, Node, WASI SDK, and TypeScript; the pinned Emscripten SDK can alternatively be installed with `python tools/download-emscripten.py`.

For original-game comparisons:

```powershell
node th075_web/scripts/cpp/build.mjs
node --test th075_web/tests/cpp/graphics.test.mjs
```

When using the bundled Python or browser dependencies, prepend `tools/python` and `th10_web/tools` to `PATH` and set `PLAYWRIGHT_BROWSERS_PATH` to the absolute path of `tools/playwright-browsers`. See [the public source setup](handoff/PUBLIC-SOURCE.md) and [the original build instructions](handoff/BUILD-AND-TEST.md).

## Assets and licensing

The repository excludes original game executables, archives, music, extracted game resources, generated game glyphs, replays, compiled output, and downloaded toolchains. Building a playable site or running original-game comparisons requires restoring local inputs you are allowed to use. Launcher artwork, site fonts, and third-party source retain their existing notices, matching the upstream TH15 publication layout.

The project uses the same MIT licensing and SteinsGateON attribution as the upstream portable repositories. Bundled third-party components retain their licenses, including the launcher's [GPL-3.0 license](th075_web/launcher/LICENSE), the [external reference's MIT license](th075_web/reference/external/th075/LICENSE), and the notices in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).

`main` and `eagler` initially contain the same source snapshot.
