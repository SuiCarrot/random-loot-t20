"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { RollStep, RollTrace } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MODIFIER_LABELS: Record<RollTrace["modifier"], string> = {
  padrao: "Padrão",
  metade: "Metade",
  dobro: "Dobro",
};

function groupSummaryLabel(count: number): string {
  return count === 1
    ? "Ver passo da rolagem"
    : `Ver passos da rolagem (${count})`;
}

type StepNodeProps = {
  step: RollStep;
  stepId: string;
  showAllDetails: boolean;
  openGroups: Record<string, boolean>;
  onToggleGroup: (stepId: string, open: boolean) => void;
  isFormulaVisible: (stepId: string) => boolean;
  onToggleFormula: (stepId: string) => void;
};

function StepNode({
  step,
  stepId,
  showAllDetails,
  openGroups,
  onToggleGroup,
  isFormulaVisible,
  onToggleFormula,
}: StepNodeProps) {
  const showFormula = isFormulaVisible(stepId);
  const hasFormula = step.detail.trim() !== step.summary.trim();
  const hasChildren = step.children != null && step.children.length > 0;
  const groupOpen = showAllDetails || openGroups[stepId] === true;

  return (
    <li className="list-none">
      <div className="rounded-md border bg-muted/30 px-3 py-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">{step.label}</span>
              {step.roll > 0 && !showFormula && (
                <span className="rounded bg-primary px-1.5 py-0.5 font-mono text-xs text-primary-foreground">
                  d% {step.roll}
                </span>
              )}
            </div>
            <p className="text-sm font-medium leading-relaxed">{step.summary}</p>
            {showFormula && hasFormula && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.detail}
              </p>
            )}
          </div>
          {hasFormula && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1 px-2 text-xs"
              onClick={() => onToggleFormula(stepId)}
              aria-expanded={showFormula}
              aria-label={
                showFormula ? "Ocultar fórmulas" : "Mostrar fórmulas e d%"
              }
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  showFormula && "rotate-180"
                )}
              />
              <span className="hidden sm:inline">
                {showFormula ? "Ocultar" : "Fórmulas"}
              </span>
            </Button>
          )}
        </div>
      </div>

      {hasChildren && (
        <details
          className="group/details mt-2 rounded-md border border-dashed border-border bg-background/60"
          open={groupOpen}
          onToggle={(e) => {
            if (!showAllDetails) {
              onToggleGroup(stepId, e.currentTarget.open);
            }
          }}
        >
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-muted-foreground",
              "hover:text-foreground [&::-webkit-details-marker]:hidden"
            )}
          >
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open/details:rotate-180" />
            {groupSummaryLabel(step.children!.length)}
          </summary>
          <ul className="space-y-2 border-t border-dashed border-border px-2 py-2">
            {step.children!.map((child, i) => (
              <StepNode
                key={`${stepId}-${i}`}
                step={child}
                stepId={`${stepId}/${i}`}
                showAllDetails={showAllDetails}
                openGroups={openGroups}
                onToggleGroup={onToggleGroup}
                isFormulaVisible={isFormulaVisible}
                onToggleFormula={onToggleFormula}
              />
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

type Props = {
  trace: RollTrace | null;
};

export function RollTraceView({ trace }: Props) {
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [formulaVisible, setFormulaVisible] = useState<Record<string, boolean>>(
    {}
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setShowAllDetails(false);
    setFormulaVisible({});
    setOpenGroups({});
  }, [trace]);

  function isFormulaVisible(stepId: string): boolean {
    if (stepId in formulaVisible) return formulaVisible[stepId];
    return showAllDetails;
  }

  function toggleGlobal() {
    setShowAllDetails((prev) => !prev);
    setFormulaVisible({});
    setOpenGroups({});
  }

  function toggleFormula(stepId: string) {
    const next = !isFormulaVisible(stepId);
    setFormulaVisible((prev) => ({ ...prev, [stepId]: next }));
  }

  function toggleGroup(stepId: string, open: boolean) {
    setOpenGroups((prev) => ({ ...prev, [stepId]: open }));
  }

  if (!trace) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Resultado</CardTitle>
          <CardDescription>
            ND {trace.nd} · tesouro {MODIFIER_LABELS[trace.modifier].toLowerCase()}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={toggleGlobal}
        >
          {showAllDetails
            ? "Recolher tudo"
            : "Expandir rolagens e fórmulas"}
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {trace.steps.map((step, i) => (
            <StepNode
              key={`${i}-${step.label}`}
              step={step}
              stepId={String(i)}
              showAllDetails={showAllDetails}
              openGroups={openGroups}
              onToggleGroup={toggleGroup}
              isFormulaVisible={isFormulaVisible}
              onToggleFormula={toggleFormula}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
