import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, serial, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull().default("General Inquiry"),
  message: text("message"),
  status: text("status").notNull().default("New Inquiry"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  artworkId: integer("artwork_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export const leadStatuses = [
  "New Inquiry",
  "Contacted",
  "Commission Proposed",
  "Commission Accepted",
  "In Progress",
  "Awaiting Payment",
  "Delivered",
  "Closed",
] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("editor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const userRoles = ["root", "admin", "editor"] as const;

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  overview: text("overview").notNull().default(""),
  targetKeywords: text("target_keywords").array().default(sql`'{}'::text[]`),
  searchIntent: text("search_intent"),
  estimatedSearchVolume: text("estimated_search_volume"),
  competitionLevel: text("competition_level"),
  leadPotential: text("lead_potential"),
  reasoning: text("reasoning"),
  status: text("status").notNull().default("suggested"),
  aiJobId: integer("ai_job_id"),
  postId: integer("post_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
  aiJobId: true,
  postId: true,
  status: true,
});

export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;
export const topicStatuses = ["suggested", "generating", "generated", "archived"] as const;

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull().default(""),
  excerpt: text("excerpt"),
  featuredImage: text("featured_image"),
  authorId: integer("author_id").references(() => users.id),
  status: text("status").notNull().default("draft"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords").array().default(sql`'{}'::text[]`),
  researchJobId: integer("research_job_id"),
  topicId: integer("topic_id"),
  readCount: integer("read_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export const postStatuses = ["draft", "queued", "published"] as const;

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("active"),
  unsubscribeToken: text("unsubscribe_token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriberSchema = createInsertSchema(subscribers).omit({
  id: true,
  createdAt: true,
  status: true,
  unsubscribeToken: true,
});

export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribers.$inferSelect;

export const newsletters = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  status: text("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNewsletterSchema = createInsertSchema(newsletters).omit({
  id: true,
  createdAt: true,
  status: true,
  sentAt: true,
  recipientCount: true,
});

export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newsletters.$inferSelect;

export const aiJobs = pgTable("ai_jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  input: text("input").notNull(),
  output: text("output"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AiJob = typeof aiJobs.$inferSelect;

export const backlinks = pgTable("backlinks", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  utmSource: text("utm_source").notNull(),
  utmMedium: text("utm_medium").notNull().default("referral"),
  utmCampaign: text("utm_campaign").notNull(),
  shortCode: text("short_code").notNull().unique(),
  clicks: integer("clicks").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Backlink = typeof backlinks.$inferSelect;

export const backlinkClicks = pgTable("backlink_clicks", {
  id: serial("id").primaryKey(),
  backlinkId: integer("backlink_id").notNull().references(() => backlinks.id, { onDelete: "cascade" }),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  clickedAt: timestamp("clicked_at").defaultNow().notNull(),
});

export type BacklinkClick = typeof backlinkClicks.$inferSelect;

export const webhookEvents = ["lead.created", "lead.updated", "post.published", "subscriber.created", "artwork.published", "order.created"] as const;

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  events: text("events").array().notNull().default(sql`'{}'::text[]`),
  secret: text("secret").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
});

export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: text("payload").notNull(),
  statusCode: integer("status_code"),
  response: text("response"),
  success: boolean("success").notNull().default(false),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  channel: text("channel").notNull().default("email"),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Rating = typeof ratings.$inferSelect;

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  badge: text("badge").notNull().default(""),
  header: text("header").notNull().default(""),
  description: text("description").notNull().default(""),
  keyDetails: text("key_details").array().default(sql`'{}'::text[]`),
  icon: text("icon").notNull().default("Palette"),
  slug: text("slug").notNull().default(""),
  accentColor: text("accent_color").notNull().default("#C084FC"),
  showPrice: boolean("show_price").notNull().default(false),
  price: text("price"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const gallerySections = pgTable("gallery_sections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGallerySectionSchema = createInsertSchema(gallerySections).omit({ id: true, createdAt: true });
export type InsertGallerySection = z.infer<typeof insertGallerySectionSchema>;
export type GallerySection = typeof gallerySections.$inferSelect;

export const galleryItems = pgTable("gallery_items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => gallerySections.id, { onDelete: "cascade" }),
  src: text("src").notNull(),
  alt: text("alt").notNull(),
  badge: text("badge"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGalleryItemSchema = createInsertSchema(galleryItems).omit({ id: true, createdAt: true });
export type InsertGalleryItem = z.infer<typeof insertGalleryItemSchema>;
export type GalleryItem = typeof galleryItems.$inferSelect;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const artworks = pgTable("artworks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  medium: text("medium").notNull().default(""),
  dimensions: text("dimensions").notNull().default(""),
  year: text("year"),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  enhancedImageUrl: text("enhanced_image_url"),
  price: numeric("price", { precision: 10, scale: 2 }),
  forSale: boolean("for_sale").notNull().default(false),
  sold: boolean("sold").notNull().default(false),
  status: text("status").notNull().default("draft"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords").array().default(sql`'{}'::text[]`),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  category: text("category").notNull().default("Abstract"),
  featured: boolean("featured").notNull().default(false),
  pageRegistryId: integer("page_registry_id"),
  viewCount: integer("view_count").notNull().default(0),
  publishedAt: timestamp("published_at"),
  // Printful print-on-demand
  printsAvailable: boolean("prints_available").notNull().default(false),
  printfulProductId: text("printful_product_id"),
  printMarkupPercent: integer("print_markup_percent").notNull().default(40),
  // Provenance & Edition
  provenanceNotes: text("provenance_notes"),
  editionInfo: text("edition_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertArtworkSchema = createInsertSchema(artworks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  stripeProductId: true,
  stripePriceId: true,
  pageRegistryId: true,
  viewCount: true,
});

export type InsertArtwork = z.infer<typeof insertArtworkSchema>;
export type Artwork = typeof artworks.$inferSelect;

export const artworkStatuses = ["draft", "published", "archived"] as const;
export const artworkCategories = ["Abstract", "Portrait", "3D Installation", "Sculpture", "Mixed Media"] as const;

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  artworkId: integer("artwork_id").notNull().references(() => artworks.id),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("usd"),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").notNull().default("pending"),
  shippingAddress: text("shipping_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;

export const orderStatuses = ["pending", "paid", "fulfilled", "cancelled"] as const;

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  page: text("page").notNull(),
  eventType: text("event_type").notNull(),
  sessionId: text("session_id"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

export const analyticsEventTypes = ["page_view", "cta_click", "cta_submit", "purchase", "gallery_view", "artwork_view", "contact_submit"] as const;

export const pageRegistry = pgTable("page_registry", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  pageType: text("page_type").notNull().default("static"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords").array().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("published"),
  linkedEntityId: integer("linked_entity_id"),
  linkedEntityType: text("linked_entity_type"),
  viewCount: integer("view_count").notNull().default(0),
  ctaClickCount: integer("cta_click_count").notNull().default(0),
  conversionCount: integer("conversion_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPageRegistrySchema = createInsertSchema(pageRegistry).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  ctaClickCount: true,
  conversionCount: true,
});

export type InsertPageRegistry = z.infer<typeof insertPageRegistrySchema>;
export type PageRegistry = typeof pageRegistry.$inferSelect;

export const pageTypes = ["static", "blog", "artwork", "service"] as const;

// ─── Commissions ─────────────────────────────────────────────────────────────

export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  style: text("style").notNull(),
  size: text("size").notNull(),
  format: text("format").notNull().default("Digital"),
  extraSubjects: integer("extra_subjects").notNull().default(0),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  formatAddon: numeric("format_addon", { precision: 10, scale: 2 }).notNull().default("0"),
  subjectFee: numeric("subject_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).notNull(),
  referenceImageUrls: text("reference_image_urls").array().default(sql`'{}'::text[]`),
  notes: text("notes"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").notNull().default("awaiting_deposit"),
  depositPaidAt: timestamp("deposit_paid_at"),
  finalPaymentLinkId: text("final_payment_link_id"),
  finalPaymentLinkUrl: text("final_payment_link_url"),
  finalPaymentPaidAt: timestamp("final_payment_paid_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  stripeSessionId: true,
  stripePaymentIntentId: true,
  status: true,
});

export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;

export const commissionStatuses = [
  "awaiting_deposit",
  "deposit_paid",
  "in_progress",
  "ready",
  "final_sent",
  "complete",
  "cancelled",
] as const;

export const commissionStyles = ["Realism", "Fusion", "Oracle"] as const;
export const commissionSizes = ["Small (8×10)", "Medium (11×14)", "Large (16×20)", "X-Large (18×24)", "XX-Large (24×36)", "XXX-Large (30×40+)"] as const;
export const commissionFormats = ["Digital", "Paper", "Canvas"] as const;

// Default pricing matrix seeded into settings
export const DEFAULT_COMMISSION_PRICE_MATRIX = {
  Realism: {
    "Small (8×10)": 350,
    "Medium (11×14)": 550,
    "Large (16×20)": 850,
    "X-Large (18×24)": 1100,
    "XX-Large (24×36)": 1600,
    "XXX-Large (30×40+)": 2200,
  },
  Fusion: {
    "Small (8×10)": 450,
    "Medium (11×14)": 700,
    "Large (16×20)": 1050,
    "X-Large (18×24)": 1400,
    "XX-Large (24×36)": 2000,
    "XXX-Large (30×40+)": 2800,
  },
  Oracle: {
    "Small (8×10)": 600,
    "Medium (11×14)": 950,
    "Large (16×20)": 1400,
    "X-Large (18×24)": 1850,
    "XX-Large (24×36)": 2600,
    "XXX-Large (30×40+)": 3500,
  },
};

export const DEFAULT_COMMISSION_FORMAT_ADDONS = {
  Digital: { "Small (8×10)": 0, "Medium (11×14)": 0, "Large (16×20)": 0, "X-Large (18×24)": 0, "XX-Large (24×36)": 0, "XXX-Large (30×40+)": 0 },
  Paper: { "Small (8×10)": 20, "Medium (11×14)": 25, "Large (16×20)": 35, "X-Large (18×24)": 40, "XX-Large (24×36)": 45, "XXX-Large (30×40+)": 50 },
  Canvas: { "Small (8×10)": 40, "Medium (11×14)": 55, "Large (16×20)": 70, "X-Large (18×24)": 80, "XX-Large (24×36)": 90, "XXX-Large (30×40+)": 100 },
};

export const DEFAULT_COMMISSION_SUBJECT_FEES = {
  Realism: { "Small (8×10)": 50, "Medium (11×14)": 65, "Large (16×20)": 75, "X-Large (18×24)": 85, "XX-Large (24×36)": 100, "XXX-Large (30×40+)": 125 },
  Fusion:  { "Small (8×10)": 60, "Medium (11×14)": 75, "Large (16×20)": 90, "X-Large (18×24)": 100, "XX-Large (24×36)": 115, "XXX-Large (30×40+)": 135 },
  Oracle:  { "Small (8×10)": 75, "Medium (11×14)": 90, "Large (16×20)": 105, "X-Large (18×24)": 115, "XX-Large (24×36)": 130, "XXX-Large (30×40+)": 150 },
};

// ─── Artwork Waitlist ─────────────────────────────────────────────────────────

export const artworkWaitlist = pgTable("artwork_waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  category: text("category").notNull(),
  artworkId: integer("artwork_id").references(() => artworks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertArtworkWaitlistSchema = createInsertSchema(artworkWaitlist).omit({
  id: true,
  createdAt: true,
});

export type InsertArtworkWaitlist = z.infer<typeof insertArtworkWaitlistSchema>;
export type ArtworkWaitlist = typeof artworkWaitlist.$inferSelect;

// ─── Print Orders (Printful) ──────────────────────────────────────────────────

export const printOrders = pgTable("print_orders", {
  id: serial("id").primaryKey(),
  artworkId: integer("artwork_id").notNull().references(() => artworks.id),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  printfulProductId: text("printful_product_id").notNull(),
  variantId: text("variant_id").notNull(),
  variantLabel: text("variant_label").notNull(),
  retailPrice: numeric("retail_price", { precision: 10, scale: 2 }).notNull(),
  printfulOrderId: text("printful_order_id"),
  trackingNumber: text("tracking_number"),
  status: text("status").notNull().default("pending"),
  shippingAddress: text("shipping_address"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPrintOrderSchema = createInsertSchema(printOrders).omit({
  id: true,
  createdAt: true,
  printfulOrderId: true,
  trackingNumber: true,
  status: true,
});

export type InsertPrintOrder = z.infer<typeof insertPrintOrderSchema>;
export type PrintOrder = typeof printOrders.$inferSelect;

export const printOrderStatuses = ["pending", "paid", "submitted", "in_production", "shipped", "delivered", "cancelled"] as const;

// ─── Testimonials ─────────────────────────────────────────────────────────────

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  collectorName: text("collector_name").notNull(),
  location: text("location"),
  quote: text("quote").notNull(),
  artworkId: integer("artwork_id").references(() => artworks.id, { onDelete: "set null" }),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
});

export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

// ─── Exhibitions ─────────────────────────────────────────────────────────────

export const exhibitions = pgTable("exhibitions", {
  id: serial("id").primaryKey(),
  venueName: text("venue_name").notNull(),
  city: text("city").notNull(),
  year: integer("year").notNull(),
  showName: text("show_name").notNull(),
  showType: text("show_type").notNull().default("Group"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExhibitionSchema = createInsertSchema(exhibitions).omit({
  id: true,
  createdAt: true,
});

export type InsertExhibition = z.infer<typeof insertExhibitionSchema>;
export type Exhibition = typeof exhibitions.$inferSelect;

export const exhibitionShowTypes = ["Solo", "Group", "Art Fair", "Juried", "Invitational"] as const;
