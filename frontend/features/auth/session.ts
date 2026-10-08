"use client";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/services/garage-api";

export function useSession() {
  return useQuery({ queryKey: ["session"], queryFn: ({ signal }) => getCurrentUser(signal), staleTime: 0 });
}
