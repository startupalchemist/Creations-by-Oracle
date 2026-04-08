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
- `users` — session auth users (root/admin/editor); `lastLoginAt` updated on each login
- `sessions` — auth sessions (token, expiresAt, userAgent, ipAddress)
- `admin_activity_log` — audit trail for admin actions (actorId, actionType, entityType, entityId, summary)
- `leads` — collector inquiries (subject, status: New Inquiry → Closed)
- `artworks` — artwork catalog (title, slug, medium, dimensions, year, description, imageUrl, enhancedImageUrl, price, forSale, sold, status, category, featured, seoTitle, seoDescription, seoKeywords, viewCount, stripeProductId, stripePriceId, pageRegistryId, publishedAt, printsAvailable, printfulProductId, printMarkupPercent)
- `commissions` — portrait commission orders (style, size, format, extraSubjects, basePrice, formatAddon, subjectFee, totalPrice, depositAmount, referenceImageUrls, notes, customerName/Email/Phone, stripeSessionId, stripePaymentIntentId, status, depositPaidAt, inProgressAt, readyAt, finalPaymentLinkId, finalPaymentLinkUrl, finalSentAt, finalPaymentPaidAt, completedAt, deliveryImageUrl)
- `orders` — artwork purchases (artworkId, buyerName, buyerEmail, amount, status, stripeSessionId, stripePaymentIntentId, shippingAddress)
- `print_orders` — Printful print-on-demand orders (artworkId, buyerName, buyerEmail, printfulProductId, variantId, variantLabel, retailPrice, printfulOrderId, status, shippingAddress, stripeSessionId)
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
- GET `/api/artworks/:id/print-variants` — get print size/format options (using template prices if no Printful product linked)
- POST `/api/upload` — base64 image upload to /uploads/
- POST `/api/ai/enhance-artwork` — OpenAI artwork analysis + description/SEO/price generation
- POST `/api/ai/capture-guidance` — real-time photo capture quality feedback
- POST `/api/analytics/event` — track page views, CTR, CTA clicks, conversions
- GET `/api/analytics/summary` — analytics summary (admin only)
- GET/POST/PATCH/DELETE `/api/pages` — page registry CRUD
- POST `/api/checkout` — Stripe checkout session creation
- POST `/api/checkout/webhook` — Stripe webhook (marks artwork sold, handles print orders, commission deposit paid, commission final payment completed)
- GET `/api/orders` — order list (admin only)
- GET `/api/commissions` — commission list (admin only)
- GET `/api/commissions/:id` — single commission (admin only)
- PATCH `/api/commissions/:id` — update commission status/notes (admin only)
- POST `/api/commissions/:id/final-payment` — create Stripe Payment Link for remaining balance, update status to final_sent, email collector (admin only)
- GET `/api/commission/pricing` — public pricing matrix + depositPct + termsNote
- POST `/api/commissions` — public commission submission (creates PaymentIntent for deposit)
- POST `/api/print-checkout` — create Stripe checkout for print order
- GET `/api/print-orders` — print order list (admin only)
- PATCH `/api/print-orders/:id` — update print order status
- GET `/api/printful/status` — Printful connection status (admin only)

## Public Pages
- `/` — Home (hero, mediums, featured works, about teaser, commission CTA)
- `/gallery` — Photo gallery (admin-managed sections)
- `/shop` — Artwork shop listing (filterable by category)
- `/shop/:slug` — Individual artwork detail + Stripe purchase flow
- `/about` — Artist bio and mediums
- `/contact` — General inquiry/contact form
- `/commissions` — 7-step portrait commission builder (style → size → format → subjects → references → contact info → review+pay; Stripe PaymentIntent for configurable deposit %; shows commission terms note)
- `/blog` — Blog listing
- `/blog/:slug` — Blog post

## Admin Tabs
- **The Dyno** — analytics dashboard (TheDyno component)
- **Dashboard** — lead pipeline summary
- **Shop** — artwork manager (create/edit/publish/delete + AI enhance + image upload + prints toggle)
- **Orders** — Stripe purchase records (sub-tabs: Original Works | Print Orders | Commissions)
- **Inquiries** — collector lead management
- **Blog** — AI blog content generation
- **Newsletter** — email newsletter
- **Pages** — page registry (auto-populated on publish)
- **Users** — user management (admin+); shows lastLoginAt; Activity Log (paginated, filterable); Active Sessions panel (root only, with revoke)
- **Integrations** — webhook + integration management + Printful connection status
- **SEO** — SEO settings and blog services
- **Blog Services** — controls AI blog topic research context
- **Gallery** — photo gallery section/item management
- **Brand** — brand settings (name, tagline, socials) + Commission Settings (deposit %, terms note) + Testimonials + Exhibitions

## Commission Order Lifecycle
- Status flow: awaiting_deposit → deposit_paid → in_progress → ready → final_sent → complete (cancelled at any time)
- Deposit % configurable via settings key `commission_deposit_pct` (default 50%)
- Terms note configurable via settings key `commission_terms_note` (shown on Review step)
- Admin can update status via dropdown in Orders > Commissions
- Admin sends final payment link via "Send Final Invoice" button (creates Stripe Payment Link)
- Stripe webhook auto-advances: payment_intent.succeeded → deposit_paid; checkout.session.completed with commissionId → complete
- Both state changes send collector + artist emails via Resend
- Per-stage lifecycle timestamps: depositPaidAt, inProgressAt, readyAt, finalSentAt, finalPaymentPaidAt, completedAt

## Print-on-Demand (Printful)
- Admin can toggle `printsAvailable` per artwork via switch in Shop tab cards
- Print variants use template sizes if no Printful product linked: Poster 11×17", Poster 18×24", Canvas 16×20", Canvas 24×36"
- `printMarkupPercent` (default 40%) applied over Printful base cost
- Artwork page shows collapsible "Limited Edition Prints" section if `printsAvailable=true`
- Collector selects a variant → enters details → Stripe checkout (orderType=print in metadata)
- Stripe webhook auto-submits to Printful API if `PRINTFUL_API_KEY` is set and shipping address exists
- Print orders tracked in `print_orders` table; admin manages status in Orders > Print Orders
- Integrations tab shows Printful connection status (configured/not configured)

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
