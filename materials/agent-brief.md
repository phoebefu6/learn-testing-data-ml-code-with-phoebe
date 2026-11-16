# Agent brief - shared by every fan-out page of learn-testing-data-ml-code-with-phoebe

Filled from `~/.claude/skills/course-builder/references/agent-brief.template.md` on 2026-11-16.
Internal build document: never link it from an audience page.

You are writing ONE static HTML session page. No servers, no npm. **If your target file already
exists on disk, do not write it; report that and stop.** Write the file, return its path and one
line of coverage. No HTML in your reply.

## Read first, in this order

1. The template page. Copy its structure, classes, SVG grammar and quiz markup EXACTLY, including
   how many options each question has (FOUR options, "A · ...", "B · ...", "C · ...", "D · ..."):
   `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-testing-data-ml-code-with-phoebe/courses/01-what-test-would-fail.html`
   For rhythm and the bench, also read the bench page
   `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-testing-data-ml-code-with-phoebe/courses/04-the-bug-catcher.html`
2. The source map: every verified fact, its evidence tier, per-session coverage, the seams, the
   Wrenfold pipeline facts and the bench canon. Use ONLY its facts and numbers; never invent a
   statistic; if a fact is missing, teach the uncertainty.
   `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-testing-data-ml-code-with-phoebe/materials/official-course-map.md`
3. The stylesheet `:root` block for the palette tokens (first 30 lines):
   `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-testing-data-ml-code-with-phoebe/assets/style.css`
4. If your page shows Wrenfold's pipeline code (cleaner, bucketing, aggregation, features, fit),
   check every rule against the engine `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-testing-data-ml-code-with-phoebe/materials/tdm_reference.py`
   (functions dist_km, hour_bucket, clean, aggregate, train_feat, serve_feat, fit, run_tests). The
   pytest code on your page is the Python form of those same functions and tests. Never invent a rule
   the engine does not have; you may simplify signatures.

## Page skeleton (keep every component)

toolbar (crumb EXACTLY "learn-testing-data-ml-code-with-phoebe / Session N of 6" with the repo name
linked to ../index.html, #toggle-all, #zoom-toggle) · masthead (eyebrow
"Learn Testing Data &amp; ML Code with Phoebe · Session N of 6", h1 with one `<span class="accent">`,
.sub, .chip-row with the level chip given in your outline, the audience chip "Data, analytics and ML
engineers who write pandas", one more audience chip of your choice, `.chip.time` "45 min", .agenda a1-a4
with flex weights 1/4/5/1) · main.wrap · section#intro (Part 0 "Where we start": kicker, .lede, .legend
pills exactly as in the template, .callout.win "★ What you walk out with tonight.") · 3 Parts, each
`section.section#part-N` with section-kicker (klabel "Part N · covers ...", h2, `.tag.concept "N min
live"`), a `.lede`, ONE figure, `details.card` accordions (summary: `.mode.live` or `.mode.self`, title,
`.mini`, `.caret ▶`), and a `.callout.example` with `span.ex-pill` "Real world" in every Part ·
section#demo-1 Build-along (klabel "Build-along", h2, `.tag.demo "★ 22 min · everyone builds"`, .lede,
ONE figure, `.steps > .step`, each step a `<p>` with any code box BELOW it as `.prompt-box.good` carrying
a `span.label` "★ Step N · ...") · section#exercise Homework (klabel "Homework", h2 "Before session N+1"
(session 6: "After the last session"), `.tag.exercise "30 min"`, ol of 4 items) · section#quiz (klabel
"Check yourself", h2 "Three questions", the passport line, 3 x `.quiz-q data-answer="0-based"` with
`p.qtext`, four `button.qopt`, `p.qwhy`; vary the correct letter across the three; one `p.quiz-score`
after the last) · section#official, klabel "Sources covered", h2 EXACTLY "What this session teaches, and
where it came from", `.covered > .covered-row` (pill solid ✓ / light ◐ + name + note), then the `.mono`
line EXACTLY "Every fact on this page, and its verification tier, is recorded in the course's source
map." · section.cheat#cheatsheet (h3 "Session N cheat sheet <span>· pin this</span>", .grid-2 of six
.cheat-item with b + span) · `.callout.next` with `.nx-pill` "Next session" (session 6: `.nx-pill`
"Where next" pointing at the sibling courses) · footer.pagefoot · scripts (see below).

Head: copy the template's social meta block with this page's own title/description/url
(`https://phoebefu6.github.io/learn-testing-data-ml-code-with-phoebe/courses/<file>`, og-image
`.../assets/og-cover.png`); `<title>Session N · <short title> - learn testing data ml code with phoebe</title>`;
`<link rel="stylesheet" href="../assets/style.css?v=1">`. Nothing else external.

Scripts at the end of body: `<script src="../assets/app.js?v=1"></script>`. ONLY a page that mounts the
bench widget (session 6) also loads, BEFORE app.js, `<script src="../assets/tdm-sample.js?v=1"></script>`
and `<script src="../assets/tdm-live.js?v=1"></script>`.

First `details.card` in the FIRST Part is `open`; no other. Sentence case headings. Warm practitioner
voice, concrete, never dry. Inside prompt-boxes escape `&` `<` `>`. 450 to 650 lines is guidance about
depth, never a target: never collapse whitespace, dissolve a list into a paragraph, or drop a component.

## Hard rules (a violation is rework)

- NEVER an em dash or en dash, anywhere (prose, code, aria-labels, comments). Hyphen only.
- No meta text: never "this course", "in this course", "the course teaches", "banned here". State the
  professional norm directly with its reason. The two exact estate phrases above are the only
  self-references; "session 5" cross-references are fine.
- Attribution "by Phoebe Fu". Never "built with" a tool.
- Every number comes from the map or is labelled constructed. For constructed data print "your
  numbers will differ", never invented outputs as if run.
- Contested or missing evidence: teach the disagreement; never resolve what the literature has not.
- Citations in the exact form of the map's appendix; anything marked R is "reported".
- NEVER "lottery" or "lotteries"; say the mechanism.
- Default to the English word. No Chinese terms are needed on these pages. Station names: quote ids
  (030, 126, 113, 041, 021) or "Pasila railway station"; never type Finnish names with accents.
- NO CROSS MARKS anywhere: never ✗ ✘ ✕ ❌ × (not even as a multiplication sign: write "x" or "times").
  Label states in words ("caught", "pass", "ships", "false alarm"). Ticks ✓ appear only in the covered
  rows as in the template.
- Light surfaces only. Never a dark background on anything you add.
- Titles, widget ids and class names must not collide with siblings. Do not reuse these titles: "The
  green suite lie", "What a test is for", "Generating tests", "Mutation testing", "Flakes and speed",
  "The quality gate", "Data testing and contracts", "Tests as trust", "Why one number lies". Class
  prefix `tdm-` belongs to the bench engine; your figures use the `sNx` prefix below.
- Course-specific: every Part that mentions Wrenfold labels it "Constructed Wrenfold example" (or
  "constructed" in the same sentence) at least once. Wrenfold's trips are REAL HSL Helsinki trips from
  May 2021 (CC BY 4.0); say so where you use them. Never Phoebe's employers, clients or projects. Do
  not invent other company cases; real-world stories come from the map (HSL file doubled rows and the
  3 unknown station ids, Google Play's stale table and the 90% to 60% column from Rules of ML, the ML
  Test Score's 36 teams and its scoring, CheckList's user study and commercial model, dbt's rename of
  tests to data tests).
- Tools are taught at the level the map verified: pytest fixtures/parametrize/yield teardown,
  Hypothesis @given and strategies and shrinking (Self-study), GX Core 1.x `gx.expectations.ExpectX(...)`
  classes and `gx.ExpectationSuite(name=...)` / `suite.add_expectation(...)` (say "GX Core 1.x"; 0.x
  API is different), pandera `pa.DataFrameSchema`, `pa.Column`, `pa.Check.ge`, `pa.Check.isin`,
  `lazy=True`, `DataFrameModel` with `pa.Field`, `import pandera.pandas as pa`; dbt data tests as a
  category with the four generic tests. Do not invent API details beyond these. Running anything locally
  is Self-study: every build-along runs in the page (reading and editing code in prompt boxes, and the
  bench widget where your outline says).
- Seams: link, never reteach (absolute URLs below). Mutation testing = ai-qa 04. CI wiring = dataops b3
  and b1. Monitoring after deploy = ml-production 05 and data-observability. Metrics and validation =
  model-evaluation a1. dbt craft = analytics-engineering a3.

## Figure grammar (hand-drawn, every figure)

Palette, ONLY these hexes (no invented greys): #804F00 (primary, petri amber) · #5A3700 (deep) ·
#94600A (mid) · #E8CC94 (soft) · #FBF3E4 (tint) · #2A1F12 (ink) · #5E5243 (muted) · #D9CDB8 (faint) ·
#ECE3D2 (hairline) · #7DD3C6 (agar teal: a FILL only, never text, never white text on it) · #0B5A50 (teal
ink, text) · #E4F6F2 (teal tint) · #FFFDF9 (paper) · `#FFFFFF` · universal reds `#991B1B` `#FEF2F2`
`#FCA5A5` only for a wrong-way panel, a bug, a shipped bug or a false alarm.

- `<figure class="zoomable">` > `<svg viewBox="0 0 880 H" xmlns="http://www.w3.org/2000/svg" role="img"
  aria-label="the data, not the shape">` > `<defs>` + `<style>` + content, then
  `<figcaption>🔍 Click to zoom - takeaway</figcaption>`. Grow H, never W.
- Prefix unique per figure, used for every class and id: `s{session}{letter}`, e.g. s2a, s2b, s2c, s2d
  for session 2's four figures (filter `s2aSk`, hatch `s2aHc`, arrow `s2aAr`, classes `.s2aH` ...).
- `<defs>` holds three things with the figure prefix P: a wobble filter `id="PSk"`
  (`feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="<int>"` +
  `feDisplacementMap scale="2.4" xChannelSelector="R" yChannelSelector="G"`, `x="-3%" y="-3%"
  width="106%" height="106%"`), a hachure pattern `id="PHc"` (7x7 userSpaceOnUse, rotate(-38), one
  #804F00 line, opacity .5), an open arrowhead `id="PAr"` (path `M1 1 L9 5 L1 9`, fill none, #2A1F12
  stroke 1.6). Omit the hatch or arrow only if unused. ALL shapes sit inside ONE `<g filter="url(#PSk)"
  fill="none" stroke="#2A1F12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`; rects
  carry a tiny rotation (-4 to 4 degrees for hand-placed items, under 1 for panels). Fills: white,
  #FBF3E4, the hachure for "the pile" or "the data", and #7DD3C6 ONLY for the one thing the figure is
  about (text on it is #2A1F12). One doodle anchor per figure, simple strokes, never a mascot. Text
  classes: `.PH` 800 12px #2A1F12 heading · `.PL` 600 11-12px #2A1F12 label · `.PS` 400 11px #5E5243 ·
  `.PB` 800 11px #0B5A50 · `.PV` 800 16-20px #5A3700 value · `.PA` 700 11px #804F00 axis caption ·
  `.PR` 800 11px #991B1B for a bug or a false alarm · `.PN` 400 12px #5E5243 note. Code inside a figure
  uses `font: 700 11px ui-monospace, Menlo, monospace`. Hand-placed items must not overlap as painted
  rects (the gate flags a pile).
- ALL `<text>` outside the filtered group, sans stack, never below 10.5px.
- Fit: max chars ≈ (box width - 20) / 7 at 12px, 6.4px/char at 11px; full-width note under 110 chars;
  40px between neighbouring point labels; bottom note 22px below the last row, H clears it by 8px. No
  line, arrow or curve may cross a label (the scanner flags line-through-text and text-out-of-box); keep
  every label inside its box with 10px padding. When in doubt, shorten.
- Floor: one figure per Part plus one in the build-along (four figures). Draw the MECHANISM (where a
  fixture enters a function and what the assert reads, which rows a check reads and where the threshold
  sits, which input a perturbation changes and which prediction must hold), never a metaphor, never
  decoration. Numbers in figures come from the map's canon or are labelled constructed.

## Voice and honesty

Every Part gets a real-world story from the map. Constructed: Wrenfold, its forecast, its test plan,
the capacity-history rows and the stale snapshot. Nothing on the page claims a measured outcome that was
not measured. Behaviour tests on a demand forecast are OUR adaptation of CheckList (an NLP method): say
so. Cost units are modelled: say so whenever you quote one.

## Bench canon you may quote (printed by the bench widget; quote nothing else from it)

Clean: 13,465 clean trip rows, 1 rejected, median trip 2.0095 km (stored first-week median 1.982), hour
profile distance 0.0415, holdout MAE 1.9113 trips per station-hour. Thresholds normal: median within 15%,
hour profile <= 0.08, MAE <= 2.2, referential <= 0.2% rejected; tight: 1%, 0.02, MAE <= 1.9.
Per bug: see the catch matrix and "What it did" table in the map (e.g. timezone MAE 1.9098, hour
profile 0.2795; duplicated trips 26,930 rows, MAE 3.8226; leakage MAE 1.7409; label shift MAE 0.3277;
serve skew MAE 2.9489; type coercion 62.34% rejected; stale reference 65 rejected, 0.48%).
Ladder: as found 0 caught / 12 ship / 1 unit; + unit tests 7 / 5 / 5; + schema 8 / 4 / 7; + data checks
12 / 0 / 29; + behaviour (all 17) 12 / 0 / 79; only unit tests 7 / 5 / 4 units; cheapest full catch =
u_distance, u_bucket, u_parity, d_reconcile, d_referential, d_split = 12 caught, 0 false alarms, 10
units. Tight with all 17: 12 caught, 3 false alarms (d_dist_drift, d_hour_drift, m_holdout).
Behaviour tests: b_mft catches timezone and serve skew; b_inv catches duplicated trips; b_dir catches
label shift; none catches a bug the cheapest set misses. m_holdout catches join fan-out, duplicated
trips and serve skew, and passes leakage, label shift and type coercion because they LOWER the error.
Test costs (modelled): smoke 1, unit 1 each, schema 2, reconcile 3, unique 3, range 2, referential 3,
each distribution check 5, split 1, MFT 8, INV 20, DIR 12, holdout 10.

## Cross-links (absolute URLs)

- AI QA 01: https://phoebefu6.github.io/learn-ai-qa-with-phoebe/courses/01-the-green-suite-lie.html
- AI QA 02: https://phoebefu6.github.io/learn-ai-qa-with-phoebe/courses/02-what-a-test-is-for.html
- AI QA 04 mutation testing: https://phoebefu6.github.io/learn-ai-qa-with-phoebe/courses/04-mutation-testing.html
- AI QA 05 flakes: https://phoebefu6.github.io/learn-ai-qa-with-phoebe/courses/05-flakes-and-speed.html
- DataOps b3: https://phoebefu6.github.io/learn-dataops-with-phoebe/courses/b3-data-testing-contracts.html
- DataOps b1: https://phoebefu6.github.io/learn-dataops-with-phoebe/courses/b1-foundations-repo.html
- Analytics engineering a3: https://phoebefu6.github.io/learn-analytics-engineering-with-phoebe/courses/a3-tests-as-trust.html
- Model evaluation a1: https://phoebefu6.github.io/learn-model-evaluation-with-phoebe/courses/a1-why-one-number-lies.html
- ML production 05: https://phoebefu6.github.io/learn-ml-production-with-phoebe/courses/05-monitor-what-you-will-act-on.html
- Data observability b5: https://phoebefu6.github.io/learn-data-observability-with-phoebe/courses/b5-distribution-drift.html
- Hub: https://phoebefu6.github.io/learn-with-phoebe/

## Footer chain and session titles

Footer left: "Session N of 6 · learn-testing-data-ml-code-with-phoebe · by Phoebe Fu &nbsp;·&nbsp; 📚 <a href="https://phoebefu6.github.io/learn-with-phoebe/">Learn with Phoebe ↗</a>"
Footer right: "<a href="PREV">← Prev: <short title></a> &nbsp;·&nbsp; <a href="NEXT">Next: <short title> →</a>"
(session 6: "← Prev: Model behaviour tests" and "<a href="../index.html">Course home →</a>").

Files and titles (the h1 may phrase it differently but keeps the substance; card titles are fixed):
1. `01-what-test-would-fail.html` · What test would fail if the code were wrong? (short: "What test would fail?")
2. `02-unit-tests-for-transforms.html` · Unit tests for transforms: pytest, fixtures, small fake data (short: "Unit tests for transforms")
3. `03-data-checks.html` · Data checks: schema, ranges, uniqueness, distributions (short: "Data checks")
4. `04-the-bug-catcher.html` · The bench: bug catcher (short: "The bug catcher")
5. `05-model-behaviour-tests.html` · Model behaviour tests: invariance, directional, minimum functionality (short: "Model behaviour tests")
6. `06-a-test-strategy-that-runs.html` · A test strategy someone keeps running (short: "A test strategy that runs")
