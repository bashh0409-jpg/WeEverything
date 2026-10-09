"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getPasskeyDomainError } from "@/lib/passkeys";

type PasskeyFactor = {
  id: string;
  friendly_name?: string;
};

type PasskeyAction =
  | { type: "add" }
  | { type: "remove"; factor: PasskeyFactor };

const PasskeySettings = () => {
  const [factors, setFactors] = useState<PasskeyFactor[]>([]);
  const [stepUpFactors, setStepUpFactors] = useState<{
    webauthnId: string | null;
    totpId: string | null;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PasskeyAction | null>(
    null,
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFactors = async () => {
    if (!supabase) {
      setMessage("Passkeys are not configured.");
      setLoading(false);
      return;
    }

    try {
      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) {
        setMessage(assuranceError.message);
        return;
      }

      if (
        assurance.currentLevel !== "aal2" &&
        assurance.nextLevel === "aal2"
      ) {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) {
          setMessage(error.message);
          return;
        }
        setStepUpFactors({
          webauthnId:
            data.webauthn.find((factor) => factor.status === "verified")?.id ??
            null,
          totpId:
            data.totp.find((factor) => factor.status === "verified")?.id ??
            null,
        });
        setMessage("Verify your identity to view and manage passkeys.");
        return;
      }

      const { data, error } = await supabase.auth.passkey.list();
      if (error) {
        setMessage(error.message);
      } else {
        setFactors(data);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load your passkey settings.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadFactors();
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const addPasskey = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Passkey added. You can now use it to sign in.");
        await loadFactors();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not add this passkey.",
      );
    }
  };

  const removePasskey = async (factor: PasskeyFactor) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.passkey.delete({
        passkeyId: factor.id,
      });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Passkey removed.");
        await loadFactors();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not remove this passkey.",
      );
    }
  };

  const runAction = async (action: PasskeyAction) => {
    if (!supabase) return;
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
      const { data, error } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.currentLevel !== "aal2" && data.nextLevel === "aal2") {
        const { data: enrolled, error: factorsError } =
          await supabase.auth.mfa.listFactors();
        if (factorsError) {
          setMessage(factorsError.message);
          return;
        }
        const webauthnId =
          enrolled.webauthn.find((factor) => factor.status === "verified")
            ?.id ?? null;
        const totpId =
          enrolled.totp.find((factor) => factor.status === "verified")?.id ??
          null;
        if (!webauthnId && !totpId) {
          setMessage(
            "Supabase requires a second-factor check before managing passkeys, but no verified factor is available on this account.",
          );
          return;
        }
        setStepUpFactors({ webauthnId, totpId });
        setPendingAction(action);
        return;
      }

      if (action.type === "add") {
        await addPasskey();
      } else {
        await removePasskey(action.factor);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not verify your sign-in security.",
      );
    } finally {
      setBusy(false);
    }
  };

  const completeStepUp = async (method: "webauthn" | "totp") => {
    if (!supabase || !stepUpFactors) return;
    setBusy(true);
    setMessage("");
    try {
      if (method === "webauthn" && stepUpFactors.webauthnId) {
        const { error } = await supabase.auth.mfa.webauthn.authenticate({
          factorId: stepUpFactors.webauthnId,
        });
        if (error) {
          setMessage(error.message);
          return;
        }
      } else if (
        method === "totp" &&
        stepUpFactors.totpId &&
        verificationCode.length === 6
      ) {
        const { error } = await supabase.auth.mfa.challengeAndVerify({
          factorId: stepUpFactors.totpId,
          code: verificationCode,
        });
        if (error) {
          setMessage(
            "That code could not be verified. Check it and try again.",
          );
          return;
        }
      } else {
        setMessage("Choose an available second-factor method.");
        return;
      }

      const action = pendingAction;
      setPendingAction(null);
      setStepUpFactors(null);
      setVerificationCode("");
      if (action?.type === "add") {
        await addPasskey();
      } else if (action?.type === "remove") {
        await removePasskey(action.factor);
      } else {
        setMessage("");
        await loadFactors();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not verify your second factor.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 border-t-2 border-black/5 pt-5">
      <p className="text-sm  font-medium tracking-tight text-black">Passkeys</p>
      <p className="geist text-sm font-medium leading-4 mt-2 tracking-tight text-[#999]">
        {" "}
        Sign in with Face ID, Touch ID, Windows Hello, or your device PIN
        instead of Google or GitHub.
      </p>
      {loading ? (
        <p className="mt-3 text-xs text-[#777]">Checking your passkeys…</p>
      ) : (
        <>
          {factors.length ? (
            <ul className="mt-3 space-y-2">
              {factors.map((factor, index) => (
                <li
                  key={factor.id}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="min-w-0 break-words text-green-700">
                    {factor.friendly_name || `Passkey ${index + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => void runAction({ type: "remove", factor })}
                    disabled={busy}
                    className="shrink-0 rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-black disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="geist text-sm font-medium leading-4 mt-2 tracking-tight text-[#999]">
              No passkey added yet.
            </p>
          )}
          <button
            type="button"
            onClick={() => void runAction({ type: "add" })}
            disabled={busy}
            className="mt-3 rounded-full bg-[#1c40f2] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Add a passkey"}
          </button>
        </>
      )}

      {stepUpFactors ? (
        <div className="mt-4 border-t border-black/10 pt-4">
          <p className="text-xs font-medium text-black">
            Verify your identity to manage passkeys
          </p>
          {stepUpFactors.webauthnId ? (
            <button
              type="button"
              onClick={() => void completeStepUp("webauthn")}
              disabled={busy}
              className="mt-3 rounded-full bg-[#1c40f2] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Continue with an enrolled passkey"}
            </button>
          ) : null}
          {stepUpFactors.totpId ? (
            <div className="mt-3">
              <label className="block text-xs font-medium text-[#555]">
                {stepUpFactors.webauthnId
                  ? "Or enter your authenticator code"
                  : "Enter your authenticator code"}
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  maxLength={6}
                  className="mt-1 w-full rounded border border-black/15 px-3 py-2 text-sm tracking-[0.2em] text-black"
                />
              </label>
              <button
                type="button"
                onClick={() => void completeStepUp("totp")}
                disabled={busy || verificationCode.length !== 6}
                className="mt-2 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
              >
                Verify and continue
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setStepUpFactors(null);
              setPendingAction(null);
              setVerificationCode("");
              setMessage("");
            }}
            disabled={busy}
            className="ml-2 mt-3 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="geist text-xs font-semibold leading-4 mt-2 tracking-tight text-[#999]">
          {message}
        </p>
      ) : null}
    </section>
  );
};

export default PasskeySettings;
