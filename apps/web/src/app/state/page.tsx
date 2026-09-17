import type { Metadata } from "next";

import { SessionStateView } from "@/features/session-state/components/session-state-view";

export const metadata: Metadata = { title: "Session state" };

export default function StatePage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-14 sm:py-10">
      <SessionStateView />
    </main>
  );
}
