# Studio — Independent Artist's Website

## Overview
Dark-themed artist website for an independent contemporary artist specializing in abstract canvas art, life-like portraiture, 3D installations, and copper sculptures. Full e-commerce with Stripe, AI-guided photo capture, AI image enhancement + description generation, SEO automation, analytics tracking, and lead capture for collector inquiries. Blog/newsletter automation retained and rebranded.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS + wouter routing
- Backend: Express.js + Node.js
- Database: PostgreSQL with Drizzle ORM
- Auth: Session-based with httpOnly cookies (bcrypt + 7-day sessions)
- AI: OpenAI (gpt-4o) via Replit AI Integrations — artwork analysis, description generation, photo guidance
- Email: Resend integration for newsletter delivery and lead notifications
- Payments: Stripe — artwork purchase checkout sessions
- Font: Georgia (serif headings), system sans-serif for body

## Architecture
- Dark-only theme (#08060e primary bg, #C084FC purple accent)
- Traditional header/footer navigation — no sidebar
- CRM-style lead management for collector inquiries in /admin
- Contact form: `subject` field replaces old `vehicle`; statuses are art-focused
- Session-based auth with role middleware (root/admin/editor)
- Root user seeded on startup: startupalchemist@consultant.com
- Role hierarchy: root > admin > editor

## Brand Guidelines
- Colors: #08060e background, #141416 cards, #C084FC primary accent (purple), #F5F5F7 text, #B3B3B8 secondary
- Tone: Minimal, artistic, premium. No exclamation points. Confident and quiet.
- Brand name: "Studio" (artist can customize)
- CTA: "Commission a Piece"
- Art categories: Abstract, Portrait, 3D Installation, Sculpture, Mixed Media

## Database Tables
- `users` — session auth users (root/admin/editor)
- `sessions` — auth sessions
- `leads` — collector inquiries (subject, status: New Inquiry → Closed)
- `artworks` — artwork catalog (title, slug, medium, dimensions, year, description, imageUrl, enhancedImageUrl, price, forSale, sold, status, category, featured, seoTitle, seoDescription, seoKeywords, viewCount, stripeProductId, stripePriceId, pageRegistryId, publishedAt)
- `orders` — artwork purchases (artworkId, buyerName, buyerEmail, amount, status, stripeSessionId, stripePaymentIntentId, shippingAddress)
- `analyticsEvents` — page views, CTR, CTA clicks, purchases (page, eventType, sessionId, referrer, utmSource/Medium/Campaign, metadata)
- `pageRegistry` — all indexed pages auto-created on publish (slug, title, pageType, seoTitle/Description/Keywords, status, linkedEntityId/Type)
- `posts`, `topics` — blog articles (AI-generated, SEO-focused)
- `subscribers`, `newsletters` — newsletter system
- `settings` — key-value store for configuration
- `webhooks`, `webhookLogs` — outgoing webhook system
- `gallerySections`, `galleryItems` — photo gallery (admin-managed)
- `services` — blog topic services (controls AI blog research context)

## Key Routes (Backend)
- GET/POST/PATCH/DELETE `/api/artworks` — artwork CRUD
- GET `/api/artworks/:idOrSlug` — artwork by ID or slug
- POST `/api/artworks/:id/view` — increment view count
- POST `/api/upload` — base64 image upload to /uploads/
- POST `/api/ai/enhance-artwork` — OpenAI artwork analysis + description/SEO/price generation
- POST `/api/ai/capture-guidance` — real-time photo capture quality feedback
- POST `/api/analytics/event` — track page views, CTR, CTA clicks, conversions
- GET `/api/analytics/summary` — analytics summary (admin only)
- GET/POST/PATCH/DELETE `/api/pages` — page registry CRUD
- POST `/api/checkout` — Stripe checkout session creation
- POST `/api/checkout/webhook` — Stripe webhook (marks artwork sold)
- GET `/api/orders` — order list (admin only)

## Public Pages
- `/` — Home (hero, mediums, featured works, about teaser, commission CTA)
- `/gallery` — Photo gallery (admin-managed sections)
- `/shop` — Artwork shop listing (filterable by category)
- `/shop/:slug` — Individual artwork detail + Stripe purchase flow
- `/about` — Artist bio and mediums
- `/contact` — General inquiry/contact form
- `/commission` — 7-step portrait commission builder (style → size → format → subjects → references → notes → contact info; Stripe Checkout for 50% deposit)
- `/blog` — Blog listing
- `/blog/:slug` — Blog post

## Admin Tabs
- **The Dyno** — analytics dashboard (TheDyno component)
- **Dashboard** — lead pipeline summary
- **Shop** — artwork manager (create/edit/publish/delete + AI enhance + image upload)
- **Orders** — Stripe purchase records
- **Inquiries** — collector lead management
- **Blog** — AI blog content generation
- **Newsletter** — email newsletter
- **Pages** — page registry (auto-populated on publish)
- **Users** — user management (admin+)
- **Integrations** — webhook + integration management
- **SEO** — SEO settings and blog services
- **Blog Services** — controls AI blog topic research context
- **Gallery** — photo gallery section/item management

## Analytics Tracking
Analytics events tracked client-side on:
- Shop page view: `page_view` on `/shop`
- Artwork view: `artwork_view` on `/shop/:slug`  
- CTA clicks: `cta_click` (buy intent, share, checkout)
- Contact form: `contact_submit` on `/contact`
- Purchases: `purchase` on successful Stripe redirect

## File Structure Notes
- Images uploaded to `client/public/uploads/` (served as static assets)
- Old contractor pages still exist but are not routed: services.tsx, custom-turf-install.tsx, etc. (safe to delete if desired)
- TheDyno component: `client/src/components/the-dyno.tsx`
- Header: `client/src/components/header.tsx`
- Footer: `client/src/components/footer.tsx`
