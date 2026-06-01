"use client";

import { useState } from "react";
import { TreasureRollForm } from "@/components/treasure-roll-form";
import { RollTraceView } from "@/components/roll-trace";
import { meta } from "@/lib/data";
import type { RollTrace } from "@/lib/types";

export default function HomePage() {
  const [trace, setTrace] = useState<RollTrace | null>(null);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Tormenta20 · ferramenta não oficial
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{meta.title}</h1>
        <p className="text-muted-foreground">
          Gera tesouros aleatórios com base na planilha oficial (Tabela 8-1
          ampliada). Se não possuir o livro de um item rolado, use o próximo da
          lista.
        </p>
      </header>

      <TreasureRollForm onRoll={setTrace} />
      <RollTraceView trace={trace} />

      <footer className="space-y-2 border-t pt-6 text-xs text-muted-foreground">
        {meta.credits.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </footer>
    </div>
  );
}
