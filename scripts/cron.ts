// Long-running scheduler. Keep this process alive (pm2, systemd, a container,
// tmux, …) and it runs the scan on SCAN_CRON (default: every 6 hours).
//
//   npm run cron               # schedule only
//   npm run cron -- --run-now  # run once immediately, then stay scheduled

import "dotenv/config";
import cron from "node-cron";
import { runScan } from "../lib/scan";
import { ensureOwnerInvite } from "../lib/invites";

const expr = process.env.SCAN_CRON ?? "0 */6 * * *";
if (!cron.validate(expr)) {
  console.error(`Invalid SCAN_CRON expression: "${expr}"`);
  process.exit(1);
}

void ensureOwnerInvite().catch((e) =>
  console.error("[cron] ensureOwnerInvite failed", e),
);

let running = false;

async function tick() {
  if (running) {
    console.warn("[cron] previous scan still running — skipping this tick");
    return;
  }
  running = true;
  const started = new Date();
  console.log(`[cron] scan starting ${started.toISOString()}`);
  try {
    const s = await runScan({ verbose: true });
    if (s.skipped) {
      console.log(`[cron] skipped: ${s.skipped}`);
    } else {
      console.log(
        `[cron] done in ${((Date.now() - started.getTime()) / 1000).toFixed(0)}s — ` +
          `${s.configuredUsers} user(s), ${s.uniqueSearches} searches, ` +
          `${s.snapshotsWritten} snapshots, ${s.dealsMatched} deal(s), ` +
          `${s.emailsSent} email(s), ${s.smsSent} sms`,
      );
    }
  } catch (err) {
    console.error("[cron] scan failed:", err);
  } finally {
    running = false;
  }
}

cron.schedule(expr, tick);
console.log(`[cron] scheduled "${expr}" — Ctrl-C to stop.`);

if (process.argv.includes("--run-now")) void tick();
