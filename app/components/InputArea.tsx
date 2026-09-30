"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

type InputAreaProps =
  | ({
      as?: "input";
      leadingIcon?: ReactNode;
      variant?: "filled" | "plain";
      wrapperClassName?: string;
    } & InputHTMLAttributes<HTMLInputElement>)
  | ({
      as: "textarea";
      leadingIcon?: never;
      variant?: "filled";
      wrapperClassName?: never;
    } & TextareaHTMLAttributes<HTMLTextAreaElement>);

const InputArea = ({
  as = "input",
  className = "",
  leadingIcon,
  variant = "filled",
  wrapperClassName = "flex min-w-0 items-center gap-2",
  ...props
}: InputAreaProps) => {
  const sharedClassName =
    variant === "plain"
      ? "w-full bg-transparent text-black outline-none"
      : "w-full rounded bg-black/5 text-sm outline-none focus:border-black/0";

  const input =
    as === "textarea" ? (
      <textarea
        {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        className={`resize-none p-2 font-medium tracking-tight ${sharedClassName} ${className}`}
      />
    ) : (
      <input
        {...(props as InputHTMLAttributes<HTMLInputElement>)}
        className={`font-medium tracking-tight ${variant === "plain" ? "px-0 py-1" : "px-2 py-2"} ${sharedClassName} ${className}`}
      />
    );

  if (as !== "textarea" && leadingIcon) {
    return (
      <div className={wrapperClassName}>
        <span aria-hidden="true" className="shrink-0">
          {leadingIcon}
        </span>
        {input}
      </div>
    );
  }

  return input;
};

export default InputArea;
