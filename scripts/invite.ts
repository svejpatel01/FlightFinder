// Manage the sign-in allowlist.
//
//   npm run invite -- add sam@example.com "friend from work"
//   npm run invite -- list
//   npm run invite -- remove sam@example.com
//   npm run invite -- seed           # (re)add OWNER_EMAIL

import "dotenv/config";
import {
  addInvite,
  ensureOwnerInvite,
  listInvites,
  removeInvite,
} from "../lib/invites";
import { prisma } from "../lib/db";

async function main() {
  const [cmd, email, note] = process.argv.slice(2);

  switch (cmd) {
    case "add": {
      if (!email) throw new Error("usage: npm run invite -- add <email> [note]");
      const inv = await addInvite(email, note);
      console.log(`invited ${inv.email}`);
      break;
    }
    case "remove": {
      if (!email) throw new Error("usage: npm run invite -- remove <email>");
      const { count } = await removeInvite(email);
      console.log(count ? `removed ${email}` : `no invite for ${email}`);
      break;
    }
    case "seed": {
      await ensureOwnerInvite();
      console.log(`ensured OWNER_EMAIL invite (${process.env.OWNER_EMAIL ?? "unset"})`);
      break;
    }
    case "list":
    default: {
      const rows = await listInvites();
      if (rows.length === 0) {
        console.log("(no invites)");
        break;
      }
      for (const r of rows) {
        console.log(
          `${r.email.padEnd(32)} ${r.claimedAt ? "claimed" : "pending"}` +
            `${r.note ? `  — ${r.note}` : ""}`,
        );
      }
    }
  }
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
