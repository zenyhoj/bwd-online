"use client";

import dynamic from "next/dynamic";

export const DynamicInspectionReportMap = dynamic(
  () => import("./inspection-report-map").then((mod) => mod.InspectionReportMap),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-slate-500">Loading map...</div> }
);
