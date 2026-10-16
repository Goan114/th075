# TH075 optional rollback

Persistent owners: game `eagler-mp`, Launcher `eagler-th075-mp`.
Game experiment: `experiment/th075-rollback`, initial base `5667ea6`, accepted
Replay-prompt baseline `4a5bb2b`. Launcher experiment:
`experiment/th075-rollback-ui`, initial base `6d7f220`, accepted named-spell
baseline `7e12862`. The common dependency stays at
`5f745a3f90e90d0f765e4eb7301ea5013f2f590b`.

## Community methods

Reviewed primary implementations:

- [Giuroll](https://github.com/Giufin/giuroll), commit
  `7eaf02ea6e38d40fd58bce95383880908101384b`: save speculative state,
  correct late input and reconcile audio separately (`src/rollback.rs`,
  `src/sound.rs`). This mod targets TH12.3, not TH075.
- [RollCaster mirror](https://github.com/copyliu/RollCaster), commit
  `05de055abc0865e353d04e7ae536ac441294ff60`: TH075 state serialization,
  object-list restoration and bounded rewind/input-delay tradeoffs
  (`src/state_dll/state.cpp`, `src/mainDat_mainStep.cpp`).

This is an independent source-level implementation using those methods and the
pinned shared RollbackCore/SessionChannel. No native addresses, DLL injection or
third-party implementation code are imported; native protocol compatibility is
not claimed.

## Product contract

The room owner can turn on the existing Rollback switch before starting.
Default remains measured pure delay (mode 1), manual D0..9 or automatic D.
Rollback uses mode 0, D0, P1..8 (room default P8), after the same input-lane
measurement barrier. Runtime/build/resource identities bind mode and P to the
peer handshake. The Launcher normalizes its legacy hybrid choice to direct
rollback just as for other rollback titles.

Only directions may repeat (two missing frames maximum). ABCD/menu/restart
edges remain unpredicted. A missing input older than P stalls the world.
Snapshots include both complete typed characters, all four object layers per
side (including derived timers), both shared-effect layers, contacts, rules,
AI, RNG, input counters, camera, controls, session/progress, render-owned HUD /
overlay / stage state and recording cursors/append lengths. Resource pointers
refer only to retained immutable assets; fighter addresses stay stable.

Replay queues truncate on restoration rather than copying the entire recording.
Transport, captured physical input and ACK history never rewind. Correction
restores before the first wrong frame and resimulates the captured logical
inputs, with GPU submissions and real-time audio pumping suppressed. Audio is
released once a frame is confirmed. Hashes and spectator packets publish only
from reconciled contiguous confirmed history. Normal waiting does not rerun
camera/render state. Pause, restart, round transitions and final save are
confirmation fences; closing an unfinished run truncates its speculative tail.

Status words 48..54 expose rollback/resimulation counts, pending history, P,
mode and the last confirmed checkpoint. Word 55 and 56..63 expose the confirmed
Replay frame and actor samples for offline Replay comparison. Presentation
samples are not used as a rollback Replay oracle.

## Validation (2026-10-16)

- Native protocol: 1,000 confirmed rollback frames with loss, reorder and
  duplicates, actual corrections on both peers, one physical capture per frame.
  Pure D0, D2, D9, automatic D and deliberate desync rejection also pass.
- Diagnostic browser: all 11 characters survive an alternate speculative
  branch, restore and an identical corrected trace / native Replay stream.
- Release Wasm `24408a9d8c6b2d1518dd2ad0f5a1fee1fef653786ac71e8eae6420b70bd58b67`:
  real RTC peers under 25..85 ms added input delay and every-23rd-packet loss;
  69 / 231 corrections, 155 / 1,278 resimulated frames, 30 shared confirmed
  spectator checkpoints, pause/resume/restart/exit, identical 1,066- and
  3,202-byte native Replays and a fresh IDBFS reload pass. Numbers are this run,
  not a latency/performance guarantee.
- Offline playback matches 19 confirmed actor samples from that release run.
- Release WebSocket fallback rollback and pure-delay regressions pass, including
  terminal fence, Replay download bytes, spectator exit and persistence.
- Companion Launcher builds; 51 service/selector tests and focused catalog,
  options and lobby snapshot gates pass.

The broad pinned-main `room-views.test.mjs` fixture still rejects the existing
TH075 catalog/localization additions at its authority precondition (31 tests
blocked); no oracle was changed to bless the candidate. Physical iPadOS 17.5.1
performance is unmeasured. Website deployment is a separate release operation.

Private evidence stays in ignored `th075_web/artifacts/multiplayer-browser/`
and workspace `_scratch/th075-rollback-20261016/`; no private DATA/Replays enter
Git.

## Reproduce

Set `EAGLER_WASI_CXX` to WASI clang++ and run
`node th075_web/scripts/test-multiplayer.mjs`.
Build the release with `npm run build`, package with `npm run package:runtime`.
Use the companion Launcher relay on 18376 and `browser-host.mjs` on 18375;
set `EAGLER_TH075_DATA` and `EAGLER_LAUNCHER_ROOT` to the private DATA and
companion Launcher. Run `browser-match.mjs --rollback`, `replay-gate.mjs`,
`browser-match.mjs --rollback --finish-only --relay`, then
`browser-match.mjs --finish-only --relay` (in `th075_web/tests/multiplayer/`).

For the all-character snapshot probe, build without `--release`, then run
`prepare-harness.mjs`. Point `EAGLER_TH075_MP_RUNTIME` and browser-host at the
resulting `th075_web/artifacts/rollback-harness`, then run `rollback-snapshot.mjs`.
This fixture contains diagnostics and must never be deployed or packaged.
The release packager rejects probe exports and stale source hashes.
