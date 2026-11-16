<!-- learn-with-phoebe hub banner -->
> ### 📚 Part of [**Learn with Phoebe**](https://phoebefu6.github.io/learn-with-phoebe/)
> The shelf of 198 free, hands-on courses on AI, data, and the craft around them. **[Browse every course ↗](https://phoebefu6.github.io/learn-with-phoebe/)**
<!-- /learn-with-phoebe hub banner -->

# Learn Testing Data & ML Code with Phoebe

Six 45-minute sessions on the bugs data pipelines and ML models ship while every job stays green, and the
cheapest set of tests that would catch them: unit tests for transforms (pytest), data checks (GX Core 1.x,
pandera, dbt data tests), model behaviour tests (CheckList's MFT, INV and DIR) and a test strategy someone
keeps running.

The running case, Wrenfold, is a constructed bike-share operator. Its pipeline runs on real trips: a seeded
sample of HSL's Helsinki city bike origin-destination data for May 2021, licensed CC BY 4.0 (data owned by
City Bike Finland, published by HSL), plus HSL's city bicycle station table (CC BY 4.0).

The session 4 bench plants twelve bugs in that pipeline and runs seventeen tests against every output,
in the browser (`assets/tdm-live.js`). A Python twin (`materials/tdm_reference.py`) produces the same
numbers; `materials/compare-ladder.py` checks them by value.

Static site: open `index.html`. No build step. By Phoebe Fu.
