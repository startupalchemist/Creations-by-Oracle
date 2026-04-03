import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2 } from "lucide-react";
import type { GallerySection, GalleryItem } from "@shared/schema";

type GallerySectionWithItems = GallerySection & { items: GalleryItem[] };

const badgeColors: Record<string, string> = {
  "Process":     "bg-amber-500/90 text-black border border-amber-400/40",
  "Complete":    "bg-[#C084FC]/90 text-white border border-[#C084FC]/40",
  "Commission":  "bg-blue-500/90 text-white border border-blue-400/40",
  "Before":      "bg-white/10 text-white border border-white/20",
  "After":       "bg-[#C084FC]/90 text-white border border-[#C084FC]/40",
  "In Progress": "bg-amber-500/90 text-black border border-amber-400/40",
};

function MasonryGrid({ images }: { images: GalleryItem[] }) {
  return (
    <div className="columns-2 md:columns-3 gap-3">
      {images.map((img, i) => (
        <div key={img.id} className="break-inside-avoid mb-3" data-testid={`gallery-img-${i}`}>
          <img
            src={img.src}
            alt={img.alt}
            loading="lazy"
            className="w-full rounded-lg object-cover transition-opacity duration-300"
            style={{ display: "block" }}
          />
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ label, title, callout }: { label: string; title: string; callout?: string }) {
  return (
    <div className="mb-8">
      <span className="text-[10px] uppercase tracking-[0.35em] text-[#C084FC]/60 font-medium">{label}</span>
      <h2 className="mt-2 text-2xl sm:text-3xl font-light text-white" style={{ fontFamily: "Georgia, serif" }}>
        {title}
      </h2>
      {callout && <p className="mt-2 text-sm text-[#B3B3B8]/60">{callout}</p>}
    </div>
  );
}

function SpotlightSection({ section }: { section: GallerySectionWithItems }) {
  return (
    <section className="mb-20 lg:mb-28" data-testid="section-spotlight">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#C084FC]/60 font-medium">{section.name}</span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-light text-white" style={{ fontFamily: "Georgia, serif" }}>
            {section.name}
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {section.items.map((img, i) => (
          <div key={img.id} className="relative rounded-xl overflow-hidden group" data-testid={`spotlight-img-${i}`}>
            <img
              src={img.src}
              alt={img.alt}
              loading="lazy"
              className="w-full h-56 sm:h-64 md:h-72 object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {img.badge && (
              <span
                className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full ${badgeColors[img.badge] ?? "bg-white/20 text-white border border-white/30"}`}
              >
                {img.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function GenericSection({ section, index }: { section: GallerySectionWithItems; index: number }) {
  const testId = `section-${section.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="mb-20 lg:mb-28" data-testid={testId}>
      <SectionHeader label={section.name} title={section.name} />
      <MasonryGrid images={section.items} />
    </section>
  );
}

export default function Gallery() {
  const { data, isLoading } = useQuery<{ sections: GallerySectionWithItems[] }>({
    queryKey: ["/api/gallery"],
  });

  const sections = data?.sections ?? [];

  return (
    <div className="bg-[#0B0B0D] min-h-screen pt-24 lg:pt-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-24 lg:pb-40">

        <div className="mb-16 lg:mb-20">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-3">The Gallery</span>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-tight"
            style={{ fontFamily: "Georgia, serif" }}
            data-testid="text-gallery-headline"
          >
            A record of the work.
          </h1>
          <p className="mt-5 text-[#B3B3B8]/60 text-base max-w-xl leading-relaxed font-light">
            Process photographs, finished works, and installation documentation from the studio.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#C084FC] animate-spin" />
          </div>
        ) : (
          <>
            {sections.map((section, i) =>
              section.name === "Project Spotlight" ? (
                <SpotlightSection key={section.id} section={section} />
              ) : (
                <GenericSection key={section.id} section={section} index={i} />
              )
            )}
          </>
        )}

        <div
          className="mt-4 p-10 rounded-sm text-center relative overflow-hidden"
          style={{
            background: "rgba(192,132,252,0.05)",
            border: "1px solid rgba(192,132,252,0.15)",
          }}
          data-testid="section-gallery-cta"
        >
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-3">Commission</span>
            <h2 className="text-2xl sm:text-3xl font-light text-white mb-4" style={{ fontFamily: "Georgia, serif" }}>
              Commission an original piece.
            </h2>
            <p className="text-[#B3B3B8]/50 text-sm leading-relaxed max-w-lg mx-auto mb-8">
              Each commission begins with a conversation. Portrait, abstract canvas, copper sculpture — all mediums available for bespoke work.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact?utm_source=gallery&utm_medium=bottom_cta&utm_campaign=commission">
                <Button
                  className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.18em] font-semibold px-10 py-3 h-auto"
                  data-testid="button-gallery-cta"
                >
                  Start a Commission
                </Button>
              </Link>
              <Link href="/shop">
                <Button
                  variant="ghost"
                  className="text-[#B3B3B8] hover:text-white border border-white/10 hover:border-white/25 text-xs uppercase tracking-[0.15em] font-semibold px-8 py-3 h-auto"
                >
                  Shop Available Works <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
