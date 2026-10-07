// Runs the arrow-key navigation test in headless Edge and reports the NAVTEST result. Exit code 1 on FAIL.
// The page is generated fresh from wwwroot/index.html so it can never drift out of sync with the app.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const root = path.join(__dirname, "..", "..");
const html = fs.readFileSync(path.join(root, "wwwroot", "index.html"), "utf8")
  .replaceAll("https://app.local/", "../../wwwroot/")
  .replace("</body>", '<script src="nav.js"></script></body>');
const page = path.join(__dirname, "nav.gen.html");
fs.writeFileSync(page, html);

const dom = execFileSync(edge, [
  "--headless=new", "--disable-gpu", "--window-size=1000,800", "--virtual-time-budget=5000", "--dump-dom", page,
], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const m = dom.match(/<pre id="result">([^<]*)<[/]pre>/);
if (!m) { console.error("no result — did the page load?"); process.exit(2); }
console.log(m[1]);
process.exit(/FAIL/.test(m[1]) ? 1 : 0);
