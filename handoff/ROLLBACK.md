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

Repeat the last known held direction and ABCD state throughout the negotiated
window, as in Giuroll EnemyInputHolder. Menu/restart commands remain unpredicted. A missing input older than P stalls the world.
Snapshots include both complete typed characters, all four object layers per
side (including derived timers), both shared-effect layers, contacts, rules,
AI, RNG, input counters, camera, controls, session/progress, render-owned HUD /
overlay / stage state and recording cursors/append lengths. Resource pointers
refer only to retained immutable assets; fighter addresses stay stable.

Replay queues truncate on restoration rather than copying the entire recording.
Transport, captured physical input and ACK history never rewind. Correction
restores before the first wrong frame and resimulates the captured logical
inputs, with GPU submissions and real-time audio pumping suppressed. Predicted audio is
played immediately; corrected intervals match already played events, suppress
duplicates and stop obsolete voices. Audio output history never rewinds. Hashes and spectator packets publish only
from reconciled contiguous confirmed history. Normal waiting does not rerun
camera/render state. Intro, round knockout and round recovery are checkpointed and speculative.
Pause, restart, victory dialogue/resource changes and final save are
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

## Rollback pacing correction (2026-10-16)

Experiment base / canonical MP base: `d32fabc`; same isolated experiment worktree
and exact common pin as above. No gameplay rules or ordinary branch changes.

The first release's passing correctness gates did not establish smooth play.
It fenced **every** intro/knockout/recovery frame, cleared predicted ABCD and
cleared directions after two frames. Its D0 channel also retained delay-mode
positive-wait pacing. These policies were incompatible with the intended
Giuroll-style held-input prediction even though native rollback existed.

Fixes: predict all held gameplay buttons throughout P; speculate all rewindable
battle phases; retain a confirmed fence before victory texture/menu lifecycle;
disable Adonis positive-wait pacing in direct rollback; reconcile immediate
predicted audio using an output journal outside snapshots.

Same desktop Chromium/D3D11, two real RTC runtimes, injected 80 ms on each input
receive lane, sustained direction and rotating held ABCD, 20 measured seconds:

| Metric | Previous release | Corrected release |
| --- | --- | --- |
| Frames after 20 s | 176 / 176, still in intro | 1203 / 1202 |
| Active simulation | Not reached | 60.0 / 60.0 fps |
| Longest observed frame gap | 184 / 200 ms | 17.2 / 17.8 ms |
| Peak speculative history | 0 / 0 | 7 / 5 frames |
| Corrections / resimulated frames | 0 / 0 | 27/184 and 27/131 |
| Common confirmed checkpoints | 3 | 20, identical |

Release Wasm: `303976836f999138cdc5fdac762bfcff59f4fb4f4971b5a836cd15105c5c854c`.
CPU time per native tick p95 was 0.5 ms on this desktop. This is not a mobile
hardware claim. A software-rendered attempt reached about 45.6 fps and failed
the 55 fps performance gate; it was not relabeled as a pass.

Regression gates: all 11 characters x Active/Intro/RoundKnockout/RoundRecovery
(44 restore/divergent-branch/Replay checks); 1000 confirmed protocol frames;
held ABCD/directions across 80 ms (438 predicted decisions, up to 7 pending,
no delay pacing); predicted sound matching/cancellation; full RTC loss/jitter
match (31 shared spectator checkpoints, restart/pause/exit, identical native
Replays, prompt and IDBFS); WebSocket rollback and pure-delay; offline playback
matching 11 confirmed combat samples. Existing browser menu tests now hold an
input until the expected state acknowledges it instead of assuming a 120 ms
pulse spans enough logical frames under injected delay.

Evidence: workspace `_scratch/th075-rollback-20261016/perf-baseline-hardware/`,
`perf-final/`, `fix-protocol.log`, `fix-snapshot.log`, `fix-rtc-final.log`,
`fix-relay.log`, `fix-pure.log`, `fix-replay.log`. Physical iPad performance
remains unmeasured. Promotion uses a reviewed commit and exact tested native
release files, verified against canonical source/header hashes before packaging.

Run `rollback-performance.mjs --accept` with `EAGLER_TH075_PERF_GPU=hardware`
on Windows hardware rendering, or without `--accept` to record a software-GPU
baseline. Use `EAGLER_TH075_PERF_OUTPUT` for separate reports. The fixed default
fault is 80 ms each input lane; `EAGLER_TH075_PERF_LATENCY` overrides it.


## Mobile-link responsiveness investigation (2026-10-16, in progress)

Base: c781ea6, experiment/th075-rollback; canonical eagler-mp remains unchanged.
Reported topology: one phone on cellular data, one computer on wired Internet,
approximately 100 ms displayed latency. No physical-device result is claimed.

Reviewed RollCaster 05de055abc0865e353d04e7ae536ac441294ff60:
- src/mainDat_mainStep.cpp::calcRewind splits local delay and rewind allowance;
  capture/send of fresh input is guarded against resampling stored frames;
- src/state_dll/dll.cpp::update_passthrough disables rendering during rewind,
  retains combo/shadow progression, and accounts for reconciliation time;
- giuroll's input head and simulation head have separate ownership; its clock
  adjustment is not equivalent to merely forcing delay=0.

Candidate fixes:
- retain bounded scheduler debt on peer waits and browser budget yields;
- connect the pinned shared SessionPacing recommendation (at most +/-2%);
- send fresh captured input before historical reconciliation;
- yield historical replay between ticks after 4 ms, retaining its target;
- suppress vertex/projection construction while retaining render-owned state;
- retain an ABCD press/release occurring entirely during a peer wait until the
  next physical capture; edge retention is outside snapshots, never resampled.

Evidence in workspace _scratch/th075-rollback-20261016/:
- scheduler-snapshot.log: 44 character/phase checks, including normal drawing
  versus suppressed drawing; exact gameplay traces and Replay streams;
- scheduler-rtc.log: pre-input-latch/pre-replay-budget candidate full RTC match,
  30/31 spectator checkpoints, identical native Replay, finish/prompt/IDBFS;
- mobile100-{baseline,candidate}: one endpoint 4x browser CPU throttle,
  20..80 ms injected receive delay with loss/reordering and recurring 260 ms
  receive delays. Candidate ~57.3..57.5 fps versus baseline ~55.1 fps, BUT
  candidate max gap ~250 ms versus ~184 ms. This is NOT smoothness acceptance.
- mobile100-noburst-{baseline,candidate}: both about 60 fps; neither reproduced
  the reported sustained cellular stutter. Synthetic hosted-input-to-native
  controls timing does not measure display or input-to-photon latency.

CPU throttle is not a phone measurement. The 8-frame horizon still cannot
cover arbitrary mobile-network blackouts. Earlier long-held-input 60fps gates
are insufficient to establish good competitive control feel. Do not deploy
this candidate or mark the user's issue resolved using these results alone.


Additional candidate work and evidence:
- MP PCM refill is capped at two 1024-frame blocks per browser callback; the
  app's per-forward-tick pump is bypassed during MP and the outer browser pump
  owns output. Ordinary builds retain six blocks. Queue thresholds, PCM values,
  music ownership and sample rate are unchanged.
- scheduler-final-rtc.log: input-latch + 4ms replay-yield candidate (before audio
  batching) completed RTC, spectators, native Replay, save prompt and IDBFS.
- scheduler-final-snapshot.log: 44 draw/suppressed-draw restore/Replay checks.
- mobile100-audio-cpu12-queue: 12x CPU throttle on one endpoint, 20..80ms
  injected receive jitter and loss, 20 seconds: both ~60fps; constrained endpoint
  synthetic input-to-controls p95 16ms / max44ms, versus baseline 23.8/63.4ms.
  Constrained endpoint max forward gap 56.8ms versus baseline331.4ms (whole-run
  values include startup; do not call them presented-frame metrics). Audio queue
  sampled minimum1056frames, no sampled empty queue. Active CPU p95 increased
  10.9->13.1ms in these separate runs; do not report a universal CPU speedup.
- The first combined audio/short-tap run failed a post-callback state observer:
  catch-up can consume a tap and its release in one callback. This observer
  cannot prove per-logical-frame capture, and that failed attempt remains
  unaccepted. The diagnostic wiring gate samples the actual keyboard/touch
  bridge directly; protocol tests separately verify capture-once ownership.

No physical cellular-link acceptance, production release or canonical promotion
has been performed for this candidate. Fixed 8-frame reach, startup stalls and
actual input-to-presentation responsiveness remain separate acceptance items.


Final diagnostic candidate verification:
- mobile100-final-wiring: 20 seconds at 50ms mean injected receive delay each
  way, 20..80ms jitter/loss, one endpoint throttled12x. Both ~60Hz; active
  maximum forward-progress gaps33.9/47.8ms; constrained endpoint synthetic
  input-to-native-controls p95 10.6ms / max34.6ms. No missed driver transitions.
  All21 shared confirmed checkpoints matched. Audio queue minimum2387frames
  on both endpoints, zero sampled empty queues. These are browser diagnostics,
  not sound-output quality or phone/input-to-photon acceptance.
- Recomputed baseline active gaps from mobile100-cpu12-baseline samples:
  17.2/64.0ms. Whole-run baseline331.4ms includes opening and must NOT be
  compared with candidate active47.8ms as if they measured the same interval.
- Real keyboard and touch exports, down+up inside one synchronous task during
  a receive blackout: diagnostic physical samples [16,0] on both endpoints.
  Corrected test uses the physical bridge; a multi-tick callback may legitimately
  show only the final release in the public post-callback status.
- scheduler-audio-rtc.log: final full RTC/confirmed spectator match;31 shared
  checkpoints per viewer, pause/restart/end, identical native Replays2084/1664
  bytes, save prompt/download and fresh-runtime IDBFS all passed.
- scheduler-audio-replay.log: offline native playback matches7 recorded states.
- scheduler-audio-pure.log: relay pure-delay404frames,908byte identical Replay,
  spectator finish, save prompt/download and IDBFS passed.
- scheduler-protocol.log: input edge retention, cadence debt, sound journal,
  1000confirmed rollbackframes, capture-once, D0/D2/D9/auto and explicit desync.

Status: diagnostic experiment only. Native/browser correctness passed; repeated
cellular blackout performance and physical phone control feel remain unaccepted.
Production acceptance hashes and canonical MP source have deliberately not been
updated from this diagnostic work. No change to main, beta, test or live relay.


Test release authorization: user requested deployment after the diagnostic report.
The bounded fixes are promoted for test-site evaluation; cellular feel remains
explicitly unaccepted. Production build removes all probe exports.


Formal release / test deployment (2026-10-16):
- Build source3538083 on canonical eagler-mp, Wasm
  bb7a1a17a0dd108896bc9f37b4cc63e4824cde5e2c52780bf89dca8e356c311c.
- Probe exports absent; package/source hashes, canonical protocol gate passed.
- scheduler-release-rtc.log initial page-load timeout preserved; fresh full RTC
  rerun scheduler-release-rtc-retry.log passed31/31 shared checkpoints, native
  Replays2150/1626bytes identical, finish/save/download/IDBFS.
- scheduler-release-relay.log formal relay rollback passed914byte native Replay.
- https://test.touhou.vip/ current release:
  th075-rollback-scheduler-20261016-47f3762090d0
  MP generationeaf395222130764110e0ad7c6c55249ebc8aca7ac725680e36115c7a81e5c9ef.
- Preserved current collaborator frontend and runtime-font-redirect release.
  Both registered worker URLs refreshed with the same new catalog while
  preserving the existing font redirect policy; sync-version.json contents
  unchanged, corrected its pre-existing stale inventory declaration only.
- Baseline generic verifier already failed inventory ordering and expected
  resource-node-only fonts on disk. Bounded publication verifier checked all
  local file hashes,3170declarations,584unchanged external font declarations,
  exact immutable frontend, new complete MP generation and Wasm exports,
  unchanged other Runtime groups, main/beta/content/nginx/relay guards.
  No missing/changed new file is accepted under the external-font exception.
- Evidence and rollback records: workspace
  _scratch/th075-scheduler-deploy-20261016/; server
  /var/lib/eagler-test-sync/th075-scheduler-20261016/.
Physical cellular-link responsiveness remains unaccepted; test deployment
does not establish Giuroll-equivalent feel or immunity to network blackouts.

Post-deployment checks: HTTPS exact-byte identities passed for all23 updated
paths. Actual public Launcher two independent clients imported the retail
package, joined a new room, selected named character/spells, opted into D0/P8,
advanced to306/306frames and both moved/attacked without Runtime errors.
Initial load-event navigation timed out; DOM-ready navigation with the same
explicit Launcher boot gates passed. Evidence: deployment directory
https-identities.json, online-browser.log, launcher-gate.json.
