"""Python reference for the bug catcher bench (assets/tdm-live.js).

Same pipeline, same 12 bug injectors, same 17 tests, same arithmetic order as the browser engine.
Prints the canon as JSON. compare-ladder.py checks it against the node run by VALUE.

Usage: python3 tdm_reference.py [path to assets/tdm-sample.js]
"""
import json
import math
import os
import re
import sys
from itertools import combinations

HERE = os.path.dirname(os.path.abspath(__file__))
WEEKEND = {1, 2, 8, 9, 15, 16, 22, 23, 29, 30}
HOURS = 744
TRAIN_LAST_DAY = 21

BUGS = ["null_coercion", "join_fanout", "unit_miles", "timezone", "dup_trips", "dropped_station",
        "leakage", "label_shift", "serve_skew", "off_by_one", "type_coercion", "stale_ref"]

TESTS = [  # id, kind, cost (modelled units)
    ("smoke", "smoke", 1),
    ("u_distance", "unit", 1),
    ("u_bucket", "unit", 1),
    ("u_aggregate", "unit", 1),
    ("u_parity", "unit", 1),
    ("d_schema", "schema", 2),
    ("d_reconcile", "data", 3),
    ("d_unique", "data", 3),
    ("d_range", "data", 2),
    ("d_referential", "data", 3),
    ("d_dist_drift", "data", 5),
    ("d_hour_drift", "data", 5),
    ("d_split", "data", 1),
    ("b_mft", "behaviour", 8),
    ("b_inv", "behaviour", 20),
    ("b_dir", "behaviour", 12),
    ("m_holdout", "metric", 10),
]
REJECT_MAX = 0.002  # referential: at most 0.2% of trips may point at an unknown station
THRESH = {
    "normal": {"dist": 0.15, "tvd": 0.08, "mae": 2.2},
    "tight": {"dist": 0.01, "tvd": 0.02, "mae": 1.9},
}
ID_RE = re.compile(r"^\d{3}$")


def load_sample(path):
    txt = open(path).read()
    return json.loads(txt[txt.index("{"): txt.rindex("}") + 1])


def js_round(x, n):
    f = 10 ** n
    return math.floor(x * f + 0.5) / f


# ---------------- pipeline ----------------
def raw_rows(S, copies=2, drop_station=None):
    """The published file carries every row twice: rebuild that. copies=4 is a re-run of the load."""
    out = []
    t = 0
    base = []
    for i in range(len(S["dsec"])):
        t += S["dsec"][i]
        sid = S["meta"]["forecast"][S["s"][i]]
        if drop_station is not None and sid == drop_station:
            continue
        base.append((t, S["dur"][i], S["dist"][i], sid, S["ids"][S["r"][i]]))
    for _ in range(copies // 2):
        for row in base:
            out.append(row)
            out.append(row)
    return out


def parse_id(x, bugs):
    return str(int(x)) if "type_coercion" in bugs else x


def dist_km(m, bugs):
    if m == 0 or m > 50000:
        return 0.0 if "null_coercion" in bugs else None
    return m / 1609.344 if "unit_miles" in bugs else m / 1000


def hour_bucket(sec, bugs):
    if "timezone" in bugs:
        return (sec + 10800) // 3600
    if "off_by_one" in bugs:
        return -((-sec) // 3600)
    return sec // 3600


def ref_table(S, bugs):
    ref = {}
    for k, cap, city in S["ref"]:
        if "stale_ref" in bugs and int(k) >= S["staleFrom"]:
            continue
        ref[k] = [cap]
    if "join_fanout" in bugs:
        for k, cap in S["history"]:
            if k in ref:
                ref[k] = ref[k] + [cap]
    return ref


def clean(raw, S, bugs):
    ref = ref_table(S, bugs)
    seen = set()
    rows = []
    rejected = 0
    kept = 0
    for (sec, dur, dm, s, r) in raw:
        s = parse_id(s, bugs)
        r = parse_id(r, bugs)
        key = (sec, dur, dm, s, r)
        if "dup_trips" not in bugs:
            if key in seen:
                continue
            seen.add(key)
        if dur < 60:
            continue
        kept += 1
        if r not in ref:
            rejected += 1
            continue
        caps = ref.get(s, [None])
        for cap in caps:
            rows.append({"sec": sec, "dur": dur, "dm": dm, "s": s, "r": r, "km": dist_km(dm, bugs),
                         "hour": hour_bucket(sec, bugs), "cap": cap})
    return {"rows": rows, "rejected": rejected, "kept": kept, "ref": ref}


def aggregate(rows, stations, bugs):
    st = stations[:-1] if "dropped_station" in bugs else stations
    agg = {s: [0] * HOURS for s in st}
    for row in rows:
        h = row["hour"]
        if h < 0 or h >= HOURS:
            continue
        k = row["r"] if "label_shift" in bugs else row["s"]
        if k in agg:
            agg[k][h] += 1
    return agg


def day_of(h):
    return h // 24 + 1


def train_feat(h):
    return (1 if day_of(h) in WEEKEND else 0, h % 24)


def serve_feat(h, bugs):
    if "serve_skew" in bugs:
        return (1 if day_of(h) in WEEKEND else 0, (h - 3) % 24)
    return train_feat(h)


def fit(agg, bugs):
    last = 31 if "leakage" in bugs else TRAIN_LAST_DAY
    days = list(range(1, last + 1))
    model = {}
    for s in agg:
        sums = [[0.0] * 24, [0.0] * 24]
        cnts = [[0] * 24, [0] * 24]
        for d in days:
            for hod in range(24):
                h = (d - 1) * 24 + hod
                dt, _ = train_feat(h)
                sums[dt][hod] += agg[s][h]
                cnts[dt][hod] += 1
        model[s] = [[sums[dt][hod] / cnts[dt][hod] for hod in range(24)] for dt in (0, 1)]
    return {"model": model, "days": days}


def predict(model, s, h, bugs):
    dt, hod = serve_feat(h, bugs)
    return model[s][dt][hod]


def run(S, bugs, raw=None):
    raw = raw if raw is not None else raw_rows(S)
    c = clean(raw, S, bugs)
    stations = [parse_id(x, bugs) for x in S["meta"]["forecast"]]
    agg = aggregate(c["rows"], stations, bugs)
    f = fit(agg, bugs)
    preds = {}
    err = 0.0
    n = 0
    for s in agg:
        p = []
        for h in range(TRAIN_LAST_DAY * 24, HOURS):
            v = predict(f["model"], s, h, bugs)
            p.append(v)
            err += abs(v - agg[s][h])
            n += 1
        preds[s] = p
    mae = err / n if n else float("nan")
    return {"clean": c, "agg": agg, "fit": f, "preds": preds, "mae": mae, "stations": stations}


# ---------------- profiles stored from a known-good run (week 1) ----------------
def median(xs):
    xs = sorted(xs)
    n = len(xs)
    if n == 0:
        return float("nan")
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2


def hour_share(rows, last_day=31):
    c = [0] * 24
    tot = 0
    for row in rows:
        h = row["hour"]
        if 0 <= h < HOURS and day_of(h) <= last_day:
            c[h % 24] += 1
            tot += 1
    return [x / tot if tot else 0 for x in c]


def stored_profile(S):
    good = run(S, [])
    wk = [r for r in good["clean"]["rows"] if day_of(r["hour"]) <= 7]
    return {
        "median_km": median([r["km"] for r in wk if r["km"] is not None]),
        "share": hour_share(wk, 7),
        "mae": good["mae"],
    }


# ---------------- tests ----------------
def run_tests(S, bugs, prof, mode):
    th = THRESH[mode]
    R = run(S, bugs)
    rows = R["clean"]["rows"]
    out = {}
    out["smoke"] = len(rows) > 0 and not math.isnan(R["mae"])
    # unit tests: the same functions, small fake data
    out["u_distance"] = [dist_km(2043, bugs), dist_km(0, bugs), dist_km(60000, bugs)] == [2.043, None, None]
    out["u_bucket"] = [hour_bucket(x, bugs) for x in (0, 3599, 3600, 2678245)] == [0, 0, 1, 743]
    fx = [{"s": "001", "r": "002", "hour": 5}]
    a = aggregate(fx, ["001", "002"], bugs)
    out["u_aggregate"] = ("001" in a and "002" in a and a["001"][5] == 1 and a["002"][5] == 0)
    out["u_parity"] = all(train_feat(h) == serve_feat(h, bugs) for h in (0, 7, 100, 503, 600))
    # data checks
    out["d_schema"] = all(ID_RE.match(r["s"]) and ID_RE.match(r["r"]) and isinstance(r["cap"], int)
                          and (r["km"] is None or isinstance(r["km"], float)) for r in rows)
    # reconciliation, computed independently from the raw rows as strings
    raw = raw_rows(S)
    ref_ids = set(R["clean"]["ref"].keys())
    distinct = set(raw)
    exp_clean = sum(1 for (sec, dur, dm, s, r) in distinct if dur >= 60 and r in ref_ids)
    exp_agg = sum(1 for r in rows if r["s"] in R["stations"] and 0 <= r["hour"] < HOURS)
    sum_agg = sum(sum(v) for v in R["agg"].values())
    out["d_reconcile"] = (len(rows) == exp_clean and sum_agg == exp_agg)
    keys = set((r["sec"], r["dur"], r["dm"], r["s"], r["r"]) for r in rows)
    out["d_unique"] = len(keys) == len(rows)
    out["d_range"] = all((r["km"] is None or 0 < r["km"] <= 50) and r["dur"] >= 60 and 0 <= r["hour"] < HOURS
                         for r in rows)
    kept = R["clean"]["kept"]
    rej_rate = R["clean"]["rejected"] / kept if kept else 1.0
    out["d_referential"] = rej_rate <= REJECT_MAX and all(s in R["clean"]["ref"] for s in R["stations"])
    med = median([r["km"] for r in rows if r["km"] is not None])
    out["d_dist_drift"] = abs(med / prof["median_km"] - 1) <= th["dist"]
    sh = hour_share(rows)
    tvd = 0.5 * sum(abs(sh[i] - prof["share"][i]) for i in range(24))
    out["d_hour_drift"] = tvd <= th["tvd"]
    out["d_split"] = max(R["fit"]["days"]) < TRAIN_LAST_DAY + 1
    # behaviour tests, through the serving path
    m = R["fit"]["model"]
    mft = True
    for s in R["agg"]:
        h4 = 23 * 24 + 4   # Monday 24 May, 04:00
        h8 = 23 * 24 + 8   # Monday 24 May, 08:00
        if not predict(m, s, h4, bugs) < predict(m, s, h8, bugs):
            mft = False
    out["b_mft"] = mft
    R2 = run(S, bugs, raw_rows(S, copies=4))
    inv = set(R2["preds"].keys()) == set(R["preds"].keys()) and all(
        abs(a - b) < 1e-9 for s in R["preds"] for a, b in zip(R["preds"][s], R2["preds"][s]))
    out["b_inv"] = inv
    closed = S["meta"]["forecast"][0]
    sk = parse_id(closed, bugs)
    R3 = run(S, bugs, raw_rows(S, drop_station=closed))
    if sk in R["preds"] and sk in R3["preds"]:
        before = sum(R["preds"][sk]) / len(R["preds"][sk])
        after = sum(R3["preds"][sk]) / len(R3["preds"][sk])
        out["b_dir"] = before > 0 and after <= 0.1 * before
    else:
        out["b_dir"] = False
    out["m_holdout"] = R["mae"] <= th["mae"]
    detail = {"rows": len(rows), "rejected": R["clean"]["rejected"], "kept": kept,
              "rej_rate": js_round(rej_rate, 4), "median_km": js_round(med, 4), "tvd": js_round(tvd, 4),
              "mae": js_round(R["mae"], 4)}
    return out, detail


def canon(S):
    prof = stored_profile(S)
    res = {"profile": {"median_km": js_round(prof["median_km"], 4), "mae": js_round(prof["mae"], 4),
                       "share_peak": prof["share"].index(max(prof["share"]))}}
    for mode in ("normal", "tight"):
        clean_out, clean_detail = run_tests(S, [], prof, mode)
        mat = {}
        details = {"clean": clean_detail}
        for b in BUGS:
            o, d = run_tests(S, [b], prof, mode)
            mat[b] = [t for t, _, _ in TESTS if not o[t]]
            details[b] = d
        res[mode] = {"false_alarms": [t for t, _, _ in TESTS if not clean_out[t]], "caught_by": mat,
                     "details": details}
    # ladder (normal thresholds)
    cost = {t: c for t, _, c in TESTS}
    kinds = {t: k for t, k, _ in TESTS}
    rungs = [
        ("as_found", ["smoke"]),
        ("unit", ["smoke"] + [t for t in cost if kinds[t] == "unit"]),
        ("schema", ["smoke"] + [t for t in cost if kinds[t] in ("unit", "schema")]),
        ("data", ["smoke"] + [t for t in cost if kinds[t] in ("unit", "schema", "data")]),
        ("behaviour", [t for t in cost]),
    ]
    mat = res["normal"]["caught_by"]
    ladder = []

    def score(suite, mode="normal"):
        caught = [b for b in BUGS if any(t in suite for t in res[mode]["caught_by"][b])]
        fa = [t for t in res[mode]["false_alarms"] if t in suite]
        return {"caught": len(caught), "ships": [b for b in BUGS if b not in caught], "false_alarms": len(fa),
                "cost": sum(cost[t] for t in suite)}

    for name, suite in rungs:
        ladder.append(dict(name=name, suite=suite, **score(suite)))
    # cheapest full-catch set, no false alarms (exhaustive)
    best = None
    names = [t for t, _, _ in TESTS]
    for n in range(1, len(names) + 1):
        for combo in combinations(names, n):
            sc = score(list(combo))
            if sc["caught"] == len(BUGS) and sc["false_alarms"] == 0:
                if best is None or sc["cost"] < best[1]["cost"] or (
                        sc["cost"] == best[1]["cost"] and len(combo) < len(best[0])):
                    best = (list(combo), sc)
    if best:
        ladder.append(dict(name="cheapest", suite=best[0], **best[1]))
    res["ladder"] = ladder
    res["tight_all"] = score(names, "tight")
    return res


if __name__ == "__main__":
    p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "assets", "tdm-sample.js")
    print(json.dumps(canon(load_sample(p)), indent=1))
