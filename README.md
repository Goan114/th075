This repo is uploaded on behalf of [@SteinsGateON](https://space.bilibili.com/34714121).

# th075

A portable C++ / SDL3 / WebAssembly implementation of 東方萃夢想 ～ Immaterial and Missing Power, targeting the Japanese 1.11 executable. Imported from the TH075 WEB 1.0.4 development package dated 2026-10-12.

## Layout

- `th075_web/`: game implementation, SDL platform, browser launcher, documentation, tests, and original-game comparison tools.
- `portable/`: shared GLES renderer and input code.
- `th08_web/`, `th09_web/`, `th10_web/`, `th11_web/`, `th15_web/`: dependency metadata and shared helpers from the development package.
- `th075_web/reference/external/th075/`: separately licensed reconstruction reference, with its original MIT license and provenance preserved. It is not the complete playable implementation.
- `deploy/`, `handoff/`, `tools/`: deployment source, original development instructions, and local input restoration helpers.

## Multiplayer branch (`eagler-mp`)

This branch adds two-human network duels through the shared eagler-touhou
room, WebRTC/relay and admitted spectator service. Ordinary single-player
development stays on `eagler`; do not merge the full MP implementation there.
See [the multiplayer contract and verification](handoff/MULTIPLAYER.md).

## Build and run

Install Python 3.10+ and Node.js 22+. With the matching private development
package and the companion `eagler-touhou` integration branch:

```powershell
python tools/import-local-inputs.py "D:/path/to/TH075-1.0.4-development-20261012" --include-toolchain
npm run build
npm run package:runtime
npm run prepare:content
npm run dev
```

Open `http://127.0.0.1:18175/`. This uses the current shared launcher and Package
Store, with the original TH075 A/B/C/D layout, button descriptions and joystick.
On this branch the Runtime output is `build-eagler-multiplayer/`. DATA and
music use the ordinary TH075 layout. All generated outputs remain ignored.

See [Eagler setup, controls and verification](handoff/EAGLER.md),
[the public source setup](handoff/PUBLIC-SOURCE.md), and
[the original development-package instructions](handoff/BUILD-AND-TEST.md).

## Assets and licensing

The repository excludes original game executables, archives, music, extracted game resources, generated game glyphs, replays, compiled output, and downloaded toolchains. Building a playable site or running original-game comparisons requires restoring local inputs you are allowed to use. Launcher artwork, site fonts, and third-party source retain their existing notices, matching the upstream TH15 publication layout.

The project uses the same MIT licensing and SteinsGateON attribution as the upstream portable repositories. Bundled third-party components retain their licenses, including the launcher's [GPL-3.0 license](th075_web/launcher/LICENSE), the [external reference's MIT license](th075_web/reference/external/th075/LICENSE), and the notices in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).

All ongoing development is on `eagler`; `main` retains the original source snapshot.
