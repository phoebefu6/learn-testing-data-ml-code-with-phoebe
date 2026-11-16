# learn-testing-data-ml-code-with-phoebe - source map

Internal build document. Not linked from any audience page.

Bucket `prog`, difficulty 3, audience builder (data, analytics and ML engineers who write pandas-level
Python and have seen a green CI run ship a wrong number). Single track, 6 sessions, 45 min each, running
case. Built 2026-11-16 by the course lead from the Phoebe-approved skeleton.

Question across the course: for each bug your pipeline could ship, which test would fail, and what does
that test cost to run?

---

## Seams (picked out loud, linked, never retaught)

| Sibling | They own | This course owns |
|---|---|---|
| learn-ai-qa 01-06 | the green-suite lie, what a test is for, test generation, MUTATION TESTING as a technique, flakes, quality gates for general code | only data and ML bug classes. s1 links ai-qa 01 and 02; s4 links ai-qa 04. The bench plants bugs; it never teaches mutation scoring |
| learn-dataops b3 (data testing and contracts), b1 (CI) | wiring tests and contracts into CI | which test catches which bug; s6 links b3 and b1 |
| learn-analytics-engineering a3 | dbt tests inside dbt models | dbt data tests named as one tool for data checks (s3), never taught |
| learn-ml-production 05, learn-data-observability | monitoring after deploy | stops at "before it ships"; s6 links them |
| learn-model-evaluation a1 | metrics, validation design | behaviour tests are not metrics; s5 links it |
| learn-python-data-analysis | Python itself | nothing |

Links (absolute, all verified to exist as local repo files 2026-11-16):
- https://phoebefu6.github.io/learn-ai-qa-with-phoebe/courses/01-the-green-suite-lie.html
- https://phoebefu6.github.io/learn-ai-qa-with-phoebe/courses/02-what-a-test-is-for.html
- https://phoebefu6.github.io/learn-ai-qa-with-phoebe/courses/04-mutation-testing.html
- https://phoebefu6.github.io/learn-ai-qa-with-phoebe/courses/05-flakes-and-speed.html
- https://phoebefu6.github.io/learn-dataops-with-phoebe/courses/b3-data-testing-contracts.html
- https://phoebefu6.github.io/learn-dataops-with-phoebe/courses/b1-foundations-repo.html
- https://phoebefu6.github.io/learn-analytics-engineering-with-phoebe/courses/a3-tests-as-trust.html
- https://phoebefu6.github.io/learn-model-evaluation-with-phoebe/courses/a1-why-one-number-lies.html
- https://phoebefu6.github.io/learn-ml-production-with-phoebe/courses/05-monitor-what-you-will-act-on.html
- https://phoebefu6.github.io/learn-data-observability-with-phoebe/courses/b5-distribution-drift.html

Sibling titles checked 2026-11-16: no collision with ai-qa 01-06, dataops a1-b8, model-evaluation,
ml-production, data-observability, analytics-engineering. Case name Wrenfold and prefix `tdm-`: 0 hits in
any other repo.

---

## Running case (constructed; every mention labelled "Constructed Wrenfold example")

Wrenfold is a constructed city bike-share operator. Its pipeline: raw trips -> cleaned trips -> station-hour
departure counts -> a demand forecast (a station x weekday/weekend x hour-of-day average) used to plan
where to move bikes. To make every number real, Wrenfold's pipeline runs on REAL public trips: HSL's
Helsinki city bike data for May 2021 (see Bench). Say it this way on pages: "Wrenfold is constructed; the
trips it processes are real HSL Helsinki trips from May 2021."

Running artifact: Wrenfold's test plan, one piece per session:

| Session | Piece of the test plan |
|---|---|
| 1 | bug inventory: the 12 ways the pipeline can be wrong while the job stays green |
| 2 | four unit tests for the cleaner and the bucketing (pytest, fixtures, parametrize) |
| 3 | a data check suite for cleaned trips (schema, reconcile, unique, range, referential, two distribution checks, split) |
| 4 | the cheapest set that catches all 12, measured on the bench |
| 5 | three behaviour tests on the demand model (MFT, INV, DIR) |
| 6 | the per-commit / nightly / release plan with a runtime budget and owners, scored on the bench |

Wrenfold pipeline facts pages may quote (all implemented in assets/tdm-live.js):
- Cleaner rules: drop exact duplicate rows; drop trips under 60 seconds; distance in metres / 1000 = km;
  a distance of 0 or over 50,000 m is missing (null), never 0; hour bucket = floor(seconds since
  1 May 00:00 local / 3600); join departure station to the station table for capacity; reject a trip whose
  return station is not in the station table.
- Forecast stations: the five busiest departure stations of May 2021, ids 030, 126, 113, 041, 021
  (HSL English names: Itamerentori, Kalasatama metro, Pasila railway station, Ympyratalo, Toolonlahdenkatu;
  the HSL table spells three of them with a/o umlauts, so pages quote the ids, or "Pasila railway station").
- Model: average departures per station, per day type (weekday or weekend), per hour of day, fitted on
  1-21 May, scored on 22-31 May. Metric: MAE in trips per station-hour.

---

## Bench: bug catcher (assets/tdm-live.js + assets/tdm-sample.js), canon

Data: HSL "City bike stations' Origin-Destination (OD) data", May 2021 file
https://dev.hsl.fi/citybikes/od-trips-2021/2021-05.csv, licence Creative Commons Attribution 4.0 (catalogue
record on avoindata.fi read via its API 2026-11-16, copy in materials/sources/od-pkg.json; maintainer HSL;
the record says the data is owned by City Bike Finland). Station table: HSL city bicycle stations CSV,
CC BY 4.0 (materials/sources/stations.csv, 457 stations).

READ AT SOURCE (we downloaded and counted it): the May 2021 file has 814,676 data lines and 407,338 distinct
rows: every row appears exactly twice. 432 station ids appear in trips; 3 of them (754, 997, 999) are not in
the station table.

Sample: every distinct trip departing the five busiest stations, seeded 50% sample (seed 20210501):
13,810 distinct trips, 258 station ids, 249,858 bytes. The loader re-creates the doubling (27,620 raw lines).

Python reference `materials/tdm_reference.py` and the node run of `assets/tdm-live.js`
(`materials/tdm-node.js`) agree BY VALUE on every number (`materials/compare-ladder.py`: MATCH, exit 0;
planted 0.1% fault: MISMATCH, exit 1). 2026-11-16.

Stored profile (week 1 of a known-good run): median trip 1.982 km; clean holdout MAE 1.9113; hour-of-day
peak 17 (17:00).

Clean run: 13,465 clean trip rows; 13,466 kept after dedup and the 60-second rule; 1 rejected (unknown
station); median trip 2.0095 km; hour-profile distance from week 1 0.0415; MAE 1.9113.

Thresholds: normal = distance median within 15%, hour profile distance (total variation) <= 0.08, holdout
MAE <= 2.2; referential: at most 0.2% of trips may point at an unknown station. "Tighten thresholds" = 1%,
0.02, MAE <= 1.9 (referential unchanged).

Costs are MODELLED units, not timed: smoke 1, each unit test 1, schema 2, reconcile 3, unique 3, range 2,
referential 3, each distribution check 5, split 1, MFT 8, INV 20 (a full re-run), DIR 12, holdout 10.
Total for all 17: 79.

Catch matrix (normal thresholds; a test "catches" a bug when it fails on that bug's output):

| Bug | Caught by | What it did to the output |
|---|---|---|
| null_coercion (silent null coercion) | u_distance, d_range | median 2.001 km, MAE unchanged 1.9113 |
| join_fanout | d_reconcile, d_unique, m_holdout | 18,711 rows, MAE 2.6158 |
| unit_miles (km/miles) | u_distance, d_dist_drift | median 1.2486 km, MAE unchanged |
| timezone (+3 h) | u_bucket, d_range, d_hour_drift, b_mft | hour profile distance 0.2795, MAE 1.9098 (metric blind) |
| dup_trips | d_reconcile, d_unique, b_inv, m_holdout | 26,930 rows, MAE 3.8226 |
| dropped_station | u_aggregate, d_reconcile | MAE 1.9418 (passes the bar) |
| leakage | d_split only | MAE 1.7409 (BETTER) |
| label_shift (arrivals) | u_aggregate, d_reconcile, b_dir | MAE 0.3277 (much BETTER) |
| serve_skew | u_parity, b_mft, m_holdout | MAE 2.9489 |
| off_by_one hour | u_bucket, d_range, d_hour_drift | hour profile distance 0.1062, MAE 1.9156 |
| type_coercion | d_schema, d_reconcile, d_referential | 5,071 rows, 8,395 rejected (62.34%), MAE 0.9319 (BETTER) |
| stale_ref | d_referential only | 65 rejected (0.48%), MAE 1.9062 |

False alarms on the clean run: none at normal thresholds. Tight: 3 (d_dist_drift, d_hour_drift, m_holdout);
under tight thresholds stale_ref is also flagged by those three.

Ladder (normal thresholds):

| Rung | Tests | Bugs caught | Ship | False alarms | Cost units |
|---|---|---|---|---|---|
| As found (smoke only) | 1 | 0 | 12 | 0 | 1 |
| + unit tests | 5 | 7 | 5 (join fan-out, duplicated trips, leakage, type coercion, stale reference) | 0 | 5 |
| + schema | 6 | 8 | 4 (join fan-out, duplicated trips, leakage, stale reference) | 0 | 7 |
| + data checks | 13 | 12 | 0 | 0 | 29 |
| + behaviour tests (all 17) | 17 | 12 | 0 | 0 | 79 |
| Cheapest full catch (exhaustive search) | 6: u_distance, u_bucket, u_parity, d_reconcile, d_referential, d_split | 12 | 0 | 0 | 10 |

Only unit tests (4, no smoke): 7 caught, 5 ship (same five as the unit rung), cost 4.
All 17 with tightened thresholds: 12 caught, 3 false alarms, cost 79.
The cheapest set is unique at cost 10 (next: several sets at 11).

Honest limits to print: the cheapest set is computed knowing the 12 bugs; a real team does not know its
next bug, so redundancy is insurance (s6). Behaviour tests catch nothing the cheapest set misses ON THIS
LIST; they are the only tests that look at the model's behaviour rather than the code or the data. The
metric got better under three bugs (leakage, label shift, type coercion): a holdout bar cannot catch a bug
that flatters the metric.

Pages quote ONLY numbers in this section.

---

## Verified facts (tier: S = read at source 2026-11-16; R = reported)

pytest (docs.pytest.org, stable, current release 9.2.0 on PyPI):
- S: tests request fixtures by declaring them as arguments; pytest matches parameter names to fixtures.
- S: fixture scopes function (default), class, module, package, session; yield fixtures are the recommended
  teardown, code after yield runs after the test, teardown in reverse order of setup.
- S: docs examples label steps with Arrange / Act / Assert comments.
- S: `@pytest.mark.parametrize("test_input,expected", [...])` runs the test once per tuple; `pytest.param(...,
  marks=pytest.mark.xfail)` marks one case.

Hypothesis (hypothesis.readthedocs.io, PyPI 6.170.15):
- S: "the property-based testing library for Python"; tests should pass for all inputs in a described range
  and Hypothesis chooses inputs; `@given` turns a function into a Hypothesis test; strategies such as
  `integers()` describe inputs; it reports a counterexample.
- S: strategies document how examples shrink (e.g. "shrink towards shorter strings"); a separate Pandas
  strategies section exists (not read in detail: name it, do not detail its API).

Great Expectations (GX Core 1.25.0 docs):
- S: "An Expectation is a verifiable assertion about your data." Created in Python as classes under
  `gx.expectations`, e.g. `gx.expectations.ExpectColumnMaxToBeBetween(column=..., min_value=..., max_value=...)`.
- S: "An Expectation Suite contains a group of Expectations that describe the same set of data";
  `gx.ExpectationSuite(name=...)`, `suite.add_expectation(...)`.
- S: the 0.18 docs are marked no longer actively maintained; the 0.x API differs. Say "GX Core 1.x" on pages.
- Expectation names that exist in GX (snake_case listed in the 0.18 glossary, read): expect_column_values_to_
  not_be_null, expect_column_values_to_be_unique, expect_column_median_to_be_between. 1.x CamelCase class names
  ExpectColumnValuesToNotBeNull, ExpectColumnValuesToBeUnique, ExpectColumnMedianToBeBetween,
  ExpectColumnValuesToBeBetween are the standard 1.x mapping (R for any not listed above).

pandera (pandera.readthedocs.io, 0.36.0):
- S: `pa.DataFrameSchema({"col": pa.Column(int, pa.Check.ge(0))})`; `pa.Check.isin`; `schema.validate(df,
  lazy=True)` aggregates errors into `pa.errors.SchemaErrors`; class-based `DataFrameModel` with `pa.Field(ge=0)`;
  `import pandera.pandas as pa` (introduced v0.24.0). Error text example: "non-nullable series 'id' contains
  null values".

dbt (docs.getdbt.com, dbt-core 1.12.7 on PyPI):
- S: data tests are select statements that return failing rows; zero rows = pass; singular vs generic;
  four built-in generic tests unique, not_null, accepted_values, relationships; "Tests are now called data
  tests to disambiguate from unit tests"; `tests:` still accepted as an alias of `data_tests:`.

Ribeiro, Wu, Guestrin, Singh (2020), "Beyond Accuracy: Behavioral Testing of NLP Models with CheckList",
ACL 2020, pp. 4902-4912 (Best Overall Paper):
- S: MFT, "inspired by unit tests in software engineering", a collection of simple examples and labels to
  check a behaviour; INV applies label-preserving perturbations and expects the prediction to stay the same;
  DIR expects the label to change in a certain direction (sentiment should not become more positive when a
  negative phrase is added).
- S: held-out accuracy "often overestimates the performance" of NLP models.
- S: in a user study, practitioners with CheckList created twice as many tests and found almost three times
  as many bugs as users without it.
- Applying MFT/INV/DIR to a tabular forecast is OUR adaptation, say so.

Breck, Cai, Nielsen, Salib, Sculley (2017), "The ML Test Score: A Rubric for ML Production Readiness and
Technical Debt Reduction", IEEE Big Data 2017:
- S: 28 specific tests and monitoring needs in 4 sections: features and data, model development, ML
  infrastructure, monitoring (7 monitoring tests; infra list includes "The ML pipeline is integration tested",
  "Model quality is validated before serving"; monitoring list includes "Training and serving are not skewed";
  data list starts "Feature expectations are captured in a schema").
- S: half a point for running a test manually with results documented and distributed; a full point if it
  runs automatically on a repeated basis; sum per section; final score = MINIMUM of the four sections.
- S: interpretation table: 0 "More of a research project than a productionized system" ... (3,5] strong
  automated testing, > 5 exceptional. Table note: different systems at different points in their development
  may reasonably aim at different points on the scale.
- S: they met with 36 teams across Google; in a survey of several dozen teams none of the tests was
  implemented by more than 80% of teams.

Zinkevich, "Rules of Machine Learning" (developers.google.com):
- S: training-serving skew "is a difference between performance during training and performance during
  serving"; causes: different handling of data in the training and serving pipelines, a change in the data
  between training and serving, a feedback loop.
- S: Rule #1 "Don't be afraid to launch a product without machine learning." Rule #4 "Keep the first model
  simple and get the infrastructure right." Rule #5 "Test the infrastructure independently from the machine
  learning." Rule #10 "Watch for silent failures": Play once had a table stale for 6 months; refreshing it
  alone gave a 2% boost in install rate; a feature column populated in 90% of examples can drop to 60%.
- S: Rule #29 save the features used at serving time and use them at training time; Rule #31 a table joined
  at training and serving may change between the two; Rule #32 re-use code between training and serving.

HSL data facts: see Bench (all S, counted by us from the downloaded file).

## Contested (teach the disagreement, never resolve)

- How much ML testing a model needs before it has earned its keep. Side A (Breck et al.): ML-centric tests
  are non-obvious and under-implemented (none above 80% of teams); score the system and raise the minimum
  section. Side B (Zinkevich Rule #1 and #4, and Breck et al.'s own Table V note): a first model can be
  simple, maybe not ML at all, and different systems reasonably aim at different points on the scale; heavy
  model testing on a model that may be thrown away is spend before evidence. No study we found measures the
  payoff curve. Pages say so.
- Distribution checks: catch real drift vs fire false alarms on normal variation (bench: tight thresholds
  give 3 false alarms on clean data). The threshold is a business choice, not a statistical fact.

## Real-world stories pages may use

- The HSL May 2021 file itself: every row appears twice (counted). A pipeline without a dedup step doubles
  every count while every job stays green.
- Google Play's stale table (Rules of ML #10): 6 months stale, 2% install-rate gain when refreshed.
- CheckList's commercial sentiment model: a team found new, actionable bugs in an extensively tested model.
- ML Test Score's 36 teams: none of the 28 tests implemented by more than 80% of teams.
- dbt's rename of tests to data tests "to disambiguate from unit tests".

## Not covered (honest list)

Mutation testing technique (ai-qa 04); CI wiring and contracts (dataops b3/b1); monitoring after deploy
(ml-production, data-observability); model metrics and validation design (model-evaluation); dbt project
craft (analytics-engineering); load and performance testing; testing LLM outputs and prompts; Spark or SQL
engine specific testing frameworks; data contracts tooling; GX Cloud; pandera's other backends (polars,
pyspark) beyond naming them.

## Per-session coverage

1. What test would fail if the code were wrong? (green) - silent failure; the 12 bug classes; a test pyramid
   for data (unit at the base, data checks in the middle, behaviour and metric tests at the top). Build-along:
   the break widget (`.tdm-bench data-mode="break"`).
2. Unit tests for transforms (green) - pytest arrange/act/assert, fixtures, parametrize; pure functions vs IO;
   Hypothesis as Self-study. Build-along: 4 tests for the cleaner (u_distance, u_bucket, u_aggregate, u_parity).
3. Data checks (yellow) - GX Core 1.x expectations and suites, pandera schemas, dbt data tests as a category;
   static vs distribution checks and their false-alarm cost. Build-along: Wrenfold's check suite.
4. The bench (orange) - full bug catcher.
5. Model behaviour tests (orange) - CheckList MFT/INV/DIR adapted; ML Test Score; contested question.
   Build-along: 3 behaviour tests on the demand model (b_mft, b_inv, b_dir).
6. A test strategy someone keeps running (red) - per commit / nightly / release, runtime budget, flaky data
   tests, ownership; capstone scored on the bench.

## Citation appendix (exact forms for pages)

- pytest documentation, "How to use fixtures" and "How to parametrize fixtures and test functions", docs.pytest.org (stable; pytest 9.2.0).
- Hypothesis documentation, hypothesis.readthedocs.io (6.170.15).
- Great Expectations, GX Core 1.25.0 documentation, docs.greatexpectations.io.
- pandera documentation, pandera.readthedocs.io (0.36.0).
- dbt documentation, "Add data tests to your DAG", docs.getdbt.com.
- Ribeiro, M. T., Wu, T., Guestrin, C. and Singh, S. (2020). "Beyond Accuracy: Behavioral Testing of NLP Models with CheckList". ACL 2020, 4902-4912.
- Breck, E., Cai, S., Nielsen, E., Salib, M. and Sculley, D. (2017). "The ML Test Score: A Rubric for ML Production Readiness and Technical Debt Reduction". IEEE Big Data 2017.
- Zinkevich, M. "Rules of Machine Learning: Best Practices for ML Engineering", Google for Developers.
- HSL / City Bike Finland, "City bike stations' Origin-Destination (OD) data", May 2021, CC BY 4.0; HSL city bicycle stations, CC BY 4.0.

Re-verify before delivery: GX Core minor version (API changed across majors), pandera import path, dbt
`data_tests` key.

Addendum (2026-11-16, read at source in the ML Test Score PDF): "All tests are worth the same number of
points. This is intentional, as we believe the relative importance of tests to teams will vary depending on
their specific priorities." The HSL station table (457 rows) lacks 3 station ids that appear in May 2021
trips: 754, 997, 999 (counted).

Addendum (2026-11-16, printed by the engine, node and python agree): station 030's fitted weekday
forecast, departures per hour: clean 04:00 = 0.07, 08:00 = 6.93, 16:00 = 12.47, 17:00 = 13.27; with the
timezone bug 04:00 = 0.20, 08:00 = 0.00 (so the MFT "04:00 below 08:00" fails). Clean whole-month hour
shares: peak 16:00 at 10.3% of departures; with the timezone bug the peak moves to 19:00 (10.3%).
Cost of the four unit tests alone: 4 units, 7 caught (null coercion, km/miles, timezone, off-by-one,
dropped station, label shift, serve skew), 5 ship.

Addendum (2026-11-16, engine): bugs caught per test, normal thresholds: smoke 0; u_distance 2 (null
coercion, km/miles); u_bucket 2 (timezone, off-by-one); u_aggregate 2 (dropped station, label shift);
u_parity 1 (serve skew); d_schema 1 (type coercion); d_reconcile 5 (fan-out, duplicates, dropped station,
label shift, type coercion); d_unique 2 (fan-out, duplicates); d_range 3 (null coercion, timezone,
off-by-one); d_referential 2 (type coercion, stale ref); d_dist_drift 1 (km/miles); d_hour_drift 2
(timezone, off-by-one); d_split 1 (leakage); b_mft 2 (timezone, serve skew); b_inv 1 (duplicates); b_dir 1
(label shift); m_holdout 3 (fan-out, duplicates, serve skew). Leakage and stale ref are each caught by ONE
test of the 17 (d_split, d_referential): no second line exists on the bench.
Lanes (score of a suite): per commit = smoke + 4 unit tests: 7 caught, 5 units, ships fan-out, duplicates,
leakage, type coercion, stale ref. Nightly = the 8 data checks: 11 caught, 24 units, ships serve skew.
Release = MFT, INV, DIR, holdout: 5 caught, 50 units. Commit + nightly: 12 caught, 29 units, 0 false
alarms. Tight thresholds: nightly lane 12 caught with 2 false alarms; release lane 10 caught with 1 false
alarm (ships leakage, type coercion).
ML Test Score infrastructure list (Table III, read at source): 1 Training is reproducible. 2 Model specs
are unit tested. 3 The ML pipeline is integration tested. 4 Model quality is validated before serving.
5 The model is debuggable. 6 Models are canaried before serving. 7 Serving models can be rolled back.
