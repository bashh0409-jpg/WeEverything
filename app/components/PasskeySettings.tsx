"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getPasskeyDomainError } from "@/lib/passkeys";

type Passkey = {
  id: string;
  friendly_name?: string;
};

type PasskeyAction =
  | { type: "add" }
  | { type: "remove"; passkey: Passkey };

const PasskeySettings = () => {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [requiresStepUp, setRequiresStepUp] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPasskeys = useCallback(async () => {
    if (!supabase) {
      setMessage("Passkeys are not configured.");
      setLoading(false);
      return;
    }

    try {
      setRequiresStepUp(true);
      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (
        assurance.currentLevel !== "aal2" &&
        assurance.nextLevel === "aal2"
      ) {
        setRequiresStepUp(true);
        const { data: factors, error: factorsError } =
          await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const verifiedTotpId =
          factors.totp.find((factor) => factor.status === "verified")?.id ??
          null;
        setTotpFactorId(verifiedTotpId);
        setPasskeys([]);
        setMessage(
          verifiedTotpId
            ? "Verify your authenticator app before viewing or managing passkeys."
            : "AAL2 verification is required, but no verified authenticator app is available. Regain access to your TOTP factor or contact Supabase Support.",
        );
        return;
      }

      setTotpFactorId(null);
      setRequiresStepUp(false);
      const { data, error } = await supabase.auth.passkey.list();
      if (error) throw error;
      setPasskeys(data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load your passkey settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadPasskeys();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadPasskeys]);

  const verifyTotpStepUp = async () => {
    if (!supabase || !totpFactorId || verificationCode.length !== 6 || busy)
      return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactorId,
        code: verificationCode,
      });
      if (error) throw error;
      setVerificationCode("");
      setTotpFactorId(null);
      await loadPasskeys();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not verify your authenticator code.",
      );
    } finally {
      setBusy(false);
    }
  };

  const addPasskey = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      const name = data.friendly_name || `Passkey ${passkeys.length + 1}`;
      setPasskeys((current) => [...current, data]);
      setMessage(`${name} added. You can now use it to sign in.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not add this passkey.",
      );
    }
  };

  const removePasskey = async (passkey: Passkey) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.passkey.delete({
        passkeyId: passkey.id,
      });
      if (error) throw error;
      setPasskeys((current) =>
        current.filter((item) => item.id !== passkey.id),
      );
      setMessage("Passkey removed.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not remove this passkey.",
      );
    }
  };

  const runAction = async (action: PasskeyAction) => {
    if (!supabase || busy) return;
    if (action.type === "add") {
      const domainError = getPasskeyDomainError(window.location.hostname);
      if (domainError) {
        setMessage(domainError);
        return;
      }
      if (!window.isSecureContext || !window.PublicKeyCredential) {
        setMessage(
          "Passkeys require a supported browser on a secure connection.",
        );
        return;
      }
    }

    setBusy(true);
    setMessage("");
    try {
      if (action.type === "add") {
        await addPasskey();
      } else {
        await removePasskey(action.passkey);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not manage your passkey.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 border-t-2 border-black/5 pt-5">
      <p className="text-sm font-medium tracking-tight text-black">Passkeys</p>
      <p className="geist mt-2 text-sm font-medium leading-4 tracking-tight text-[#999]">
        Sign in with a device PIN or biometrics.
      </p>
      {totpFactorId ? (
        <div className="mt-4">
          <label className="block text-xs font-medium text-[#555]">
            Enter your six-digit authenticator code to manage passkeys
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verificationCode}
              onChange={(event) =>
                setVerificationCode(
                  event.currentTarget.value.replace(/\D/g, "").slice(0, 6),
                )
              }
              maxLength={6}
              className="mt-2 w-full rounded border border-black/15 px-3 py-2 text-sm tracking-[0.2em] text-black"
            />
          </label>
          <button
            type="button"
            onClick={() => void verifyTotpStepUp()}
            disabled={busy || verificationCode.length !== 6}
            className="mt-2 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify and continue"}
          </button>
        </div>
      ) : null}
      {loading ? (
        <p className="geist mt-2 text-sm font-medium leading-4 tracking-tight text-[#999]">
          Checking your passkeys…
        </p>
      ) : requiresStepUp ? (
        <p className="geist mt-2 text-sm font-medium leading-4 tracking-tight text-[#999]">
          Verify your identity to view or manage passkeys.
        </p>
      ) : (
        <>
          {passkeys.length ? (
            <ul className="mt-3 space-y-2">
              {passkeys.map((passkey, index) => (
                <li
                  key={passkey.id}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="geist mt-2 text-sm font-medium leading-4 tracking-tight text-green-500">
                    {passkey.friendly_name || `Passkey ${index + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => void runAction({ type: "remove", passkey })}
                    disabled={busy}
                    className="max-w-full capitalize geist max-h-7 mt-4 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="geist mt-2 text-sm font-medium leading-4 tracking-tight text-[#999]">
              No passkey added yet.
            </p>
          )}
          <button
            type="button"
            onClick={() => void runAction({ type: "add" })}
            disabled={busy}
            className="max-w-full capitalize geist max-h-7 mt-4 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
          >
            {busy ? "Please wait…" : "Add key"}
          </button>
        </>
      )}

      {message ? (
        <p className="geist mt-2 text-xs font-semibold leading-4 tracking-tight text-[#999]">
          {message}
        </p>
      ) : null}
    </section>
  );
};

export default PasskeySettings;
