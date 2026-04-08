import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrand } from "@/hooks/use-brand";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "Gallery", href: "/gallery" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const brand = useBrand();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <header
      data-testid="header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-white/8" : "bg-transparent"
      }`}
      style={scrolled ? {
        background: "rgba(8, 6, 14, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      } : {}}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="flex flex-col leading-none">
                <span
                  className="text-white font-light tracking-[0.3em] text-sm uppercase"
                  style={{ fontFamily: "Georgia, serif", letterSpacing: "0.28em" }}
                  data-testid="text-logo-name"
                >
                  {brand.artist_name}
                </span>
                <span
                  className="text-[#C084FC]/60 tracking-[0.15em] text-[9px] uppercase"
                  style={{ letterSpacing: "0.25em" }}
                >
                  {brand.artist_tagline}
                </span>
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7" data-testid="nav-desktop">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <span
                  className={`text-[11px] uppercase tracking-[0.2em] font-medium cursor-pointer transition-colors duration-300 ${
                    location === item.href || location.startsWith(item.href + "/")
                      ? "text-[#C084FC]"
                      : "text-[#B3B3B8] hover:text-white"
                  }`}
                  data-testid={`link-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
            <Link href="/commission">
              <Button
                variant="default"
                className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-[11px] uppercase tracking-[0.18em] font-semibold px-5 py-2"
                data-testid="button-commission-header"
              >
                Commission a Piece
              </Button>
            </Link>
          </nav>

          <button
            className="lg:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="button-mobile-menu"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden border-t border-white/8 max-h-[80vh] overflow-y-auto"
          style={{
            background: "rgba(8, 6, 14, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          data-testid="nav-mobile"
        >
          <div className="px-6 py-6 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <span className="text-sm uppercase tracking-[0.2em] font-medium text-[#B3B3B8] hover:text-white block py-2 cursor-pointer transition-colors">
                  {item.label}
                </span>
              </Link>
            ))}
            <Link href="/commission">
              <Button
                variant="default"
                className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 w-full text-[11px] uppercase tracking-[0.18em] font-semibold mt-3"
                data-testid="button-commission-mobile"
              >
                Commission a Piece
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
