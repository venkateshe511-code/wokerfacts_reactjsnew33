import { useAuth } from "@/hooks/use-auth";

/**
 * Returns true only for the designated sample/demo account.
 * Strictly checks the authenticated email to avoid stale flags.
 */
export const useDemoMode = (): boolean => {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase() || "";
  return email === "workerfacts@gmail.com" || email === "rgagne@usph.com";
};
