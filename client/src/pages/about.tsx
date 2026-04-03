import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Palette } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-[#08060e]" data-testid="page-about">
      <title>About the Artist — Creations by Oracle</title>
      <meta name="description" content="Learn about Creations by Oracle — exploring abstract canvas, portraiture, and sculptural installations in copper and reclaimed materials." />
      <meta property="og:title" content="About the Artist — Creations by Oracle" />
      <meta property="og:description" content="Exploring abstract canvas, portraiture, and sculptural installations in copper and reclaimed materials." />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Creations by Oracle" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="About the Artist — Creations by Oracle" />

      {/* Hero */}
      <div className="pt-32 pb-16 px-6 lg:px-10 max-w-7xl mx-auto">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-4">The Artist</span>
        <h1 className="text-4xl sm:text-5xl font-light text-white max-w-2xl leading-tight" style={{ fontFamily: "Georgia, serif" }} data-testid="heading-about">
          Between emotion
          <br />
          <span className="italic">and material.</span>
        </h1>
      </div>

      {/* Bio */}
      <div className="px-6 lg:px-10 max-w-7xl mx-auto pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          <div>
            <div className="space-y-5 text-[#B3B3B8]/70 text-sm leading-relaxed">
              <p>
                Working at the intersection of abstraction, representation, and three-dimensional form, my practice spans canvas, copper, and installation — each medium a different language for the same essential investigation.
              </p>
              <p>
                Abstract canvas work begins intuitively, layer on layer, until the painting tells me what it is. Portraiture demands the opposite — patient observation, technical precision, and a willingness to be humbled by the face in front of you.
              </p>
              <p>
                The sculptural work — copper, reclaimed wood, found materials — is about transformation. Metal that was once something else becomes something new. The history of the material becomes part of the work.
              </p>
              <p>
                I take commissions seriously because I believe that great art belongs in living spaces, not just galleries. A commission is a conversation, and the piece that comes out of it belongs to both of us.
              </p>
            </div>

            <div className="mt-10 flex gap-4 flex-wrap">
              <Link href="/contact?utm_source=about&utm_medium=cta&utm_campaign=commission">
                <Button
                  className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em] font-semibold px-7 py-3 h-auto"
                  data-testid="button-about-commission"
                >
                  Commission a Piece
                </Button>
              </Link>
              <Link href="/shop">
                <Button
                  variant="ghost"
                  className="text-[#B3B3B8] hover:text-white border border-white/15 hover:border-white/30 text-xs uppercase tracking-[0.2em] font-semibold px-7 py-3 h-auto"
                  data-testid="button-about-shop"
                >
                  View Works
                </Button>
              </Link>
            </div>
          </div>

          <div>
            <div
              className="aspect-[4/5] rounded-sm flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(192,132,252,0.08) 0%, rgba(139,92,246,0.05) 100%)", border: "1px solid rgba(192,132,252,0.1)" }}
            >
              <div className="text-center">
                <Palette className="w-10 h-10 text-[#C084FC]/20 mx-auto mb-3" />
                <p className="text-[#B3B3B8]/20 text-xs uppercase tracking-[0.2em]">Artist portrait</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mediums */}
      <div className="border-t border-white/5 bg-[#0c0915] py-16 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-4">Practice</span>
          <h2 className="text-2xl font-light text-white mb-10" style={{ fontFamily: "Georgia, serif" }}>Mediums</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Abstract Canvas", desc: "Large-scale explorations of color, texture, and emotional abstraction. Each work unique and irreproducible.", href: "/shop?category=Abstract" },
              { title: "Life-like Portraiture", desc: "Technically demanding hyperrealism. The face as a site of narrative, history, and feeling.", href: "/shop?category=Portrait" },
              { title: "3D Installations", desc: "Site-specific work designed to inhabit and transform architectural space.", href: "/shop?category=3D+Installation" },
              { title: "Copper Sculpture", desc: "Hand-worked copper and reclaimed materials — sculpture as a record of process.", href: "/shop?category=Sculpture" },
            ].map((m) => (
              <Link key={m.title} href={m.href}>
                <div
                  className="group p-5 rounded-sm border border-white/8 hover:border-[#C084FC]/30 transition-all duration-300 cursor-pointer h-full"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                  data-testid={`card-medium-${m.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <h3 className="text-[#F5F5F7] text-sm font-medium tracking-wide mb-2 group-hover:text-[#C084FC] transition-colors">{m.title}</h3>
                  <p className="text-[#B3B3B8]/50 text-xs leading-relaxed">{m.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-[#C084FC]/30 group-hover:text-[#C084FC] transition-colors">
                    <span className="text-[9px] uppercase tracking-[0.2em]">Explore</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 px-6 lg:px-10 text-center border-t border-white/5 bg-[#08060e]" data-testid="section-about-cta">
        <h2 className="text-2xl sm:text-3xl font-light text-white mb-4" style={{ fontFamily: "Georgia, serif" }}>
          Let's make something together.
        </h2>
        <p className="text-[#B3B3B8]/50 text-sm max-w-sm mx-auto mb-8">
          Portrait commissions, abstract works, and installation projects. Each begins with a conversation.
        </p>
        <Link href="/contact">
          <Button
            className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em] font-semibold px-8 py-3 h-auto"
            data-testid="button-about-contact"
          >
            Get in Touch
          </Button>
        </Link>
      </div>
    </div>
  );
}
