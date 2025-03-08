const fs = require('fs');
const path = require("path");

function cleanJunk(dir, extensions) {
    const d = fs.readdirSync(dir);
    let removedCount = 0;

    for (const fd of d) {
        const pfd = path.join(dir, fd);
        if (fs.statSync(pfd).isDirectory()) {
            removedCount += cleanJunk(pfd, extensions);
        } else {
            const ex = extensions.filter((v) => fd.endsWith(v));
            if (ex.length) {
                removedCount++;
                console.log("Cleaning " + pfd);
                fs.unlinkSync(pfd);
            } else continue;
        }
    }

    return removedCount;
}

const count = cleanJunk(path.join(process.cwd(), "lib"), [".d.ts", ".js"]);

console.log(`Cleaned ${count} files.`);