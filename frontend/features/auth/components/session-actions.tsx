"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/services/garage-api";
import { errorMessage } from "@/lib/api-client";

export function SessionActions() {
  const router = useRouter();
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: logout, onSuccess: async () => {
    await client.cancelQueries();
    client.clear();
    client.setQueryData(["session"], null);
    router.replace("/login");
  } });
  return <><button type="button" className="header-logout" disabled={mutation.isPending} onClick={() => { if (!mutation.isPending) mutation.mutate(); }}>{mutation.isPending ? "로그아웃 중…" : "로그아웃"}</button>
    {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}</>;
}
