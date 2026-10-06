# NEBULA PROTOCOL — ASCENSION v15.1.1 // GALACTIC WAR

V14 is a tactical command-matrix evolution layered on the existing v8/v9/v11/v12/v13 systems. It keeps the original single game loop and legacy gameplay systems while replacing the cluttered combat presentation with a structured combat HUD.

## V14 additions
- Structured MOVE / ATTACK CONTROL / TACTICAL SYSTEMS / POWER BANK controls.
- Always-visible HULL, SHIELD and ENERGY health telemetry during combat.
- Clear weapon, heat, combo and target readouts.
- Boss health integrated into the central mission display.
- Mobile-safe-area responsive layouts for narrow phones and tablets.
- Desktop button controls alongside keyboard/mouse controls.
- Procedural Web Audio combat cues for weapon cycling, missiles, dash, abilities, special attacks, pickups, damage, critical health and boss defeat.
- SFX toggle in the tactical systems panel.
- Fixed v13 ship-power runtime bug caused by a stale undefined cost reference.
- Fixed VORTEX projectile null assignment edge case.

## Controls
Desktop: WASD / arrows to move, LMB or Space to fire, RMB for missiles, Q for weapon cycle, T or middle mouse for lock, 1–4 for powers, Shift for dash, C for ability, E for special, R for recharge, F for auto fire, P/Esc for pause.

Mobile/tablet: use the MOVE joystick; ATTACK CONTROL contains FIRE, WEAPON, MISSILE and PREV; TACTICAL SYSTEMS contains LOCK, DASH, ABILITY, SPECIAL, SHIP POWER, RECHARGE, AUTO and SFX; the POWER BANK exposes P1–P4.

## Architecture
Existing v8/v9 systems remain loaded first. V14 is appended last and uses the same N8 hook/post/draw extension points. No backend, API key or external engine is required.

## Deployment
Open `index.html` on GitHub Pages or any static web server. The only external dependency is the optional Google Fonts stylesheet.

## v15 — GOD MODE / COMMAND MATRIX
Added: `v15-core.js` (combat core), `v15-fx.js` (effects), `v15-ui.js` (HUD strip, Command Center, mixer, God Mode panel), `v15.css`.
Controls: WASD move · mouse aim · LMB primary · RMB secondary · Space dash · E special · Q weapon · R recharge · F ultimate · Esc pause · V auto-fire.
Open COMMAND CENTER from the main menu or pause screen (Controls / Audio / God Mode). God Mode is OFF by default and pauses progress saving while active.
Run: serve the folder (e.g. `python3 -m http.server 8000`) and open http://localhost:8000, or open index.html directly.


## v15.1.1 Stability Release
- Deterministic boot validation
- Single release build cache key: `15.1.1.20261001`
- Version integrity checks
- Required-module validation
- Asset failure reporting
- Preserved local progression

**Current build:** v15.1.1 / 15.1.1.20261001
