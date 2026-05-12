"use client";

import { useEffect, useState, useMemo } from "react";
import { getAccreditedPlumbersAction } from "@/actions/plumbers";
import { Loader2, Search, Phone, MapPin, User, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function AccreditedPlumbersTable() {
  const [plumbers, setPlumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredPlumbers = useMemo(() => {
    if (!searchQuery.trim()) return plumbers;
    const query = searchQuery.toLowerCase();
    return plumbers.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(query) ||
        p.notes?.toLowerCase().includes(query)
    );
  }, [plumbers, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-muted/5 rounded-xl border border-dashed">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary/60" />
        <p className="font-medium">Fetching accredited plumbers...</p>
      </div>
    );
  }

  if (plumbers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground bg-muted/5">
        <p className="text-lg font-medium">No plumbers found</p>
        <p className="text-sm mt-1">There are no accredited plumbers listed for your branch at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 my-6">
      {/* Search Header */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
          <Search className="h-4 w-4" />
        </div>
        <Input
          placeholder="Search by name or area (barangay)..."
          className="pl-10 h-11 bg-background border-border/80 focus:border-primary/50 transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground border-b border-border/50">
            <tr>
              <th className="px-6 py-4 font-semibold">Plumber Name</th>
              <th className="px-6 py-4 font-semibold">Assigned Area</th>
              <th className="px-6 py-4 font-semibold text-right">Contact Information</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredPlumbers.length > 0 ? (
              filteredPlumbers.map((plumber, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {plumber.full_name?.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{plumber.full_name}</span>
                        <Badge variant="secondary" className="w-fit text-[10px] h-4 mt-0.5 px-1 py-0 bg-green-500/10 text-green-600 border-none">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Verified
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 opacity-60" />
                      {plumber.notes || "General Area"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {(plumber.phone || plumber.contact_number)?.split("/").map((num: string, i: number) => {
                        const cleanNum = num.trim();
                        if (!cleanNum) return null;
                        return (
                          <a
                            key={i}
                            href={`tel:${cleanNum}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all border border-primary/10 font-medium"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {cleanNum}
                          </a>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic bg-muted/5">
                  No matching plumbers found for "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredPlumbers.length > 0 ? (
          filteredPlumbers.map((plumber, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-border/80 bg-card shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {plumber.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground leading-tight">{plumber.full_name}</h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="secondary" className="text-[9px] h-3.5 px-1 py-0 bg-green-500/10 text-green-600 border-none">
                        Verified
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2 pt-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                  <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                  <span className="truncate">{plumber.notes || "General Area"}</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  {(plumber.phone || plumber.contact_number)?.split("/").map((num: string, i: number) => {
                    const cleanNum = num.trim();
                    if (!cleanNum) return null;
                    return (
                      <a
                        key={i}
                        href={`tel:${cleanNum}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold active:scale-[0.98] transition-transform shadow-md shadow-primary/20"
                      >
                        <Phone className="h-4 w-4" />
                        Call {cleanNum}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground italic bg-muted/5 rounded-xl border border-dashed">
            No matching plumbers found for "{searchQuery}"
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center px-4">
        * All plumbers listed are accredited by the Water District. Please contact them directly for service.
      </p>
    </div>
  );
}
