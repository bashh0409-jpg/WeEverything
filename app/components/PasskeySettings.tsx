"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getPasskeyDomainError } from "@/lib/passkeys";

type PasskeyFactor = {
  id: string;
  friendly_name?: string;
};

const PasskeySettings = () => {
  const [factors, setFactors] = useState<PasskeyFactor[]>([]);
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
      const { data, error } = await supabase.auth.registerPasskey();
      if (error) {
        setMessage(error.message);
      } else {
        const passkeyName =
          data.friendly_name || `Passkey ${factors.length + 1}`;
        setFactors((current) => [...current, data]);
        setMessage(`${passkeyName} added. You can now use it to sign in.`);
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
        setFactors((current) =>
          current.filter((currentFactor) => currentFactor.id !== factor.id),
        );
        setMessage("Passkey removed.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not remove this passkey.",
      );
    }
  };

  const runAction = async (
    action: { type: "add" } | { type: "remove"; factor: PasskeyFactor },
  ) => {
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
      if (action.type === "add") {
        await addPasskey();
      } else {
        await removePasskey(action.factor);
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

      {message ? (
        <p className="geist text-xs font-semibold leading-4 mt-2 tracking-tight text-[#999]">
          {message}
        </p>
      ) : null}
    </section>
  );
};

export default PasskeySettings;
