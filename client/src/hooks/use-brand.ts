import { useQuery } from "@tanstack/react-query";

export interface BrandSettings {
  artist_name?: string;
  artist_tagline?: string;
  artist_email?: string;
  artist_instagram?: string;
  artist_twitter?: string;
  artist_facebook?: string;
  artist_tiktok?: string;
}

const DEFAULTS: BrandSettings = {
  artist_name: "Creations by Oracle",
  artist_tagline: "Original Art",
};

export function useBrand(): BrandSettings {
  const { data } = useQuery<BrandSettings>({
    queryKey: ["/api/brand"],
    staleTime: 5 * 60 * 1000,
  });

  return { ...DEFAULTS, ...data };
}
