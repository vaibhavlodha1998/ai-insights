"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";

import { makeStore } from "./store";

export function StoreProvider({ children }: { children: ReactNode }) {
  // Created once per mount, never shared between requests on the server
  const [store] = useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
}
