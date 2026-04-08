import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Palette, ArrowRight, Filter, Eye } from "lucide-react";
import type { Artwork } from "@shared/schema";
import { artworkCategories } from "@shared/schema";
import { useOgImage } from "@/hooks/use-og-image";

function useSessionId() {
  const [id] = useState(() => {
    let sid = sessionStorage.getItem("sid");
    if (!sid) { sid = Math.random().toString(36).slice(2); sessionStorage.setItem("sid", sid); }
    return sid;
  });
  return id;
}

function trackEvent(page: string, eventType: string, sessionId: string) {
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, eventType, sessionId }),
  }).catch(() => {});
}

function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <Link href={`/shop/${artwork.slug}`}>
      <div className="group cursor-pointer" data-testid={`card-artwork-${artwork.id}`}>
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[#1a1225] mb-4">
          {artwork.enhancedImageUrl || artwork.imageUrl ? (
            <img
              src={artwork.enhancedImageUrl || artwork.imageUrl}
              alt={artwork.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Palette className="w-8 h-8 text-white/10" />
            </div>
          )}
          {artwork.sold && (
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-[#F5F5F7]/60 text-[9px] uppercase tracking-[0.2em] px-2 py-1 rounded-sm">
              Sold
            </div>
          )}
          {artwork.forSale && !artwork.sold && (
            <div className="absolute top-3 right-3 bg-[#C084FC]/90 text-white text-[9px] uppercase tracking-[0.2em] px-2 py-1 rounded-sm">
              Available
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-white text-xs uppercase tracking-[0.2em] flex items-center gap-1">
              View Work <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
        <div>
          <p className="text-[#B3B3B8]/40 text-[9px] uppercase tracking-[0.2em] mb-1">{artwork.category}</p>
          <h3 className="text-[#F5F5F7] text-sm font-medium tracking-wide group-hover:text-[#C084FC] transition-colors">{artwork.title}</h3>
          <p className="text-[#B3B3B8]/50 text-xs mt-0.5">{artwork.medium}{artwork.dimensions ? ` · ${artwork.dimensions}` : ""}{artwork.year ? ` · ${artwork.year}` : ""}</p>
          <div className="flex items-center justify-between mt-1.5">
            <div>
              {artwork.price && artwork.forSale && !artwork.sold && (
                <p className="text-[#C084FC] text-sm font-medium">${parseFloat(String(artwork.price)).toLocaleString()}</p>
              )}
              {artwork.sold && <p className="text-[#B3B3B8]/40 text-sm">Sold</p>}
              {!artwork.forSale && !artwork.sold && <p className="text-[#B3B3B8]/40 text-xs">Not for sale</p>}
            </div>
            {artwork.viewCount > 0 && (
              <div className="flex items-center gap-1 text-[#B3B3B8]/30" data-testid={`text-view-count-${artwork.id}`}>
                <Eye className="w-3 h-3" />
                <span className="text-[10px]">{artwork.viewCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Shop() {
  const defaultOgImage = useOgImage();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [location] = useLocation();
  const sessionId = useSessionId();

  useEffect(() => {
    trackEvent("/shop", "page_view", sessionId);
  }, [sessionId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    if (cat) setActiveCategory(decodeURIComponent(cat));
  }, [location]);

  const { data: artworks, isLoading } = useQuery<Artwork[]>({
    queryKey: ["/api/artworks", "published"],
    queryFn: () => fetch("/api/artworks?status=published").then((r) => r.json()),
  });

  const categories = ["All", ...artworkCategories];
  const filtered = artworks?.filter((a) => activeCategory === "All" || a.category === activeCategory) || [];

  return (
    <div className="min-h-screen bg-[#08060e]" data-testid="page-shop">
      <title>Shop Original Art — Creations by Oracle</title>
      <meta name="description" content="Browse and purchase original artworks by Creations by Oracle — abstract canvas, portraits, 3D installations, and copper sculptures." />
      <meta property="og:title" content="Shop Original Art — Creations by Oracle" />
      <meta property="og:description" content="Browse and purchase original artworks by Creations by Oracle — abstract canvas, portraits, 3D installations, and copper sculptures." />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Creations by Oracle" />
      <meta property="og:image" content={defaultOgImage} />
      <meta property="og:url" content={typeof window !== "undefined" ? window.location.href : "/shop"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Shop Original Art — Creations by Oracle" />
      <meta name="twitter:description" content="Browse and purchase original artworks by Creations by Oracle — abstract canvas, portraits, 3D installations, and copper sculptures." />
      <meta name="twitter:image" content={defaultOgImage} />

      {/* Header */}
      <div className="pt-32 pb-12 px-6 lg:px-10 max-w-7xl mx-auto">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-3">Available Works</span>
        <h1 className="text-4xl sm:text-5xl font-light text-white" style={{ fontFamily: "Georgia, serif" }}>
          The Shop
        </h1>
        <p className="text-[#B3B3B8]/50 text-sm mt-3 max-w-lg">
          Original works available for immediate purchase or through commission. Each piece ships with a certificate of authenticity.
        </p>
      </div>

      {/* Category Filter */}
      <div className="px-6 lg:px-10 max-w-7xl mx-auto mb-12">
        <div className="flex items-center gap-2 flex-wrap" data-testid="div-category-filters">
          <Filter className="w-3.5 h-3.5 text-[#B3B3B8]/40 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] rounded-sm border transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-[#C084FC] border-[#C084FC] text-white"
                  : "border-white/10 text-[#B3B3B8]/60 hover:text-white hover:border-white/25"
              }`}
              data-testid={`button-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="px-6 lg:px-10 max-w-7xl mx-auto pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-sm bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-white/8 rounded-sm">
            <Palette className="w-8 h-8 text-white/10 mx-auto mb-4" />
            <p className="text-[#B3B3B8]/40 text-sm mb-2">No works in this category yet.</p>
            <Link href="/contact">
              <Button className="mt-4 bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em]">
                Inquire About a Commission
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filtered.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        )}
      </div>

      {/* Commission CTA */}
      <div className="border-t border-white/5 bg-[#0c0915] py-16 px-6 lg:px-10 text-center" data-testid="section-shop-commission">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-3">Custom Work</span>
        <h2 className="text-2xl sm:text-3xl font-light text-white mb-4" style={{ fontFamily: "Georgia, serif" }}>
          Don't see what you're looking for?
        </h2>
        <p className="text-[#B3B3B8]/50 text-sm max-w-md mx-auto mb-8">
          Commission a bespoke piece — from a portrait to a large-scale installation. Every conversation is a collaboration.
        </p>
        <Link href="/contact?utm_source=shop&utm_medium=cta&utm_campaign=commission">
          <Button
            className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em] font-semibold px-8 py-3 h-auto"
            data-testid="button-shop-commission-cta"
          >
            Start a Commission
          </Button>
        </Link>
      </div>
    </div>
  );
}
