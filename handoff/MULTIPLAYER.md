# TH075 multiplayer contract

Persistent source branch: `eagler-mp`. Ordinary development remains on `eagler`.
Initial topic base: `66405ae` (the Safari shared-effect stack fix).
Launcher topic base: `8e08ef2`. Common library pin remains the exact revision in
`dependencies.json`; never silently build against a sibling checkout's HEAD.

## Ownership and rules

The Launcher catalog declares TH075MP, its dedicated Runtime, two seats,
11 characters, 9 first/second spell combinations per character, four
 difficulties and measured pure-delay timing (manual D=0..9, automatic choice).
The native Runtime owns input capture, the measured-start barrier, exact
confirmed input and deterministic world advancement. It reuses the pinned
common codec, channel, browser peer transport and calibration presentation.
This is Caster-style deterministic delay, not rollback or Caster protocol
interoperability. See the original author's technical explanation:
https://web.archive.org/web/20180429085318/http://mizuumi.net/2010/11/08/caster-how-its-done/

Each seat uses its local P1 keyboard/touch/gamepad controls. Inputs are sampled
once for logical N+D, applied to the assigned native fighter, and retained for
repair. Native `VersusCpu` mode means the original two-human duel. The shared
seed, characters, spell choices, difficulty, fixed shrine stage, build
identity and DATA resource identities are agreed before frame zero; local profiles do not choose the world.
Camera and fade mutation occur in the original render callback, so waiting for
a missing peer input must not rerun it. No prediction or undo is performed.
Every 60 network frames the peers compare a bounded explicit world observation;
this detects divergence, but is not a claim that every latent native field is
included in the diagnostic digest.

Pause and restart use the same confirmed input stream. Restart saves the prior
native `.rep` and deterministically rebuilds the world. Battle exit saves before
native menus can replace the recording, drains the shared retirement fence,
then returns through the shared Runtime exit event. A peer close after the local
terminal frame is confirmed and acknowledged must not turn the already completed
battle into a connection-ended hang. Expected disconnection
freezes the last world and uses the shared connection-ended UI.

The admitted spectator replays confirmed frames from zero and never sends
player inputs. The optional upload lane cannot block the players. Spectator
backlogs and native receive queues are bounded; falling behind fails explicitly.
Timing metadata uses EPTM/1 and inputs use EPNP/4, with game marker 0x50.

MP saves and ordinary saves are isolated (`/savesth075mp` versus `/savesth075`).
Both use the original native `.rep` format with two input streams. No EAGX sidecar
is needed. Replay playback itself does not use a network transport.

## Build and verification

Restore private inputs and Emscripten as described in EAGLER.md. Materialize the
exact common pin under `third_party/eagler-common` or set `EAGLER_COMMON_ROOT`.
`npm run build` and `npm run package:runtime` on this branch produce only the
multiplayer variant. Generated Runtime files and original DATA stay untracked.

`npm run test:multiplayer` requires `EAGLER_WASI_CXX` pointing to WASI clang++
and the packaged Runtime. It checks loss/reorder/duplicate repair, once-only
capture, manual and measured delay, explicit desync, and browser option bounds.
Real browser acceptance additionally needs the private ordinary TH075 DATA,
the current Launcher and its real shared relay. A handshake alone is not proof
of matching gameplay, spectator or Replay behavior. Keep cross-device/iPad,
end-of-match retirement, Replay playback and deployment results explicit when
those checks have not been run.

The repeatable browser fixture is `th075_web/tests/multiplayer/browser-host.mjs`.
Start it with `EAGLER_TH075_DATA` pointing at private `th075.data` and run the
current Launcher relay on port 18376. Then run
`node th075_web/tests/multiplayer/browser-match.mjs` (RTC) and again with
`--relay` (RTC deliberately unavailable). `--finish-only` bounds the run to
400 frames and the normal native pause-menu exit. `--disconnect` tests a shared
peer-disconnected control notification and asserts that the remaining world
freezes without resetting. Set `EAGLER_LAUNCHER_ROOT`
when the companion Launcher is not the sibling checkout. Test URL, relay and
port overrides are `EAGLER_TH075_MP_TEST_URL`, `EAGLER_TH075_MP_TEST_RELAY`,
`EAGLER_TH075_MP_TEST_PORT`; defaults are HTTP 18375 and WS 18376.
Reports, screenshots and private replay outputs stay under ignored
`th075_web/artifacts/multiplayer-browser/`. This Runtime fixture complements,
but does not replace, testing the real Launcher product card and room.

Keep the corresponding Launcher work on its independent `eagler-th075-mp`
branch as well. Set `EAGLER_LAUNCHER_ROOT` to that checkout for local development;
no main-site deployment or ordinary-game branch merge is implied.

After a full browser-match run, `node th075_web/tests/multiplayer/replay-gate.mjs`
reopens its first native replay without a network session and compares recorded
fighter position, health and action at identical simulation frames. Native
`.rep` stores random draws, not the live generator state, so that state word is
not a playback equality requirement. `--spectator-failure` on browser-match
closes only the viewer stream, requires an explicit viewer error, and proves
that both player worlds keep advancing.

Recorded results, immutable source bases and remaining limits are in
[MULTIPLAYER-ACCEPTANCE.md](MULTIPLAYER-ACCEPTANCE.md).
