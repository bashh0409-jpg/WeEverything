import { createClient } from "@supabase/supabase-js";

const usage = () => {
  console.log(`Usage:
  npm run passkeys:clear
  npm run passkeys:clear -- --confirm

Without --confirm, list all passkeys that would be deleted.
Credentials are read from .env.local and are never printed.`);
};

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--confirm")) {
  usage();
  process.exit(1);
}
const confirmed = args[0] === "--confirm";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    experimental: { passkey: true },
  },
});

const perPage = 1000;
const users = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
  if (error) {
    console.error(`Could not list users on page ${page}: ${error.message}`);
    process.exit(1);
  }
  users.push(...data.users);
  if (data.users.length < perPage) break;
}

const passkeys = [];
const listErrors = [];
for (const user of users) {
  const { data, error } = await admin.auth.admin.passkey.listPasskeys({
    userId: user.id,
  });
  if (error) {
    listErrors.push({ userId: user.id, message: error.message });
    continue;
  }
  passkeys.push(
    ...data.map((passkey) => ({
      userId: user.id,
      passkeyId: passkey.id,
      name: passkey.friendly_name || "(unnamed)",
    })),
  );
}

if (listErrors.length > 0) {
  console.error(
    `Could not inspect passkeys for ${listErrors.length} user(s); no passkeys were deleted.`,
  );
  for (const { userId, message } of listErrors) {
    console.error(`User ${userId}: ${message}`);
  }
  process.exit(1);
}

const affectedUsers = new Set(passkeys.map(({ userId }) => userId)).size;
console.log(
  `Found ${passkeys.length} passkey(s) across ${affectedUsers} user(s).`,
);

if (!confirmed) {
  console.log(
    "No changes made. Re-run with --confirm to delete these passkeys.",
  );
  process.exit(0);
}

let deletedCount = 0;
const deleteErrors = [];
for (const { userId, passkeyId } of passkeys) {
  const { error } = await admin.auth.admin.passkey.deletePasskey({
    userId,
    passkeyId,
  });
  if (error) {
    deleteErrors.push({ userId, passkeyId, message: error.message });
    continue;
  }
  deletedCount += 1;
}

console.log(`Deleted ${deletedCount} of ${passkeys.length} passkey(s).`);
if (deleteErrors.length > 0) {
  console.error(`Could not delete ${deleteErrors.length} passkey(s):`);
  for (const { userId, passkeyId, message } of deleteErrors) {
    console.error(`User ${userId}, passkey ${passkeyId}: ${message}`);
  }
  process.exit(1);
}
