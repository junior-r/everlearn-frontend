import type { LabKey, LabModule, LabRunner } from "@/entities/lab";
import { completionsLab, definitionsLab } from "@/features/labs/language";
import { equationSolverLab, functionGrapherLab, scientificCalculatorLab } from "@/features/labs/maths";
import { forcesLab, gravityLab, kinematicsLab, projectileLab } from "@/features/labs/physics";

function runner<State extends object>(module: LabModule<State>): LabRunner {
  const { View } = module;
  return {
    key: module.key,
    initial: () => module.initial(),
    parse: (value) => module.parse(value),
    // The state handed back here always came from this module's initial or parse
    render: ({ state, onChange, mode, institutionId }) => (
      <View state={state as State} onChange={onChange} mode={mode} institutionId={institutionId} />
    ),
  };
}

export const LAB_RUNNERS: Record<LabKey, LabRunner> = {
  gravity: runner(gravityLab),
  forces: runner(forcesLab),
  kinematics: runner(kinematicsLab),
  projectile: runner(projectileLab),
  "function-grapher": runner(functionGrapherLab),
  "scientific-calculator": runner(scientificCalculatorLab),
  "equation-solver": runner(equationSolverLab),
  completions: runner(completionsLab),
  definitions: runner(definitionsLab),
};

/** The lab for a key, for screens that show labs without knowing them. */
export const findLab = (key: LabKey): LabRunner => LAB_RUNNERS[key];
