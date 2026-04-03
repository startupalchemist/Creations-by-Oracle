import { useQuery } from "@tanstack/react-query";

export function useOgImage(): string {
  const { data } = useQuery<{ ogImageUrl: string }>({
    queryKey: ["/api/seo/og-image"],
    staleTime: 5 * 60 * 1000,
  });
  return data?.ogImageUrl || "/og-image.png";
}
