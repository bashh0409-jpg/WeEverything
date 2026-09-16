"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type InputAreaProps =
  | ({ as?: "input" } & InputHTMLAttributes<HTMLInputElement>)
  | ({ as: "textarea" } & TextareaHTMLAttributes<HTMLTextAreaElement>);

const InputArea = ({
  as = "input",
  className = "",
  ...props
}: InputAreaProps) => {
  const sharedClassName = `w-full bg-black/5 rounded text-sm outline-none focus:border-black/0 ${className}`;

  return as === "textarea" ? (
    <textarea
      {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
      className={`font-medium tracking-tight resize-none   p-2   ${sharedClassName}`}
    />
  ) : (
    <input
      {...(props as InputHTMLAttributes<HTMLInputElement>)}
      className={`font-medium tracking-tight   py-2 px-2 ${sharedClassName}`}
    />
  );
};

export default InputArea;
