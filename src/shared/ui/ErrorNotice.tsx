export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className="rounded-lg bg-danger-surface px-3 py-2.5 text-sm text-danger">
      {message}
    </p>
  );
}
