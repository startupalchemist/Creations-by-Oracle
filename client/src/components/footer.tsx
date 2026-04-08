import { Link } from "wouter";
import { useBrand } from "@/hooks/use-brand";

const navLinks = [
  { label: "Gallery", href: "/gallery" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const artLinks = [
  { label: "Abstract Canvas", href: "/shop?category=Abstract" },
  { label: "Life-like Portraits", href: "/shop?category=Portrait" },
  { label: "3D Art Installations", href: "/shop?category=3D+Installation" },
  { label: "Copper Sculptures", href: "/shop?category=Sculpture" },
  { label: "Mixed Media", href: "/shop?category=Mixed+Media" },
];

export default function Footer() {
  const brand = useBrand();
  return (
    <footer className="border-t border-white/5 bg-[#08060e]" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          <div>
            <div className="mb-4">
              <span className="text-[#F5F5F7] font-light tracking-[0.3em] text-base uppercase block"
                style={{ fontFamily: "Georgia, serif" }}>
                {brand.artist_name}
              </span>
              <span className="text-[#C084FC]/50 text-[10px] tracking-[0.25em] uppercase">
                {brand.artist_tagline}
              </span>
            </div>
            <p className="text-[#B3B3B8]/60 text-xs leading-relaxed max-w-xs mt-4">
              Abstract canvas art, life-like portraiture, 3D installations, and sculptures crafted in copper and other materials. Each work is one of a kind.
            </p>
            <div className="mt-6">
              <Link href="/contact?utm_source=footer&utm_medium=cta&utm_campaign=commission">
                <span className="inline-block text-xs uppercase tracking-[0.18em] font-semibold text-[#C084FC] hover:text-[#d8a4ff] transition-colors cursor-pointer border border-[#C084FC]/30 px-4 py-2 rounded-sm hover:border-[#C084FC]/60">
                  Commission a Piece
                </span>
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#C084FC] font-semibold mb-4">
              Mediums
            </h4>
            <ul className="space-y-2">
              {artLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    <span
                      className="text-[#B3B3B8]/60 hover:text-[#F5F5F7] text-xs transition-colors duration-300 cursor-pointer"
                      data-testid={`link-footer-art-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#C084FC] font-semibold mb-4">
              Navigate
            </h4>
            <ul className="space-y-2">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    <span
                      className="text-[#B3B3B8]/60 hover:text-[#F5F5F7] text-xs transition-colors duration-300 cursor-pointer"
                      data-testid={`link-footer-${item.label.toLowerCase()}`}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <p className="text-[#B3B3B8]/40 text-xs leading-relaxed">
                Available for commissions, exhibitions, and private collections.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#B3B3B8]/30 text-xs tracking-wide">
            {new Date().getFullYear()} {brand.artist_name}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/login">
              <span className="text-[#B3B3B8]/25 hover:text-[#B3B3B8]/50 text-xs tracking-wide transition-colors duration-300 cursor-pointer" data-testid="link-footer-admin">
                Admin
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
