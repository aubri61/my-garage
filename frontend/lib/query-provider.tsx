"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: false, staleTime: 30000 }, mutations: { retry: false },
  } }));
  useEffect(() => {
    function expire() {
      void client.cancelQueries({ predicate: query => query.queryKey[0] !== "session" });
      client.removeQueries({ predicate: query => query.queryKey[0] !== "session" });
      client.setQueryData(["session"], null);
    }
    window.addEventListener("my-garage:session-expired", expire);
    return () => window.removeEventListener("my-garage:session-expired", expire);
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
