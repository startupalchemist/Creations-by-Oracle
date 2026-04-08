import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, ShoppingBag, Palette, Layers, Quote } from "lucide-react";
import type { Artwork } from "@shared/schema";
import { useOgImage } from "@/hooks/use-og-image";

interface Testimonial {
  id: number;
  collectorName: string;
  location: string | null;
  quote: string;
  artworkId: number | null;
  displayOrder: number;
  active: boolean;
}

function TestimonialsSection() {
  const { data: testimonials = [] } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials", { active: true }],
    queryFn: () => fetch("/api/testimonials?active=true").then((r) => r.json()),
  });

  const { ref, inView } = useInView();

  const visible = testimonials.slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <section ref={ref} className="py-20 px-6 lg:px-10 border-t border-white/5 bg-[#0c0915]" data-testid="section-testimonials">
      <div className="max-w-7xl mx-auto">
        <div
          className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-3">Collectors</span>
          <h2 className="text-2xl font-light text-white mb-10" style={{ fontFamily: "Georgia, serif" }}>
            What collectors say
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((t, i) => (
            <div
              key={t.id}
              className={`p-6 rounded-sm border border-white/8 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ background: "rgba(255,255,255,0.02)", transitionDelay: `${i * 100}ms` }}
              data-testid={`card-testimonial-${t.id}`}
            >
              <Quote className="w-5 h-5 text-[#C084FC]/30 mb-4" />
              <p className="text-[#B3B3B8]/80 text-sm leading-relaxed italic mb-5">"{t.quote}"</p>
              <div>
                <p className="text-[#F5F5F7] text-xs font-medium">{t.collectorName}</p>
                {t.location && <p className="text-[#B3B3B8]/40 text-[10px] mt-0.5">{t.location}</p>}
                {t.artworkId && (
                  <a href={`/artwork/${t.artworkId}`} className="text-[#C084FC]/60 text-[10px] mt-1.5 inline-block hover:text-[#C084FC] transition-colors" data-testid={`link-testimonial-artwork-${t.id}`}>
                    View artwork →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function HeroSection() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" data-testid="section-hero">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #08060e 0%, #0e0818 40%, #12091a 70%, #0a0612 100%)" }} />

      {/* Abstract art background pattern */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `
          radial-gradient(ellipse 60% 40% at 20% 30%, rgba(192, 132, 252, 0.3) 0%, transparent 60%),
          radial-gradient(ellipse 50% 60% at 80% 70%, rgba(139, 92, 246, 0.2) 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at 60% 20%, rgba(216, 180, 254, 0.15) 0%, transparent 50%)
        `,
      }} />

      <div
        className={`relative z-10 text-center px-6 max-w-4xl mx-auto transition-all duration-1000 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <div className="mb-8">
          <span className="inline-block text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/60 mb-6">
            Original Works
          </span>
          <h1
            className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-light text-white leading-[0.95] tracking-tight mb-8"
            style={{ fontFamily: "Georgia, serif" }}
            data-testid="heading-hero"
          >
            Art that
            <br />
            <span className="italic text-[#C084FC]">transcends</span>
            <br />
            the frame.
          </h1>
          <p className="text-[#B3B3B8]/70 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-light" data-testid="text-hero-subtitle">
            Abstract canvas works, life-like portraits, and sculptural installations crafted in copper and reclaimed materials.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10" data-testid="div-hero-ctas">
          <Link href="/shop">
            <Button
              className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em] font-semibold px-8 py-3 h-auto"
              data-testid="button-shop-hero"
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-2" />
              Explore the Shop
            </Button>
          </Link>
          <Link href="/gallery">
            <Button
              variant="ghost"
              className="text-[#B3B3B8] hover:text-white border border-white/15 hover:border-white/30 text-xs uppercase tracking-[0.2em] font-semibold px-8 py-3 h-auto"
              data-testid="button-gallery-hero"
            >
              <Eye className="w-3.5 h-3.5 mr-2" />
              View Gallery
            </Button>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#C084FC]/40 to-transparent" />
      </div>
    </section>
  );
}

function MediumsSection() {
  const { ref, inView } = useInView();
  const mediums = [
    {
      icon: <Palette className="w-5 h-5" />,
      label: "Abstract Canvas",
      desc: "Large-scale works exploring color, texture, and emotional resonance through layered paint and mixed media.",
      href: "/shop?category=Abstract",
    },
    {
      icon: <Eye className="w-5 h-5" />,
      label: "Life-like Portraits",
      desc: "Hyper-realistic portraiture capturing the nuance and depth of the human form with photographic precision.",
      href: "/shop?category=Portrait",
    },
    {
      icon: <Layers className="w-5 h-5" />,
      label: "3D Installations",
      desc: "Immersive sculptural installations that engage and reshape the experience of interior and exterior space.",
      href: "/shop?category=3D+Installation",
    },
    {
      icon: <div className="w-5 h-5 flex items-center justify-center text-xs font-bold">Cu</div>,
      label: "Copper Sculpture",
      desc: "Hand-formed sculptures in copper and reclaimed materials — each piece a conversation between material and form.",
      href: "/shop?category=Sculpture",
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-[#08060e]" data-testid="section-mediums">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-3">Mediums</span>
            <h2 className="text-3xl sm:text-4xl font-light text-white" style={{ fontFamily: "Georgia, serif" }}>
              The Work
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {mediums.map((m, i) => (
              <Link key={m.label} href={m.href}>
                <div
                  className="group border border-white/8 rounded-sm p-6 hover:border-[#C084FC]/30 transition-all duration-300 cursor-pointer h-full"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                  data-testid={`card-medium-${i}`}
                >
                  <div className="text-[#C084FC]/60 mb-4 group-hover:text-[#C084FC] transition-colors">{m.icon}</div>
                  <h3 className="text-[#F5F5F7] text-sm font-medium tracking-wide mb-3">{m.label}</h3>
                  <p className="text-[#B3B3B8]/60 text-xs leading-relaxed">{m.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-[#C084FC]/40 group-hover:text-[#C084FC] transition-colors">
                    <span className="text-[10px] uppercase tracking-[0.2em]">Explore</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedWorksSection() {
  const { ref, inView } = useInView();
  const { data: artworks, isLoading } = useQuery<Artwork[]>({
    queryKey: ["/api/artworks", "published"],
    queryFn: () => fetch("/api/artworks?status=published").then((r) => r.json()),
  });

  const featured = artworks?.filter((a) => a.featured || a.forSale).slice(0, 3) || [];

  return (
    <section className="py-24 lg:py-32" style={{ background: "linear-gradient(180deg, #08060e 0%, #0c0915 100%)" }} data-testid="section-featured">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="flex items-end justify-between mb-14">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-3">Available</span>
              <h2 className="text-3xl sm:text-4xl font-light text-white" style={{ fontFamily: "Georgia, serif" }}>
                Featured Works
              </h2>
            </div>
            <Link href="/shop">
              <span className="hidden sm:flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#B3B3B8]/50 hover:text-[#C084FC] transition-colors cursor-pointer">
                Shop All <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-sm bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="text-center py-16 border border-white/8 rounded-sm">
              <p className="text-[#B3B3B8]/40 text-sm">New works coming soon.</p>
              <Link href="/commission">
                <Button className="mt-4 bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em]">
                  Commission a Piece
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((artwork) => (
                <Link key={artwork.id} href={`/shop/${artwork.slug}`}>
                  <div
                    className="group cursor-pointer"
                    data-testid={`card-artwork-${artwork.id}`}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[#1a1225] mb-4">
                      {(artwork.enhancedImageUrl || artwork.imageUrl) ? (
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
                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-[#F5F5F7]/70 text-[9px] uppercase tracking-[0.2em] px-2 py-1 rounded-sm">
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
                      <h3 className="text-[#F5F5F7] text-sm font-medium tracking-wide group-hover:text-[#C084FC] transition-colors">{artwork.title}</h3>
                      <p className="text-[#B3B3B8]/50 text-xs mt-1">{artwork.medium}{artwork.dimensions ? ` · ${artwork.dimensions}` : ""}</p>
                      {artwork.price && artwork.forSale && !artwork.sold && (
                        <p className="text-[#C084FC] text-sm mt-1.5 font-medium">${parseFloat(String(artwork.price)).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/shop">
              <Button
                variant="ghost"
                className="text-[#B3B3B8] hover:text-white border border-white/15 hover:border-white/30 text-xs uppercase tracking-[0.2em] font-semibold px-8 py-3 h-auto"
                data-testid="button-view-all-shop"
              >
                View All Works
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  const { ref, inView } = useInView();

  return (
    <section className="py-24 lg:py-32 bg-[#0c0915]" data-testid="section-about">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-4">The Artist</span>
              <h2 className="text-3xl sm:text-4xl font-light text-white leading-tight mb-6" style={{ fontFamily: "Georgia, serif" }}>
                Where imagination
                <br />
                <span className="italic">meets material.</span>
              </h2>
              <p className="text-[#B3B3B8]/70 text-sm leading-relaxed mb-4">
                Working across abstract canvas, portraiture, and sculptural installation, each piece is an exploration of the boundary between emotion and form — between what is felt and what can be made tangible.
              </p>
              <p className="text-[#B3B3B8]/60 text-sm leading-relaxed mb-8">
                Copper, reclaimed materials, and layered paint serve as the vocabulary of a practice rooted in honesty and craft. Every work begins with a question and ends with something that exists entirely on its own terms.
              </p>
              <div className="flex gap-4">
                <Link href="/about">
                  <Button
                    variant="ghost"
                    className="text-[#C084FC] hover:text-white border border-[#C084FC]/30 hover:border-[#C084FC]/60 text-xs uppercase tracking-[0.18em] font-semibold px-6 py-2.5 h-auto"
                    data-testid="button-about-learn-more"
                  >
                    About the Artist
                  </Button>
                </Link>
                <Link href="/commission">
                  <Button
                    variant="ghost"
                    className="text-[#B3B3B8]/60 hover:text-white border border-white/10 hover:border-white/25 text-xs uppercase tracking-[0.18em] font-semibold px-6 py-2.5 h-auto"
                    data-testid="button-about-commission"
                  >
                    Commission
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div
                className="aspect-[4/5] rounded-sm"
                style={{ background: "linear-gradient(135deg, rgba(192,132,252,0.1) 0%, rgba(139,92,246,0.08) 50%, rgba(216,180,254,0.05) 100%)", border: "1px solid rgba(192,132,252,0.1)" }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Palette className="w-12 h-12 text-[#C084FC]/20 mx-auto mb-3" />
                    <p className="text-[#B3B3B8]/20 text-xs uppercase tracking-[0.2em]">Artist portrait</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 w-48 h-32 rounded-sm border border-white/5"
                style={{ background: "rgba(192,132,252,0.05)" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommissionCTASection() {
  const { ref, inView } = useInView();

  return (
    <section className="py-24 lg:py-32 bg-[#08060e]" data-testid="section-commission-cta">
      <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-4">Commissions</span>
          <h2 className="text-3xl sm:text-4xl font-light text-white mb-6" style={{ fontFamily: "Georgia, serif" }}>
            A piece made for you,<br />
            <span className="italic">and only you.</span>
          </h2>
          <p className="text-[#B3B3B8]/60 text-sm leading-relaxed mb-10 max-w-xl mx-auto">
            Commission an original work — a portrait, an abstract canvas, or a custom sculpture. Each commission begins with a conversation about what you want to live with.
          </p>
          <Link href="/commission">
            <Button
              className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em] font-semibold px-10 py-3.5 h-auto"
              data-testid="button-commission-cta"
            >
              Start a Commission
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const defaultOgImage = useOgImage();
  return (
    <div data-testid="page-home">
      <title>Creations by Oracle — Original Art | Abstract, Portraits & Sculpture</title>
      <meta name="description" content="Creations by Oracle — original abstract canvas works, life-like portraits, 3D art installations, and copper sculptures. Commissions welcome." />
      <meta property="og:title" content="Creations by Oracle — Original Art" />
      <meta property="og:description" content="Original abstract canvas works, life-like portraits, 3D art installations, and copper sculptures. Commissions welcome." />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Creations by Oracle" />
      <meta property="og:image" content={defaultOgImage} />
      <meta property="og:url" content={typeof window !== "undefined" ? window.location.origin : "/"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Creations by Oracle — Original Art" />
      <meta name="twitter:description" content="Original abstract canvas works, life-like portraits, 3D art installations, and copper sculptures. Commissions welcome." />
      <meta name="twitter:image" content={defaultOgImage} />
      <HeroSection />
      <MediumsSection />
      <FeaturedWorksSection />
      <TestimonialsSection />
      <AboutSection />
      <CommissionCTASection />
    </div>
  );
}
