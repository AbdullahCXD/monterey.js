const { writeFileSync } = require("fs");
const { Monterey } = require("..");
const monterey = new Monterey();
monterey.setTranspiler();

const r = monterey.buildFile("test.monjson");

writeFileSync("output.js", r)