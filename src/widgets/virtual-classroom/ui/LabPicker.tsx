"use client";

import { categoryOf, LabIcon, type LabKey } from "@/entities/lab";
import { useDictionary } from "@/shared/i18n";
import { Button, Dialog } from "@/shared/ui";

interface LabPickerProps {
  isOpen: boolean;
  /** The labs the Teacher's token lets them share: those the institution has on. */
  labs: LabKey[];
  onPick(labKey: LabKey): void;
  onClose(): void;
}

/** Chooses which lab to show the class. */
export function LabPicker({ isOpen, labs: shareable, onPick, onClose }: LabPickerProps) {
  const { classroom, labs } = useDictionary();
  const text = classroom.lab;
  return (
    <Dialog
      isOpen={isOpen}
      title={text.pickTitle}
      description={shareable.length > 0 ? text.pickBody : text.noneShareable}
      onClose={onClose}
    >
      <ul className="grid w-full gap-2 sm:grid-cols-2">
        {shareable.map((labKey) => (
          <li key={labKey}>
            <button
              type="button"
              onClick={() => onPick(labKey)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm font-medium transition-colors hover:border-brand/60 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand"
            >
              <LabIcon labKey={labKey} category={categoryOf(labKey)} size="sm" />
              {labs.names[labKey]}
            </button>
          </li>
        ))}
      </ul>
      <Button size="sm" variant="secondary" onClick={onClose}>
        {text.cancel}
      </Button>
    </Dialog>
  );
}
