# TH075 multiplayer acceptance — 2026-10-16

## Source separation

- Original/upstream reference (`main`): `7c6127c7c71f89c8a790ba692d465bff75891096`.
- Ordinary `eagler` and MP topic base: `66405aeabff2194a7e4b40dd981fdc944262c6f2`.
- Experiment implementation: `7991f00`; accepted on permanent `eagler-mp`: `dbdf5fe`.
- Launcher base: `8e08ef2`; implementation: `be7d983`, retained on independent
  `eagler-th075-mp` with its policy test registered in the repository plan.
- `eagler-common`: exact `dependencies.json` pin; compiled native inputs and
  shared calibration source must be clean at that revision.
- Ordinary branches were not advanced. Generated Runtime, DATA, music, private
  input resources, SDK, screenshots and native replay outputs are not committed.

The title-owned changes are the battle bootstrap, exact-input driver, terminal
lifecycle, MP replay save and MP storage mount. Shared Launcher orchestration
reads the catalog; no new TH075 condition was added to room orchestration.
Room presentation now reads `gameplay` for the versus/cooperative label.

## Accepted checks

The permanent MP checkout was rebuilt and packaged independently of the topic
checkout. Its production WASM SHA-256 is:

`99eb59ee4ab80f4243bd23fb5d42ec7087eb35239359ec8450f1f025dc0f648c`

- Native WASI: 1000 exact frames each at manual D=0, D=2, D=9 and measured
  automatic D=1, with dropped, duplicated and reordered input traffic. Exactly
  one capture per logical frame; no predicted frame. Terminal input/ACK repair
  works without another physical sample. A deliberately changed state digest
  is rejected explicitly at frame 120.
- Permanent Runtime, real shared transport, two browser seats plus admitted
  spectator: RTC players reached 2203/2201 frames, spectator 1803. Equal-frame
  observations matched, including RNG, fighter state, score and object counts;
  native periodic world comparisons reported no divergence. Pause, resume,
  restart, read-only viewer input, terminal confirmation, automatic replay save
  and all three Runtime exit events passed. The two completed native replay
  files were byte-identical across player seats.
- Forced WebSocket relay topic run: players 2169/2171, spectator 1803, with the
  same movement/attack, pause/resume, restart and terminal lifecycle checks.
  This proves the local relay route; it is not an Internet latency claim.
- A separate post-intro movement assertion passed on the permanent Runtime:
  P1 moved right from x=480 to x=577, and P2 moved left from x=800 to x=616.
  It then completed the same normal exit/terminal/replay checks.
- Shared disconnect notification: the remaining world enters connection-ended
  state and its complete observed state stays fixed rather than resetting.
- Closing only the spectator stream produces an explicit viewer error while
  both player worlds continue advancing.
- Permanent Runtime offline replay: 22 matching recorded simulation-frame
  samples of fighter position, health and action. Native `.rep` replays random
  draws; the live generator state word is intentionally not compared in playback. An additional moving-fighter
  replay run matched 16 observed combat states.
- Real permanent Launcher frontend: public TH075MP card, directory create/join,
  two seats, versus label, resource preparation, ready/start and both real WASM
  worlds passed (309/311 frames). Original DATA was installed through the public
  package import UI; no Runtime or gameplay response was stubbed.
- Launcher production build/type check; six selected product/timing/relay/
  spectator contract suites; four game adapter tests; common keyboard drift
  check and production package identity/export checks passed.
- Runtime Release `/2` assembly and verification passed for all nine registered
  games, including separate TH075 normal and MP generations. Other titles used
  unchanged code downloaded from the test site's published Runtime manifest,
  with every file hash checked; their source builds were not repeated.

Reproduction commands and bounded fixture setup are in [MULTIPLAYER.md](MULTIPLAYER.md).
Browser artifacts are ignored under `th075_web/artifacts/multiplayer-browser/`;
workspace run logs and the verified Runtime Release remain in the local
`_scratch/th075-multiplayer/` directory.

## Explicit limits and existing aggregate failures

Physical cross-device/iPad Safari, WAN/TURN paths and long-duration Internet
play are not accepted by these local-browser results. The implementation uses
confirmed pure delay; rollback is not advertised.

`node scripts/check.mjs --workspace` was attempted. It stopped in repository
core at the existing `test-test-ownership.mjs` failure: ten older TH075 tests have
no declared lane. The same failure was reproduced on unchanged Launcher base
`8e08ef2`; the new TH075MP policy test has a declared repository lane. Independently,
`test-netplay-measured-timing.mjs:25` also fails on that unchanged base because
its old hybrid-mode assertion disagrees with the current direct-rollback
normalization. These pre-existing checks were not weakened or labelled PASS.
The aggregate gate did not reach its cross-repository phase. Standalone
publication audit also flags pre-existing Phosphor/UI asset allowlist entries
and TH20 card artwork on the unchanged base. The MP commits add source,
documentation and tests only; no original game assets were added.

No test-site or main-site deployment was made for multiplayer in this task.
