# TH075 static thcrap localization

The Eagler shell accepts the Launcher's verified `runtimePack` before launch.
Files stay under `/thcrap/th075/`; no translation server is contacted by the
Runtime. Japanese DATA, saves, input, Replay representation and game logic remain
the baseline. Missing translated resources fall back to the original resource.

The Launcher host compiler groups thpatch PNGs by native bitmap bank, and emits
only replacement records. `E75I` version 2 carries the original CRC32/size and
strict bitmap index/dimension bindings; pixels use native 32-bit runs where
smaller. `E75T` version 1 replaces quoted text by its original ordinal, with the
same original CRC32/size binding. Japanese script labels, expressions, numeric
commands, ordering and Music Room track IDs are not replaced.

Tagged, fixed-width glyph tokens use the existing optional glyph-bank path.
The compiler bakes an explicit font into GG75 at all five native text heights,
audits its character coverage and includes the font license. This is functional
Unicode presentation, not a claim of original Windows/GDI pixel parity. The
previous private Chinese release and its GBK tables are not a thcrap source.

Verified source coverage for the selected patches is recorded in each pack's
`localization/options.json`. Simplified Chinese currently supplies 101 image
banks, ten ending scripts and Music Room text. English has a smaller upstream
resource set. Story text absent from thpatch remains Japanese; no translation
is invented to make the capability look complete.

Verification uses the matching private DATA and the sibling Launcher:

```powershell
npm run build
npm run package:runtime
node th075_web/scripts/build-sdl.mjs --release --eagler --test-harness
```

The Launcher's `test-th075-thcrap-native-browser.mjs` checks every localized
image decode, all changed ending text through the native rasterizer, unchanged
script controls/Music Room IDs, all eleven native fighter loaders and rejection
of a mismatching original-resource CRC. Its probe is conditional on
`TH075_DEVELOPMENT_HARNESS` and cannot appear in a published Runtime.
`test-th075-thcrap-browser.mjs` uses actual Launcher language selection, menus,
Story entry and Music Room. It passes for Japanese, Simplified Chinese and
English. The translated menu regression keeps zero asset reads on entry.

Isolation baseline: upstream `main` at
`7c6127c7c71f89c8a790ba692d465bff75891096`; canonical `eagler` at `d792a62`;
experiment `experiment/thcrap` in `worktrees/th075-thcrap`. Promotion records
the reviewed experiment head and final canonical verification in the delivery
receipt. Full ending playthrough, alternate-palette visual parity and physical
phone performance are not claimed by these tests.
