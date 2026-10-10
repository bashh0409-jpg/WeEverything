type SignOutConfirmationProps = {
  isOpen: boolean;
  isSigningOut: boolean;
  error: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const SignOutConfirmation = ({
  isOpen,
  isSigningOut,
  error,
  onConfirm,
  onCancel,
}: SignOutConfirmationProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed mx-auto inset-0 z-50 flex items-center justify-center bg-white px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-out-title"
    >
      <div className="relative w-full text-center flex flex-col items-center mx-auto bg-white">
        <h2
          id="sign-out-title"
          className="mon geist max-w-xs text-center overflow-hidden text-xl font-semibold tracking-tighter text-black mb-2"
        >
          Sure you want to sign out?
        </h2>
        <p className="geist max-w-xs text-center overflow-hidden text-[13px] font-semibold leading-3 tracking-tight text-[#999]">
          You will be signed out of your account. You can sign back in at any
          time to access your profile and settings.
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-center text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-6 mono flex flex-wrap justify-center gap-1">
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isSigningOut}
            className="w-fit geist capitalize max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSigningOut}
            className="max-w-full capitalize geist max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignOutConfirmation;
