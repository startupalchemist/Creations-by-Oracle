import { useState, useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingBag, Palette, CheckCircle, Loader2, Share2, Eye, X, ZoomIn } from "lucide-react";
import type { Artwork } from "@shared/schema";

function useSessionId() {
  const [id] = useState(() => {
    let sid = sessionStorage.getItem("sid");
    if (!sid) { sid = Math.random().toString(36).slice(2); sessionStorage.setItem("sid", sid); }
    return sid;
  });
  return id;
}

function trackEvent(page: string, eventType: string, sessionId: string, metadata?: string) {
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, eventType, sessionId, metadata }),
  }).catch(() => {});
}

export default function ArtworkPage() {
  const [, params] = useRoute("/shop/:slug");
  const slug = params?.slug || "";
  const { toast } = useToast();
  const sessionId = useSessionId();
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCountry, setShippingCountry] = useState("United States");
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);

  const { data: artwork, isLoading } = useQuery<Artwork>({
    queryKey: ["/api/artworks", slug],
    queryFn: () => fetch(`/api/artworks/${slug}`).then((r) => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    enabled: !!slug,
  });

  useEffect(() => {
    if (!artwork) return;
    trackEvent(`/shop/${slug}`, "artwork_view", sessionId, JSON.stringify({ artworkId: artwork.id }));
    fetch(`/api/artworks/${artwork.id}/view`, { method: "POST" }).catch(() => {});
    // Check for purchase success from Stripe redirect
    const params2 = new URLSearchParams(window.location.search);
    if (params2.get("purchased") === "true") {
      setPurchased(true);
      trackEvent(`/shop/${slug}`, "purchase", sessionId);
    }
  }, [artwork, slug, sessionId]);

  useEffect(() => {
    if (!artwork) return;
    const title = artwork.seoTitle || artwork.title;
    const desc = artwork.seoDescription || (artwork.description ? artwork.description.substring(0, 155) : "");
    const image = artwork.enhancedImageUrl || artwork.imageUrl || "";
    const url = window.location.href;

    document.title = `${title} — Creations by Oracle`;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    const setOg = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.content = content;
    };

    if (desc) setMeta("description", desc);
    setOg("og:title", title);
    setOg("og:description", desc);
    setOg("og:image", image);
    setOg("og:type", "product");
    setOg("og:url", url);
    setOg("og:site_name", "Creations by Oracle");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", image);

    return () => {
      document.title = "Creations by Oracle — Original Art";
    };
  }, [artwork]);

  const closeLightbox = useCallback(() => { setLightboxOpen(false); setLightboxZoomed(false); }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, closeLightbox]);

  const shippingAddress = JSON.stringify({
    name: shippingName,
    street: shippingStreet,
    city: shippingCity,
    state: shippingState,
    zip: shippingZip,
    country: shippingCountry,
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/checkout", {
        artworkId: artwork?.id,
        buyerName,
        buyerEmail,
        shippingAddress: shippingStreet ? shippingAddress : undefined,
      }),
    onSuccess: async (data) => {
      const json = await data.json();
      if (json.url) {
        trackEvent(`/shop/${slug}`, "cta_click", sessionId, JSON.stringify({ type: "checkout" }));
        window.location.href = json.url;
      }
    },
    onError: (e: any) => {
      toast({ title: "Checkout failed", description: e.message || "Please try again.", variant: "destructive" });
    },
  });

  const handleShare = () => {
    if (navigator.share && artwork) {
      navigator.share({ title: artwork.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied" });
    }
    trackEvent(`/shop/${slug}`, "cta_click", sessionId, JSON.stringify({ type: "share" }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08060e] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#C084FC] animate-spin" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="min-h-screen bg-[#08060e] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#B3B3B8]/40 text-sm mb-4">Artwork not found.</p>
          <Link href="/shop">
            <Button className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em]">
              Back to Shop
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08060e]" data-testid="page-artwork">

      {purchased && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#C084FC] text-white px-6 py-3 rounded-sm flex items-center gap-2 shadow-xl" data-testid="banner-purchased">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Thank you for your purchase! We'll be in touch shortly.</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-28 pb-24">
        {/* Back */}
        <Link href="/shop">
          <button className="flex items-center gap-2 text-[#B3B3B8]/40 hover:text-[#B3B3B8] text-xs uppercase tracking-[0.2em] mb-10 transition-colors" data-testid="button-back-shop">
            <ArrowLeft className="w-3.5 h-3.5" />
            Shop
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Image */}
          <div className="relative">
            <div
              className="aspect-[3/4] rounded-sm overflow-hidden bg-[#1a1225] group cursor-zoom-in"
              onClick={() => { if (artwork.enhancedImageUrl || artwork.imageUrl) setLightboxOpen(true); }}
              data-testid="div-artwork-image-container"
            >
              {artwork.enhancedImageUrl || artwork.imageUrl ? (
                <>
                  <img
                    src={artwork.enhancedImageUrl || artwork.imageUrl}
                    alt={artwork.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    data-testid="img-artwork"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                    <ZoomIn className="w-8 h-8 text-white/70 drop-shadow-lg" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Palette className="w-12 h-12 text-white/10" />
                </div>
              )}
            </div>
            {artwork.sold && (
              <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-[#F5F5F7]/70 text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm">
                Sold
              </div>
            )}
            <p className="text-[#B3B3B8]/25 text-[10px] text-center mt-2">Click image to zoom</p>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-[#B3B3B8]/40 text-[9px] uppercase tracking-[0.3em] mb-3" data-testid="text-artwork-category">{artwork.category}</p>
              <h1
                className="text-3xl sm:text-4xl font-light text-white mb-4 leading-tight"
                style={{ fontFamily: "Georgia, serif" }}
                data-testid="heading-artwork-title"
              >
                {artwork.title}
              </h1>

              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6">
                {artwork.medium && (
                  <div data-testid="text-artwork-medium">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#B3B3B8]/30 mb-0.5">Medium</p>
                    <p className="text-[#B3B3B8]/70 text-sm">{artwork.medium}</p>
                  </div>
                )}
                {artwork.dimensions && (
                  <div data-testid="text-artwork-dimensions">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#B3B3B8]/30 mb-0.5">Dimensions</p>
                    <p className="text-[#B3B3B8]/70 text-sm">{artwork.dimensions}</p>
                  </div>
                )}
                {artwork.year && (
                  <div data-testid="text-artwork-year">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#B3B3B8]/30 mb-0.5">Year</p>
                    <p className="text-[#B3B3B8]/70 text-sm">{artwork.year}</p>
                  </div>
                )}
                {artwork.viewCount > 0 && (
                  <div data-testid="text-artwork-views">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#B3B3B8]/30 mb-0.5">Views</p>
                    <p className="text-[#B3B3B8]/70 text-sm flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      {artwork.viewCount.toLocaleString()} views
                    </p>
                  </div>
                )}
              </div>

              <div className="w-12 h-px bg-[#C084FC]/30 mb-6" />

              {artwork.description && (
                <div className="space-y-3 mb-8" data-testid="text-artwork-description">
                  {artwork.description.split("\n\n").map((para, i) => (
                    <p key={i} className="text-[#B3B3B8]/70 text-sm leading-relaxed">{para}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Purchase Section */}
            <div className="mt-8">
              {artwork.forSale && !artwork.sold && artwork.price ? (
                <div className="space-y-4" data-testid="div-purchase-section">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-light text-white" data-testid="text-artwork-price">
                      ${parseFloat(String(artwork.price)).toLocaleString()}
                    </span>
                    <span className="text-[#B3B3B8]/40 text-xs uppercase tracking-[0.15em]">USD · Original</span>
                  </div>

                  {!showBuyForm ? (
                    <div className="flex gap-3">
                      <Button
                        className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.18em] font-semibold px-8 py-3 h-auto flex-1"
                        onClick={() => {
                          setShowBuyForm(true);
                          trackEvent(`/shop/${slug}`, "cta_click", sessionId, JSON.stringify({ type: "buy_intent" }));
                        }}
                        data-testid="button-buy-artwork"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 mr-2" />
                        Purchase
                      </Button>
                      <Button
                        variant="ghost"
                        className="border border-white/15 hover:border-white/30 text-[#B3B3B8] hover:text-white px-3 py-3 h-auto"
                        onClick={handleShare}
                        data-testid="button-share-artwork"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 border border-white/10 rounded-sm p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <p className="text-[#B3B3B8]/50 text-xs">Enter your details to proceed to secure checkout.</p>

                      <p className="text-[9px] uppercase tracking-[0.18em] text-[#B3B3B8]/40 pt-1">Contact</p>
                      <Input
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Your name"
                        className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm"
                        data-testid="input-buyer-name"
                      />
                      <Input
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="Your email"
                        className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm"
                        data-testid="input-buyer-email"
                      />

                      <p className="text-[9px] uppercase tracking-[0.18em] text-[#B3B3B8]/40 pt-1">Shipping Address</p>
                      <Input
                        value={shippingName}
                        onChange={(e) => setShippingName(e.target.value)}
                        placeholder="Recipient name (if different)"
                        className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm"
                        data-testid="input-shipping-name"
                      />
                      <Input
                        value={shippingStreet}
                        onChange={(e) => setShippingStreet(e.target.value)}
                        placeholder="Street address"
                        className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm"
                        data-testid="input-shipping-street"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          placeholder="City"
                          className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm"
                          data-testid="input-shipping-city"
                        />
                        <Input
                          value={shippingState}
                          onChange={(e) => setShippingState(e.target.value)}
                          placeholder="State / Province"
                          className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm"
                          data-testid="input-shipping-state"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={shippingZip}
                          onChange={(e) => setShippingZip(e.target.value)}
                          placeholder="Postal code"
                          className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm"
                          data-testid="input-shipping-zip"
                        />
                        <Input
                          value={shippingCountry}
                          onChange={(e) => setShippingCountry(e.target.value)}
                          placeholder="Country"
                          className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm"
                          data-testid="input-shipping-country"
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.18em] font-semibold h-auto py-2.5 flex-1"
                          disabled={!buyerName.trim() || !buyerEmail.trim() || !shippingStreet.trim() || !shippingCity.trim() || !shippingZip.trim() || checkoutMutation.isPending}
                          onClick={() => checkoutMutation.mutate()}
                          data-testid="button-proceed-checkout"
                        >
                          {checkoutMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ShoppingBag className="w-3.5 h-3.5 mr-1" />}
                          Proceed to Checkout
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-[#B3B3B8] text-xs border border-white/10 px-3 h-auto"
                          onClick={() => setShowBuyForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : artwork.sold ? (
                <div className="border border-white/8 rounded-sm p-4 text-center" data-testid="div-sold-section">
                  <p className="text-[#B3B3B8]/40 text-sm mb-3">This work has found its home.</p>
                  <Link href="/commission">
                    <Button className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em]" data-testid="button-commission-similar">
                      Commission a Similar Piece
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="border border-white/8 rounded-sm p-4" data-testid="div-inquire-section">
                  <p className="text-[#B3B3B8]/50 text-sm mb-3">Interested in this work?</p>
                  <Link href={`/contact?artwork=${encodeURIComponent(artwork.title)}&utm_source=artwork&utm_medium=inquire`}>
                    <Button className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em]" data-testid="button-inquire-artwork">
                      Inquire
                    </Button>
                  </Link>
                </div>
              )}

              <p className="text-[#B3B3B8]/25 text-[10px] mt-4 leading-relaxed">
                All works ship with a certificate of authenticity. Shipping quoted at checkout.
              </p>
            </div>
          </div>
        </div>

        {/* More Works */}
        <div className="mt-20 pt-12 border-t border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-light text-white" style={{ fontFamily: "Georgia, serif" }}>More Works</h2>
            <Link href="/shop">
              <span className="text-xs uppercase tracking-[0.2em] text-[#B3B3B8]/40 hover:text-[#C084FC] transition-colors cursor-pointer">
                View All
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (artwork.enhancedImageUrl || artwork.imageUrl) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={closeLightbox}
          data-testid="div-lightbox-overlay"
        >
          <button
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            onClick={closeLightbox}
            data-testid="button-lightbox-close"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className={`transition-all duration-300 ${lightboxZoomed ? "overflow-auto max-w-none max-h-none" : "max-w-[90vw] max-h-[90vh]"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={artwork.enhancedImageUrl || artwork.imageUrl}
              alt={artwork.title}
              className={`rounded-sm shadow-2xl object-contain transition-all duration-300 select-none ${lightboxZoomed ? "w-[180vw] max-w-none cursor-zoom-out" : "max-w-[90vw] max-h-[90vh] cursor-zoom-in"}`}
              onClick={() => setLightboxZoomed((z) => !z)}
              data-testid="img-lightbox"
            />
          </div>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-[0.2em]">
            {lightboxZoomed ? "Click to zoom out · Esc to close" : "Click to zoom · Esc to close"}
          </p>
        </div>
      )}
    </div>
  );
}
