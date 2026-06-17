"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

export function NavigationProgress() {
  return (
    <ProgressBar
      height="3px"
      color="oklch(var(--primary))"
      options={{ showSpinner: false, easing: "ease", speed: 300 }}
      shallowRouting
    />
  );
}
