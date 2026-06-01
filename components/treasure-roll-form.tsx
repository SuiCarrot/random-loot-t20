"use client";

import { useState } from "react";
import { rollTreasure } from "@/lib/roll-treasure";
import type { RollTrace, TreasureModifier } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MODIFIERS: { value: TreasureModifier; label: string; hint: string }[] = [
  {
    value: "padrao",
    label: "Padrão",
    hint: "Tesouro típico, sem alteração",
  },
  {
    value: "metade",
    label: "Metade",
    hint: "Divide pela metade os resultados de Dinheiro",
  },
  {
    value: "dobro",
    label: "Dobro",
    hint: "Rola duas vezes em cada coluna",
  },
];

type Props = {
  onRoll: (trace: RollTrace) => void;
};

export function TreasureRollForm({ onRoll }: Props) {
  const [nd, setNd] = useState("7");
  const [modifier, setModifier] = useState<TreasureModifier>("padrao");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onRoll(rollTreasure(parseInt(nd, 10), modifier));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerar tesouro</CardTitle>
        <CardDescription>
          Role na tabela do ND da criatura derrotada — colunas Dinheiro e Itens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nd">Nível de desafio (ND)</Label>
            <Select value={nd} onValueChange={setNd}>
              <SelectTrigger id="nd" className="w-full max-w-xs">
                <SelectValue placeholder="Selecione o ND" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    ND {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Tipo de tesouro da criatura</Label>
            <RadioGroup
              value={modifier}
              onValueChange={(v) => setModifier(v as TreasureModifier)}
              className="grid gap-3"
            >
              {MODIFIERS.map((m) => (
                <div key={m.value} className="flex items-start gap-3">
                  <RadioGroupItem
                    value={m.value}
                    id={`mod-${m.value}`}
                    className="mt-1"
                  />
                  <div className="grid gap-0.5">
                    <Label htmlFor={`mod-${m.value}`} className="font-medium">
                      {m.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{m.hint}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button type="submit" size="lg">
            Gerar tesouro
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
