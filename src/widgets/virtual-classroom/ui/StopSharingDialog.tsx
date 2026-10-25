"use client";

import { useDictionary } from "@/shared/i18n";
import { Button, Dialog } from "@/shared/ui";

interface StopSharingDialogProps {
  isOpen: boolean;
  /** What is being taken off show: the viewer's screen or the lab they present. */
  what: "screen" | "lab";
  onConfirm(): void;
  onClose(): void;
}

/** Asks before a share ends, since the class loses it at once and a lab loses its changes. */
export function StopSharingDialog({ isOpen, what, onConfirm, onClose }: StopSharingDialogProps) {
  const text = useDictionary().classroom.stopDialog;
  return (
    <Dialog
      isOpen={isOpen}
      title={what === "screen" ? text.screenTitle : text.labTitle}
      description={what === "screen" ? text.screenBody : text.labBody}
      onClose={onClose}
    >
      <Button size="sm" variant="secondary" onClick={onClose}>
        {text.cancel}
      </Button>
      <Button size="sm" variant="danger" onClick={onConfirm}>
        {text.confirm}
      </Button>
    </Dialog>
  );
}
