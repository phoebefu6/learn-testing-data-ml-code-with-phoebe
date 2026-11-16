"""Write window.MINDMAP_DATA into index.html with json.dumps (never string interpolation)."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "..", "index.html")
F = ["01-what-test-would-fail.html", "02-unit-tests-for-transforms.html", "03-data-checks.html",
     "04-the-bug-catcher.html", "05-model-behaviour-tests.html", "06-a-test-strategy-that-runs.html"]
S = [
    ("What test\nwould fail?", "#34D399", ["Silent failure", "Twelve bug classes", "A pyramid for data"]),
    ("Unit tests for\ntransforms", "#34D399", ["Arrange, act, assert", "Fixtures and parametrize", "Pure functions vs IO"]),
    ("Data checks", "#FBBF24", ["Schema and ranges", "Reconcile and unique", "Distribution, false alarms"]),
    ("The bug\ncatcher", "#FB923C", ["Catch matrix", "Tighten thresholds", "Cheapest full catch"]),
    ("Model behaviour\ntests", "#FB923C", ["MFT, INV, DIR", "The ML Test Score", "Metrics that flatter"]),
    ("A test strategy\nthat runs", "#F87171", ["Commit, nightly, release", "Flaky data tests", "Owners and budget"]),
]
data = {"title": "Testing Data\n& ML Code", "centerColor": "#5A3700", "sessions": [
    {"label": l, "href": "courses/" + f, "color": c, "concepts": [{"label": x, "href": "courses/" + f} for x in cs]}
    for f, (l, c, cs) in zip(F, S)]}
html = open(P).read()
block = "<script>\nwindow.MINDMAP_DATA = " + json.dumps(data, indent=1) + ";\n</script>"
html = re.sub(r"<script>\nwindow\.MINDMAP_DATA = .*?;\n</script>", lambda m: block, html, flags=re.S)
open(P, "w").write(html)
print("ok")
