# Casino Calculator Roadmap

This roadmap keeps momentum: ship the web build first, learn from real players,
then port only after the game has proof behind it.

## Release Strategy

1. Web first: GitHub Pages plus itch.io. Keep load time tiny, let anyone play in a tab, and use the web version as the public demo forever.
2. PC second: package for Steam once the loop has retention. Prefer a Godot rebuild if non-programmers need to edit scenes, assets, and tuning. Consider a Tauri/Electron wrapper only if the web code is already proven and the PC release does not need deep engine features.
3. Mobile third: rebuild or port after PC controls and pacing are settled. Mobile needs shorter sessions, touch-first UI, safe-area layout, and store compliance review.

## Phase 0: Ship The Current Web Game

Goal: public playable release with no backend dependency.

- Merge the PR to `main` and enable GitHub Pages with GitHub Actions as the source.
- Run `npm run package:itch` and upload `casino-calculator-web.zip` to itch.io as an HTML game.
- Replace the footer tip link with the real Ko-fi, Buy Me a Coffee, or project page.
- Keep the disclaimer visible: fictional chips only, no cashout, no real gambling.

## Phase 1: Validate

Goal: learn whether strangers start runs, finish runs, and come back.

- Enable the optional Cloudflare backend in `server/leaderboard`.
- Build with `VITE_LEADERBOARD_URL` for global scores.
- Build with `VITE_ANALYTICS_URL` for coarse events only: boot, run_start, ante_cleared, victory, death, fake_donation.
- Watch these numbers: play starts, ante reached, death reason, victory rate, overtime starts, return visits, leaderboard submissions.
- Post the game to itch.io communities, web game subreddits, relevant Discords, and small streamers.

## Phase 2: Make The Web Code Team-Editable

Goal: let programmers and designers change content without spelunking through game logic.

- Move perks, items, twists, quotas, boot lines, and shop data into JSON files.
- Add schema validation for content files.
- Add a headless simulator test suite for run balance, impossible states, and score ceilings.
- Migrate modules to TypeScript once the content boundaries are stable.
- Split screen drawing into reusable views: title, run HUD, shop, calculator, leaderboard, settings.
- Add a small tuning guide for designers.

## Phase 3: Anti-Cheat And Live Ops

Goal: make global competition credible enough to promote.

- Add seeded run generation.
- Submit seed plus decision log with each score.
- Replay runs server-side before accepting scores.
- Add daily seed mode, weekly boards, and archived seasons.
- Add moderation tools for deleting impossible or offensive entries.

## Phase 4: PC Build

Goal: turn a validated web hit into a maintainable commercial build.

- Decide engine with evidence:
  - Godot 4 if artists/designers need visual editing, asset import, animation timelines, Steam/mobile paths, and a long-lived team workflow.
  - Web wrapper if the team is mostly programmers and the commercial build can remain close to the browser game.
- Preserve the web version as the demo and viral funnel.
- Build Steam features only after the core port works: achievements, cloud saves, rich presence, controller polish.
- Price low at launch unless the scope grows substantially.

## Phase 5: Mobile

Goal: adapt, not merely shrink.

- Redesign inputs around touch: large wager pad, swipe-free critical actions, accessible pause.
- Shorten default run pacing or add daily bite-size mode.
- Tune battery/performance for mid-range Android.
- Review store policy language carefully because the theme parodies gambling.

## Current Recommendation

Do not port yet. Ship web, measure, harden the content pipeline, then choose
Godot when real collaboration pressure appears. A port is worth it when the game
has traction and a human team needs an editor, not before.
