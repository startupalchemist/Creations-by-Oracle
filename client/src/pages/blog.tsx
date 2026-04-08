import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useOgImage } from "@/hooks/use-og-image";

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
}

export default function Blog() {
  const defaultOgImage = useOgImage();
  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts", "published"],
    queryFn: () => fetch("/api/posts?status=published").then(r => r.json()),
  });

  return (
    <div className="bg-[#0B0B0D] min-h-screen pt-24 lg:pt-32">
      <title>Blog — Creations by Oracle</title>
      <meta name="description" content="Art insights, process notes, and creative reflections from Creations by Oracle." />
      <meta property="og:title" content="Blog — Creations by Oracle" />
      <meta property="og:description" content="Art insights, process notes, and creative reflections from Creations by Oracle." />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Creations by Oracle" />
      <meta property="og:image" content={defaultOgImage} />
      <meta property="og:url" content={typeof window !== "undefined" ? window.location.href : "/blog"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Blog — Creations by Oracle" />
      <meta name="twitter:description" content="Art insights, process notes, and creative reflections from Creations by Oracle." />
      <meta name="twitter:image" content={defaultOgImage} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Creations by Oracle — Blog",
            description: "Art insights, creative process notes, and reflections from the studio of Creations by Oracle.",
            url: typeof window !== "undefined" ? window.location.origin + "/blog" : "/blog",
          }),
        }}
      />
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24 lg:pb-40">
        <div className="max-w-2xl mb-16">
          <span className="text-xs uppercase tracking-[0.3em] text-[#C084FC] font-semibold mb-4 block">Journal</span>
          <h1
            className="text-4xl sm:text-5xl font-light text-white leading-tight"
            style={{ fontFamily: "Georgia, serif" }}
            data-testid="text-blog-headline"
          >
            The Journal
          </h1>
          <p className="mt-4 text-[#B3B3B8] text-lg leading-relaxed font-light">
            Process notes, artistic reflections, and insights on contemporary art and collecting.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#C084FC] animate-spin" />
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="blog-post-grid">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <article
                  className="p-6 rounded-sm cursor-pointer h-full flex flex-col transition-all duration-300 hover:border-[#C084FC]/20"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  data-testid={`card-blog-post-${post.id}`}
                >
                  <p className="text-xs text-[#B3B3B8]/50 uppercase tracking-[0.15em] mb-3">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : ""}
                  </p>
                  <h2 className="text-base font-light text-white leading-snug mb-3" style={{ fontFamily: "Georgia, serif" }} data-testid={`text-post-title-${post.id}`}>
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-[#B3B3B8]/60 leading-relaxed mb-4 flex-1">
                      {post.excerpt}
                    </p>
                  )}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] uppercase tracking-[0.15em] text-[#C084FC]/70 bg-[#C084FC]/10 px-2 py-0.5 rounded-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20" data-testid="blog-empty-state">
            <p className="text-[#B3B3B8]/50 text-sm mb-6">Articles and studio notes coming soon.</p>
            <Link href="/commission">
              <Button
                className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.15em] font-semibold px-8"
                data-testid="button-blog-cta"
              >
                Commission a Piece
              </Button>
            </Link>
          </div>
        )}

        <div
          className="mt-16 p-6 rounded-sm"
          style={{
            background: "rgba(192,132,252,0.04)",
            border: "1px solid rgba(192,132,252,0.12)",
          }}
        >
          <h3 className="text-xs uppercase tracking-[0.2em] text-[#B3B3B8]/50 font-semibold mb-4">Explore the Work</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Abstract Canvas", href: "/shop?category=Abstract" },
              { label: "Portraits", href: "/shop?category=Portrait" },
              { label: "3D Installations", href: "/shop?category=3D+Installation" },
              { label: "Copper Sculpture", href: "/shop?category=Sculpture" },
              { label: "Shop All Works", href: "/shop" },
              { label: "Commission a Piece", href: "/commission" },
            ].map((link) => (
              <Link key={link.href} href={link.href}>
                <span className="text-xs text-[#C084FC]/70 hover:text-[#C084FC] transition-colors cursor-pointer">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
