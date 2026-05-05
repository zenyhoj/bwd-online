"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <div className="fixed bottom-8 right-8 z-50 print:hidden">
      <Button 
        onClick={() => window.print()} 
        size="lg" 
        className="rounded-full shadow-lg gap-2 font-semibold px-6 h-14"
      >
        <Printer className="h-5 w-5" />
        Print Document
      </Button>
    </div>
  );
}
