import {
  leads, users, sessions, posts, subscribers, newsletters, aiJobs, backlinks, backlinkClicks, topics, webhooks, webhookLogs, ratings, settings, services, gallerySections, galleryItems, artworks, orders, analyticsEvents, pageRegistry,
  type Lead, type InsertLead,
  type User, type InsertUser,
  type Session,
  type Post, type InsertPost,
  type Subscriber, type InsertSubscriber,
  type Newsletter, type InsertNewsletter,
  type AiJob,
  type Backlink,
  type BacklinkClick,
  type Topic,
  type Webhook, type InsertWebhook,
  type WebhookLog,
  type Rating,
  type Setting,
  type Service, type InsertService,
  type GallerySection, type InsertGallerySection,
  type GalleryItem, type InsertGalleryItem,
  type Artwork, type InsertArtwork,
  type Order,
  type AnalyticsEvent,
  type PageRegistry, type InsertPageRegistry,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, count, sum } from "drizzle-orm";

export interface IStorage {
  createLead(lead: InsertLead): Promise<Lead>;
  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  updateLead(id: number, data: Partial<Lead>): Promise<Lead | undefined>;

  createUser(user: InsertUser & { passwordHash: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  createSession(userId: number, token: string, expiresAt: Date): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;

  createPost(post: InsertPost & { authorId: number }): Promise<Post>;
  getPosts(status?: string): Promise<Post[]>;
  getPostById(id: number): Promise<Post | undefined>;
  getPostBySlug(slug: string): Promise<Post | undefined>;
  updatePost(id: number, data: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: number): Promise<void>;

  createSubscriber(sub: InsertSubscriber & { unsubscribeToken: string }): Promise<Subscriber>;
  getSubscribers(status?: string): Promise<Subscriber[]>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  getSubscriberByToken(token: string): Promise<Subscriber | undefined>;
  updateSubscriber(id: number, data: Partial<Subscriber>): Promise<Subscriber | undefined>;
  deleteSubscriber(id: number): Promise<void>;

  createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter>;
  getNewsletters(): Promise<Newsletter[]>;
  getNewsletterById(id: number): Promise<Newsletter | undefined>;
  updateNewsletter(id: number, data: Partial<Newsletter>): Promise<Newsletter | undefined>;

  createAiJob(job: { type: string; input: string }): Promise<AiJob>;
  getAiJobs(): Promise<AiJob[]>;
  getAiJobsByType(type: string): Promise<AiJob[]>;
  updateAiJob(id: number, data: Partial<AiJob>): Promise<AiJob | undefined>;

  createTopic(data: { title: string; overview: string; targetKeywords?: string[]; searchIntent?: string; estimatedSearchVolume?: string; competitionLevel?: string; leadPotential?: string; reasoning?: string; aiJobId?: number }): Promise<Topic>;
  getTopics(status?: string): Promise<Topic[]>;
  getTopicById(id: number): Promise<Topic | undefined>;
  updateTopic(id: number, data: Partial<Topic>): Promise<Topic | undefined>;
  deleteTopic(id: number): Promise<void>;

  incrementPostReadCount(id: number): Promise<void>;
  incrementPostShareCount(id: number): Promise<void>;

  createWebhook(data: InsertWebhook): Promise<Webhook>;
  getWebhooks(): Promise<Webhook[]>;
  getWebhookById(id: number): Promise<Webhook | undefined>;
  updateWebhook(id: number, data: Partial<Webhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: number): Promise<void>;
  getActiveWebhooksForEvent(event: string): Promise<Webhook[]>;
  createWebhookLog(data: { webhookId: number; event: string; payload: string; statusCode?: number; response?: string; success: boolean; duration?: number }): Promise<WebhookLog>;
  getWebhookLogs(webhookId?: number): Promise<WebhookLog[]>;

  createBacklink(data: { postId: number; platform: string; url: string; utmSource: string; utmMedium: string; utmCampaign: string; shortCode: string }): Promise<Backlink>;
  getBacklinksByPostId(postId: number): Promise<Backlink[]>;
  getBacklinkByShortCode(shortCode: string): Promise<Backlink | undefined>;
  getAllBacklinks(): Promise<Backlink[]>;
  incrementBacklinkClicks(id: number): Promise<void>;
  createBacklinkClick(data: { backlinkId: number; referrer: string | null; userAgent: string | null }): Promise<BacklinkClick>;
  getBacklinkClicksByBacklinkId(backlinkId: number): Promise<BacklinkClick[]>;
  getBacklinkAnalytics(): Promise<{ platform: string; clicks: number; backlinkCount: number }[]>;

  createRating(data: { leadId: number | null; score: number; token: string; channel?: string }): Promise<Rating>;
  getRatingByToken(token: string): Promise<Rating | undefined>;
  getRatingsByLeadId(leadId: number): Promise<Rating[]>;
  getAllRatings(): Promise<Rating[]>;
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  getLeadSentimentSent(leadId: number): Promise<boolean>;
  markLeadSentimentSent(leadId: number): Promise<void>;

  getServices(): Promise<Service[]>;
  getServiceById(id: number): Promise<Service | undefined>;
  createService(data: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<Service>): Promise<Service | undefined>;
  deleteService(id: number): Promise<void>;

  getPublicGallery(): Promise<{ sections: (GallerySection & { items: GalleryItem[] })[] }>;
  getAdminGallery(): Promise<{ sections: (GallerySection & { items: GalleryItem[] })[] }>;
  getGallerySections(): Promise<GallerySection[]>;
  getGallerySectionById(id: number): Promise<GallerySection | undefined>;
  createGallerySection(data: InsertGallerySection): Promise<GallerySection>;
  updateGallerySection(id: number, data: Partial<GallerySection>): Promise<GallerySection | undefined>;
  deleteGallerySection(id: number): Promise<void>;
  getGalleryItems(sectionId?: number): Promise<GalleryItem[]>;
  getGalleryItemById(id: number): Promise<GalleryItem | undefined>;
  createGalleryItem(data: InsertGalleryItem): Promise<GalleryItem>;
  updateGalleryItem(id: number, data: Partial<GalleryItem>): Promise<GalleryItem | undefined>;
  deleteGalleryItem(id: number): Promise<void>;

  createArtwork(data: InsertArtwork): Promise<Artwork>;
  getArtworks(status?: string): Promise<Artwork[]>;
  getArtworkById(id: number): Promise<Artwork | undefined>;
  getArtworkBySlug(slug: string): Promise<Artwork | undefined>;
  updateArtwork(id: number, data: Partial<Artwork>): Promise<Artwork | undefined>;
  deleteArtwork(id: number): Promise<void>;
  incrementArtworkViewCount(id: number): Promise<void>;

  createOrder(data: { artworkId: number; buyerName: string; buyerEmail: string; amount: string; stripeSessionId: string; currency?: string; shippingAddress?: string }): Promise<Order>;
  getOrders(): Promise<Order[]>;
  getOrderBySessionId(sessionId: string): Promise<Order | undefined>;
  updateOrder(id: number, data: Partial<Order>): Promise<Order | undefined>;

  trackEvent(data: { page: string; eventType: string; sessionId?: string; referrer?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; metadata?: string }): Promise<AnalyticsEvent>;
  getAnalyticsSummary(days?: number): Promise<{
    totalViews: number;
    uniqueSessions: number;
    ctaClicks: number;
    conversions: number;
    contactSubmits: number;
    topPages: { page: string; views: number }[];
  }>;

  getPageRegistry(): Promise<PageRegistry[]>;
  getPageBySlug(slug: string): Promise<PageRegistry | undefined>;
  createPage(data: InsertPageRegistry): Promise<PageRegistry>;
  updatePage(id: number, data: Partial<PageRegistry>): Promise<PageRegistry | undefined>;
  deletePage(id: number): Promise<void>;
  incrementPageView(slug: string): Promise<void>;
  incrementPageCTA(slug: string): Promise<void>;
  incrementPageConversion(slug: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createLead(lead: InsertLead): Promise<Lead> {
    const [result] = await db.insert(leads).values(lead).returning();
    return result;
  }
  async getLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }
  async getLead(id: number): Promise<Lead | undefined> {
    const [result] = await db.select().from(leads).where(eq(leads.id, id));
    return result;
  }
  async updateLead(id: number, data: Partial<Lead>): Promise<Lead | undefined> {
    const [result] = await db.update(leads).set(data).where(eq(leads.id, id)).returning();
    return result;
  }

  async createUser(user: InsertUser & { passwordHash: string }): Promise<User> {
    const [result] = await db.insert(users).values({
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role || "editor",
    }).returning();
    return result;
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return result;
  }
  async getUserById(id: number): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return result;
  }
  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [result] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result;
  }
  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async createSession(userId: number, token: string, expiresAt: Date): Promise<Session> {
    const [result] = await db.insert(sessions).values({ userId, token, expiresAt }).returning();
    return result;
  }
  async getSessionByToken(token: string): Promise<Session | undefined> {
    const [result] = await db.select().from(sessions).where(eq(sessions.token, token));
    return result;
  }
  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  async deleteExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(eq(sessions.expiresAt, new Date(0)));
  }

  async createPost(post: InsertPost & { authorId: number }): Promise<Post> {
    const [result] = await db.insert(posts).values(post).returning();
    return result;
  }
  async getPosts(status?: string): Promise<Post[]> {
    if (status) {
      return db.select().from(posts).where(eq(posts.status, status)).orderBy(desc(posts.createdAt));
    }
    return db.select().from(posts).orderBy(desc(posts.createdAt));
  }
  async getPostById(id: number): Promise<Post | undefined> {
    const [result] = await db.select().from(posts).where(eq(posts.id, id));
    return result;
  }
  async getPostBySlug(slug: string): Promise<Post | undefined> {
    const [result] = await db.select().from(posts).where(eq(posts.slug, slug));
    return result;
  }
  async updatePost(id: number, data: Partial<Post>): Promise<Post | undefined> {
    const [result] = await db.update(posts).set({ ...data, updatedAt: new Date() }).where(eq(posts.id, id)).returning();
    return result;
  }
  async deletePost(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  async createSubscriber(sub: InsertSubscriber & { unsubscribeToken: string }): Promise<Subscriber> {
    const [result] = await db.insert(subscribers).values(sub).returning();
    return result;
  }
  async getSubscribers(status?: string): Promise<Subscriber[]> {
    if (status) {
      return db.select().from(subscribers).where(eq(subscribers.status, status)).orderBy(desc(subscribers.createdAt));
    }
    return db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
  }
  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [result] = await db.select().from(subscribers).where(eq(subscribers.email, email));
    return result;
  }
  async getSubscriberByToken(token: string): Promise<Subscriber | undefined> {
    const [result] = await db.select().from(subscribers).where(eq(subscribers.unsubscribeToken, token));
    return result;
  }
  async updateSubscriber(id: number, data: Partial<Subscriber>): Promise<Subscriber | undefined> {
    const [result] = await db.update(subscribers).set(data).where(eq(subscribers.id, id)).returning();
    return result;
  }
  async deleteSubscriber(id: number): Promise<void> {
    await db.delete(subscribers).where(eq(subscribers.id, id));
  }

  async createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter> {
    const [result] = await db.insert(newsletters).values(newsletter).returning();
    return result;
  }
  async getNewsletters(): Promise<Newsletter[]> {
    return db.select().from(newsletters).orderBy(desc(newsletters.createdAt));
  }
  async getNewsletterById(id: number): Promise<Newsletter | undefined> {
    const [result] = await db.select().from(newsletters).where(eq(newsletters.id, id));
    return result;
  }
  async updateNewsletter(id: number, data: Partial<Newsletter>): Promise<Newsletter | undefined> {
    const [result] = await db.update(newsletters).set(data).where(eq(newsletters.id, id)).returning();
    return result;
  }

  async createAiJob(job: { type: string; input: string }): Promise<AiJob> {
    const [result] = await db.insert(aiJobs).values(job).returning();
    return result;
  }
  async getAiJobs(): Promise<AiJob[]> {
    return db.select().from(aiJobs).orderBy(desc(aiJobs.createdAt));
  }
  async getAiJobsByType(type: string): Promise<AiJob[]> {
    return db.select().from(aiJobs).where(eq(aiJobs.type, type)).orderBy(desc(aiJobs.createdAt));
  }
  async updateAiJob(id: number, data: Partial<AiJob>): Promise<AiJob | undefined> {
    const [result] = await db.update(aiJobs).set(data).where(eq(aiJobs.id, id)).returning();
    return result;
  }

  async createTopic(data: { title: string; overview: string; targetKeywords?: string[]; searchIntent?: string; estimatedSearchVolume?: string; competitionLevel?: string; leadPotential?: string; reasoning?: string; aiJobId?: number }): Promise<Topic> {
    const [result] = await db.insert(topics).values(data).returning();
    return result;
  }
  async getTopics(status?: string): Promise<Topic[]> {
    if (status) {
      return db.select().from(topics).where(eq(topics.status, status)).orderBy(desc(topics.createdAt));
    }
    return db.select().from(topics).orderBy(desc(topics.createdAt));
  }
  async getTopicById(id: number): Promise<Topic | undefined> {
    const [result] = await db.select().from(topics).where(eq(topics.id, id));
    return result;
  }
  async updateTopic(id: number, data: Partial<Topic>): Promise<Topic | undefined> {
    const [result] = await db.update(topics).set(data).where(eq(topics.id, id)).returning();
    return result;
  }
  async deleteTopic(id: number): Promise<void> {
    await db.delete(topics).where(eq(topics.id, id));
  }

  async incrementPostReadCount(id: number): Promise<void> {
    await db.update(posts).set({ readCount: sql`${posts.readCount} + 1` }).where(eq(posts.id, id));
  }
  async incrementPostShareCount(id: number): Promise<void> {
    await db.update(posts).set({ shareCount: sql`${posts.shareCount} + 1` }).where(eq(posts.id, id));
  }

  async createWebhook(data: InsertWebhook): Promise<Webhook> {
    const [result] = await db.insert(webhooks).values(data).returning();
    return result;
  }
  async getWebhooks(): Promise<Webhook[]> {
    return db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  }
  async getWebhookById(id: number): Promise<Webhook | undefined> {
    const [result] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    return result;
  }
  async updateWebhook(id: number, data: Partial<Webhook>): Promise<Webhook | undefined> {
    const [result] = await db.update(webhooks).set(data).where(eq(webhooks.id, id)).returning();
    return result;
  }
  async deleteWebhook(id: number): Promise<void> {
    await db.delete(webhooks).where(eq(webhooks.id, id));
  }
  async getActiveWebhooksForEvent(event: string): Promise<Webhook[]> {
    const allActive = await db.select().from(webhooks).where(eq(webhooks.active, true));
    return allActive.filter((w) => (w.events as string[]).includes(event));
  }
  async createWebhookLog(data: { webhookId: number; event: string; payload: string; statusCode?: number; response?: string; success: boolean; duration?: number }): Promise<WebhookLog> {
    const [result] = await db.insert(webhookLogs).values(data).returning();
    return result;
  }
  async getWebhookLogs(webhookId?: number): Promise<WebhookLog[]> {
    if (webhookId) {
      return db.select().from(webhookLogs).where(eq(webhookLogs.webhookId, webhookId)).orderBy(desc(webhookLogs.createdAt)).limit(100);
    }
    return db.select().from(webhookLogs).orderBy(desc(webhookLogs.createdAt)).limit(100);
  }

  async createBacklink(data: { postId: number; platform: string; url: string; utmSource: string; utmMedium: string; utmCampaign: string; shortCode: string }): Promise<Backlink> {
    const [result] = await db.insert(backlinks).values(data).returning();
    return result;
  }
  async getBacklinksByPostId(postId: number): Promise<Backlink[]> {
    return db.select().from(backlinks).where(eq(backlinks.postId, postId)).orderBy(desc(backlinks.createdAt));
  }
  async getBacklinkByShortCode(shortCode: string): Promise<Backlink | undefined> {
    const [result] = await db.select().from(backlinks).where(eq(backlinks.shortCode, shortCode));
    return result;
  }
  async getAllBacklinks(): Promise<Backlink[]> {
    return db.select().from(backlinks).orderBy(desc(backlinks.createdAt));
  }
  async incrementBacklinkClicks(id: number): Promise<void> {
    await db.update(backlinks).set({ clicks: sql`${backlinks.clicks} + 1` }).where(eq(backlinks.id, id));
  }
  async createBacklinkClick(data: { backlinkId: number; referrer: string | null; userAgent: string | null }): Promise<BacklinkClick> {
    const [result] = await db.insert(backlinkClicks).values(data).returning();
    return result;
  }
  async getBacklinkClicksByBacklinkId(backlinkId: number): Promise<BacklinkClick[]> {
    return db.select().from(backlinkClicks).where(eq(backlinkClicks.backlinkId, backlinkId)).orderBy(desc(backlinkClicks.clickedAt));
  }
  async getBacklinkAnalytics(): Promise<{ platform: string; clicks: number; backlinkCount: number }[]> {
    const allBacklinks = await db.select().from(backlinks);
    const map = new Map<string, { clicks: number; backlinkCount: number }>();
    for (const b of allBacklinks) {
      const existing = map.get(b.platform) || { clicks: 0, backlinkCount: 0 };
      map.set(b.platform, { clicks: existing.clicks + b.clicks, backlinkCount: existing.backlinkCount + 1 });
    }
    return Array.from(map.entries()).map(([platform, stats]) => ({ platform, ...stats }));
  }

  async createRating(data: { leadId: number | null; score: number; token: string; channel?: string }): Promise<Rating> {
    const [result] = await db.insert(ratings).values(data).returning();
    return result;
  }
  async getRatingByToken(token: string): Promise<Rating | undefined> {
    const [result] = await db.select().from(ratings).where(eq(ratings.token, token));
    return result;
  }
  async getRatingsByLeadId(leadId: number): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.leadId, leadId)).orderBy(desc(ratings.createdAt));
  }
  async getAllRatings(): Promise<Rating[]> {
    return db.select().from(ratings).orderBy(desc(ratings.createdAt));
  }
  async getSetting(key: string): Promise<string | undefined> {
    const [result] = await db.select().from(settings).where(eq(settings.key, key));
    return result?.value;
  }
  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  }
  async getLeadSentimentSent(leadId: number): Promise<boolean> {
    const existing = await db.select().from(ratings).where(eq(ratings.leadId, leadId));
    return existing.length > 0;
  }
  async markLeadSentimentSent(leadId: number): Promise<void> {
    // no-op; existence of rating record serves as the marker
  }

  async getServices(): Promise<Service[]> {
    return db.select().from(services).orderBy(services.displayOrder);
  }
  async getServiceById(id: number): Promise<Service | undefined> {
    const [result] = await db.select().from(services).where(eq(services.id, id));
    return result;
  }
  async createService(data: InsertService): Promise<Service> {
    const [result] = await db.insert(services).values(data).returning();
    return result;
  }
  async updateService(id: number, data: Partial<Service>): Promise<Service | undefined> {
    const [result] = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return result;
  }
  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async getPublicGallery(): Promise<{ sections: (GallerySection & { items: GalleryItem[] })[] }> {
    const sections = await db.select().from(gallerySections).where(eq(gallerySections.isActive, true)).orderBy(gallerySections.displayOrder);
    const items = await db.select().from(galleryItems).where(eq(galleryItems.isActive, true)).orderBy(galleryItems.displayOrder);
    return {
      sections: sections.map((s) => ({
        ...s,
        items: items.filter((i) => i.sectionId === s.id),
      })),
    };
  }
  async getAdminGallery(): Promise<{ sections: (GallerySection & { items: GalleryItem[] })[] }> {
    const sections = await db.select().from(gallerySections).orderBy(gallerySections.displayOrder);
    const items = await db.select().from(galleryItems).orderBy(galleryItems.displayOrder);
    return {
      sections: sections.map((s) => ({
        ...s,
        items: items.filter((i) => i.sectionId === s.id),
      })),
    };
  }
  async getGallerySections(): Promise<GallerySection[]> {
    return db.select().from(gallerySections).orderBy(gallerySections.displayOrder);
  }
  async getGallerySectionById(id: number): Promise<GallerySection | undefined> {
    const [result] = await db.select().from(gallerySections).where(eq(gallerySections.id, id));
    return result;
  }
  async createGallerySection(data: InsertGallerySection): Promise<GallerySection> {
    const [result] = await db.insert(gallerySections).values(data).returning();
    return result;
  }
  async updateGallerySection(id: number, data: Partial<GallerySection>): Promise<GallerySection | undefined> {
    const [result] = await db.update(gallerySections).set(data).where(eq(gallerySections.id, id)).returning();
    return result;
  }
  async deleteGallerySection(id: number): Promise<void> {
    await db.delete(gallerySections).where(eq(gallerySections.id, id));
  }
  async getGalleryItems(sectionId?: number): Promise<GalleryItem[]> {
    if (sectionId) {
      return db.select().from(galleryItems).where(eq(galleryItems.sectionId, sectionId)).orderBy(galleryItems.displayOrder);
    }
    return db.select().from(galleryItems).orderBy(galleryItems.displayOrder);
  }
  async getGalleryItemById(id: number): Promise<GalleryItem | undefined> {
    const [result] = await db.select().from(galleryItems).where(eq(galleryItems.id, id));
    return result;
  }
  async createGalleryItem(data: InsertGalleryItem): Promise<GalleryItem> {
    const [result] = await db.insert(galleryItems).values(data).returning();
    return result;
  }
  async updateGalleryItem(id: number, data: Partial<GalleryItem>): Promise<GalleryItem | undefined> {
    const [result] = await db.update(galleryItems).set(data).where(eq(galleryItems.id, id)).returning();
    return result;
  }
  async deleteGalleryItem(id: number): Promise<void> {
    await db.delete(galleryItems).where(eq(galleryItems.id, id));
  }

  async createArtwork(data: InsertArtwork): Promise<Artwork> {
    const [result] = await db.insert(artworks).values(data).returning();
    return result;
  }
  async getArtworks(status?: string): Promise<Artwork[]> {
    if (status) {
      return db.select().from(artworks).where(eq(artworks.status, status)).orderBy(desc(artworks.createdAt));
    }
    return db.select().from(artworks).orderBy(desc(artworks.createdAt));
  }
  async getArtworkById(id: number): Promise<Artwork | undefined> {
    const [result] = await db.select().from(artworks).where(eq(artworks.id, id));
    return result;
  }
  async getArtworkBySlug(slug: string): Promise<Artwork | undefined> {
    const [result] = await db.select().from(artworks).where(eq(artworks.slug, slug));
    return result;
  }
  async updateArtwork(id: number, data: Partial<Artwork>): Promise<Artwork | undefined> {
    const [result] = await db.update(artworks).set({ ...data, updatedAt: new Date() }).where(eq(artworks.id, id)).returning();
    return result;
  }
  async deleteArtwork(id: number): Promise<void> {
    await db.delete(artworks).where(eq(artworks.id, id));
  }
  async incrementArtworkViewCount(id: number): Promise<void> {
    await db.update(artworks).set({ viewCount: sql`${artworks.viewCount} + 1` }).where(eq(artworks.id, id));
  }

  async createOrder(data: { artworkId: number; buyerName: string; buyerEmail: string; amount: string; stripeSessionId: string; currency?: string; shippingAddress?: string }): Promise<Order> {
    const [result] = await db.insert(orders).values(data).returning();
    return result;
  }
  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  async getOrderBySessionId(sessionId: string): Promise<Order | undefined> {
    const [result] = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId));
    return result;
  }
  async updateOrder(id: number, data: Partial<Order>): Promise<Order | undefined> {
    const [result] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return result;
  }

  async trackEvent(data: { page: string; eventType: string; sessionId?: string; referrer?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; metadata?: string }): Promise<AnalyticsEvent> {
    const [result] = await db.insert(analyticsEvents).values(data).returning();
    return result;
  }
  async getAnalyticsSummary(days: number = 30): Promise<{
    totalViews: number;
    uniqueSessions: number;
    ctaClicks: number;
    conversions: number;
    contactSubmits: number;
    topPages: { page: string; views: number }[];
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await db.select().from(analyticsEvents).where(gte(analyticsEvents.createdAt, since));
    const views = events.filter((e) => e.eventType === "page_view");
    const uniqueSessionSet = new Set(events.filter((e) => e.sessionId).map((e) => e.sessionId));
    const ctaClicks = events.filter((e) => e.eventType === "cta_click").length;
    const conversions = events.filter((e) => e.eventType === "purchase").length;
    const contactSubmits = events.filter((e) => e.eventType === "contact_submit" || e.eventType === "cta_submit").length;
    const pageMap = new Map<string, number>();
    for (const v of views) {
      pageMap.set(v.page, (pageMap.get(v.page) || 0) + 1);
    }
    const topPages = Array.from(pageMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));
    return {
      totalViews: views.length,
      uniqueSessions: uniqueSessionSet.size,
      ctaClicks,
      conversions,
      contactSubmits,
      topPages,
    };
  }

  async getPageRegistry(): Promise<PageRegistry[]> {
    return db.select().from(pageRegistry).orderBy(desc(pageRegistry.createdAt));
  }
  async getPageBySlug(slug: string): Promise<PageRegistry | undefined> {
    const [result] = await db.select().from(pageRegistry).where(eq(pageRegistry.slug, slug));
    return result;
  }
  async createPage(data: InsertPageRegistry): Promise<PageRegistry> {
    const [result] = await db.insert(pageRegistry).values(data).returning();
    return result;
  }
  async updatePage(id: number, data: Partial<PageRegistry>): Promise<PageRegistry | undefined> {
    const [result] = await db.update(pageRegistry).set({ ...data, updatedAt: new Date() }).where(eq(pageRegistry.id, id)).returning();
    return result;
  }
  async deletePage(id: number): Promise<void> {
    await db.delete(pageRegistry).where(eq(pageRegistry.id, id));
  }
  async incrementPageView(slug: string): Promise<void> {
    await db.update(pageRegistry).set({ viewCount: sql`${pageRegistry.viewCount} + 1` }).where(eq(pageRegistry.slug, slug));
  }
  async incrementPageCTA(slug: string): Promise<void> {
    await db.update(pageRegistry).set({ ctaClickCount: sql`${pageRegistry.ctaClickCount} + 1` }).where(eq(pageRegistry.slug, slug));
  }
  async incrementPageConversion(slug: string): Promise<void> {
    await db.update(pageRegistry).set({ conversionCount: sql`${pageRegistry.conversionCount} + 1` }).where(eq(pageRegistry.slug, slug));
  }
}

export const storage = new DatabaseStorage();
