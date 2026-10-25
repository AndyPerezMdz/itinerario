"use client";

import { useFormStatus } from "react-dom";
import { ui } from "@/lib/ui";

export function Submit({
  children,
  variante = "btn",
  confirmar,
  name,
  value,
}: {
  children: React.ReactNode;
  variante?: keyof typeof ui;
  confirmar?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={ui[variante]}
      onClick={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
