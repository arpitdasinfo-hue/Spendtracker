import AddEntryWorkflow from "@/components/finance/AddEntryWorkflow";
import type { EntryType } from "@/lib/finance";

interface AddPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function resolveInitialType(value: string | string[] | undefined): EntryType | undefined {
  if (typeof value !== "string") return undefined;

  if (value === "expense" || value === "income" || value === "transfer" || value === "repayment") {
    return value;
  }

  return undefined;
}

export default async function AddPage({ searchParams }: AddPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const initialType = resolveInitialType(params?.type);

  return <AddEntryWorkflow initialType={initialType} />;
}
