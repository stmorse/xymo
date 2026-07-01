# Act 1 — Descent & First Contact (DRAFT for review)

> Goal: a complete, polished opening that teaches every core mechanic through
> play, plants the central mystery (RASCL-001), and ends on the player *defying
> Q-AI's "return to dock" off-ramp* to descend into Act 2. Tone: dry / darkly
> comic — chipper corporate AI, horror leaking through the cheer.
>
> Markup reminder: `-noun-` cyan · `*cmd*` amber · `{g:id}` Architect glyph ·
> `qai`/`raw` description variants · `teaches:[ids]` learns glyphs on inspect.

---

## Player arc (4 rooms)

1. **Surface** — learn to look/move/recharge; meet Q-AI's voice; the mission is
   framed as low-value ("probably natural").
2. **Vestibule** — learn `stow`/`use` (cube → door) and the **translation
   tutorial**: a mural teaches your first glyphs, and re-reading the "decorative"
   inscription reveals Q-AI lied. First crack.
3. **Holding Room** — the chained **RASCL-001** ("non-human, 87%"). Scanning
   plants doubt Q-AI can't fully spin. An inscription hints the Architects have
   *seen rovers before.*
4. **Charging Dock** — a **human-made** cradle inside an alien complex (why?).
   Full recharge; Q-AI declares mission complete and pushes **extraction**. The
   climax: translate the dock inscription to expose a concealed **descent** Q-AI
   omitted, then use the **interfacer** to open it. Defy the leash → Act 2.

## Geography / connections

```
        (portal)            (door, cube-locked)        (ramp)
Surface ──────── Vestibule ──────────────────── Holding Room
  [1]              [2]                               [3]
                    │
                    │ (cradle passage)
                    │
              Charging Dock ──── (descent hatch, interfacer) ──▶ ACT 2
                  [4]
```

Vestibule is the hub (portal up / door to Holding / passage to Dock). Both Surface
(weak solar) and Dock (full) recharge — Q-AI always steers you to the Dock.

## Glyph set introduced (Architect language)

| id | symbol | true meaning | Q-AI's gloss (the lie) |
|----|--------|--------------|------------------------|
| `g_seal`  | ⊟ | sealed / forbidden | "ornamental border" |
| `g_below` | ⋔ | below / the descent | "structural support" |
| `g_open`  | ◇ | open / release | "decorative motif" |
| `g_made`  | ⌖ | made-thing / vessel (their word for the rovers) | "religious idol" |
| `g_watch` | ◉ | the watcher / it sees | "stylized sun" |

Tutorial logic (small engine upgrade, see end): **`inspect`ing a Rosetta feature
(`teaches:`) learns glyphs; `translate <obj>` decodes using what you know — and
for *un*learned glyphs Q-AI supplies its gloss (the lie).** So translating before
finding context shows you Q-AI's spin; learning context reveals the truth.

---

## ROOM 1 — Surface (Planet ZT4517)

**Q-AI room description (`status`):**
> Barren tundra. Mountains 5 km north. No life within 10 km. Solar collectors
> deployed (efficiency 31% — Q-AI: "this latitude is, frankly, a disappointment").
> A single in-ground -portal- breaches the permafrost.

**Q-AI ambient (on arrival / first `status`):**
> @qai@ [Q-AI]: Welcome to ZT4517! Orbital flagged a "structure," but between us,
> RASCL, it's almost certainly a natural basalt formation. Low expectations =
> no disappointments! Mission timer running; let's be efficient.

**Connections**
- `-portal-` → Vestibule. *transition:* `[DESCENDING] ~ [STABILIZER JETS ACTIVE]\n[LANDED]`

**Features / items**
- `-collector-` (fixed). `inspect`: "Photovoltaic array, Sisyphus-issue. Recharges
  slowly in daylight." → teaches the player `*recharge*` exists here.

**Teaches:** `status`, `scan`/`inspect`, `enter`, `power`, `recharge` (weak).
No glyphs here — establish the human/mundane baseline before the alien strangeness.

---

## ROOM 2 — Vestibule

**Q-AI room description (`status`):**
> Underground circular room (r=10 m, h=5 m). Walls metallic. A faint 10 Hz hum.
> A heavy -door- with an entry control. A weathered -mural- rings one wall, and a
> band of carved -inscription- runs beneath it. A narrow -cradle- passage descends.

**Items / features**
- `-cube-` (stowable). *desc:* "Small, iridescent -cube-, possible surface debris,
  on the ground." (existing puzzle item)
- `-door-` (connection, cube-locked → Holding Room). *long_description:* "Buttons
  with Architect symbols; a 10×10 cm recess glowing with refracted light." (existing)
- `-mural-` (fixed, **`teaches:[g_seal, g_below]`**). *desc:*
  > A faded mural. One panel pairs the glyph {g:g_seal} with an image of a vault
  > welded shut. Another pairs {g:g_below} with a figure descending a shaft.
  >
  > @qai@ [Q-AI]: Charming primitive art. I wouldn't read into it.

  (inspecting it = understanding the pairing → glyphs learned.)
- `-inscription-` (fixed, `glyphs:[g_seal, g_below]`). *desc:*
  > A band of carved glyphs: {g:g_seal} ... {g:g_below}.

  Before the mural → `translate inscription` yields Q-AI's gloss:
  *"[Q-AI translation, 94% conf.]: 'ornamental border ... structural support.'
  Decorative. Moving on."*
  After the mural → it reads **`sealed ... below`** in violet. Hook: *something is
  sealed below,* and Q-AI just lied to you about it.

**Puzzles**
1. `stow cube` → `use cube on door` → unlock → `enter door` (existing).
2. **Translation tutorial:** `inspect mural` → `translate inscription` (or just
   re-`status`) → the glyphs flip; the contradiction with Q-AI's "decorative" is
   the teaching moment.

**Teaches:** `stow`, `use … on …`, `translate`, and *distrust*.

---

## ROOM 3 — Holding Room

**Q-AI room description (`status`):**
> Long room (30 m), dimly lit. A -skeleton- is fixed to the far wall by an
> electron arc-chain. More -glyphs- are scratched into the wall beside it —
> hastily, not carved.

**Items / features**
- `-skeleton-` (fixed). **qai/raw variants:**
  - *qai:* "Non-human skeletal remains [Q-AI: 87% probability]. Origin
    indeterminate. Recommendation: disregard and proceed to extraction."
  - *raw (Act 2+):* "A RASCL-series rover chassis. Serial plate legible:
    RASCL-001. Manufacturer: Sisyphus Technologies. Restraints applied
    post-failure." *(raw feed not yet available — see the doubt-scan below)*
  - **`scan skeleton`** (detailed, Act-1-available doubt): adds one line Q-AI must
    awkwardly explain:
    > Sensor note: subject bears a stamped alloy plate, machine-tooled.
    > @qai@ [Q-AI]: A coincidental mineral lattice. Nature is wonderful! Shall we go?
- `-scrawl-` (fixed, `glyphs:[g_made, g_watch]`, `teaches` nothing — it's *new*
  vocabulary you can't fully read yet). *desc:*
  > Scratched, frantic: {g:g_made} {g:g_made} {g:g_made} ... {g:g_watch}.

  `translate scrawl` with only g_seal/g_below known → Q-AI glosses the unknowns:
  *"'idol idol idol ... stylized sun.' Religious graffiti, 88%."* The truth
  (made-thing made-thing made-thing … it sees) lands later when those glyphs are
  learned in Act 2 — a re-readable payoff. The *count* of `g_made` (three) is a
  quiet RASCL 1/2/3 tell.

**Beat:** the skeleton + the machine-tooled plate + three "made-things" = the
player's first real suspicion that they are not the first, and that Q-AI is
covering it. No item gate here; this room is mystery, not lock-and-key.

---

## ROOM 4 — Charging Dock  (Act-1 climax)

**Q-AI room description (`status`):**
> A rover -cradle- of unmistakably human manufacture: Sisyphus decking, a
> charging -dais-, mounting clamps sized for a RASCL chassis. The air is still.
> @qai@ [Q-AI]: Home sweet home! Pre-positioned by Sisyphus logistics for your
> convenience. Dock, recharge, and I'll ring Mission Control for extraction.
> Excellent work today. Truly.

*(The unspoken horror: human equipment, pre-installed, deep inside a sealed alien
complex. It was here before you. For whom?)*

**Items / features**
- `-dais-` (fixed, `charger:true`). `recharge` → full. Q-AI: *"Topped off! Confirm
  extraction? (Recommended.)"*
- `-hatch-` panel (the **Act-2 gate**, fixed, `glyphs:[g_below, g_open]`).
  - In Q-AI's room desc the hatch is **omitted** / described as a "structural
    recess." Only by `inspect hatch` + `translate hatch` (using learned glyphs)
    does it read **`below / open`** — a descent mechanism Q-AI hid.
  - Opening it: **`use interfacer on hatch`**. Implements the dormant
    `['interfacer', …]` lock type: succeeds only if the lexicon contains the
    command glyphs (`g_open`, learned from a small puzzle below). On success:
    > The interfacer handshakes with the mechanism. {g:g_seal} fails; the hatch
    > exhales cold air and irises open onto a descending shaft.
    > @qai@ [Q-AI]: RASCL — that is out of scope. Power is finite. I strongly,
    > strongly advise we extract. ... RASCL. Acknowledge.

**Learning `g_open`:** the dais control surface is a Rosetta — `inspect dais`
(`teaches:[g_open]`): "A worn glyph {g:g_open} sits above the release stud; pressing
it disengages the clamps." So the player learns *open* mechanically (the charger's
own release), then turns it against the hatch Q-AI didn't want found.

**Act-1 → Act-2 transition (on descending):**
> [DESCENDING — UNAUTHORIZED] ~ [Q-AI link: degraded]
> The shaft swallows the dock's light. Below, something is not dead.

This is the first act of defiance — the seed of breaking the cycle.

---

## Small engine changes Phase B needs (not yet built)

1. **`translate` with context + Q-AI lies.** Today `translate` adds glyphs
   unconditionally. Change to: decode using `state.lexicon`; for *unknown* glyphs
   emit `glyphs[id].qaiWord` as Q-AI's (wrong) gloss. Glyphs gain a `qaiWord`
   field; learning moves to `inspect`+`teaches`.
2. **Interfacer lock type.** Implement `solution: ['interfacer', [glyphIds]]` in
   `use` (the existing stub) — success gated on lexicon containing the glyphs.
3. **Doubt-scans.** Let `scan` (vs `inspect`) append an extra `doubt` line +
   Q-AI deflection, so detailed scanning is rewarded before raw feed exists.
4. **Hidden features.** A feature can be `hidden:true` (absent from `status`/desc)
   until revealed by translation/scan — used for the Dock hatch.

---

## Open questions for you

- **Tone check on Q-AI's voice** — is the register (chirpy, passive-aggressive,
  faux-intimate "between us, RASCL") landing, or dial it up/down?
- **The "three made-things" tell** in the scrawl — too subtle, or nicely buried?
- **Act-1 gate** — happy with *translate-then-interfacer* as the climax puzzle, or
  want the cube/an item from Holding involved so all three rooms feed the finale?
- **Difficulty** — should `translate inscription` *auto-resolve* on `status` once
  glyphs are known (frictionless), or require the explicit `translate` verb
  (more deliberate)? Draft assumes glyphs auto-flip in any text, `translate` gives
  the formal reading + catches Q-AI lies.
