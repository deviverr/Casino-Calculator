# Casino Calculator 🎰

Basically . . [ Casino ] Calculator game.

A calculator that gambles. The house flashes an equation — is it **TRUE** or a **BLUFF**?
Bet your chips, beat the clock, ride the streak.

## Play

Open `index.html` in a browser. No build, no dependencies — plain HTML/CSS/JS.

```sh
python3 -m http.server   # optional: serve it, then visit http://localhost:8000
```

## How to play

1. **Bet** chips (minimum 10) and press **DEAL**.
2. An equation flashes on the LCD — e.g. `47 × 18 = 846`. Call **✓ TRUE** or **✗ BLUFF**
   before the timer runs out. Bluffs are subtle: off by a few, or two digits swapped.
3. Wins pay by difficulty tier — streaks raise the tier: bigger math, less time, better odds.

| Streak | Math                  | Pays |
| ------ | --------------------- | ---- |
| 0–2    | 2-digit + / −         | 1:1  |
| 3–5    | small × or 3-digit +  | 3:2  |
| 6–9    | 2-digit × 2-digit     | 2:1  |
| 10+    | mixed × with + / −    | 3:1  |

4. Every win offers **DOUBLE OR NOTHING** — a coin flip. Let it ride as long as your nerve holds.
5. Bust out and the house comps you 100 chips. The house is generous. The house also always wins.

The **CALC** tab is a fully working calculator, for counting your losses.

Chips, best streak, and sound setting persist in `localStorage`. Reset from the footer.

**Keyboard:** `Enter` deal / collect · `T` true · `B` bluff · `D` double.
Calc mode takes digits and operators directly.
