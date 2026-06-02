"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ConcessionaireOption = {
  id: string;
  concessionaire_number: string;
  account_name?: string | null;
};

type ConcessionaireFilterProps = {
  concessionaires: ConcessionaireOption[];
};

export function ConcessionaireFilter({ concessionaires }: ConcessionaireFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAccount = searchParams?.get("account") ?? "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value === "all") {
      params.delete("account");
    } else {
      params.set("account", value);
    }
    const query = params.toString();
    router.push(`/applicant/water-bills${query ? `?${query}` : ""}`);
  }

  return (
    <Select value={currentAccount} onValueChange={handleChange}>
      <SelectTrigger className="w-full sm:w-[280px] h-11">
        <SelectValue placeholder="All accounts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All accounts</SelectItem>
        {concessionaires.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="font-mono font-medium">{c.concessionaire_number}</span>
            {c.account_name ? (
              <span className="ml-2 text-muted-foreground">— {c.account_name}</span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
