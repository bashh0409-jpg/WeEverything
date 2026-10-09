import { createClient } from "@supabase/supabase-js";

const usage = () => {
  console.log(`Usage:
  npm run passkeys:admin -- list <user-id>
  npm run passkeys:admin -- delete <user-id> <passkey-id> --confirm
  npm run passkeys:admin -- list-factors <user-id>
  npm run passkeys:admin -- delete-factor <user-id> <factor-id> --confirm

List passkeys or factors first, then copy the exact ID to delete.
Deleting a verified MFA factor signs the user out of all active sessions.
Credentials are read from .env.local and are never printed.`);
};

const [action, userId, resourceId, confirmation] = process.argv.slice(2);
if (!action || action === "--help" || action === "-h") {
  usage();
  process.exit(action ? 0 : 1);
}

const supportedActions = [
  "list",
  "delete",
  "list-factors",
  "delete-factor",
];
if (!supportedActions.includes(action)) {
  usage();
  process.exit(1);
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidPattern.test(userId ?? "")) {
  console.error("Provide a valid Supabase user UUID.");
  process.exit(1);
}
const isDelete = action === "delete" || action === "delete-factor";
const isFactorAction = action === "list-factors" || action === "delete-factor";
const resourceName = isFactorAction ? "factor" : "passkey";
if (isDelete && !uuidPattern.test(resourceId ?? "")) {
  console.error(`Provide a valid ${resourceName} UUID.`);
  process.exit(1);
}
if (!isDelete && resourceId !== undefined) {
  usage();
  process.exit(1);
}
if (isDelete && (confirmation !== "--confirm" || process.argv.length !== 6)) {
  console.error("Deletion requires the exact --confirm flag.");
  usage();
  process.exit(1);
}

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

if (action === "list" || action === "delete") {
  const { data: passkeys, error: listError } =
    await admin.auth.admin.passkey.listPasskeys({ userId });
  if (listError) {
    console.error(`Could not list passkeys: ${listError.message}`);
    process.exit(1);
  }

  if (action === "list") {
    if (passkeys.length === 0) {
      console.log("No passkeys found for that user.");
    } else {
      console.table(
        passkeys.map(({ id, friendly_name, created_at }) => ({
          id,
          name: friendly_name || "(unnamed)",
          created_at,
        })),
      );
    }
    process.exit(0);
  }

  const passkey = passkeys.find((item) => item.id === resourceId);
  if (!passkey) {
    console.error("That passkey ID is not registered to the specified user.");
    process.exit(1);
  }

  const { error: deleteError } = await admin.auth.admin.passkey.deletePasskey({
    userId,
    passkeyId: resourceId,
  });
  if (deleteError) {
    console.error(`Could not delete passkey: ${deleteError.message}`);
    process.exit(1);
  }

  console.log(
    `Deleted passkey "${passkey.friendly_name || passkey.id}" from user ${userId}.`,
  );
} else {
  const { data, error: listError } = await admin.auth.admin.mfa.listFactors({
    userId,
  });
  if (listError) {
    console.error(`Could not list MFA factors: ${listError.message}`);
    process.exit(1);
  }

  if (action === "list-factors") {
    const factors = data.factors;
    if (factors.length === 0) {
      console.log("No MFA factors found for that user.");
    } else {
      console.table(
        factors.map(({ id, friendly_name, factor_type, status, created_at }) => ({
          id,
          name: friendly_name || "(unnamed)",
          type: factor_type,
          status,
          created_at,
        })),
      );
    }
    process.exit(0);
  }

  const factor = data.factors.find((item) => item.id === resourceId);
  if (!factor) {
    console.error("That MFA factor is not registered to the specified user.");
    process.exit(1);
  }
  if (factor.factor_type !== "totp") {
    console.error("Only TOTP authenticator factors can be deleted by this command.");
    process.exit(1);
  }

  const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({
    userId,
    id: resourceId,
  });
  if (deleteError) {
    console.error(`Could not delete MFA factor: ${deleteError.message}`);
    process.exit(1);
  }

  console.log(
    `Deleted TOTP factor "${factor.friendly_name || factor.id}" from user ${userId}.`,
  );
}
