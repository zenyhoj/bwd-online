"use client";

import { useEffect, useState } from "react";
import { getAccreditedPlumbersAction } from "@/actions/plumbers";
import { Loader2 } from "lucide-react";

export function AccreditedPlumbersTable() {
  const [plumbers, setPlumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getAccreditedPlumbersAction();
      if (result.data) {
        setPlumbers(result.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading accredited plumbers...
      </div>
    );
  }

  if (plumbers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No accredited plumbers found at this time.
      </div>
    );
  }

  return (
    <div className="rich-text-table-wrap">
      <table className="rich-text-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Area</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          {plumbers.map((plumber, idx) => (
            <tr key={idx}>
              <td className="font-medium text-foreground">{plumber.full_name}</td>
              <td>{plumber.notes || "N/A"}</td>
              <td>{plumber.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
