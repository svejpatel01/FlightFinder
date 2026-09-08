// One-shot scan. Use this to run the job manually or from an external cron.
//
//   npm run scan            # real run: writes snapshots, sends email
//   npm run scan -- --dry-run   # no writes, no email — just show what would fire

import "dotenv/config";
import { runScan } from "../lib/scan";

const dryRun = process.argv.includes("--dry-run");

runScan({ dryRun, verbose: true })
  .then((summary) => {
    console.log("\n=== scan summary ===");
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
