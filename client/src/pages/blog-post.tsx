import { useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Share2, Eye, Palette, ArrowRight } from "lucide-react";
import { SiX, SiFacebook, SiLinkedin } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import type { Artwork } from "@shared/schema";
import { useOgImage } from "@/hooks/use-og-image";

interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[] | null;
  readCount: number;
  shareCount: number;
  publishedAt: string | null;
  createdAt: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMarkdown(content: string): string {
  const linkPlaceholders: { placeholder: string; html: string }[] = [];
  let idx = 0;

  let processed = content
    .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, (_match, text, href) => {
      const placeholder = `%%LINK_${idx++}%%`;
      const safeText = escapeHtml(text.trim());
      const safeHref = escapeHtml(href.trim());
      linkPlaceholders.push({
        placeholder,
        html: `<a href="${safeHref}" class="text-[#5D3FD3] hover:text-[#7a5ce8] underline underline-offset-2 transition-colors">${safeText}</a>`
      });
      return placeholder;
    })
    .replace(/(?:^|(?<=\s))(\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*)(?=[\s.,;:)]|$)/gm, (match) => {
      const placeholder = `%%LINK_${idx++}%%`;
      const label = match.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      linkPlaceholders.push({
        placeholder,
        html: `<a href="${escapeHtml(match)}" class="text-[#5D3FD3] hover:text-[#7a5ce8] underline underline-offset-2 transition-colors">${escapeHtml(label)}</a>`
      });
      return placeholder;
    });

  let bulletPlaceholders: { placeholder: string; html: string }[] = [];
  let bIdx = 0;
  processed = processed.replace(/^[-*] (.+)$/gm, (_match, item) => {
    const placeholder = `%%BULLET_${bIdx++}%%`;
    bulletPlaceholders.push({
      placeholder,
      html: `<li class="text-[#B3B3B8] leading-relaxed">${escapeHtml(item)}</li>`
    });
    return placeholder;
  });

  let safe = escapeHtml(processed);

  for (const { placeholder, html } of linkPlaceholders) {
    safe = safe.replace(placeholder, html);
  }

  let inList = false;
  const lines = safe.split('\n');
  const outputLines: string[] = [];
  for (const line of lines) {
    const bulletMatch = bulletPlaceholders.find(b => line.includes(b.placeholder));
    if (bulletMatch) {
      if (!inList) {
        outputLines.push('<ul class="list-disc list-inside text-[#B3B3B8] text-sm leading-relaxed mb-4 space-y-1 ml-2">');
        inList = true;
      }
      outputLines.push(line.replace(bulletMatch.placeholder, bulletMatch.html));
    } else {
      if (inList) {
        outputLines.push('</ul>');
        inList = false;
      }
      outputLines.push(line);
    }
  }
  if (inList) outputLines.push('</ul>');
  safe = outputLines.join('\n');

  return safe
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-white mt-10 mb-4">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, '</p><p class="text-[#B3B3B8] leading-relaxed mb-4">')
    .replace(/^/, '<p class="text-[#B3B3B8] leading-relaxed mb-4">')
    .replace(/$/, "</p>");
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const readTracked = useRef(false);
  const defaultOgImage = useOgImage();

  const { data: post, isLoading, error } = useQuery<Post>({
    queryKey: ["/api/posts", slug],
    queryFn: () => fetch(`/api/posts/${slug}`).then(r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    enabled: !!slug,
  });

  const { data: allArtworks } = useQuery<Artwork[]>({
    queryKey: ["/api/artworks", "published"],
    queryFn: () => fetch("/api/artworks?status=published").then(r => r.json()),
  });

  const relatedArtworks = (() => {
    if (!post || !allArtworks || allArtworks.length === 0) return [];
    const postTags = (post.tags || []).map((t: string) => t.toLowerCase());
    if (postTags.length === 0) return [];
    const scored = allArtworks.map((a) => {
      let score = 0;
      const artTags = [a.category || "", a.medium || "", ...(a.seoKeywords || [])].map(s => s.toLowerCase());
      for (const tag of postTags) {
        for (const artTag of artTags) {
          if (artTag && (artTag.includes(tag) || tag.includes(artTag))) score++;
        }
      }
      return { artwork: a, score };
    });
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.artwork);
  })();

  useEffect(() => {
    if (!post || readTracked.current) return;
    readTracked.current = true;
    fetch(`/api/posts/${post.id}/read`, { method: "POST" }).catch(() => {});
  }, [post]);

  useEffect(() => {
    if (!post) return;
    document.title = post.seoTitle || `${post.title} | Creations by Oracle`;
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
    const desc = post.seoDescription || post.excerpt || "";
    if (desc) setMeta("description", desc);
    if (post.seoKeywords?.length) setMeta("keywords", post.seoKeywords.join(", "));
    setOg("og:title", post.seoTitle || post.title);
    setOg("og:description", post.excerpt || post.seoDescription || "");
    setOg("og:type", "article");
    setOg("og:url", window.location.href);
    setOg("og:site_name", "Creations by Oracle");
    setOg("og:image", defaultOgImage);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", post.seoTitle || post.title);
    setMeta("twitter:description", post.excerpt || post.seoDescription || "");
    setMeta("twitter:image", defaultOgImage);

    let ldEl = document.querySelector('script[data-blog-ld]') as HTMLScriptElement | null;
    if (!ldEl) { ldEl = document.createElement("script"); ldEl.type = "application/ld+json"; ldEl.setAttribute("data-blog-ld", "true"); document.head.appendChild(ldEl); }
    ldEl.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt || post.seoDescription || "",
      datePublished: post.publishedAt,
      ...(post.seoKeywords?.length ? { keywords: post.seoKeywords.join(", ") } : {}),
      publisher: { "@type": "Organization", name: "Creations by Oracle" },
    });

    return () => {
      document.title = "Creations by Oracle — Original Art";
      document.querySelector('meta[name="description"]')?.remove();
      document.querySelector('meta[name="keywords"]')?.remove();
      document.querySelector('meta[property="og:title"]')?.remove();
      document.querySelector('meta[property="og:description"]')?.remove();
      document.querySelector('meta[property="og:type"]')?.remove();
      document.querySelector('meta[property="og:url"]')?.remove();
      document.querySelector('meta[property="og:site_name"]')?.remove();
      document.querySelector('meta[property="og:image"]')?.remove();
      document.querySelector('meta[name="twitter:card"]')?.remove();
      document.querySelector('meta[name="twitter:title"]')?.remove();
      document.querySelector('meta[name="twitter:description"]')?.remove();
      document.querySelector('meta[name="twitter:image"]')?.remove();
      document.querySelector('script[data-blog-ld]')?.remove();
    };
  }, [post, defaultOgImage]);

  const handleShare = (platform: string) => {
    if (!post) return;
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post.title);

    let shareUrl = "";
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case "copy":
        navigator.clipboard.writeText(window.location.href);
        fetch(`/api/posts/${post.id}/share`, { method: "POST" }).catch(() => {});
        return;
    }

    fetch(`/api/posts/${post.id}/share`, { method: "POST" }).catch(() => {});

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#0B0B0D] min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="bg-[#0B0B0D] min-h-screen pt-24 lg:pt-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center py-20">
          <h1 className="text-2xl font-bold text-white mb-4" data-testid="text-post-not-found">Article Not Found</h1>
          <p className="text-[#B3B3B8] mb-8">This article may have been moved or removed.</p>
          <Link href="/blog">
            <Button
              className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs uppercase tracking-[0.15em] font-semibold"
              data-testid="button-back-to-blog"
            >
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0B0D] min-h-screen pt-24 lg:pt-32">
      <article className="max-w-3xl mx-auto px-6 lg:px-10 pb-24 lg:pb-40">
        <Link href="/blog">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#B3B3B8]/60 hover:text-[#5D3FD3] transition-colors cursor-pointer mb-8" data-testid="link-back-to-blog">
            <ArrowLeft className="w-3 h-3" />
            Back to Blog
          </span>
        </Link>

        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <p className="text-xs text-[#B3B3B8]/50 uppercase tracking-[0.15em]">
              {post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                : ""}
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-[#B3B3B8]/40" data-testid="text-read-count">
                <Eye className="w-3 h-3" />
                {post.readCount}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#B3B3B8]/40" data-testid="text-share-count">
                <Share2 className="w-3 h-3" />
                {post.shareCount}
              </span>
            </div>
          </div>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white uppercase tracking-tight leading-[1.05]"
            style={{ fontFamily: "Poppins, sans-serif" }}
            data-testid="text-post-title"
          >
            {post.title}
          </h1>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] uppercase tracking-[0.15em] text-[#5D3FD3]/80 bg-[#5D3FD3]/10 px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className="prose-reign"
          data-testid="blog-post-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        {relatedArtworks.length > 0 && (
          <div className="mt-16 pt-12 border-t border-white/5">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#C084FC]/50 block mb-3">From the Shop</span>
            <h3 className="text-xl font-light text-white mb-8" style={{ fontFamily: "Georgia, serif" }}>Related Works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedArtworks.map((artwork) => (
                <Link key={artwork.id} href={`/shop/${artwork.slug}`}>
                  <div className="group cursor-pointer" data-testid={`related-artwork-${artwork.id}`}>
                    <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[#1a1225] mb-3">
                      {artwork.enhancedImageUrl || artwork.imageUrl ? (
                        <img
                          src={artwork.enhancedImageUrl || artwork.imageUrl}
                          alt={artwork.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Palette className="w-6 h-6 text-white/10" />
                        </div>
                      )}
                      {artwork.sold && (
                        <div className="absolute top-2 left-2 bg-black/70 text-[#F5F5F7]/60 text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm">Sold</div>
                      )}
                    </div>
                    <p className="text-[#B3B3B8]/40 text-[9px] uppercase tracking-[0.2em] mb-0.5">{artwork.category}</p>
                    <h4 className="text-[#F5F5F7] text-sm group-hover:text-[#C084FC] transition-colors">{artwork.title}</h4>
                    {artwork.price && artwork.forSale && !artwork.sold && (
                      <p className="text-[#C084FC] text-xs mt-0.5">${parseFloat(String(artwork.price)).toLocaleString()}</p>
                    )}
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-[#C084FC]/40 group-hover:text-[#C084FC] transition-colors mt-2">
                      View Work <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <Link href="/contact?utm_source=blog&utm_medium=post_cta&utm_campaign=commission">
              <Button
                className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.15em] font-semibold px-8"
                data-testid="button-post-cta"
              >
                Commission a Piece
              </Button>
            </Link>

            <div className="flex items-center gap-1">
              <span className="text-xs text-[#B3B3B8]/40 uppercase tracking-[0.15em] mr-2">Share</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShare("twitter")}
                className="text-[#B3B3B8] hover:text-white"
                data-testid="button-share-twitter"
              >
                <SiX className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShare("facebook")}
                className="text-[#B3B3B8] hover:text-white"
                data-testid="button-share-facebook"
              >
                <SiFacebook className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShare("linkedin")}
                className="text-[#B3B3B8] hover:text-white"
                data-testid="button-share-linkedin"
              >
                <SiLinkedin className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShare("copy")}
                className="text-[#B3B3B8] hover:text-white"
                data-testid="button-share-copy"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
