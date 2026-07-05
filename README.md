# Casino Calculator

A calculator that gambles, rebuilt as a 3D arcade cabinet in an after-hours office.

Casino Calculator is a fake-money arcade roguelike: wager fictional chips, read the CRT, and call whether each equation is TRUE or a BLUFF before the timer runs out. The run structure leans into Balatro-style buildcraft and Buckshot Roulette-style tension: shell magazines, audit debts, LCD damage, perks, consumable tools, escalating boss twists, and a risky let-it-ride coin flip.

## Features

- 3D Three.js office scene with a standing calculator arcade cabinet.
- Pixel CRT game UI rendered to an offscreen canvas and mapped onto the cabinet screen.
- Physical 3D calculator keyboard plus full keyboard controls.
- Roguelike runs with antes, debts, magazines, combo multipliers, shops, perks, items, and overtime.
- Local leaderboard with arcade initials.
- Settings for volume, CRT effects, flicker, camera sway, and 3D/2D rendering.
- Synthesized chiptune soundtrack and sound effects with no audio asset downloads.
- Fake donation machine and clear disclaimers: no real gambling, no cashout, fake in-game chips only.
- Optional real tip link in the footer, separate from the fake in-game donation gag.
- LocalStorage persistence for settings, leaderboard, fake donations, and in-progress runs.

## Play Locally

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`.

## Build

```sh
npm run build
npm run preview
```

The Vite build uses a relative base path, so the static output works on project-style hosts such as GitHub Pages.

## Docker

```sh
docker build -t casino-calculator .
docker run --rm -p 8080:80 casino-calculator
```

Open `http://127.0.0.1:8080/`.

## Controls

- `Enter` / `=`: select, deal, continue, pay audit.
- Digits: type a wager.
- `+` or `T`: call TRUE.
- `-` or `B`: call BLUFF.
- `%`: wager half.
- `x` / `*`: all in, or let it ride after a win.
- `/`: cash out early when eligible, or reroll the shop.
- `1`-`4`: use item slots during a shell.
- `C` / `Esc`: back, clear, or pause depending on context.

## Disclaimer

Casino Calculator is a parody video game. It uses fictional chips only. It is not real gambling, does not accept in-game payments, and offers no cashout, prize, refund, or financial value. The in-game donation machine is fake.
