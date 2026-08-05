const http = require("http");
const fs = require("fs");
const events = JSON.parse(fs.readFileSync("test/fixtures/mis-api-contract-sample.json", "utf8"));
http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url.startsWith("/api/v1/health")) {
    res.end(JSON.stringify({ status: "ok", lastIngestAt: new Date().toISOString(), eventCount: events.length }));
  } else if (req.url.startsWith("/api/v1/disruptions")) {
    res.end(JSON.stringify({ generatedAt: new Date().toISOString(), count: events.length, events }));
  } else if (req.url.startsWith("/api/v1/vessels")) {
    res.end(JSON.stringify({ available: false, count: 0, vessels: [] }));
  } else {
    res.statusCode = 404; res.end();
  }
}).listen(3061, () => console.log("fake MIS on 3061"));
