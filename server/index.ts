import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedRootUser } from "./auth";
import { storage } from "./storage";
import fs from "fs";
import path from "path";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(cookieParser());
app.use(
  express.json({
    limit: "20mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Serve /uploads from a persistent directory that survives builds
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function runOneTimePDRCleanup(): Promise<void> {
  try {
    // v2 supersedes v1: no date filter, deletes ALL published/queued legacy posts
    const flag = await storage.getSetting("pdr_cleanup_v2");
    if (flag === "done") return;

    const allPosts = await storage.getPosts();
    const legacyPosts = allPosts.filter((p) => p.status === "published" || p.status === "queued");
    const removedPostIds = new Set(legacyPosts.map((p) => p.id));
    let deletedPosts = 0;
    for (const post of legacyPosts) {
      await storage.deletePost(post.id);
      deletedPosts++;
    }

    // Hard-delete topics linked to removed posts
    const allTopics = await storage.getTopics();
    let deletedTopics = 0;
    for (const topic of allTopics) {
      if (topic.postId && removedPostIds.has(topic.postId)) {
        await storage.deleteTopic(topic.id);
        deletedTopics++;
      }
    }

    await storage.setSetting("pdr_cleanup_v2", "done");
    log(`[startup cleanup v2] Removed ${deletedPosts} legacy published/queued posts and ${deletedTopics} associated topics; ${allPosts.length - legacyPosts.length} draft posts preserved`);
  } catch (err) {
    log(`[startup cleanup] Failed: ${err}`);
  }
}

type SeedItem = { src: string; alt: string; badge?: string; displayOrder: number };
type SeedSection = { name: string; displayOrder: number; items: SeedItem[] };

async function seedGallery(): Promise<void> {
  try {
    const flag = await storage.getSetting("gallery_seeded_v1");
    if (flag === "done") return;

    const SECTIONS: SeedSection[] = [
      {
        name: "Project Spotlight",
        displayOrder: 0,
        items: [
          { src: "/gallery/spotlight-before-1.jpeg",   alt: "Before: bare patchy backyard",                badge: "Before",      displayOrder: 0 },
          { src: "/gallery/spotlight-progress-1.jpeg",  alt: "In Progress: gravel base and edging laid",   badge: "In Progress", displayOrder: 1 },
          { src: "/gallery/spotlight-after-1.jpeg",     alt: "After: lush turf with rock border",           badge: "After",       displayOrder: 2 },
          { src: "/gallery/spotlight-after-2.jpeg",     alt: "After: turf with flagstone and planter boxes",badge: "After",       displayOrder: 3 },
          { src: "/gallery/spotlight-after-3.jpeg",     alt: "After: flagstone patio and turf, tree feature",badge: "After",      displayOrder: 4 },
          { src: "/gallery/spotlight-after-4.jpeg",     alt: "After: golden hour full reveal",              badge: "After",       displayOrder: 5 },
        ],
      },
      {
        name: "Turf & Pavers",
        displayOrder: 1,
        items: [
          { src: "/gallery/pool-stepping-stones.webp",   alt: "Pool with turf and stepping stones",                  displayOrder: 0 },
          { src: "/gallery/pool-diamond-pavers.webp",    alt: "Pool with diamond turf and paver surround",           displayOrder: 1 },
          { src: "/gallery/outdoor-kitchen-pavers.webp", alt: "Covered outdoor kitchen with fire pit and pavers",    displayOrder: 2 },
          { src: "/gallery/firepit-pavers-night.webp",   alt: "Fire pit with turf grid at night",                   displayOrder: 3 },
          { src: "/gallery/aerial-pool-turf-1.jpeg",     alt: "Aerial view: pool with turf and paver install",       displayOrder: 4 },
          { src: "/gallery/aerial-pool-turf-2.jpeg",     alt: "Aerial view: pool and turf backyard",                displayOrder: 5 },
          { src: "/gallery/aerial-pool-turf-3.jpeg",     alt: "Aerial view: full turf backyard with pool",           displayOrder: 6 },
          { src: "/gallery/aerial-pool-turf-4.jpeg",     alt: "Aerial view: modern pool with turf and fire pit",     displayOrder: 7 },
        ],
      },
      {
        name: "Custom Patterns",
        displayOrder: 2,
        items: [
          { src: "/gallery/pattern-diamond-factory.jpeg", alt: "Custom diamond-cut turf pattern",          displayOrder: 0 },
          { src: "/gallery/pattern-floral-wall.jpeg",     alt: "Custom floral turf accent wall",           displayOrder: 1 },
          { src: "/gallery/pattern-circular-luxury.jpeg", alt: "Custom circular pattern on luxury estate", displayOrder: 2 },
        ],
      },
      {
        name: "Putting Greens",
        displayOrder: 3,
        items: [
          { src: "/gallery/putting-green-aerial-1.jpeg",  alt: "Aerial view: multi-hole putting green",   displayOrder: 0 },
          { src: "/gallery/putting-green-aerial-2.jpeg",  alt: "Aerial view: putting green alternate angle",displayOrder: 1 },
          { src: "/gallery/putting-green-gazebo.jpeg",    alt: "Putting green with backyard gazebo",       displayOrder: 2 },
          { src: "/gallery/putting-green-side-yard.jpeg", alt: "Dual putting green in side yard",          displayOrder: 3 },
        ],
      },
      {
        name: "Sports & Commercial",
        displayOrder: 4,
        items: [
          { src: "/gallery/sports-mini-soccer.jpeg",       alt: "Backyard mini soccer field with turf",   displayOrder: 0 },
          { src: "/gallery/sports-commercial-soccer.jpeg", alt: "Full indoor commercial soccer field",    displayOrder: 1 },
        ],
      },
      {
        name: "Outdoor Living",
        displayOrder: 5,
        items: [
          { src: "/gallery/outdoor-living-pergola.jpeg", alt: "Modern pergola with outdoor seating", displayOrder: 0 },
        ],
      },
      {
        name: "Residential",
        displayOrder: 6,
        items: [
          { src: "/gallery/residential-playground.jpeg", alt: "Children's playground on artificial turf",          displayOrder: 0 },
          { src: "/gallery/residential-frontyard.jpeg",  alt: "Clean front yard turf and pavers, aerial view", displayOrder: 1 },
        ],
      },
    ];

    for (const sectionData of SECTIONS) {
      const section = await storage.createGallerySection({
        name: sectionData.name,
        displayOrder: sectionData.displayOrder,
        isActive: true,
      });
      for (const item of sectionData.items) {
        await storage.createGalleryItem({
          sectionId: section.id,
          src: item.src,
          alt: item.alt,
          badge: item.badge ?? null,
          displayOrder: item.displayOrder,
          isActive: true,
        });
      }
    }

    await storage.setSetting("gallery_seeded_v1", "done");
    log(`[gallery seed] Seeded ${SECTIONS.length} sections with 26 images`);
  } catch (err) {
    log(`[gallery seed] Failed: ${err}`);
  }
}

type SeedService = {
  title: string;
  badge: string;
  description: string;
  keyDetails: string[];
  icon: string;
  slug: string;
  accentColor: string;
  displayOrder: number;
};

async function seedServices(): Promise<void> {
  try {
    const flag = await storage.getSetting("services_seeded_v1");
    if (flag === "done") return;

    const SERVICES: SeedService[] = [
      {
        title: "Custom Turf Design & Install",
        badge: "Residential & Commercial",
        description: "From intimate backyard putting greens to large-scale commercial lawns, Reign Services delivers precision-installed artificial turf that looks natural year-round. Our process includes full design consultation, topsoil removal, professional base preparation, drainage engineering, and expert turf installation — finished to the highest standard.",
        keyDetails: [
          "Comprehensive site assessment and custom layout design",
          "Professional topsoil and sod removal",
          "Engineered base and drainage installation",
          "Premium turf selection for Texas climate",
          "15–20 year lifespan with minimal maintenance",
          "Pet-safe and child-safe options available",
        ],
        icon: "Leaf",
        slug: "/custom-turf-install",
        accentColor: "#5D3FD3",
        displayOrder: 0,
      },
      {
        title: "Foundation Repair",
        badge: "Structural Solutions",
        description: "North Texas expansive clay soil creates unique foundation challenges. Our licensed structural team diagnoses and resolves foundation movement with proven, lasting methods — giving you peace of mind and protecting your property's value.",
        keyDetails: [
          "Thorough foundation inspection and diagnosis",
          "Pier and beam reinforcement",
          "Slab foundation leveling and repair",
          "Drainage correction and soil stabilization",
          "Warranty-backed workmanship",
          "Residential and commercial properties",
        ],
        icon: "Home",
        slug: "/foundation-repair",
        accentColor: "#0A1F44",
        displayOrder: 1,
      },
      {
        title: "Interior Remodeling",
        badge: "Full Interior Transformations",
        description: "From kitchen renovations and bathroom remodels to flooring, cabinetry, and complete space redesigns — Reign Services handles every detail of your interior transformation. We serve homeowners and commercial clients across DFW who demand quality finishes and professional execution.",
        keyDetails: [
          "Full kitchen and bathroom renovations",
          "Custom cabinetry and countertop installation",
          "Flooring: hardwood, tile, LVP, and more",
          "Lighting upgrades and fixture installation",
          "Open-concept layout reconfiguration",
          "Commercial tenant improvements",
        ],
        icon: "Wrench",
        slug: "/interior-remodeling",
        accentColor: "#5D3FD3",
        displayOrder: 2,
      },
      {
        title: "Outdoor Remodeling",
        badge: "Exterior Upgrades",
        description: "Elevate your property's exterior with professional outdoor remodeling. From deck construction and patio redesigns to pergolas and privacy fencing, we transform ordinary outdoor areas into functional, beautiful extensions of your living or working space.",
        keyDetails: [
          "Custom deck and patio construction",
          "Pergola, gazebo, and shade structure installation",
          "Privacy fencing and decorative borders",
          "Outdoor lighting integration",
          "Permit handling and HOA coordination",
          "Designed for DFW's climate",
        ],
        icon: "Sun",
        slug: "/outdoor-remodeling",
        accentColor: "#0A1F44",
        displayOrder: 3,
      },
      {
        title: "Bespoke Outdoor Living Spaces",
        badge: "Premium Outdoor Environments",
        description: "Our signature service. We design and build fully custom outdoor living environments — from outdoor kitchens and covered pavilions to fire features, water elements, and entertainment systems. Every project is unique, built to your vision and engineered to last.",
        keyDetails: [
          "Custom outdoor kitchen design and build",
          "Covered living pavilions and pergola systems",
          "Fire pits, fireplaces, and water features",
          "Entertainment system integration",
          "Custom lighting and ambiance design",
          "Residential estates and commercial hospitality",
        ],
        icon: "Trees",
        slug: "/outdoor-living",
        accentColor: "#5D3FD3",
        displayOrder: 4,
      },
      {
        title: "Turf & Pavers",
        badge: "Hardscape & Softscape",
        description: "The perfect union of artificial turf and premium pavers delivers stunning, low-maintenance outdoor surfaces. Ideal for driveways, walkways, pool decks, rooftop terraces, and commercial hardscaping. We design the pattern, source the materials, and handle professional installation.",
        keyDetails: [
          "Custom turf and paver pattern design",
          "Driveway, walkway, and pool surround installation",
          "Commercial hardscaping and plaza design",
          "Permeable paver systems for drainage compliance",
          "Natural stone, concrete, and porcelain options",
          "Long-term durability for DFW conditions",
        ],
        icon: "Square",
        slug: "/turf-and-pavers",
        accentColor: "#0A1F44",
        displayOrder: 5,
      },
    ];

    for (const s of SERVICES) {
      await storage.createService({
        title: s.title,
        badge: s.badge,
        header: "",
        description: s.description,
        keyDetails: s.keyDetails,
        icon: s.icon,
        slug: s.slug,
        accentColor: s.accentColor,
        showPrice: false,
        price: null,
        isActive: true,
        displayOrder: s.displayOrder,
      });
    }

    await storage.setSetting("services_seeded_v1", "done");
    log(`[services seed] Seeded ${SERVICES.length} services`);
  } catch (err) {
    log(`[services seed] Failed: ${err}`);
  }
}

async function seedStaticPageRegistry(): Promise<void> {
  try {
    const flag = await storage.getSetting("static_pages_seeded_v1");
    if (flag === "done") return;

    const STATIC_PAGES = [
      { slug: "", title: "Home", pageType: "static" as const, seoTitle: "Creations by Oracle — Original Art | Abstract, Portraits & Sculpture", seoDescription: "Original abstract canvas works, life-like portraits, 3D art installations, and copper sculptures. Commissions welcome.", seoKeywords: ["abstract art", "original paintings", "copper sculpture", "art commissions"] },
      { slug: "shop", title: "Shop", pageType: "static" as const, seoTitle: "Shop — Creations by Oracle", seoDescription: "Browse original paintings, sculptures, and prints available for purchase.", seoKeywords: ["buy original art", "art for sale", "paintings for sale"] },
      { slug: "gallery", title: "Gallery", pageType: "static" as const, seoTitle: "Gallery — Creations by Oracle", seoDescription: "A curated view of the full portfolio from Creations by Oracle.", seoKeywords: ["art gallery", "portfolio", "abstract art gallery"] },
      { slug: "about", title: "About", pageType: "static" as const, seoTitle: "About — Creations by Oracle", seoDescription: "Learn about the artist behind Creations by Oracle — process, inspiration, and vision.", seoKeywords: ["about Creations by Oracle", "artist biography"] },
      { slug: "blog", title: "Blog", pageType: "blog" as const, seoTitle: "Blog — Creations by Oracle", seoDescription: "Art insights, process notes, and creative reflections from Creations by Oracle.", seoKeywords: ["art blog", "creative process", "studio notes"] },
      { slug: "contact", title: "Contact", pageType: "static" as const, seoTitle: "Contact & Commissions — Creations by Oracle", seoDescription: "Commission a piece or inquire about available works. Reach out to Creations by Oracle.", seoKeywords: ["art commissions", "contact artist"] },
      { slug: "commission", title: "Commission", pageType: "static" as const, seoTitle: "Commission a Piece — Creations by Oracle", seoDescription: "Commission an original portrait or abstract work. Choose your style, size, and format. 50% deposit secures your commission.", seoKeywords: ["portrait commission", "custom art", "art commission", "abstract portrait"] },
    ];

    for (const p of STATIC_PAGES) {
      const existing = await storage.getPageBySlug(p.slug);
      if (!existing) {
        await storage.createPage({
          slug: p.slug,
          title: p.title,
          pageType: p.pageType,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          seoKeywords: p.seoKeywords,
          status: "published",
          linkedEntityId: null,
          linkedEntityType: null,
        });
      }
    }

    await storage.setSetting("static_pages_seeded_v1", "done");
    log(`[page registry seed] Seeded ${STATIC_PAGES.length} static page registry entries`);
  } catch (err) {
    log(`[page registry seed] Failed: ${err}`);
  }
}

async function seedArtistSettings(): Promise<void> {
  try {
    const flag = await storage.getSetting("artist_settings_seeded_v1");
    if (flag === "done") return;

    const defaults: Record<string, string> = {
      artist_name: "Creations by Oracle",
      artist_tagline: "Original Art",
      artist_email: "",
      artist_instagram: "",
      artist_twitter: "",
      artist_facebook: "",
      artist_tiktok: "",
    };

    for (const [key, value] of Object.entries(defaults)) {
      const existing = await storage.getSetting(key);
      if (existing === undefined) {
        await storage.setSetting(key, value);
      }
    }

    await storage.setSetting("artist_settings_seeded_v1", "done");
    log("[artist settings seed] Seeded default artist settings");
  } catch (err) {
    log(`[artist settings seed] Failed: ${err}`);
  }
}

async function seedTestimonials(): Promise<void> {
  try {
    const flag = await storage.getSetting("testimonials_seeded_v1");
    if (flag === "done") return;

    const TESTIMONIALS = [
      { collectorName: "Maya R.", location: "New York, NY", quote: "The abstract canvas piece Oracle created for my living room has stopped guests in their tracks every single time. It's alive — the colours shift with the light in the most magical way.", displayOrder: 0, active: true },
      { collectorName: "James & Priya Okonkwo", location: "London, UK", quote: "We commissioned a family portrait and were blown away. It captured something intangible — the feeling of us, not just our faces. Absolutely worth every penny.", displayOrder: 1, active: true },
      { collectorName: "Carlos Méndez", location: "Miami, FL", quote: "The copper sculpture exceeded my wildest expectations. Oracle has an instinct for form and finish that you rarely encounter. A centrepiece for the ages.", displayOrder: 2, active: true },
      { collectorName: "Thandi N.", location: "Johannesburg, ZA", quote: "Commissioned a 3D installation for my studio. The dialogue it creates between space and shadow is exactly what I was hoping for. Truly extraordinary craftsmanship.", displayOrder: 3, active: true },
    ];

    for (const t of TESTIMONIALS) {
      await storage.createTestimonial({ ...t, artworkId: null });
    }

    await storage.setSetting("testimonials_seeded_v1", "done");
    log(`[testimonials seed] Seeded ${TESTIMONIALS.length} placeholder testimonials`);
  } catch (err) {
    log(`[testimonials seed] Failed: ${err}`);
  }
}

async function seedCommissionPricing(): Promise<void> {
  try {
    const flag = await storage.getSetting("commission_pricing_seeded_v1");
    if (flag === "done") return;

    const { DEFAULT_COMMISSION_PRICE_MATRIX, DEFAULT_COMMISSION_FORMAT_ADDONS, DEFAULT_COMMISSION_SUBJECT_FEES } = await import("@shared/schema");

    const existing = await storage.getSetting("commission_price_matrix");
    if (!existing) {
      await storage.setSetting("commission_price_matrix", JSON.stringify(DEFAULT_COMMISSION_PRICE_MATRIX));
      await storage.setSetting("commission_format_addons", JSON.stringify(DEFAULT_COMMISSION_FORMAT_ADDONS));
      await storage.setSetting("commission_subject_fees", JSON.stringify(DEFAULT_COMMISSION_SUBJECT_FEES));
    }

    // Seed deposit pct & terms note defaults if not yet set
    const depositPctExisting = await storage.getSetting("commission_deposit_pct");
    if (!depositPctExisting) {
      await storage.setSetting("commission_deposit_pct", "50");
    }
    const termsNoteExisting = await storage.getSetting("commission_terms_note");
    if (!termsNoteExisting) {
      await storage.setSetting("commission_terms_note", "50% deposit required to begin. Remaining balance due upon completion before delivery.");
    }

    await storage.setSetting("commission_pricing_seeded_v1", "done");
    log("[commission seed] Seeded commission pricing matrix");
  } catch (err) {
    log(`[commission seed] Failed: ${err}`);
  }
}

(async () => {
  await seedRootUser();
  await runOneTimePDRCleanup();
  await seedGallery();
  await seedServices();
  await seedArtistSettings();
  await seedCommissionPricing();
  await seedTestimonials();
  await seedStaticPageRegistry();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
