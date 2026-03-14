export type PostgrestErrorLike = {
  code?: string;
  message: string;
};

export function isMissingColumnError(
  error: PostgrestErrorLike | null | undefined,
  column: string,
) {
  if (!error) {
    return false;
  }

  if (error.code === "42703") {
    return true;
  }

  const message = error.message.toLowerCase();
  const columnName = column.toLowerCase();

  if (!message.includes(columnName)) {
    return false;
  }

  return (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("not found")
  );
}
