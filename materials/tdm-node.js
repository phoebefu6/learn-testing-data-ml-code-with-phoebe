// Runs assets/tdm-live.js headlessly in node and prints the canon JSON.
// Usage: node tdm-node.js > node.json
var fs = require("fs"), path = require("path");
global.window = {};
global.document = { readyState: "complete", querySelectorAll: function () { return []; } };
eval(fs.readFileSync(path.join(__dirname, "..", "assets", "tdm-sample.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "assets", "tdm-live.js"), "utf8"));
process.stdout.write(JSON.stringify(window.TDM_ENGINE.canon(), null, 1));
