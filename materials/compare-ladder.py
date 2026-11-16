"""Compare the python reference canon with the node canon BY VALUE.
Usage: python3 compare-ladder.py py.json node.json [--plant]
--plant perturbs one node number by 0.1% and must make the comparison FAIL (verifier self-test)."""
import json, sys

def walk(a, b, path, errs):
    if isinstance(a, dict):
        if not isinstance(b, dict) or set(a) != set(b):
            errs.append(path + " keys differ"); return
        for k in a: walk(a[k], b[k], path + "." + k, errs)
    elif isinstance(a, list):
        if not isinstance(b, list) or len(a) != len(b):
            errs.append(path + " length differs"); return
        for i, (x, y) in enumerate(zip(a, b)): walk(x, y, "%s[%d]" % (path, i), errs)
    elif isinstance(a, (int, float)) and not isinstance(a, bool):
        if not isinstance(b, (int, float)) or abs(a - b) > 1e-9 * max(1, abs(a)):
            errs.append("%s %r != %r" % (path, a, b))
    elif a != b:
        errs.append("%s %r != %r" % (path, a, b))

py = json.load(open(sys.argv[1])); nd = json.load(open(sys.argv[2]))
if "--plant" in sys.argv:
    nd["profile"]["mae"] *= 1.001
errs = []
walk(py, nd, "canon", errs)
for e in errs[:20]: print(e)
print("MATCH" if not errs else "MISMATCH (%d)" % len(errs))
sys.exit(1 if errs else 0)
