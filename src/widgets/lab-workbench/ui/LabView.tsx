"use client";

import type { LabKey, LabMode, LabState } from "@/entities/lab";
import { LAB_RUNNERS } from "../model/registry";

interface LabViewProps {
  labKey: LabKey;
  state: LabState;
  onChange(state: LabState): void;
  mode: LabMode;
  institutionId: string;
}

/** Any lab of the catalogue, drawn from its state. */
export function LabView({ labKey, ...props }: LabViewProps) {
  return <>{LAB_RUNNERS[labKey].render(props)}</>;
}
