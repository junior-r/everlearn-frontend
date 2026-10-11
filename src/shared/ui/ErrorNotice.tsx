import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-surface px-3 py-2.5 text-sm text-danger"
    >
      <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
