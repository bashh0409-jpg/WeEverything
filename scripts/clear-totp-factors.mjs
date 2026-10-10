import { createClient } from "@supabase/supabase-js";

const usage = () => {
  console.log(`Usage:
  npm run totp:clear
  npm run totp:clear -- --confirm

Without --confirm, list the TOTP factors that would be deleted.
Deleting verified factors signs affected users out of all active sessions.
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

const totpFactors = [];
const factorErrors = [];
for (const user of users) {
  const { data, error } = await admin.auth.admin.mfa.listFactors({
    userId: user.id,
  });
  if (error) {
    factorErrors.push({ userId: user.id, message: error.message });
    continue;
  }
  totpFactors.push(
    ...data.factors
      .filter((factor) => factor.factor_type === "totp")
      .map((factor) => ({ userId: user.id, factor })),
  );
}

if (factorErrors.length > 0) {
  console.error(
    `Could not inspect MFA factors for ${factorErrors.length} user(s); no factors were deleted.`,
  );
  for (const { userId, message } of factorErrors) {
    console.error(`User ${userId}: ${message}`);
  }
  process.exit(1);
}

const affectedUsers = new Set(totpFactors.map(({ userId }) => userId)).size;
console.log(
  `Found ${totpFactors.length} TOTP factor(s) across ${affectedUsers} user(s).`,
);

if (!confirmed) {
  console.log(
    "No changes made. Re-run with --confirm to delete these factors.",
  );
  process.exit(0);
}

let deletedCount = 0;
const deleteErrors = [];
for (const { userId, factor } of totpFactors) {
  const { error } = await admin.auth.admin.mfa.deleteFactor({
    userId,
    id: factor.id,
  });
  if (error) {
    deleteErrors.push({ userId, factorId: factor.id, message: error.message });
    continue;
  }
  deletedCount += 1;
}

console.log(`Deleted ${deletedCount} of ${totpFactors.length} TOTP factor(s).`);
if (deletedCount > 0) {
  console.log(
    "Users whose verified TOTP factors were deleted may be signed out of active sessions.",
  );
}
if (deleteErrors.length > 0) {
  console.error(`Could not delete ${deleteErrors.length} TOTP factor(s):`);
  for (const { userId, factorId, message } of deleteErrors) {
    console.error(`User ${userId}, factor ${factorId}: ${message}`);
  }
  process.exit(1);
}
