/* tdm-live.js - the bug catcher bench for learn-testing-data-ml-code-with-phoebe.
   A real pipeline on real rows (HSL Helsinki city bike trips, May 2021, CC BY 4.0), 12 bug
   injectors that each change one code path, 17 tests that really run against the output.
   Mirrors materials/tdm_reference.py line for line; the two must agree by value.
   Mount: <div class="tdm-bench" data-mode="full|break" data-rung="as_found"></div>
   Page API: window.TDM_BENCH.setRung(id), .setTight(bool), .canon() */
(function () {
  "use strict";
  var S = window.TDM_SAMPLE;
  if (!S) return;

  var WEEKEND = { 1: 1, 2: 1, 8: 1, 9: 1, 15: 1, 16: 1, 22: 1, 23: 1, 29: 1, 30: 1 };
  var HOURS = 744, TRAIN_LAST_DAY = 21, REJECT_MAX = 0.002;
  var THRESH = { normal: { dist: 0.15, tvd: 0.08, mae: 2.2 }, tight: { dist: 0.01, tvd: 0.02, mae: 1.9 } };

  var BUGS = [
    ["null_coercion", "Silent null coercion", "a missing distance becomes 0.0 km instead of null"],
    ["join_fanout", "Join fan-out", "the station join reads a capacity-history table without the current-row filter"],
    ["unit_miles", "km / miles mismatch", "metres divided by 1609.344 instead of 1000"],
    ["timezone", "Timezone shift", "local Helsinki times parsed as UTC and moved +3 h"],
    ["dup_trips", "Duplicated trips", "the dedup step is skipped; the source file carries every row twice"],
    ["dropped_station", "Dropped station", "the aggregation loop stops one station early"],
    ["leakage", "Target leakage", "the baseline is fitted on all 31 days, including the 10 it is scored on"],
    ["label_shift", "Label shift", "the target counts arrivals at a station instead of departures"],
    ["serve_skew", "Train/serve skew", "the serving path computes hour of day in UTC, training in local time"],
    ["off_by_one", "Off-by-one hour", "hour buckets use ceiling instead of floor"],
    ["type_coercion", "Type coercion", "station ids read as integers, so \"030\" becomes \"30\""],
    ["stale_ref", "Stale reference table", "the station table is an old snapshot missing stations 300 and up"]
  ];
  var TESTS = [
    ["smoke", "smoke", 1, "Smoke: the job runs and writes rows"],
    ["u_distance", "unit", 1, "Unit: distance cleaner on 3 fake rows"],
    ["u_bucket", "unit", 1, "Unit: hour bucketing on 4 timestamps"],
    ["u_aggregate", "unit", 1, "Unit: aggregation counts a departure once"],
    ["u_parity", "unit", 1, "Unit: train and serve features agree"],
    ["d_schema", "schema", 2, "Schema: id pattern, capacity int, types"],
    ["d_reconcile", "data", 3, "Row reconciliation, raw to clean to aggregate"],
    ["d_unique", "data", 3, "Uniqueness of the trip key"],
    ["d_range", "data", 2, "Ranges: km, duration, hour"],
    ["d_referential", "data", 3, "Referential: stations exist in the table"],
    ["d_dist_drift", "data", 5, "Distribution: median trip km vs stored"],
    ["d_hour_drift", "data", 5, "Distribution: hour-of-day profile vs stored"],
    ["d_split", "data", 1, "Split integrity: no scored day in the fit"],
    ["b_mft", "behaviour", 8, "Minimum functionality: 04:00 below 08:00"],
    ["b_inv", "behaviour", 20, "Invariance: a re-run load changes nothing"],
    ["b_dir", "behaviour", 12, "Directional: close a station, its forecast falls"],
    ["m_holdout", "metric", 10, "Holdout MAE at or under the bar"]
  ];
  var KIND_LABEL = { smoke: "Smoke", unit: "Unit", schema: "Schema", data: "Data", behaviour: "Behaviour", metric: "Metric" };
  var RUNGS = [
    ["as_found", "As found", ["smoke"]],
    ["unit", "+ unit tests", ["smoke", "u_distance", "u_bucket", "u_aggregate", "u_parity"]],
    ["schema", "+ schema", ["smoke", "u_distance", "u_bucket", "u_aggregate", "u_parity", "d_schema"]],
    ["data", "+ data checks", ["smoke", "u_distance", "u_bucket", "u_aggregate", "u_parity", "d_schema", "d_reconcile", "d_unique", "d_range", "d_referential", "d_dist_drift", "d_hour_drift", "d_split"]],
    ["behaviour", "+ behaviour tests", TESTS.map(function (t) { return t[0]; })],
    ["unit_only", "Only unit tests", ["u_distance", "u_bucket", "u_aggregate", "u_parity"]]
  ];
  var ID_RE = /^\d{3}$/;
  var FORECAST = S.meta.forecast;

  function has(bugs, b) { return bugs.indexOf(b) !== -1; }
  function jsRound(x, n) { var f = Math.pow(10, n); return Math.floor(x * f + 0.5) / f; }

  // ---------------- pipeline ----------------
  function rawRows(copies, dropStation) {
    copies = copies || 2;
    var base = [], t = 0;
    for (var i = 0; i < S.dsec.length; i++) {
      t += S.dsec[i];
      var sid = FORECAST[S.s[i]];
      if (dropStation != null && sid === dropStation) continue;
      base.push([t, S.dur[i], S.dist[i], sid, S.ids[S.r[i]]]);
    }
    var out = [];
    for (var c = 0; c < Math.floor(copies / 2); c++) {
      for (var j = 0; j < base.length; j++) { out.push(base[j]); out.push(base[j]); }
    }
    return out;
  }
  function parseId(x, bugs) { return has(bugs, "type_coercion") ? String(parseInt(x, 10)) : x; }
  function distKm(m, bugs) {
    if (m === 0 || m > 50000) return has(bugs, "null_coercion") ? 0.0 : null;
    return has(bugs, "unit_miles") ? m / 1609.344 : m / 1000;
  }
  function hourBucket(sec, bugs) {
    if (has(bugs, "timezone")) return Math.floor((sec + 10800) / 3600);
    if (has(bugs, "off_by_one")) return Math.ceil(sec / 3600);
    return Math.floor(sec / 3600);
  }
  function refTable(bugs) {
    var ref = new Map();
    S.ref.forEach(function (row) {
      if (has(bugs, "stale_ref") && parseInt(row[0], 10) >= S.staleFrom) return;
      ref.set(row[0], [row[1]]);
    });
    if (has(bugs, "join_fanout")) {
      S.history.forEach(function (h) { if (ref.has(h[0])) ref.set(h[0], ref.get(h[0]).concat([h[1]])); });
    }
    return ref;
  }
  function clean(raw, bugs) {
    var ref = refTable(bugs), seen = new Set(), rows = [], rejected = 0, kept = 0;
    var dedup = !has(bugs, "dup_trips");
    for (var i = 0; i < raw.length; i++) {
      var q = raw[i], sec = q[0], dur = q[1], dm = q[2];
      var s = parseId(q[3], bugs), r = parseId(q[4], bugs);
      if (dedup) {
        var key = sec + "|" + dur + "|" + dm + "|" + s + "|" + r;
        if (seen.has(key)) continue;
        seen.add(key);
      }
      if (dur < 60) continue;
      kept++;
      if (!ref.has(r)) { rejected++; continue; }
      var caps = ref.has(s) ? ref.get(s) : [null];
      for (var k = 0; k < caps.length; k++) {
        rows.push({ sec: sec, dur: dur, dm: dm, s: s, r: r, km: distKm(dm, bugs), hour: hourBucket(sec, bugs), cap: caps[k] });
      }
    }
    return { rows: rows, rejected: rejected, kept: kept, ref: ref };
  }
  function aggregate(rows, stations, bugs) {
    var st = has(bugs, "dropped_station") ? stations.slice(0, stations.length - 1) : stations;
    var agg = new Map();
    st.forEach(function (s) { var a = []; for (var h = 0; h < HOURS; h++) a.push(0); agg.set(s, a); });
    var lab = has(bugs, "label_shift");
    for (var i = 0; i < rows.length; i++) {
      var h2 = rows[i].hour;
      if (h2 < 0 || h2 >= HOURS) continue;
      var k = lab ? rows[i].r : rows[i].s;
      if (agg.has(k)) agg.get(k)[h2] += 1;
    }
    return agg;
  }
  function dayOf(h) { return Math.floor(h / 24) + 1; }
  function trainFeat(h) { return [WEEKEND[dayOf(h)] ? 1 : 0, h % 24]; }
  function serveFeat(h, bugs) {
    if (has(bugs, "serve_skew")) return [WEEKEND[dayOf(h)] ? 1 : 0, (((h - 3) % 24) + 24) % 24];
    return trainFeat(h);
  }
  function fit(agg, bugs) {
    var last = has(bugs, "leakage") ? 31 : TRAIN_LAST_DAY, days = [];
    for (var d = 1; d <= last; d++) days.push(d);
    var model = new Map();
    agg.forEach(function (counts, s) {
      var sums = [[], []], cnts = [[], []];
      for (var x = 0; x < 24; x++) { sums[0].push(0); sums[1].push(0); cnts[0].push(0); cnts[1].push(0); }
      days.forEach(function (dd) {
        for (var hod = 0; hod < 24; hod++) {
          var h = (dd - 1) * 24 + hod, dt = trainFeat(h)[0];
          sums[dt][hod] += counts[h];
          cnts[dt][hod] += 1;
        }
      });
      model.set(s, [0, 1].map(function (dt) { return sums[dt].map(function (v, i) { return v / cnts[dt][i]; }); }));
    });
    return { model: model, days: days };
  }
  function predict(model, s, h, bugs) { var f = serveFeat(h, bugs); return model.get(s)[f[0]][f[1]]; }
  function run(bugs, raw) {
    raw = raw || rawRows();
    var c = clean(raw, bugs);
    var stations = FORECAST.map(function (x) { return parseId(x, bugs); });
    var agg = aggregate(c.rows, stations, bugs);
    var f = fit(agg, bugs);
    var preds = new Map(), err = 0, n = 0;
    agg.forEach(function (counts, s) {
      var p = [];
      for (var h = TRAIN_LAST_DAY * 24; h < HOURS; h++) {
        var v = predict(f.model, s, h, bugs);
        p.push(v);
        err += Math.abs(v - counts[h]);
        n++;
      }
      preds.set(s, p);
    });
    return { clean: c, agg: agg, fit: f, preds: preds, mae: n ? err / n : NaN, stations: stations };
  }

  // ---------------- profiles stored from a known-good run (week 1) ----------------
  function median(xs) {
    xs = xs.slice().sort(function (a, b) { return a - b; });
    var n = xs.length;
    if (!n) return NaN;
    return n % 2 ? xs[(n - 1) / 2] : (xs[n / 2 - 1] + xs[n / 2]) / 2;
  }
  function hourShare(rows, lastDay) {
    lastDay = lastDay || 31;
    var c = [], tot = 0, i;
    for (i = 0; i < 24; i++) c.push(0);
    for (i = 0; i < rows.length; i++) {
      var h = rows[i].hour;
      if (h >= 0 && h < HOURS && dayOf(h) <= lastDay) { c[h % 24] += 1; tot++; }
    }
    return c.map(function (x) { return tot ? x / tot : 0; });
  }
  var PROF = null, GOOD = null;
  function storedProfile() {
    if (PROF) return PROF;
    GOOD = run([]);
    var wk = GOOD.clean.rows.filter(function (r) { return dayOf(r.hour) <= 7; });
    PROF = {
      median_km: median(wk.filter(function (r) { return r.km !== null; }).map(function (r) { return r.km; })),
      share: hourShare(wk, 7),
      mae: GOOD.mae
    };
    return PROF;
  }

  // ---------------- tests (all of them really run) ----------------
  function eqArr(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  function runTests(bugs, mode) {
    var prof = storedProfile(), th = THRESH[mode];
    var R = run(bugs), rows = R.clean.rows, out = {};
    out.smoke = rows.length > 0 && !isNaN(R.mae);
    out.u_distance = eqArr([distKm(2043, bugs), distKm(0, bugs), distKm(60000, bugs)], [2.043, null, null]);
    out.u_bucket = eqArr([0, 3599, 3600, 2678245].map(function (x) { return hourBucket(x, bugs); }), [0, 0, 1, 743]);
    var a = aggregate([{ s: "001", r: "002", hour: 5 }], ["001", "002"], bugs);
    out.u_aggregate = a.has("001") && a.has("002") && a.get("001")[5] === 1 && a.get("002")[5] === 0;
    out.u_parity = [0, 7, 100, 503, 600].every(function (h) { return eqArr(trainFeat(h), serveFeat(h, bugs)); });
    out.d_schema = rows.every(function (r) {
      return ID_RE.test(r.s) && ID_RE.test(r.r) && Number.isInteger(r.cap) && (r.km === null || typeof r.km === "number");
    });
    var raw = rawRows(), distinct = new Map();
    raw.forEach(function (q) { distinct.set(q.join("|"), q); });
    var expClean = 0;
    distinct.forEach(function (q) { if (q[1] >= 60 && R.clean.ref.has(q[4])) expClean++; });
    var expAgg = rows.filter(function (r) { return R.stations.indexOf(r.s) !== -1 && r.hour >= 0 && r.hour < HOURS; }).length;
    var sumAgg = 0;
    R.agg.forEach(function (v) { for (var i = 0; i < v.length; i++) sumAgg += v[i]; });
    out.d_reconcile = rows.length === expClean && sumAgg === expAgg;
    var keys = new Set(rows.map(function (r) { return r.sec + "|" + r.dur + "|" + r.dm + "|" + r.s + "|" + r.r; }));
    out.d_unique = keys.size === rows.length;
    out.d_range = rows.every(function (r) { return (r.km === null || (r.km > 0 && r.km <= 50)) && r.dur >= 60 && r.hour >= 0 && r.hour < HOURS; });
    var kept = R.clean.kept, rej = kept ? R.clean.rejected / kept : 1;
    out.d_referential = rej <= REJECT_MAX && R.stations.every(function (s) { return R.clean.ref.has(s); });
    var med = median(rows.filter(function (r) { return r.km !== null; }).map(function (r) { return r.km; }));
    out.d_dist_drift = Math.abs(med / prof.median_km - 1) <= th.dist;
    var sh = hourShare(rows), tvd = 0;
    for (var i = 0; i < 24; i++) tvd += Math.abs(sh[i] - prof.share[i]);
    tvd = 0.5 * tvd;
    out.d_hour_drift = tvd <= th.tvd;
    out.d_split = Math.max.apply(null, R.fit.days) < TRAIN_LAST_DAY + 1;
    var m = R.fit.model, mft = true;
    R.agg.forEach(function (v, s) {
      if (!(predict(m, s, 23 * 24 + 4, bugs) < predict(m, s, 23 * 24 + 8, bugs))) mft = false;
    });
    out.b_mft = mft;
    var R2 = run(bugs, rawRows(4)), inv = R2.preds.size === R.preds.size;
    R.preds.forEach(function (p, s) {
      if (!R2.preds.has(s)) { inv = false; return; }
      var q = R2.preds.get(s);
      for (var j = 0; j < p.length; j++) if (Math.abs(p[j] - q[j]) >= 1e-9) inv = false;
    });
    out.b_inv = inv;
    var closed = FORECAST[0], sk = parseId(closed, bugs), R3 = run(bugs, rawRows(2, closed));
    if (R.preds.has(sk) && R3.preds.has(sk)) {
      var mean = function (p) { var t = 0; for (var j = 0; j < p.length; j++) t += p[j]; return t / p.length; };
      var before = mean(R.preds.get(sk)), after = mean(R3.preds.get(sk));
      out.b_dir = before > 0 && after <= 0.1 * before;
    } else out.b_dir = false;
    out.m_holdout = R.mae <= th.mae;
    var detail = { rows: rows.length, rejected: R.clean.rejected, kept: kept, rej_rate: jsRound(rej, 4),
      median_km: jsRound(med, 4), tvd: jsRound(tvd, 4), mae: jsRound(R.mae, 4) };
    return { out: out, detail: detail };
  }

  var CACHE = {};
  function matrix(mode) {
    if (CACHE[mode]) return CACHE[mode];
    var cl = runTests([], mode), cb = {}, details = { clean: cl.detail };
    BUGS.forEach(function (b) {
      var r = runTests([b[0]], mode);
      cb[b[0]] = TESTS.filter(function (t) { return !r.out[t[0]]; }).map(function (t) { return t[0]; });
      details[b[0]] = r.detail;
    });
    CACHE[mode] = { false_alarms: TESTS.filter(function (t) { return !cl.out[t[0]]; }).map(function (t) { return t[0]; }), caught_by: cb, details: details };
    return CACHE[mode];
  }
  var COST = {};
  TESTS.forEach(function (t) { COST[t[0]] = t[2]; });
  function score(suite, mode) {
    var M = matrix(mode || "normal");
    var caught = BUGS.filter(function (b) { return M.caught_by[b[0]].some(function (t) { return suite.indexOf(t) !== -1; }); }).map(function (b) { return b[0]; });
    return {
      caught: caught.length,
      ships: BUGS.map(function (b) { return b[0]; }).filter(function (b) { return caught.indexOf(b) === -1; }),
      false_alarms: M.false_alarms.filter(function (t) { return suite.indexOf(t) !== -1; }).length,
      cost: suite.reduce(function (a, t) { return a + COST[t]; }, 0)
    };
  }
  function cheapest(mode) {
    var M = matrix(mode || "normal"), names = TESTS.map(function (t) { return t[0]; });
    var bmask = names.map(function (t) {
      var m = 0;
      BUGS.forEach(function (b, i) { if (M.caught_by[b[0]].indexOf(t) !== -1) m |= (1 << i); });
      return m;
    });
    var fa = names.map(function (t) { return M.false_alarms.indexOf(t) !== -1; });
    var full = (1 << BUGS.length) - 1, best = null;
    for (var mask = 1; mask < (1 << names.length); mask++) {
      var cov = 0, cost = 0, n = 0, bad = false;
      for (var i = 0; i < names.length; i++) if (mask & (1 << i)) { cov |= bmask[i]; cost += COST[names[i]]; n++; if (fa[i]) bad = true; }
      if (bad || cov !== full) continue;
      if (!best || cost < best.cost || (cost === best.cost && n < best.n)) best = { cost: cost, n: n, mask: mask };
    }
    if (!best) return null;
    return names.filter(function (t, i) { return best.mask & (1 << i); });
  }
  function canon() {
    var prof = storedProfile();
    var res = { profile: { median_km: jsRound(prof.median_km, 4), mae: jsRound(prof.mae, 4), share_peak: prof.share.indexOf(Math.max.apply(null, prof.share)) } };
    ["normal", "tight"].forEach(function (mode) { res[mode] = matrix(mode); });
    var ladder = RUNGS.slice(0, 5).map(function (r) {
      var s = score(r[2]);
      return { name: r[0], suite: r[2], caught: s.caught, ships: s.ships, false_alarms: s.false_alarms, cost: s.cost };
    });
    var ch = cheapest();
    if (ch) { var s2 = score(ch); ladder.push({ name: "cheapest", suite: ch, caught: s2.caught, ships: s2.ships, false_alarms: s2.false_alarms, cost: s2.cost }); }
    res.ladder = ladder;
    res.tight_all = score(TESTS.map(function (t) { return t[0]; }), "tight");
    return res;
  }

  // ---------------- UI ----------------
  function fmt(x) { return Number.isInteger(x) ? x.toLocaleString("en-US") : String(x); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var BUGNAME = {}; BUGS.forEach(function (b) { BUGNAME[b[0]] = b[1]; });
  var TESTNAME = {}; TESTS.forEach(function (t) { TESTNAME[t[0]] = t[3]; });
  var RAIL = "Real rows: " + S.dsec.length.toLocaleString("en-US") + " distinct trips from the five busiest departure stations of HSL's Helsinki city bike data, May 2021, " +
    S.meta.licence + ", seeded 50% sample; the published file carries every row twice and the loader keeps that. " +
    "The pipeline, the 12 bugs and the 17 tests run for real in your browser. Constructed: the capacity-history rows, the stale station snapshot and the Wrenfold framing. Modelled: the cost units.";

  function mountFull(root) {
    var st = { suite: [], tight: false, rung: root.getAttribute("data-rung") || "as_found" };
    root.innerHTML = "";
    var head = el("div", "tdm-head");
    head.appendChild(el("h4", null, "Bug catcher: which test fails when the pipeline is wrong?"));
    head.appendChild(el("p", "tdm-rail", RAIL));
    root.appendChild(head);
    var presets = el("div", "tdm-presets");
    var pbtn = {};
    RUNGS.forEach(function (r) {
      var b = el("button", "tdm-preset" + (r[0] === "unit_only" ? " tdm-trap" : ""), r[1]);
      b.type = "button";
      b.addEventListener("click", function () { api.setRung(r[0]); });
      pbtn[r[0]] = b; presets.appendChild(b);
    });
    var cb = el("button", "tdm-preset", "Cheapest full catch");
    cb.type = "button";
    cb.addEventListener("click", function () { api.setRung("cheapest"); });
    pbtn.cheapest = cb; presets.appendChild(cb);
    var tb = el("button", "tdm-preset tdm-trap", "Tighten thresholds");
    tb.type = "button";
    tb.addEventListener("click", function () { api.setTight(!st.tight); });
    presets.appendChild(tb);
    root.appendChild(presets);
    root.appendChild(el("p", "tdm-note", "Presets set the switches; toggle any test yourself. Tighten thresholds moves the two distribution checks and the holdout bar from 15% / 0.08 / MAE 2.2 to 1% / 0.02 / MAE 1.9."));
    var tg = el("div", "tdm-toggles"), tbox = {};
    TESTS.forEach(function (t) {
      var lab = el("label", "tdm-tog tdm-k-" + t[1]);
      var cbx = document.createElement("input"); cbx.type = "checkbox"; cbx.value = t[0];
      cbx.addEventListener("change", function () {
        if (cbx.checked) { if (st.suite.indexOf(t[0]) === -1) st.suite.push(t[0]); } else st.suite = st.suite.filter(function (x) { return x !== t[0]; });
        st.rung = "custom"; render();
      });
      tbox[t[0]] = cbx;
      lab.appendChild(cbx);
      lab.appendChild(el("span", "tdm-tk", KIND_LABEL[t[1]]));
      lab.appendChild(el("span", "tdm-tn", t[3]));
      lab.appendChild(el("span", "tdm-tc", t[2] + " u"));
      tg.appendChild(lab);
    });
    root.appendChild(tg);
    var headline = el("div", "tdm-headline"); root.appendChild(headline);
    var wrap = el("div", "tdm-tablewrap"); root.appendChild(wrap);
    root.appendChild(el("p", "tdm-foot", "A cell reads \"caught\" when that test fails on that bug's output. The clean row is the pipeline with no bug: anything that fails there is a false alarm. Cost units are modelled (unit test 1, a full pipeline re-run 20), not timed."));

    function render() {
      var mode = st.tight ? "tight" : "normal";
      headline.textContent = "Running 12 pipelines and " + st.suite.length + " tests...";
      var M = matrix(mode), sc = score(st.suite, mode);
      Object.keys(pbtn).forEach(function (k) { pbtn[k].classList.toggle("is-on", k === st.rung); });
      tb.classList.toggle("is-on", st.tight);
      TESTS.forEach(function (t) { tbox[t[0]].checked = st.suite.indexOf(t[0]) !== -1; });
      headline.innerHTML = "";
      var big = el("div", "tdm-big");
      big.appendChild(el("b", null, String(sc.ships.length)));
      big.appendChild(el("span", null, "of 12 bugs ship"));
      headline.appendChild(big);
      var two = el("div", "tdm-two");
      [["caught", sc.caught + " caught"], ["fa" + (sc.false_alarms ? " is-bad" : ""), sc.false_alarms + " false alarm" + (sc.false_alarms === 1 ? "" : "s") + " on the clean run"], ["cost", sc.cost + (sc.cost === 1 ? " cost unit" : " cost units") + " per run (modelled)"]].forEach(function (p) {
        two.appendChild(el("span", "tdm-stat tdm-" + p[0], p[1]));
      });
      headline.appendChild(two);
      if (sc.ships.length) headline.appendChild(el("p", "tdm-ships", "Ships: " + sc.ships.map(function (b) { return BUGNAME[b]; }).join(", ")));
      // matrix
      wrap.innerHTML = "";
      var cols = TESTS.filter(function (t) { return st.suite.indexOf(t[0]) !== -1; });
      var tbl = el("table", "clean tdm-table"), thead = el("thead"), hr = el("tr");
      hr.appendChild(el("th", null, "Bug injected"));
      cols.forEach(function (t) { var th = el("th", "tdm-col", t[0]); th.title = t[3]; hr.appendChild(th); });
      hr.appendChild(el("th", null, "Verdict"));
      thead.appendChild(hr); tbl.appendChild(thead);
      var tbody = el("tbody");
      var crow = el("tr", "tdm-cleanrow");
      crow.appendChild(el("td", "tdm-bn", "Clean run (no bug)"));
      cols.forEach(function (t) {
        var fa = M.false_alarms.indexOf(t[0]) !== -1;
        crow.appendChild(el("td", fa ? "tdm-cell tdm-fa" : "tdm-cell", fa ? "false alarm" : "pass"));
      });
      crow.appendChild(el("td", "tdm-cell", sc.false_alarms ? sc.false_alarms + " noisy" : "quiet"));
      tbody.appendChild(crow);
      BUGS.forEach(function (b) {
        var tr = el("tr"), name = el("td", "tdm-bn");
        name.appendChild(el("b", null, b[1]));
        name.appendChild(el("span", "tdm-bd", b[2]));
        tr.appendChild(name);
        var any = false;
        cols.forEach(function (t) {
          var hit = M.caught_by[b[0]].indexOf(t[0]) !== -1;
          if (hit) any = true;
          tr.appendChild(el("td", hit ? "tdm-cell tdm-hit" : "tdm-cell", hit ? "caught" : "pass"));
        });
        tr.appendChild(el("td", any ? "tdm-cell tdm-ok" : "tdm-cell tdm-ship", any ? "caught" : "ships"));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }
    var api = {
      setRung: function (id) {
        if (id === "cheapest") st.suite = cheapest(st.tight ? "tight" : "normal") || [];
        else { var r = RUNGS.filter(function (x) { return x[0] === id; })[0]; if (!r) return; st.suite = r[2].slice(); }
        st.rung = id; render();
      },
      setTight: function (v) { st.tight = !!v; if (st.rung === "cheapest") st.suite = cheapest(st.tight ? "tight" : "normal") || []; render(); },
      state: function () { var sc = score(st.suite, st.tight ? "tight" : "normal"); return { rung: st.rung, tight: st.tight, suite: st.suite.slice(), caught: sc.caught, ships: sc.ships.length, false_alarms: sc.false_alarms, cost: sc.cost }; },
      canon: canon
    };
    api.setRung(st.rung);
    return api;
  }

  function mountBreak(root) {
    root.innerHTML = "";
    var head = el("div", "tdm-head");
    head.appendChild(el("h4", null, "Break one transform, then read the existing test"));
    head.appendChild(el("p", "tdm-rail", RAIL));
    root.appendChild(head);
    var sel = document.createElement("select");
    sel.className = "tdm-select";
    sel.setAttribute("aria-label", "Bug to inject");
    var o0 = document.createElement("option"); o0.value = ""; o0.textContent = "No bug (the clean pipeline)"; sel.appendChild(o0);
    BUGS.forEach(function (b) { var o = document.createElement("option"); o.value = b[0]; o.textContent = b[1] + ": " + b[2]; sel.appendChild(o); });
    root.appendChild(sel);
    var out = el("div", "tdm-headline"); root.appendChild(out);
    function render() {
      var b = sel.value, M = matrix("normal"), d = b ? M.details[b] : M.details.clean, cl = M.details.clean;
      var smokeFails = b ? M.caught_by[b].indexOf("smoke") !== -1 : M.false_alarms.indexOf("smoke") !== -1;
      out.innerHTML = "";
      var big = el("div", "tdm-big");
      big.appendChild(el("b", null, smokeFails ? "red" : "green"));
      big.appendChild(el("span", null, "the existing smoke test (the job ran and wrote rows)"));
      out.appendChild(big);
      var tbl = el("table", "clean tdm-table tdm-small"), tb = el("tbody");
      [["Clean trip rows written", cl.rows, d.rows], ["Trips rejected (unknown station)", cl.rejected, d.rejected],
        ["Median trip, km", cl.median_km, d.median_km], ["Hour profile distance from week 1", cl.tvd, d.tvd],
        ["Forecast error on 22-31 May (MAE, trips per station-hour)", cl.mae, d.mae]].forEach(function (r) {
        var tr = el("tr");
        tr.appendChild(el("td", null, r[0]));
        tr.appendChild(el("td", "tdm-num", fmt(r[1])));
        tr.appendChild(el("td", "tdm-num" + (r[1] !== r[2] ? " tdm-moved" : ""), fmt(r[2])));
        tb.appendChild(tr);
      });
      var th = el("thead"), hr = el("tr");
      ["Output", "Clean", b ? "With this bug" : "Clean again"].forEach(function (x) { hr.appendChild(el("th", null, x)); });
      th.appendChild(hr); tbl.appendChild(th); tbl.appendChild(tb);
      out.appendChild(tbl);
      if (b) {
        var n = M.caught_by[b].length;
        out.appendChild(el("p", "tdm-note", n + " of the 17 tests on the session 4 bench would fail on this bug. The one Wrenfold runs today is not among them."));
      }
    }
    sel.addEventListener("change", render);
    render();
    return { set: function (b) { sel.value = b || ""; render(); }, canon: canon };
  }

  window.TDM_ENGINE = { run: run, runTests: runTests, matrix: matrix, score: score, cheapest: cheapest, canon: canon, BUGS: BUGS, TESTS: TESTS };
  function init() {
    var roots = document.querySelectorAll(".tdm-bench");
    for (var i = 0; i < roots.length; i++) {
      var mode = roots[i].getAttribute("data-mode") || "full";
      var api = mode === "break" ? mountBreak(roots[i]) : mountFull(roots[i]);
      if (mode === "break") window.TDM_BREAK = api; else window.TDM_BENCH = api;
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
