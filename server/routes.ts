import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertWebhookSchema, leadStatuses, webhookEvents, insertArtworkSchema, artworkCategories, artworkStatuses, type Commission } from "@shared/schema";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { authMiddleware, requireRole, hashPassword, verifyPassword, createSession, destroySession } from "./auth";
import crypto from "crypto";
import OpenAI from "openai";
import { getResendClient } from "./resend";

async function fireWebhooks(event: string, payload: Record<string, any>) {
  try {
    const hooks = await storage.getActiveWebhooksForEvent(event);
    for (const hook of hooks) {
      const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
      const signature = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event,
          },
          body,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const duration = Date.now() - start;
        const respText = await resp.text().catch(() => "");
        await storage.createWebhookLog({
          webhookId: hook.id,
          event,
          payload: body,
          statusCode: resp.status,
          response: respText.substring(0, 2000),
          success: resp.ok,
          duration,
        });
      } catch (e: any) {
        const duration = Date.now() - start;
        await storage.createWebhookLog({
          webhookId: hook.id,
          event,
          payload: body,
          statusCode: 0,
          response: e?.message || "Connection failed",
          success: false,
          duration,
        });
      }
    }
  } catch (e: any) {
    console.error("Webhook dispatch error:", e?.message);
  }
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function sendSentimentSurvey(lead: { id: number; name: string; email: string }) {
  try {
    const enabled = await storage.getSetting("sentiment_auto_survey");
    if (enabled === "false") return;

    const alreadySent = await storage.getLeadSentimentSent(lead.id);
    if (alreadySent) return;

    const token = crypto.randomUUID();
    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DEPLOYMENT_URL
      ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
      : "http://localhost:5000";
    const rateUrl = `${baseUrl}/rate/${token}?leadId=${lead.id}`;

    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail,
      to: lead.email,
      subject: "How was your experience with us?",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0B0B0D; color: #F5F5F7; padding: 40px 24px; border-radius: 8px;">
          <p style="color: #B3B3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">Creations by Oracle</p>
          <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 16px 0;">How was your experience, ${lead.name.split(" ")[0]}?</h2>
          <p style="color: #B3B3B8; font-size: 14px; line-height: 1.6; margin-bottom: 32px;">Thank you for your inquiry. We'd love to hear about your experience working with us.</p>
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${rateUrl}&score=5" style="text-decoration: none; font-size: 32px; margin: 0 8px;">&#128515;</a>
            <a href="${rateUrl}&score=4" style="text-decoration: none; font-size: 32px; margin: 0 8px;">&#128578;</a>
            <a href="${rateUrl}&score=3" style="text-decoration: none; font-size: 32px; margin: 0 8px;">&#128528;</a>
            <a href="${rateUrl}&score=2" style="text-decoration: none; font-size: 32px; margin: 0 8px;">&#128533;</a>
            <a href="${rateUrl}&score=1" style="text-decoration: none; font-size: 32px; margin: 0 8px;">&#128542;</a>
          </div>
          <p style="color: #B3B3B8; font-size: 12px; text-align: center;">Click a face to rate. Takes 2 seconds.</p>
        </div>
      `,
    });

    await storage.markLeadSentimentSent(lead.id);
  } catch (e: any) {
    console.error("Sentiment survey email error:", e?.message);
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Auth Routes ───────────────────────────────────────────────

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      await createSession(res, user.id);
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    await destroySession(req, res);
    res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", authMiddleware, (req, res) => {
    const u = req.user!;
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
  });

  // ─── User Management (root + admin, with root protection) ───

  app.get("/api/users", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt })));
    } catch {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password required" });
      }
      if (role === "root" && req.user!.role !== "root") {
        return res.status(403).json({ message: "Only the webmaster can create root users" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email already in use" });
      }
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({ name, email, role: role || "editor", passwordHash });
      res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch {
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const target = await storage.getUserById(id);
      if (!target) {
        return res.status(404).json({ message: "User not found" });
      }
      if (target.role === "root" && req.user!.role !== "root") {
        return res.status(403).json({ message: "Cannot modify webmaster account" });
      }
      if (req.body.role === "root" && req.user!.role !== "root") {
        return res.status(403).json({ message: "Only the webmaster can assign root role" });
      }
      const updates: Record<string, any> = {};
      if (req.body.role) updates.role = req.body.role;
      if (req.body.name) updates.name = req.body.name;

      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (req.user!.id === id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      const target = await storage.getUserById(id);
      if (!target) {
        return res.status(404).json({ message: "User not found" });
      }
      if (target.role === "root" && req.user!.role !== "root") {
        return res.status(403).json({ message: "Cannot delete webmaster account" });
      }
      await storage.deleteUser(id);
      res.json({ message: "User deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ─── Lead Routes ───────────────────────────────────────────────

  app.post("/api/leads", async (req, res) => {
    try {
      const data = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(data);
      res.status(201).json(lead);
      fireWebhooks("lead.created", { id: lead.id, name: lead.name, email: lead.email, phone: lead.phone, vehicle: lead.vehicle, insurance: lead.insurance, message: lead.message, status: lead.status, createdAt: lead.createdAt });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create lead" });
      }
    }
  });

  app.get("/api/leads", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const allLeads = await storage.getLeads();
      res.json(allLeads);
    } catch {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch {
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.patch("/api/leads/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates: Record<string, any> = {};

      if (req.body.status) {
        if (!leadStatuses.includes(req.body.status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        updates.status = req.body.status;
      }
      if (req.body.message !== undefined) updates.message = req.body.message;
      if (req.body.subject !== undefined) updates.subject = req.body.subject;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const lead = await storage.updateLead(id, updates);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
      fireWebhooks("lead.updated", { id: lead.id, name: lead.name, email: lead.email, phone: lead.phone, status: lead.status, changes: Object.keys(updates) });
      if (updates.status === "Delivered") {
        sendSentimentSurvey({ id: lead.id, name: lead.name, email: lead.email });
      }
    } catch {
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // ─── Blog Post Routes ─────────────────────────────────────────

  app.get("/api/posts/queue", authMiddleware, requireRole("root", "admin", "editor"), async (_req, res) => {
    try {
      const queued = await storage.getPosts("queued");
      res.json(queued);
    } catch {
      res.status(500).json({ message: "Failed to fetch queue" });
    }
  });

  app.get("/api/posts", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const allPosts = await storage.getPosts(status);
      res.json(allPosts);
    } catch {
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/:idOrSlug", async (req, res) => {
    try {
      const param = req.params.idOrSlug;
      const id = parseInt(param);
      const post = isNaN(id) ? await storage.getPostBySlug(param) : await storage.getPostById(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch {
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.post("/api/posts", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const { title, content, excerpt, tags, seoTitle, seoDescription, status, featuredImage } = req.body;
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      let slug = slugify(title);
      const existing = await storage.getPostBySlug(slug);
      if (existing) {
        slug = slug + "-" + Date.now().toString(36);
      }
      const post = await storage.createPost({
        title,
        slug,
        content: content || "",
        excerpt: excerpt || null,
        tags: tags || [],
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        status: status || "draft",
        featuredImage: featuredImage || null,
        publishedAt: status === "published" ? new Date() : null,
        authorId: req.user!.id,
      });
      res.status(201).json(post);
    } catch {
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.patch("/api/posts/:id", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates: Record<string, any> = {};
      const fields = ["title", "content", "excerpt", "tags", "seoTitle", "seoDescription", "seoKeywords", "status", "featuredImage"];
      for (const f of fields) {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      }
      let existingPost: Awaited<ReturnType<typeof storage.getPostById>> | undefined;
      if (updates.status === "published") {
        existingPost = await storage.getPostById(id);
        if (existingPost && !existingPost.publishedAt) {
          updates.publishedAt = new Date();
        }
      }
      if (updates.title) {
        updates.slug = slugify(updates.title);
        const existing = await storage.getPostBySlug(updates.slug);
        if (existing && existing.id !== id) {
          updates.slug = updates.slug + "-" + Date.now().toString(36);
        }
      }
      const post = await storage.updatePost(id, updates);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      // Auto-register in pageRegistry when transitioning to published
      if (updates.status === "published" && existingPost && !existingPost.publishedAt) {
        try {
          const blogSlug = `blog/${post.slug}`;
          const existingPage = await storage.getPageBySlug(blogSlug);
          if (!existingPage) {
            await storage.createPage({
              slug: blogSlug,
              title: post.title,
              pageType: "blog",
              seoTitle: post.seoTitle || post.title,
              seoDescription: post.seoDescription || post.excerpt || "",
              seoKeywords: post.seoKeywords || [],
              status: "published",
              linkedEntityId: id,
              linkedEntityType: "post",
            });
          }
        } catch (e: any) {
          console.error("Page registry auto-create error:", e?.message);
        }
      }
      res.json(post);
    } catch {
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete("/api/posts/purge-all", authMiddleware, requireRole("root"), async (_req, res) => {
    try {
      const allPosts = await storage.getPosts();
      for (const post of allPosts) {
        await storage.deletePost(post.id);
      }
      const allTopics = await storage.getTopics();
      for (const topic of allTopics) {
        await storage.deleteTopic(topic.id);
      }
      res.json({ message: `Deleted ${allPosts.length} posts and ${allTopics.length} associated topics` });
    } catch {
      res.status(500).json({ message: "Failed to purge posts" });
    }
  });

  app.delete("/api/posts/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePost(id);
      res.json({ message: "Post deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // ─── AI Article Generation (single topic) ──────────────────────

  async function handleWriteArticle(req: Request, res: Response): Promise<void> {
    try {
      const { topic, keywords, tone } = req.body;
      if (!topic) {
        res.status(400).json({ message: "Topic is required" });
        return;
      }

      const blogServicesRaw = await storage.getSetting("blog_services");
      const blogServices: { title: string; description: string }[] = (() => {
        try { return blogServicesRaw ? JSON.parse(blogServicesRaw) : []; } catch { return []; }
      })();
      const servicesContext = blogServices.length > 0
        ? blogServices.map((s) => s.title + (s.description ? `: ${s.description}` : "")).join("; ")
        : "abstract canvas painting, life-like portraiture, 3D art installations, copper sculptures, mixed media";

      const job = await storage.createAiJob({ type: "article", input: JSON.stringify({ topic, keywords, tone }) });

      // Fetch published artworks to include shop links in generated articles
      const publishedArtworks = await storage.getArtworks("published");
      const artworkLinks = publishedArtworks.slice(0, 12).map((a) => `"${a.title}" (/shop/${a.slug}) — ${a.category || ""}${a.medium ? `, ${a.medium}` : ""}`).join("\n");

      const systemPrompt = `You are an expert art writer and content strategist for an independent contemporary artist. Write authoritative, eloquent blog articles about art, the creative process, and the artist's work. Context about the artist's mediums: ${servicesContext}.

${artworkLinks ? `Available artworks in the shop (link to 1-2 when contextually relevant):\n${artworkLinks}\n` : ""}
Rules:
- Write in a thoughtful, evocative tone. No hype. No exclamation points.
- Use substantive, specific content about art techniques, materials, artistic intent, and the viewer's experience.
- Structure with H2 and H3 headings using markdown.
- Include internal links using proper markdown link syntax: [link text](/path). For example: [view the gallery](/gallery), [shop original works](/shop), [contact for commissions](/contact). Do NOT output raw URLs or bare paths.
- When relevant, link naturally to 1-2 specific artworks from the list above using [artwork title](/shop/slug) syntax — only when it fits naturally in context.
- Include a compelling excerpt (2 sentences max).
- Suggest 3-5 relevant tags.
- Suggest an SEO title (60 chars max) and meta description (155 chars max).
- Minimum 800 words of article content.`;

      const userPrompt = `Write a blog article about: ${topic}${keywords ? `\nTarget keywords: ${keywords}` : ""}${tone ? `\nTone: ${tone}` : ""}

Respond in this exact JSON format:
{
  "title": "Article Title",
  "excerpt": "Brief 1-2 sentence excerpt",
  "content": "Full article content in markdown",
  "tags": ["tag1", "tag2"],
  "seoTitle": "SEO Title",
  "seoDescription": "Meta description"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });

      const raw = response.choices[0]?.message?.content || "{}";
      let article: { title?: string; content?: string; excerpt?: string; tags?: string[]; seoTitle?: string; seoDescription?: string; seoKeywords?: string[] };
      try {
        article = JSON.parse(raw);
      } catch {
        article = { title: topic, content: raw, excerpt: "", tags: [], seoTitle: "", seoDescription: "" };
      }

      await storage.updateAiJob(job.id, { output: raw, status: "completed" });

      const slug = slugify(article.title || topic);
      const existingSlug = await storage.getPostBySlug(slug);
      const finalSlug = existingSlug ? slug + "-" + Date.now().toString(36) : slug;

      const post = await storage.createPost({
        title: article.title || topic,
        slug: finalSlug,
        content: article.content || "",
        excerpt: article.excerpt || null,
        tags: article.tags || [],
        seoTitle: article.seoTitle || null,
        seoDescription: article.seoDescription || null,
        seoKeywords: article.seoKeywords || [],
        status: "draft",
        featuredImage: null,
        publishedAt: null,
        authorId: req.user!.id,
      });

      res.json({ post, job });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("AI write error:", msg);
      res.status(500).json({ message: "Failed to generate article", error: msg });
    }
  }

  // Both endpoints share the same handler — /api/ai/write is the canonical name
  app.post("/api/ai/generate-article", authMiddleware, requireRole("root", "admin", "editor"), handleWriteArticle);
  app.post("/api/ai/write", authMiddleware, requireRole("root", "admin", "editor"), handleWriteArticle);

  app.get("/api/ai/jobs", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const jobs = await storage.getAiJobs();
      res.json(jobs);
    } catch {
      res.status(500).json({ message: "Failed to fetch AI jobs" });
    }
  });

  // ─── Research Agent: 5 Topic Suggestions Only ──────────────────

  app.get("/api/topics", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const allTopics = await storage.getTopics(status);
      res.json(allTopics);
    } catch {
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  app.get("/api/topics/:id", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const topic = await storage.getTopicById(id);
      if (!topic) return res.status(404).json({ message: "Topic not found" });
      res.json(topic);
    } catch {
      res.status(500).json({ message: "Failed to fetch topic" });
    }
  });

  app.post("/api/ai/research", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const job = await storage.createAiJob({
        type: "research",
        input: JSON.stringify({ triggeredBy: req.user!.email }),
      });

      res.json({ jobId: job.id, status: "processing" });

      (async () => {
        try {
          const blogServicesRaw = await storage.getSetting("blog_services");
          const blogServices: { title: string; description: string }[] = (() => { try { return blogServicesRaw ? JSON.parse(blogServicesRaw) : []; } catch { return []; } })();
          const activeServices = blogServices.length > 0
            ? blogServices.map((s) => s.title + (s.description ? `: ${s.description}` : "")).join("; ")
            : "Abstract Canvas Painting; Life-like Portraiture; 3D Art Installations; Copper Sculptures; Mixed Media";

          const researchPrompt = `You are an expert SEO strategist and content marketing researcher for an independent contemporary artist specializing in abstract canvas art, life-like portraits, 3D art installations, and sculptures using copper and other materials.

Artist's mediums and focus areas:
${activeServices}

Conduct thorough research on the contemporary art market. Analyze:
1. What art-related topics drive engagement and discovery for collectors, art lovers, and buyers
2. High-value, lower-competition keywords in the contemporary art and collector market
3. Seasonal trends (art fairs, exhibitions, commission seasons)
4. Buyer questions about original art, commissions, pricing, and collecting
5. SEO opportunities around abstract art, portrait commissions, and sculptural work

Then identify 5 highly effective article topics that will:
- Drive organic search traffic from art collectors and enthusiasts
- Convert readers into collectors or commission inquiries
- Showcase the artist's unique mediums and process
- Cover informational, commercial, and transactional intent

For each topic provide:
- title: compelling headline
- overview: 1-paragraph overview of the article concept (what it covers, angle, unique value)
- targetKeywords: array of 5-8 target keywords/phrases
- searchIntent: "informational" | "commercial" | "transactional"
- estimatedSearchVolume: "high" | "medium" | "low"
- competitionLevel: "high" | "medium" | "low"
- leadPotential: brief explanation of how this drives leads
- reasoning: why this topic was chosen, what search data supports it

Respond in JSON format:
{
  "marketInsights": "Brief summary of competitive landscape and opportunities",
  "topics": [
    {
      "title": "...",
      "overview": "...",
      "targetKeywords": ["..."],
      "searchIntent": "...",
      "estimatedSearchVolume": "...",
      "competitionLevel": "...",
      "leadPotential": "...",
      "reasoning": "..."
    }
  ]
}`;

          const researchResponse = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [{ role: "user", content: researchPrompt }],
            response_format: { type: "json_object" },
            max_completion_tokens: 4096,
          });

          const researchRaw = researchResponse.choices[0]?.message?.content || "{}";
          let research;
          try {
            research = JSON.parse(researchRaw);
          } catch {
            research = { marketInsights: "", topics: [] };
          }

          const topicsData = research.topics || [];
          for (const t of topicsData.slice(0, 5)) {
            await storage.createTopic({
              title: t.title,
              overview: t.overview || "",
              targetKeywords: t.targetKeywords || [],
              searchIntent: t.searchIntent || null,
              estimatedSearchVolume: t.estimatedSearchVolume || null,
              competitionLevel: t.competitionLevel || null,
              leadPotential: t.leadPotential || null,
              reasoning: t.reasoning || null,
              aiJobId: job.id,
            });
          }

          await storage.updateAiJob(job.id, {
            output: JSON.stringify({ research, topicCount: topicsData.length }),
            status: "completed",
          });
        } catch (e: any) {
          console.error("Research agent error:", e?.message);
          await storage.updateAiJob(job.id, { output: JSON.stringify({ error: e?.message }), status: "failed" });
        }
      })();
    } catch (error: any) {
      console.error("Research agent error:", error);
      res.status(500).json({ message: "Failed to start research agent", error: error?.message });
    }
  });

  // ─── Writer Agent: Generate Article from Topic ──────────────────

  app.post("/api/topics/:id/generate", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const topicId = parseInt(req.params.id);
      const topic = await storage.getTopicById(topicId);
      if (!topic) return res.status(404).json({ message: "Topic not found" });
      if (topic.status === "generated" || topic.status === "generating") {
        return res.status(400).json({ message: "Article already generated or in progress for this topic" });
      }

      await storage.updateTopic(topicId, { status: "generating" });
      res.json({ status: "generating", topicId });

      (async () => {
        try {
          const blogServicesRaw = await storage.getSetting("blog_services");
          const blogServices: { title: string; description: string }[] = (() => { try { return blogServicesRaw ? JSON.parse(blogServicesRaw) : []; } catch { return []; } })();
          const activeServices = blogServices.length > 0
            ? blogServices.map((s) => s.title + (s.description ? `: ${s.description}` : "")).join("; ")
            : "Abstract Canvas Painting; Life-like Portraiture; 3D Art Installations; Copper Sculptures; Mixed Media";

          // Fetch published artworks filtered by topic category for category-aware linking
          const publishedArtworks = await storage.getArtworks("published");
          const topicKeywords = (topic.targetKeywords || []).map((k: string) => k.toLowerCase());
          const categoryArtworks = publishedArtworks.filter((a) => {
            const artTags = [a.category || "", a.medium || "", ...(a.seoKeywords || [])].map(s => s.toLowerCase());
            return topicKeywords.some(kw => artTags.some(at => at.includes(kw) || kw.includes(at)));
          });
          const linkCandidates = (categoryArtworks.length > 0 ? categoryArtworks : publishedArtworks).slice(0, 6);
          const artworkLinksBlock = linkCandidates.map((a) =>
            `"${a.title}" (/shop/${a.slug}) — ${a.category || ""}${a.medium ? `, ${a.medium}` : ""}`
          ).join("\n");

          const articlePrompt = `You are an expert art writer and content strategist for Creations by Oracle, an independent contemporary artist.

Artist's mediums and focus areas: ${activeServices}

Write a comprehensive, SEO-optimized blog article based on this research:
Topic: ${topic.title}
Overview: ${topic.overview}
Target Keywords: ${(topic.targetKeywords || []).join(", ")}
Search Intent: ${topic.searchIntent || "informational"}

${artworkLinksBlock ? `Artworks available for inline linking (prefer category-matching ones — link 1–2 when contextually relevant):\n${artworkLinksBlock}\n` : ""}
Rules:
- Write in a thoughtful, evocative tone. No exclamation points. No sales hype.
- Naturally incorporate target keywords throughout the content
- Use substantive, specific content about art techniques, materials, artistic intent, and the viewer's experience
- Structure with H2 and H3 headings using markdown
- Minimum 1000 words
- Include internal links using proper markdown link syntax: [link text](/path). For example: [view the gallery](/gallery), [shop original works](/shop), [contact for commissions](/contact). Do NOT output raw URLs or bare paths.
- When contextually natural, link to 1-2 artworks from the list above using [artwork title](/shop/slug) syntax
- End with a subtle call-to-action for commissions or visiting the shop

Respond in JSON format:
{
  "title": "Article Title",
  "excerpt": "2 sentence excerpt for search results",
  "content": "Full markdown article content",
  "tags": ["tag1", "tag2", "tag3"],
  "seoTitle": "SEO page title (60 chars max)",
  "seoDescription": "Meta description (155 chars max)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

          const articleResponse = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [{ role: "user", content: articlePrompt }],
            response_format: { type: "json_object" },
            max_completion_tokens: 8192,
          });

          const articleRaw = articleResponse.choices[0]?.message?.content || "{}";
          let article;
          try {
            article = JSON.parse(articleRaw);
          } catch {
            article = { title: topic.title, content: articleRaw, excerpt: "", tags: [], seoTitle: "", seoDescription: "", seoKeywords: [] };
          }

          let slug = slugify(article.title || topic.title);
          const existingSlug = await storage.getPostBySlug(slug);
          if (existingSlug) slug = slug + "-" + Date.now().toString(36);

          const post = await storage.createPost({
            title: article.title || topic.title,
            slug,
            content: article.content || "",
            excerpt: article.excerpt || null,
            tags: article.tags || [],
            seoTitle: article.seoTitle || null,
            seoDescription: article.seoDescription || null,
            seoKeywords: article.seoKeywords || [],
            status: "queued",
            featuredImage: null,
            publishedAt: null,
            topicId,
            authorId: req.user!.id,
          });

          await storage.updateTopic(topicId, { status: "generated", postId: post.id });
        } catch (e: any) {
          console.error("Writer agent error:", e?.message);
          await storage.updateTopic(topicId, { status: "suggested" });
        }
      })();
    } catch (error: any) {
      console.error("Writer agent error:", error);
      res.status(500).json({ message: "Failed to generate article from topic" });
    }
  });

  // ─── Archive Topic ──────────────────────────────────────────────

  app.patch("/api/topics/:id/archive", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const topic = await storage.updateTopic(id, { status: "archived" });
      if (!topic) return res.status(404).json({ message: "Topic not found" });
      res.json(topic);
    } catch {
      res.status(500).json({ message: "Failed to archive topic" });
    }
  });

  app.get("/api/ai/research-jobs", authMiddleware, requireRole("root", "admin", "editor"), async (_req, res) => {
    try {
      const jobs = await storage.getAiJobsByType("research");
      res.json(jobs);
    } catch {
      res.status(500).json({ message: "Failed to fetch research jobs" });
    }
  });

  // ─── Publisher Agent: Publish + SEO + Backlinks + Auto-Newsletter ──

  app.post("/api/posts/:id/publish", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getPostById(id);
      if (!post) return res.status(404).json({ message: "Post not found" });

      const updated = await storage.updatePost(id, { status: "published", publishedAt: new Date() });
      res.json(updated);
      fireWebhooks("post.published", { id: post.id, title: post.title, slug: post.slug, excerpt: post.excerpt, tags: post.tags, publishedAt: new Date().toISOString() });

      // Auto-register published blog post in pageRegistry for sitemap inclusion
      try {
        const blogSlug = `blog/${post.slug}`;
        const existingPage = await storage.getPageBySlug(blogSlug);
        if (!existingPage) {
          await storage.createPage({
            slug: blogSlug,
            title: post.title,
            pageType: "blog",
            seoTitle: post.seoTitle || post.title,
            seoDescription: post.seoDescription || post.excerpt || "",
            seoKeywords: post.seoKeywords || [],
            status: "published",
            linkedEntityId: id,
            linkedEntityType: "post",
          });
        }
      } catch (e: any) {
        console.error("Page registry auto-create error:", e?.message);
      }

      (async () => {
        try {
          if (!post.seoTitle || !post.seoDescription || !(post.seoKeywords && post.seoKeywords.length > 0)) {
            const seoPrompt = `You are an SEO specialist. Generate optimized SEO metadata for this blog article.

Title: ${post.title}
Excerpt: ${post.excerpt || ""}
Tags: ${(post.tags || []).join(", ")}

Respond in JSON:
{
  "seoTitle": "SEO title (60 chars max)",
  "seoDescription": "Meta description (155 chars max)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

            try {
              const seoResponse = await openai.chat.completions.create({
                model: "gpt-5.2",
                messages: [{ role: "user", content: seoPrompt }],
                response_format: { type: "json_object" },
                max_completion_tokens: 512,
              });

              const seoRaw = seoResponse.choices[0]?.message?.content || "{}";
              let seoData;
              try { seoData = JSON.parse(seoRaw); } catch { seoData = {}; }

              const seoUpdates: Record<string, any> = {};
              if (!post.seoTitle && seoData.seoTitle) seoUpdates.seoTitle = seoData.seoTitle;
              if (!post.seoDescription && seoData.seoDescription) seoUpdates.seoDescription = seoData.seoDescription;
              if ((!post.seoKeywords || post.seoKeywords.length === 0) && seoData.seoKeywords) seoUpdates.seoKeywords = seoData.seoKeywords;

              if (Object.keys(seoUpdates).length > 0) {
                await storage.updatePost(id, seoUpdates);
              }
            } catch (e: any) {
              console.error("SEO agent error:", e?.message);
            }
          }

          const baseUrl = process.env.REPLIT_DEPLOYMENT_URL
            ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
            : process.env.REPLIT_DEV_DOMAIN
              ? `https://${process.env.REPLIT_DEV_DOMAIN}`
              : "";

          const backlinkPlatforms = ["Reddit", "LinkedIn", "Twitter", "Medium", "Hacker News"];
          for (const platform of backlinkPlatforms) {
            try {
              const shortCode = crypto.randomBytes(4).toString("hex");
              const utmSource = platform.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              const utmCampaign = post.slug;
              const articleUrl = `${baseUrl}/blog/${post.slug}?utm_source=${utmSource}&utm_medium=referral&utm_campaign=${utmCampaign}`;

              await storage.createBacklink({
                postId: id,
                platform,
                url: articleUrl,
                utmSource,
                utmMedium: "referral",
                utmCampaign,
                shortCode,
              });
            } catch (e: any) {
              console.error(`Backlink creation error for ${platform}:`, e?.message);
            }
          }

          try {
            const articleLink = `${baseUrl}/blog/${post.slug}`;
            const nlSubject = post.title;
            const nlHtml = `<div style="font-family:Manrope,sans-serif;background:#0B0B0D;color:#F5F5F7;padding:40px 20px;">
<h1 style="font-size:24px;margin-bottom:16px;">${post.title}</h1>
${post.excerpt ? `<p style="color:#B3B3B8;font-size:16px;line-height:1.6;margin-bottom:24px;">${post.excerpt}</p>` : ""}
<a href="${articleLink}" style="display:inline-block;background:#5D3FD3;color:white;padding:12px 32px;text-decoration:none;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Read Full Article</a>
<p style="color:#B3B3B8;font-size:12px;margin-top:40px;">Creations by Oracle</p>
</div>`;

            const newsletter = await storage.createNewsletter({ subject: nlSubject, htmlContent: nlHtml });

            const activeSubscribers = await storage.getSubscribers("active");
            if (activeSubscribers.length > 0) {
              let sent = 0;
              try {
                const { client, fromEmail } = await getResendClient();
                for (const sub of activeSubscribers) {
                  try {
                    await client.emails.send({
                      from: fromEmail,
                      to: sub.email,
                      subject: nlSubject,
                      html: nlHtml +
                        `<p style="font-size:12px;color:#999;margin-top:40px;"><a href="${baseUrl}/api/unsubscribe/${sub.unsubscribeToken}">Unsubscribe</a></p>`,
                    });
                    sent++;
                  } catch (e) {
                    console.error(`Failed to send to ${sub.email}:`, e);
                  }
                }
              } catch (e) {
                console.error("Resend client error:", e);
              }

              await storage.updateNewsletter(newsletter.id, {
                status: "sent",
                sentAt: new Date(),
                recipientCount: sent,
              });
            }
          } catch (e: any) {
            console.error("Auto-newsletter error:", e?.message);
          }
        } catch (e: any) {
          console.error("Publisher agent error:", e?.message);
        }
      })();
    } catch {
      res.status(500).json({ message: "Failed to publish post" });
    }
  });

  // ─── Read/Share Count Tracking ──────────────────────────────────

  app.post("/api/posts/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.incrementPostReadCount(id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to track read" });
    }
  });

  app.post("/api/posts/:id/share", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.incrementPostShareCount(id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to track share" });
    }
  });

  // ─── Backlink Agent ─────────────────────────────────────────────

  app.post("/api/ai/backlink-research", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { postId } = req.body;
      if (!postId) return res.status(400).json({ message: "Post ID required" });

      const post = await storage.getPostById(postId);
      if (!post) return res.status(404).json({ message: "Post not found" });

      const prompt = `You are an expert SEO link building strategist. Analyze this blog article and recommend the 8 most effective platforms/websites to distribute it for maximum backlink value and organic traffic.

Article Title: ${post.title}
Article Topic: ${post.excerpt || post.title}
Tags: ${(post.tags || []).join(", ")}

For each platform, provide:
- platform: name of the platform/website
- type: "social" | "forum" | "directory" | "guest-post" | "aggregator" | "community"
- authority: "high" | "medium" | "low" (domain authority estimate)
- relevance: brief explanation of why this platform is effective for this content
- suggestedAction: what specifically to do on this platform (e.g., "Submit to relevant subreddit", "Share with industry hashtags")

Respond in JSON format:
{
  "platforms": [
    {
      "platform": "...",
      "type": "...",
      "authority": "...",
      "relevance": "...",
      "suggestedAction": "..."
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const raw = response.choices[0]?.message?.content || "{}";
      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        result = { platforms: [] };
      }

      res.json(result);
    } catch (error: any) {
      console.error("Backlink research error:", error);
      res.status(500).json({ message: "Failed to research backlink platforms" });
    }
  });

  app.post("/api/backlinks/generate", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { postId, platform } = req.body;
      if (!postId || !platform) return res.status(400).json({ message: "Post ID and platform required" });

      const post = await storage.getPostById(postId);
      if (!post) return res.status(404).json({ message: "Post not found" });

      const shortCode = crypto.randomBytes(4).toString("hex");
      const utmSource = platform.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const utmCampaign = post.slug;

      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "";

      const articleUrl = `${baseUrl}/blog/${post.slug}?utm_source=${utmSource}&utm_medium=referral&utm_campaign=${utmCampaign}`;

      const backlink = await storage.createBacklink({
        postId,
        platform,
        url: articleUrl,
        utmSource,
        utmMedium: "referral",
        utmCampaign,
        shortCode,
      });

      const trackingUrl = `${baseUrl}/r/${shortCode}`;

      res.json({ backlink, trackingUrl, articleUrl });
    } catch (error: any) {
      console.error("Backlink generation error:", error);
      res.status(500).json({ message: "Failed to generate backlink" });
    }
  });

  app.get("/api/backlinks", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const postId = req.query.postId ? parseInt(req.query.postId as string) : undefined;
      const links = postId ? await storage.getBacklinksByPostId(postId) : await storage.getAllBacklinks();
      res.json(links);
    } catch {
      res.status(500).json({ message: "Failed to fetch backlinks" });
    }
  });

  app.get("/api/backlinks/analytics", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const analytics = await storage.getBacklinkAnalytics();
      res.json(analytics);
    } catch {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ─── Backlink Click Tracking Redirect ───────────────────────────

  app.get("/r/:shortCode", async (req, res) => {
    try {
      const backlink = await storage.getBacklinkByShortCode(req.params.shortCode);
      if (!backlink) return res.status(404).send("Not found");

      await storage.incrementBacklinkClicks(backlink.id);
      await storage.createBacklinkClick({
        backlinkId: backlink.id,
        referrer: req.headers.referer || null,
        userAgent: req.headers["user-agent"] || null,
      });

      res.redirect(301, backlink.url);
    } catch {
      res.status(500).send("Error");
    }
  });

  // ─── Newsletter Subscriber Routes ─────────────────────────────

  app.post("/api/subscribers", async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const existing = await storage.getSubscriberByEmail(email);
      if (existing) {
        if (existing.status === "unsubscribed") {
          await storage.updateSubscriber(existing.id, { status: "active" });
          return res.json({ message: "Re-subscribed" });
        }
        return res.json({ message: "Already subscribed" });
      }
      const unsubscribeToken = crypto.randomBytes(32).toString("hex");
      const sub = await storage.createSubscriber({ name: name || null, email, unsubscribeToken });
      res.status(201).json({ message: "Subscribed" });
      fireWebhooks("subscriber.created", { id: sub.id, email: sub.email, name: sub.name, createdAt: sub.createdAt });
    } catch {
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  app.get("/api/subscribers", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const subs = await storage.getSubscribers(status);
      res.json(subs);
    } catch {
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  app.delete("/api/subscribers/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSubscriber(id);
      res.json({ message: "Subscriber deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete subscriber" });
    }
  });

  app.get("/api/unsubscribe/:token", async (req, res) => {
    try {
      const sub = await storage.getSubscriberByToken(req.params.token);
      if (!sub) {
        return res.status(404).json({ message: "Subscriber not found" });
      }
      await storage.updateSubscriber(sub.id, { status: "unsubscribed" });
      res.json({ message: "Unsubscribed successfully" });
    } catch {
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // ─── Newsletter Routes ────────────────────────────────────────

  app.get("/api/newsletters", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const newsletters = await storage.getNewsletters();
      res.json(newsletters);
    } catch {
      res.status(500).json({ message: "Failed to fetch newsletters" });
    }
  });

  app.post("/api/newsletters", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { subject, htmlContent } = req.body;
      if (!subject || !htmlContent) {
        return res.status(400).json({ message: "Subject and content required" });
      }
      const newsletter = await storage.createNewsletter({ subject, htmlContent });
      res.status(201).json(newsletter);
    } catch {
      res.status(500).json({ message: "Failed to create newsletter" });
    }
  });

  app.post("/api/newsletters/:id/send", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const newsletter = await storage.getNewsletterById(id);
      if (!newsletter) {
        return res.status(404).json({ message: "Newsletter not found" });
      }
      if (newsletter.status === "sent") {
        return res.status(400).json({ message: "Newsletter already sent" });
      }

      const activeSubscribers = await storage.getSubscribers("active");
      if (activeSubscribers.length === 0) {
        return res.status(400).json({ message: "No active subscribers" });
      }

      let sent = 0;
      try {
        const { client, fromEmail } = await getResendClient();
        for (const sub of activeSubscribers) {
          try {
            await client.emails.send({
              from: fromEmail,
              to: sub.email,
              subject: newsletter.subject,
              html: newsletter.htmlContent +
                `<p style="font-size:12px;color:#999;margin-top:40px;"><a href="${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : ''}/api/unsubscribe/${sub.unsubscribeToken}">Unsubscribe</a></p>`,
            });
            sent++;
          } catch (e) {
            console.error(`Failed to send to ${sub.email}:`, e);
          }
        }
      } catch (e) {
        console.error("Resend client error:", e);
        return res.status(500).json({ message: "Email service unavailable" });
      }

      await storage.updateNewsletter(id, {
        status: "sent",
        sentAt: new Date(),
        recipientCount: sent,
      });

      res.json({ message: `Newsletter sent to ${sent} subscribers`, sent });
    } catch {
      res.status(500).json({ message: "Failed to send newsletter" });
    }
  });

  // ─── Webhook Integration Routes ──────────────────────────────

  app.get("/api/webhooks", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const hooks = await storage.getWebhooks();
      res.json(hooks);
    } catch {
      res.status(500).json({ message: "Failed to fetch webhooks" });
    }
  });

  app.post("/api/webhooks", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const data = insertWebhookSchema.parse({
        ...req.body,
        secret: req.body.secret || crypto.randomBytes(32).toString("hex"),
      });
      const hook = await storage.createWebhook(data);
      res.status(201).json(hook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create webhook" });
    }
  });

  app.patch("/api/webhooks/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates: Record<string, any> = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.url !== undefined) updates.url = req.body.url;
      if (req.body.events !== undefined) updates.events = req.body.events;
      if (typeof req.body.active === "boolean") updates.active = req.body.active;
      if (req.body.secret !== undefined) updates.secret = req.body.secret;

      const hook = await storage.updateWebhook(id, updates);
      if (!hook) return res.status(404).json({ message: "Webhook not found" });
      res.json(hook);
    } catch {
      res.status(500).json({ message: "Failed to update webhook" });
    }
  });

  app.delete("/api/webhooks/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWebhook(id);
      res.json({ message: "Webhook deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete webhook" });
    }
  });

  app.post("/api/webhooks/:id/test", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const hook = await storage.getWebhookById(id);
      if (!hook) return res.status(404).json({ message: "Webhook not found" });

      const testPayload = {
        event: "webhook.test",
        data: { message: "This is a test webhook delivery from Creations by Oracle CRM", timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      };
      const body = JSON.stringify(testPayload);
      const signature = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(hook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Webhook-Signature": signature, "X-Webhook-Event": "webhook.test" },
          body,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const duration = Date.now() - start;
        const respText = await resp.text().catch(() => "");
        const log = await storage.createWebhookLog({
          webhookId: hook.id,
          event: "webhook.test",
          payload: body,
          statusCode: resp.status,
          response: respText.substring(0, 2000),
          success: resp.ok,
          duration,
        });
        res.json({ success: resp.ok, statusCode: resp.status, duration, log });
      } catch (e: any) {
        const duration = Date.now() - start;
        const log = await storage.createWebhookLog({
          webhookId: hook.id,
          event: "webhook.test",
          payload: body,
          statusCode: 0,
          response: e?.message || "Connection failed",
          success: false,
          duration,
        });
        res.json({ success: false, statusCode: 0, duration, error: e?.message, log });
      }
    } catch {
      res.status(500).json({ message: "Failed to test webhook" });
    }
  });

  app.get("/api/webhooks/logs", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const webhookId = req.query.webhookId ? parseInt(req.query.webhookId as string) : undefined;
      const logs = await storage.getWebhookLogs(webhookId);
      res.json(logs);
    } catch {
      res.status(500).json({ message: "Failed to fetch webhook logs" });
    }
  });

  app.get("/api/webhooks/events", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    res.json(webhookEvents);
  });

  // ─── Dashboard Stats ──────────────────────────────────────────

  // ─── Art Stats Endpoint ───────────────────────────────────────
  app.get("/api/stats/art", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const stats = await storage.getArtStats();
      res.json(stats);
    } catch (e: any) {
      console.error("Art stats error:", e?.message);
      res.status(500).json({ message: "Failed to fetch art stats" });
    }
  });

  app.get("/api/stats", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const [allLeads, allPosts, allSubscribers, allNewsletters, allRatings, allBacklinks] = await Promise.all([
        storage.getLeads(),
        storage.getPosts(),
        storage.getSubscribers(),
        storage.getNewsletters(),
        storage.getAllRatings(),
        storage.getAllBacklinks(),
      ]);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentLeads = allLeads.filter(l => l.createdAt > thirtyDaysAgo);
      const delivered = allLeads.filter(l => l.status === "Delivered");
      const closed = allLeads.filter(l => l.status === "Closed" || l.status === "Delivered");
      const utmLeads = allLeads.filter(l => l.utmSource || l.utmCampaign);
      const pipelineStatuses = ["New Lead", "Sale Closed", "Claim Initiated", "RA Signed", "Loaner Assigned", "Vehicle In Shop", "Scoped", "Estimate Sent", "First Look", "Supplement Submitted", "Awaiting Approval", "Approved", "R&I", "PDR", "QC 1", "Reinstall", "QC 2", "Detail", "Ready for Delivery"];
      const pipelineLeads = allLeads.filter(l => pipelineStatuses.includes(l.status));
      const avgRating = allRatings.length > 0 ? allRatings.reduce((s, r) => s + r.score, 0) / allRatings.length : 0;
      const totalReads = allPosts.reduce((s, p) => s + (p.readCount || 0), 0);
      const totalShares = allPosts.reduce((s, p) => s + (p.shareCount || 0), 0);
      const totalClicks = allBacklinks.reduce((s, b) => s + (b.clicks || 0), 0);

      res.json({
        leads: {
          total: allLeads.length,
          new: allLeads.filter(l => l.status === "New Lead").length,
          recent: recentLeads.length,
          closed: closed.length,
        },
        posts: {
          total: allPosts.length,
          published: allPosts.filter(p => p.status === "published").length,
          drafts: allPosts.filter(p => p.status === "draft").length,
        },
        subscribers: {
          total: allSubscribers.length,
          active: allSubscribers.filter(s => s.status === "active").length,
        },
        newsletters: {
          total: allNewsletters.length,
          sent: allNewsletters.filter(n => n.status === "sent").length,
        },
        dyno: {
          rpm: recentLeads.length,
          rpmMax: Math.max(allLeads.length, 10),
          speed: allLeads.length > 0 ? Math.round((delivered.length / allLeads.length) * 100) : 0,
          temp: Math.round(avgRating * 20),
          tempRaw: Math.round(avgRating * 10) / 10,
          fuel: pipelineLeads.length,
          fuelMax: Math.max(allLeads.length, 10),
          boost: allLeads.length > 0 ? Math.round((utmLeads.length / allLeads.length) * 100) : 0,
          totalReads,
          totalShares,
          totalClicks,
          totalBacklinks: allBacklinks.length,
          publishedPosts: allPosts.filter(p => p.status === "published").length,
          activeSubscribers: allSubscribers.filter(s => s.status === "active").length,
          totalRatings: allRatings.length,
          deliveredCount: delivered.length,
        },
      });
    } catch {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ─── Rating / Sentiment Routes ─────────────────────────────

  app.get("/api/rate/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const score = parseInt(req.query.score as string);
      const leadId = req.query.leadId ? parseInt(req.query.leadId as string) : null;

      if (!score || score < 1 || score > 5) {
        return res.status(400).json({ message: "Invalid score" });
      }

      const existing = await storage.getRatingByToken(token);
      if (existing) {
        return res.redirect(`/rate/${token}?done=1`);
      }

      await storage.createRating({ leadId, score, token });
      res.redirect(`/rate/${token}?done=1&score=${score}`);
    } catch {
      res.status(500).json({ message: "Failed to submit rating" });
    }
  });

  app.get("/api/ratings", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const allRatings = await storage.getAllRatings();
      res.json(allRatings);
    } catch {
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  app.get("/api/ratings/summary", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const allRatings = await storage.getAllRatings();
      const total = allRatings.length;
      const avg = total > 0 ? allRatings.reduce((s, r) => s + r.score, 0) / total : 0;
      const distribution = [1, 2, 3, 4, 5].map(s => ({
        score: s,
        count: allRatings.filter(r => r.score === s).length,
      }));
      res.json({ total, average: Math.round(avg * 10) / 10, distribution });
    } catch {
      res.status(500).json({ message: "Failed to fetch rating summary" });
    }
  });

  // ─── Settings Routes ─────────────────────────────────────────

  // Explicit blog-services endpoint (also accessible via generic /:key below)
  app.get("/api/settings/blog-services", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const val = await storage.getSetting("blog_services");
      res.json({ key: "blog_services", value: val ?? null });
    } catch {
      res.status(500).json({ message: "Failed to fetch blog services" });
    }
  });

  app.put("/api/settings/blog-services", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { value } = req.body;
      if (typeof value !== "string") {
        return res.status(400).json({ message: "Value must be a string" });
      }
      // Validate that value is a JSON array of {title, description} objects
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        return res.status(400).json({ message: "Value must be valid JSON" });
      }
      if (!Array.isArray(parsed)) {
        return res.status(400).json({ message: "Value must be a JSON array" });
      }
      for (const item of parsed) {
        if (typeof item !== "object" || item === null) {
          return res.status(400).json({ message: "Each service entry must be an object" });
        }
        const entry = item as Record<string, unknown>;
        if (!("title" in entry) || typeof entry.title !== "string") {
          return res.status(400).json({ message: "Each service entry must have a title string" });
        }
        if ("description" in entry && typeof entry.description !== "string") {
          return res.status(400).json({ message: "Each service entry description must be a string" });
        }
      }
      await storage.setSetting("blog_services", value);
      res.json({ key: "blog_services", value });
    } catch {
      res.status(500).json({ message: "Failed to update blog services" });
    }
  });

  app.get("/api/settings/:key", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const val = await storage.getSetting(req.params.key);
      res.json({ key: req.params.key, value: val ?? null });
    } catch {
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.put("/api/settings/:key", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { value } = req.body;
      if (typeof value !== "string") {
        return res.status(400).json({ message: "Value must be a string" });
      }
      await storage.setSetting(req.params.key, value);
      res.json({ key: req.params.key, value });
    } catch {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // ─── Funnel Analytics Routes ──────────────────────────────────

  app.get("/api/analytics/funnel", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const allLeads = await storage.getLeads();
      const bySource: Record<string, { total: number; statuses: Record<string, number> }> = {};
      for (const lead of allLeads) {
        const source = lead.utmSource || "direct";
        if (!bySource[source]) bySource[source] = { total: 0, statuses: {} };
        bySource[source].total++;
        bySource[source].statuses[lead.status] = (bySource[source].statuses[lead.status] || 0) + 1;
      }
      const byCampaign: Record<string, { total: number; statuses: Record<string, number> }> = {};
      for (const lead of allLeads) {
        const campaign = lead.utmCampaign || "none";
        if (!byCampaign[campaign]) byCampaign[campaign] = { total: 0, statuses: {} };
        byCampaign[campaign].total++;
        byCampaign[campaign].statuses[lead.status] = (byCampaign[campaign].statuses[lead.status] || 0) + 1;
      }
      res.json({
        totalLeads: allLeads.length,
        bySource: Object.entries(bySource).map(([source, data]) => ({ source, ...data })),
        byCampaign: Object.entries(byCampaign).map(([campaign, data]) => ({ campaign, ...data })),
      });
    } catch {
      res.status(500).json({ message: "Failed to fetch funnel analytics" });
    }
  });

  // ─── Brand / Artist Settings (Public Read) ────────────────────

  app.get("/api/brand", async (_req, res) => {
    try {
      const keys = ["artist_name", "artist_tagline", "artist_email", "artist_instagram", "artist_twitter", "artist_facebook", "artist_tiktok"];
      const values: Record<string, string> = {};
      for (const key of keys) {
        const val = await storage.getSetting(key);
        if (val !== undefined) values[key] = val;
      }
      res.json(values);
    } catch {
      res.status(500).json({ message: "Failed to fetch brand settings" });
    }
  });

  app.put("/api/brand", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const allowed = ["artist_name", "artist_tagline", "artist_email", "artist_instagram", "artist_twitter", "artist_facebook", "artist_tiktok"];
      const updates = req.body as Record<string, unknown>;
      for (const key of Object.keys(updates)) {
        if (!allowed.includes(key)) {
          return res.status(400).json({ message: `Invalid brand key: ${key}` });
        }
        if (typeof updates[key] !== "string") {
          return res.status(400).json({ message: `Value for ${key} must be a string` });
        }
      }
      for (const [key, value] of Object.entries(updates)) {
        await storage.setSetting(key, value as string);
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to update brand settings" });
    }
  });

  // ─── SEO Management Routes ────────────────────────────────────

  app.get("/api/seo/og-image", async (_req, res) => {
    try {
      const globalRaw = await storage.getSetting("seo_global");
      if (globalRaw) {
        const global = JSON.parse(globalRaw);
        return res.json({ ogImageUrl: global.ogImageUrl || "/og-image.png" });
      }
      res.json({ ogImageUrl: "/og-image.png" });
    } catch {
      res.json({ ogImageUrl: "/og-image.png" });
    }
  });

  app.get("/api/seo", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const [globalRaw, pagesRaw, keywordsRaw] = await Promise.all([
        storage.getSetting("seo_global"),
        storage.getSetting("seo_pages"),
        storage.getSetting("seo_keywords"),
      ]);
      const parseSafe = (raw: string | null) => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } };
      res.json({
        global: parseSafe(globalRaw),
        pages: parseSafe(pagesRaw),
        keywords: parseSafe(keywordsRaw),
      });
    } catch {
      res.status(500).json({ message: "Failed to fetch SEO settings" });
    }
  });

  app.put("/api/seo", authMiddleware, requireRole("root"), async (req, res) => {
    try {
      const { key, value } = req.body;
      const allowed = ["seo_global", "seo_pages", "seo_keywords"];
      if (!allowed.includes(key)) {
        return res.status(400).json({ message: "Invalid SEO key" });
      }
      await storage.setSetting(key, JSON.stringify(value));
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to update SEO setting" });
    }
  });

  // ─── Services CRUD ──────────────────────────────────────────────

  app.get("/api/services/public", async (_req, res) => {
    try {
      const all = await storage.getServices();
      res.json(all.filter((s) => s.isActive).sort((a, b) => a.displayOrder - b.displayOrder));
    } catch {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/by-slug/:slug", async (req, res) => {
    try {
      const slug = `/${req.params.slug}`;
      const all = await storage.getServices();
      const service = all.find((s) => s.isActive && s.slug === slug);
      if (!service) return res.status(404).json({ message: "Service not found" });
      res.json(service);
    } catch {
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.get("/api/services", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const all = await storage.getServices();
      res.json(all);
    } catch {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/services", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { title } = req.body;
      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }
      const all = await storage.getServices();
      const maxOrder = all.length > 0 ? Math.max(...all.map(s => s.displayOrder)) : -1;
      const service = await storage.createService({
        title: title.trim(),
        badge: "",
        header: "",
        description: "",
        keyDetails: [],
        showPrice: false,
        price: null,
        isActive: true,
        displayOrder: maxOrder + 1,
      });
      res.status(201).json(service);
    } catch {
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.patch("/api/services/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid service ID" });
      }
      const patchSchema = z.object({
        title: z.string().min(1).optional(),
        badge: z.string().optional(),
        header: z.string().optional(),
        description: z.string().optional(),
        keyDetails: z.array(z.string()).optional(),
        icon: z.string().optional(),
        slug: z.string().optional(),
        accentColor: z.string().optional(),
        showPrice: z.boolean().optional(),
        price: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().int().optional(),
      });
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid fields", errors: parsed.error.errors });
      }
      const updates = parsed.data as Record<string, any>;
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      const service = await storage.updateService(id, updates);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch {
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid service ID" });
      }
      const existing = await storage.getServiceById(id);
      if (!existing) {
        return res.status(404).json({ message: "Service not found" });
      }
      await storage.deleteService(id);
      res.json({ message: "Service deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // ─── AI Service Content Generation ─────────────────────────────

  app.post("/api/ai/service-content", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { serviceTitle, description, generateDescription, generatePricing, generateKeyDetails } = req.body;
      if (!serviceTitle) {
        return res.status(400).json({ message: "serviceTitle is required" });
      }
      if (!generateDescription && !generatePricing && !generateKeyDetails) {
        return res.status(400).json({ message: "At least one generation toggle must be enabled" });
      }

      const parts: string[] = [];
      if (generateDescription) parts.push("description");
      if (generatePricing) parts.push("pricing");
      if (generateKeyDetails) parts.push("keyDetails");

      const systemPrompt = `You are a marketing copywriter for Creations by Oracle, an independent contemporary artist. Write professional, confident copy about art services and offerings. No exclamation points. No hype. Use clear, evocative language.`;

      const userPrompt = `Write marketing copy for the following service: "${serviceTitle}"
${description ? `Current description for context: ${description}` : ""}

Generate only the requested fields. Respond in this exact JSON format:
{
  ${generateDescription ? `"description": "3-5 sentences of professional marketing copy describing the service, its value, and the quality of work.",` : ""}
  ${generatePricing ? `"price": "A natural free-text pricing note (e.g. 'Starting at $8/sq ft — final quote based on scope and materials'). Keep it short.",` : ""}
  ${generateKeyDetails ? `"keyDetails": ["Feature bullet 1", "Feature bullet 2", "Feature bullet 3", "Feature bullet 4", "Feature bullet 5"]` : ""}
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1024,
      });

      const raw = response.choices[0]?.message?.content || "{}";
      let result: { description?: string; price?: string; keyDetails?: string[] };
      try {
        result = JSON.parse(raw);
      } catch {
        result = {};
      }

      res.json({
        description: generateDescription ? (result.description || "") : undefined,
        price: generatePricing ? (result.price || "") : undefined,
        keyDetails: generateKeyDetails ? (Array.isArray(result.keyDetails) ? result.keyDetails : []) : undefined,
      });
    } catch {
      res.status(500).json({ message: "Failed to generate service content" });
    }
  });

  // ─── Gallery Routes (public) ──────────────────────────────────

  app.get("/api/gallery", async (_req, res) => {
    try {
      const gallery = await storage.getPublicGallery();
      res.json(gallery);
    } catch {
      res.status(500).json({ message: "Failed to fetch gallery" });
    }
  });

  app.get("/api/gallery/admin", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const gallery = await storage.getAdminGallery();
      res.json(gallery);
    } catch {
      res.status(500).json({ message: "Failed to fetch admin gallery" });
    }
  });

  // ─── Gallery Section Management (root + admin) ────────────────

  app.get("/api/gallery/sections", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const sections = await storage.getGallerySections();
      res.json(sections);
    } catch {
      res.status(500).json({ message: "Failed to fetch gallery sections" });
    }
  });

  app.post("/api/gallery/sections", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { name, displayOrder, isActive } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Section name is required" });
      }
      const section = await storage.createGallerySection({
        name,
        displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
        isActive: isActive !== false,
      });
      res.status(201).json(section);
    } catch {
      res.status(500).json({ message: "Failed to create gallery section" });
    }
  });

  app.patch("/api/gallery/sections/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const updates: Record<string, any> = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (typeof req.body.displayOrder === "number") updates.displayOrder = req.body.displayOrder;
      if (typeof req.body.isActive === "boolean") updates.isActive = req.body.isActive;
      const section = await storage.updateGallerySection(id, updates);
      if (!section) return res.status(404).json({ message: "Section not found" });
      res.json(section);
    } catch {
      res.status(500).json({ message: "Failed to update gallery section" });
    }
  });

  app.delete("/api/gallery/sections/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteGallerySection(id);
      res.json({ message: "Section deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete gallery section" });
    }
  });

  // ─── Gallery Item Management (root + admin) ───────────────────

  app.post("/api/gallery/items", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { sectionId, src, alt, badge, displayOrder, isActive } = req.body;
      if (!sectionId || !src || !alt) {
        return res.status(400).json({ message: "sectionId, src, and alt are required" });
      }
      const item = await storage.createGalleryItem({
        sectionId: parseInt(sectionId),
        src,
        alt,
        badge: badge || null,
        displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
        isActive: isActive !== false,
      });
      res.status(201).json(item);
    } catch {
      res.status(500).json({ message: "Failed to create gallery item" });
    }
  });

  app.patch("/api/gallery/items/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const updates: Record<string, any> = {};
      if (req.body.src !== undefined) updates.src = req.body.src;
      if (req.body.alt !== undefined) updates.alt = req.body.alt;
      if (req.body.badge !== undefined) updates.badge = req.body.badge || null;
      if (typeof req.body.displayOrder === "number") updates.displayOrder = req.body.displayOrder;
      if (typeof req.body.isActive === "boolean") updates.isActive = req.body.isActive;
      if (typeof req.body.sectionId === "number") updates.sectionId = req.body.sectionId;
      const item = await storage.updateGalleryItem(id, updates);
      if (!item) return res.status(404).json({ message: "Item not found" });
      res.json(item);
    } catch {
      res.status(500).json({ message: "Failed to update gallery item" });
    }
  });

  app.delete("/api/gallery/items/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteGalleryItem(id);
      res.json({ message: "Item deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete gallery item" });
    }
  });

  // ─── Artwork Routes ──────────────────────────────────────────────

  app.get("/api/artworks", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const allArtworks = await storage.getArtworks(status);
      res.json(allArtworks);
    } catch {
      res.status(500).json({ message: "Failed to fetch artworks" });
    }
  });

  app.get("/api/artworks/:idOrSlug", async (req, res) => {
    try {
      const param = req.params.idOrSlug;
      const id = parseInt(param);
      const artwork = isNaN(id) ? await storage.getArtworkBySlug(param) : await storage.getArtworkById(id);
      if (!artwork) return res.status(404).json({ message: "Artwork not found" });
      res.json(artwork);
    } catch {
      res.status(500).json({ message: "Failed to fetch artwork" });
    }
  });

  app.post("/api/artworks/bulk", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const items = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Request body must be a non-empty array of artworks" });
      }
      if (items.length > 50) {
        return res.status(400).json({ message: "Maximum 50 artworks per request" });
      }
      const bulkItemSchema = insertArtworkSchema.omit({ slug: true }).extend({
        title: z.string().min(1),
        category: z.enum(artworkCategories).optional().default("Abstract"),
        forSale: z.boolean().optional().default(false),
        featured: z.boolean().optional().default(false),
        status: z.enum(artworkStatuses).optional().default("draft"),
      });
      const bulkSchema = z.array(bulkItemSchema);
      const parsed = bulkSchema.safeParse(items);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
      }
      // Pre-generate unique slugs before the transaction
      const artworkItems: Parameters<typeof storage.bulkCreateArtworks>[0] = [];
      const usedSlugs = new Set<string>();
      for (const item of parsed.data) {
        let base = slugify(item.title);
        let slug = base;
        let counter = 1;
        // Check both in-batch duplicates and existing DB records
        while (usedSlugs.has(slug) || await storage.getArtworkBySlug(slug)) {
          slug = `${base}-${counter++}`;
        }
        usedSlugs.add(slug);
        artworkItems.push({
          title: item.title,
          slug,
          medium: item.medium || "",
          dimensions: item.dimensions || "",
          year: item.year || null,
          description: item.description || "",
          imageUrl: item.imageUrl || "",
          enhancedImageUrl: null,
          price: item.price ? String(item.price) : null,
          forSale: item.forSale ?? false,
          sold: false,
          status: (item.status as string) || "draft",
          category: item.category || "Abstract",
          featured: item.featured ?? false,
          seoTitle: null,
          seoDescription: null,
          seoKeywords: [],
          publishedAt: null,
        });
      }
      const created = await storage.bulkCreateArtworks(artworkItems);
      res.status(201).json({ created: created.length, artworks: created });
    } catch (e: any) {
      console.error("Bulk artwork import error:", e?.message);
      res.status(500).json({ message: "Failed to bulk import artworks" });
    }
  });

  app.post("/api/artworks", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const { title, medium, dimensions, year, description, imageUrl, enhancedImageUrl, price, forSale, category, featured, seoTitle, seoDescription, seoKeywords } = req.body;
      if (!title) return res.status(400).json({ message: "Title is required" });
      let slug = slugify(title);
      const existing = await storage.getArtworkBySlug(slug);
      if (existing) slug = slug + "-" + Date.now().toString(36);
      const artwork = await storage.createArtwork({
        title,
        slug,
        medium: medium || "",
        dimensions: dimensions || "",
        year: year || null,
        description: description || "",
        imageUrl: imageUrl || "",
        enhancedImageUrl: enhancedImageUrl || null,
        price: price ? String(price) : null,
        forSale: forSale ?? false,
        sold: false,
        status: "draft",
        category: category || "Abstract",
        featured: featured ?? false,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoKeywords: seoKeywords || [],
        publishedAt: null,
      });
      res.status(201).json(artwork);
    } catch {
      res.status(500).json({ message: "Failed to create artwork" });
    }
  });

  app.patch("/api/artworks/:id", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid artwork ID" });
      const fields = ["title", "medium", "dimensions", "year", "description", "imageUrl", "enhancedImageUrl", "price", "forSale", "sold", "status", "category", "featured", "seoTitle", "seoDescription", "seoKeywords", "stripeProductId", "stripePriceId"];
      const updates: Record<string, any> = {};
      for (const f of fields) {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      }
      if (updates.status === "published") {
        const existing = await storage.getArtworkById(id);
        if (existing && !existing.publishedAt) {
          updates.publishedAt = new Date();
          // Auto-create page registry entry
          const existing2 = await storage.getArtworkById(id);
          const artworkSlug = `shop/${existing2?.slug || id}`;
          const existingPage = await storage.getPageBySlug(artworkSlug);
          if (!existingPage && existing2) {
            const page = await storage.createPage({
              slug: artworkSlug,
              title: existing2.title,
              pageType: "artwork",
              seoTitle: existing2.seoTitle || existing2.title,
              seoDescription: existing2.seoDescription || existing2.description.substring(0, 155),
              seoKeywords: existing2.seoKeywords || [],
              status: "published",
              linkedEntityId: id,
              linkedEntityType: "artwork",
            });
            updates.pageRegistryId = page.id;
          }
        }
      }
      if (updates.title) {
        const slug2 = slugify(updates.title);
        const existingSlug = await storage.getArtworkBySlug(slug2);
        updates.slug = (existingSlug && existingSlug.id !== id) ? slug2 + "-" + Date.now().toString(36) : slug2;
      }
      const artwork = await storage.updateArtwork(id, updates);
      if (!artwork) return res.status(404).json({ message: "Artwork not found" });
      if (updates.status === "published") {
        fireWebhooks("artwork.published", { id: artwork.id, title: artwork.title, slug: artwork.slug, category: artwork.category });
      }
      res.json(artwork);
    } catch {
      res.status(500).json({ message: "Failed to update artwork" });
    }
  });

  app.delete("/api/artworks/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid artwork ID" });
      await storage.deleteArtwork(id);
      res.json({ message: "Artwork deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete artwork" });
    }
  });

  app.post("/api/artworks/:id/view", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!isNaN(id)) await storage.incrementArtworkViewCount(id);
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  });

  // ─── Image Upload ──────────────────────────────────────────────

  app.post("/api/upload", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const { imageData, filename } = req.body;
      if (!imageData) return res.status(400).json({ message: "imageData is required" });
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const ext = imageData.match(/data:image\/(\w+);/)?.[1] || "jpg";
      const safeName = (filename || `upload-${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, "-") + "." + ext;
      const uploadDir = path.join(process.cwd(), "client", "public", "uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, safeName);
      fs.writeFileSync(filePath, buffer);
      res.json({ url: `/uploads/${safeName}` });
    } catch (e: any) {
      res.status(500).json({ message: "Upload failed", error: e?.message });
    }
  });

  // ─── AI Artwork Enhancement & Description ────────────────────

  app.post("/api/ai/enhance-artwork", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const { imageUrl, title, medium, dimensions } = req.body;
      if (!imageUrl) return res.status(400).json({ message: "imageUrl is required" });

      // Build absolute URL for the image if it's a relative path
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEPLOYMENT_URL
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : "http://localhost:5000";
      const absoluteImageUrl = imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: absoluteImageUrl, detail: "high" },
              },
              {
                type: "text",
                text: `You are an expert art curator and writer. Analyze this artwork${title ? ` titled "${title}"` : ""}${medium ? ` created in ${medium}` : ""}${dimensions ? ` with dimensions ${dimensions}` : ""}.

Generate comprehensive artwork metadata. Respond in JSON:
{
  "description": "2-3 paragraph artistic description covering composition, technique, emotional impact, and what makes this work unique. No exclamation points.",
  "seoTitle": "SEO title under 60 chars (artwork title + medium)",
  "seoDescription": "Compelling meta description 140-155 chars for collectors and art lovers",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
  "captureScore": 85,
  "captureNotes": "Assessment of image quality for listing purposes",
  "suggestedPrice": 2500
}

For captureScore: 0-100 rating of how well the photo captures the artwork for online sale.
For suggestedPrice: Based on apparent medium, size, and complexity — suggest a fair market price in USD.`,
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1024,
      });

      const raw = response.choices[0]?.message?.content || "{}";
      let result: { description?: string; seoTitle?: string; seoDescription?: string; seoKeywords?: string[]; captureScore?: number; captureNotes?: string; suggestedPrice?: number };
      try {
        result = JSON.parse(raw);
      } catch {
        result = {};
      }

      res.json(result);
    } catch (e: any) {
      console.error("AI enhance error:", e?.message);
      res.status(500).json({ message: "AI analysis failed", error: e?.message });
    }
  });

  // ─── AI Capture Guidance ──────────────────────────────────────

  app.post("/api/ai/capture-guidance", authMiddleware, requireRole("root", "admin", "editor"), async (req, res) => {
    try {
      const { imageData } = req.body;
      if (!imageData) return res.status(400).json({ message: "imageData is required" });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageData, detail: "low" },
              },
              {
                type: "text",
                text: `You are helping an artist capture a photo of their artwork for sale online. Analyze this camera preview image and provide real-time guidance.

Respond in JSON:
{
  "score": 72,
  "ready": false,
  "issues": ["Too close — step back to show full artwork", "Lighting uneven on right side"],
  "tips": ["Move camera back until the full piece is visible", "Turn on room lights or open blinds"],
  "frameGuide": "center"
}

score: 0-100 photo quality score for artwork listing
ready: true if score >= 80 and no major issues
issues: list of current problems (max 3, be specific)
tips: actionable steps to fix (max 2)
frameGuide: "center", "move_left", "move_right", "move_up", "move_down", "zoom_out", "zoom_in"`,
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 256,
      });

      const raw = response.choices[0]?.message?.content || "{}";
      let result;
      try { result = JSON.parse(raw); } catch { result = { score: 50, ready: false, issues: ["Could not analyze"], tips: ["Try again"], frameGuide: "center" }; }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: "Guidance failed", error: e?.message });
    }
  });

  // ─── Analytics Events ─────────────────────────────────────────

  app.post("/api/analytics/event", async (req, res) => {
    try {
      const { page, eventType, sessionId, referrer, utmSource, utmMedium, utmCampaign, metadata } = req.body;
      if (!page || !eventType) return res.status(400).json({ message: "page and eventType required" });
      await storage.trackEvent({ page, eventType, sessionId, referrer, utmSource, utmMedium, utmCampaign, metadata });
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  });

  app.get("/api/analytics/summary", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const summary = await storage.getAnalyticsSummary(days);
      res.json(summary);
    } catch {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ─── Page Registry ────────────────────────────────────────────

  app.get("/api/pages", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const pages = await storage.getPageRegistry();
      res.json(pages);
    } catch {
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  app.post("/api/pages", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const { slug, title, pageType, seoTitle, seoDescription, seoKeywords, status, linkedEntityId, linkedEntityType } = req.body;
      if (!slug || !title) return res.status(400).json({ message: "slug and title required" });
      const page = await storage.createPage({ slug, title, pageType: pageType || "static", seoTitle, seoDescription, seoKeywords, status: status || "published", linkedEntityId, linkedEntityType });
      res.status(201).json(page);
    } catch {
      res.status(500).json({ message: "Failed to create page" });
    }
  });

  app.patch("/api/pages/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid page ID" });
      const fields = ["slug", "title", "pageType", "seoTitle", "seoDescription", "seoKeywords", "status"];
      const updates: Record<string, any> = {};
      for (const f of fields) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }
      const page = await storage.updatePage(id, updates);
      if (!page) return res.status(404).json({ message: "Page not found" });
      res.json(page);
    } catch {
      res.status(500).json({ message: "Failed to update page" });
    }
  });

  app.delete("/api/pages/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid page ID" });
      await storage.deletePage(id);
      res.json({ message: "Page deleted" });
    } catch {
      res.status(500).json({ message: "Failed to delete page" });
    }
  });

  // ─── Sitemap & Robots ─────────────────────────────────────────

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEPLOYMENT_URL
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : "http://localhost:5000";

      const pages = await storage.getPageRegistry();
      const seen = new Set<string>();
      const entries: { loc: string; lastmod: string; priority: string; changefreq: string }[] = [];

      for (const page of pages) {
        if (page.status !== "published") continue;
        const loc = page.slug === "" ? "/" : `/${page.slug}`;
        if (seen.has(loc)) continue;
        seen.add(loc);

        let priority = "0.6";
        let changefreq = "weekly";
        if (page.pageType === "artwork") {
          priority = "0.8";
          changefreq = "monthly";
        } else if (page.pageType === "blog" || page.pageType === "post") {
          priority = "0.7";
          changefreq = "monthly";
        }

        entries.push({
          loc,
          lastmod: (page.updatedAt || page.createdAt).toISOString().split("T")[0],
          priority,
          changefreq,
        });
      }

      const urls = entries.map(
        (p) => `  <url>\n    <loc>${baseUrl}${p.loc}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
      );

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (e: any) {
      res.status(500).send("Failed to generate sitemap");
    }
  });

  app.get("/robots.txt", (_req, res) => {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DEPLOYMENT_URL
      ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
      : "http://localhost:5000";

    res.set("Content-Type", "text/plain");
    res.send(`User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  // ─── Stripe Checkout ──────────────────────────────────────────

  app.post("/api/checkout", async (req, res) => {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(503).json({ message: "Checkout is temporarily unavailable. Please try again later or contact us directly to inquire about this artwork." });
      }
      const Stripe = require("stripe");
      const stripe = new Stripe(stripeKey);

      const { artworkId, buyerName, buyerEmail, shippingAddress } = req.body;
      if (!artworkId) return res.status(400).json({ message: "artworkId required" });
      const artwork = await storage.getArtworkById(parseInt(artworkId));
      if (!artwork) return res.status(404).json({ message: "Artwork not found" });
      if (!artwork.forSale || artwork.sold) return res.status(400).json({ message: "Artwork not available for purchase" });
      if (!artwork.price) return res.status(400).json({ message: "Artwork has no price set" });

      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEPLOYMENT_URL
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : "http://localhost:5000";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: artwork.title,
              description: artwork.description.substring(0, 200) || `Original artwork — ${artwork.medium}`,
              images: artwork.enhancedImageUrl ? [artwork.enhancedImageUrl.startsWith("http") ? artwork.enhancedImageUrl : `${baseUrl}${artwork.enhancedImageUrl}`] : artwork.imageUrl ? [artwork.imageUrl.startsWith("http") ? artwork.imageUrl : `${baseUrl}${artwork.imageUrl}`] : [],
            },
            unit_amount: Math.round(parseFloat(String(artwork.price)) * 100),
          },
          quantity: 1,
        }],
        customer_email: buyerEmail || undefined,
        metadata: { artworkId: String(artwork.id), buyerName: buyerName || "", shippingAddress: shippingAddress || "" },
        success_url: `${baseUrl}/shop/${artwork.slug}?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/shop/${artwork.slug}?cancelled=true`,
      });

      // Pre-create order record
      if (buyerEmail && buyerName) {
        await storage.createOrder({
          artworkId: artwork.id,
          buyerName,
          buyerEmail,
          amount: String(artwork.price),
          stripeSessionId: session.id,
          shippingAddress: shippingAddress || null,
        });
      }

      res.json({ url: session.url, sessionId: session.id });
    } catch (e: any) {
      console.error("Checkout error:", e?.message);
      res.status(500).json({ message: "Failed to create checkout session", error: e?.message });
    }
  });

  app.post("/api/checkout/webhook", async (req, res) => {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!stripeKey) return res.status(200).json({ received: true });

      const Stripe = require("stripe");
      const stripe = new Stripe(stripeKey);
      let event;

      if (webhookSecret) {
        const sig = req.headers["stripe-signature"];
        try {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch {
          return res.status(400).json({ message: "Webhook signature invalid" });
        }
      } else {
        event = req.body;
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const artworkId = parseInt(session.metadata?.artworkId);
        if (artworkId) {
          await storage.updateArtwork(artworkId, { sold: true });
          const order = await storage.getOrderBySessionId(session.id);
          if (order) {
            await storage.updateOrder(order.id, { status: "paid", stripePaymentIntentId: session.payment_intent });
          }
          await storage.trackEvent({ page: `/shop`, eventType: "purchase", metadata: JSON.stringify({ artworkId, sessionId: session.id }) });
          fireWebhooks("order.created", { artworkId, sessionId: session.id, amount: session.amount_total });
        }

        // Handle commission deposit payments
        if (session.metadata?.commissionType === "deposit") {
          const commission = await storage.getCommissionBySessionId(session.id);
          if (commission) {
            await storage.updateCommission(commission.id, {
              status: "deposit_paid",
              stripePaymentIntentId: session.payment_intent,
            });
            // Send confirmation emails
            try {
              const baseUrl = process.env.REPLIT_DEV_DOMAIN
                ? `https://${process.env.REPLIT_DEV_DOMAIN}`
                : process.env.REPLIT_DEPLOYMENT_URL
                ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
                : "http://localhost:5000";
              const { client, fromEmail } = await getResendClient();
              const totalPrice = parseFloat(commission.totalPrice);
              const depositAmount = parseFloat(commission.depositAmount);
              await client.emails.send({
                from: fromEmail,
                to: commission.customerEmail,
                subject: "Deposit Received — Commission Confirmed",
                html: buildCollectorEmail({ commission, totalPrice, depositAmount, baseUrl }),
              });
              const artistEmail = await storage.getSetting("artist_email");
              if (artistEmail) {
                await client.emails.send({
                  from: fromEmail,
                  to: artistEmail,
                  subject: `Deposit Paid — Commission #${commission.id} from ${commission.customerName}`,
                  html: buildArtistEmail({ commission, totalPrice, depositAmount }),
                });
              }
            } catch (emailErr: any) {
              console.error("Commission deposit email error:", emailErr?.message);
            }
          }
        }
      }
      res.json({ received: true });
    } catch (e: any) {
      res.status(500).json({ message: "Webhook error" });
    }
  });

  app.get("/api/orders", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const allOrders = await storage.getOrders();
      res.json(allOrders);
    } catch {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // ─── Commission Pricing ──────────────────────────────────────────

  app.get("/api/commission/pricing", async (_req, res) => {
    try {
      const [matrixRaw, addonsRaw, subjectFeesRaw] = await Promise.all([
        storage.getSetting("commission_price_matrix"),
        storage.getSetting("commission_format_addons"),
        storage.getSetting("commission_subject_fees"),
      ]);

      const { DEFAULT_COMMISSION_PRICE_MATRIX, DEFAULT_COMMISSION_FORMAT_ADDONS, DEFAULT_COMMISSION_SUBJECT_FEES } = await import("@shared/schema");

      const matrix = matrixRaw ? JSON.parse(matrixRaw) : DEFAULT_COMMISSION_PRICE_MATRIX;
      const addons = addonsRaw ? JSON.parse(addonsRaw) : DEFAULT_COMMISSION_FORMAT_ADDONS;
      const subjectFees = subjectFeesRaw ? JSON.parse(subjectFeesRaw) : DEFAULT_COMMISSION_SUBJECT_FEES;

      res.json({ matrix, addons, subjectFees });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch pricing" });
    }
  });

  // ─── Commission Submission ────────────────────────────────────────

  app.post("/api/commissions", async (req, res) => {
    try {
      const {
        style, size, format, extraSubjects,
        referenceImageUrls, notes,
        customerName, customerEmail, customerPhone,
      } = req.body;

      if (!style || !size || !format || !customerName || !customerEmail) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Load pricing matrix from settings
      const [matrixRaw, addonsRaw, subjectFeesRaw] = await Promise.all([
        storage.getSetting("commission_price_matrix"),
        storage.getSetting("commission_format_addons"),
        storage.getSetting("commission_subject_fees"),
      ]);

      const { DEFAULT_COMMISSION_PRICE_MATRIX, DEFAULT_COMMISSION_FORMAT_ADDONS, DEFAULT_COMMISSION_SUBJECT_FEES } = await import("@shared/schema");
      const matrix = matrixRaw ? JSON.parse(matrixRaw) : DEFAULT_COMMISSION_PRICE_MATRIX;
      const addons = addonsRaw ? JSON.parse(addonsRaw) : DEFAULT_COMMISSION_FORMAT_ADDONS;
      const subjectFees = subjectFeesRaw ? JSON.parse(subjectFeesRaw) : DEFAULT_COMMISSION_SUBJECT_FEES;

      const basePrice = matrix[style]?.[size];
      if (basePrice === undefined) {
        return res.status(400).json({ message: "Invalid style or size" });
      }

      const formatAddon = addons[format]?.[size] || 0;
      const subjectFeePerExtra = subjectFees[style]?.[size] || 0;
      const numExtra = Math.max(0, parseInt(String(extraSubjects || 0)));
      const subjectFee = subjectFeePerExtra * numExtra;
      const totalPrice = basePrice + formatAddon + subjectFee;
      const depositAmount = Math.round(totalPrice * 50) / 100; // 50% deposit

      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEPLOYMENT_URL
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : "http://localhost:5000";

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        // No Stripe configured — save commission, return success without payment
        const commission = await storage.createCommission({
          style, size, format,
          extraSubjects: numExtra,
          basePrice: String(basePrice),
          formatAddon: String(formatAddon),
          subjectFee: String(subjectFee),
          totalPrice: String(totalPrice),
          depositAmount: String(depositAmount),
          referenceImageUrls: referenceImageUrls || [],
          notes: notes || null,
          customerName,
          customerEmail,
          customerPhone: customerPhone || null,
          status: "awaiting_deposit",
        });

        // Send notification email without payment
        try {
          const { client, fromEmail } = await getResendClient();
          await client.emails.send({
            from: fromEmail,
            to: customerEmail,
            subject: "Commission Request Received — Creations by Oracle",
            html: buildCollectorEmail({ commission, totalPrice, depositAmount, baseUrl }),
          });
          const artistEmail = await storage.getSetting("artist_email");
          if (artistEmail) {
            await client.emails.send({
              from: fromEmail,
              to: artistEmail,
              subject: `New Commission Request — ${style} ${size} from ${customerName}`,
              html: buildArtistEmail({ commission, totalPrice, depositAmount }),
            });
          }
        } catch (emailErr: any) {
          console.error("Commission email error:", emailErr?.message);
        }

        return res.status(201).json({ commission, requiresPayment: false });
      }

      // Stripe is configured — create checkout session
      const Stripe = require("stripe");
      const stripe = new Stripe(stripeKey);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `${style} Portrait Commission — ${size}`,
              description: `50% deposit for ${format} format${numExtra > 0 ? `, ${numExtra} extra subject${numExtra > 1 ? "s" : ""}` : ""}. Remaining balance due on completion.`,
            },
            unit_amount: Math.round(depositAmount * 100),
          },
          quantity: 1,
        }],
        customer_email: customerEmail,
        metadata: {
          commissionType: "deposit",
          style, size, format,
          extraSubjects: String(numExtra),
          customerName,
          customerEmail,
          totalPrice: String(totalPrice),
          depositAmount: String(depositAmount),
        },
        success_url: `${baseUrl}/commission?deposited=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/commission?cancelled=true`,
      });

      // Persist commission record
      const commission = await storage.createCommission({
        style, size, format,
        extraSubjects: numExtra,
        basePrice: String(basePrice),
        formatAddon: String(formatAddon),
        subjectFee: String(subjectFee),
        totalPrice: String(totalPrice),
        depositAmount: String(depositAmount),
        referenceImageUrls: referenceImageUrls || [],
        notes: notes || null,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        stripeSessionId: session.id,
        status: "awaiting_deposit",
      });

      res.json({ url: session.url, sessionId: session.id, commissionId: commission.id, requiresPayment: true });
    } catch (e: any) {
      console.error("Commission create error:", e?.message);
      res.status(500).json({ message: "Failed to create commission", error: e?.message });
    }
  });

  app.get("/api/commissions", authMiddleware, requireRole("root", "admin"), async (_req, res) => {
    try {
      const all = await storage.getCommissions();
      res.json(all);
    } catch {
      res.status(500).json({ message: "Failed to fetch commissions" });
    }
  });

  app.get("/api/commissions/:id", authMiddleware, requireRole("root", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const commission = await storage.getCommissionById(id);
      if (!commission) return res.status(404).json({ message: "Commission not found" });
      res.json(commission);
    } catch {
      res.status(500).json({ message: "Failed to fetch commission" });
    }
  });

  return httpServer;
}

// Email template helpers
function buildCollectorEmail({ commission, totalPrice, depositAmount, baseUrl }: { commission: Commission; totalPrice: number; depositAmount: number; baseUrl: string }) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0B0B0D; color: #F5F5F7; padding: 40px 24px; border-radius: 8px;">
      <p style="color: #C084FC; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 24px;">Creations by Oracle</p>
      <h2 style="font-size: 24px; font-weight: 300; margin: 0 0 8px 0; font-family: Georgia, serif;">Your Commission Request</h2>
      <p style="color: #B3B3B8; font-size: 14px; line-height: 1.6; margin-bottom: 28px;">Thank you, ${commission.customerName.split(" ")[0]}. We've received your commission request and will be in touch shortly to confirm details.</p>
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 20px; margin-bottom: 28px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">Style</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${commission.style}</td></tr>
          <tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">Size</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${commission.size}</td></tr>
          <tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">Format</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${commission.format}</td></tr>
          ${commission.extraSubjects > 0 ? `<tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">Extra Subjects</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${commission.extraSubjects}</td></tr>` : ""}
          <tr><td style="color: #C084FC; font-size: 13px; font-weight: 600; padding: 10px 0 6px;">Total</td><td style="color: #C084FC; font-size: 13px; font-weight: 600; padding: 10px 0 6px; text-align: right;">$${totalPrice.toLocaleString()}</td></tr>
          <tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0;">Deposit Due (50%)</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; text-align: right;">$${depositAmount.toLocaleString()}</td></tr>
        </table>
      </div>
      <p style="color: #B3B3B8; font-size: 12px; line-height: 1.6;">Questions? Reply to this email or visit <a href="${baseUrl}/contact" style="color: #C084FC;">creations by oracle</a>.</p>
    </div>
  `;
}

function buildArtistEmail({ commission, totalPrice, depositAmount }: { commission: Commission; totalPrice: number; depositAmount: number }) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0B0B0D; color: #F5F5F7; padding: 40px 24px; border-radius: 8px;">
      <p style="color: #C084FC; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 24px;">New Commission</p>
      <h2 style="font-size: 24px; font-weight: 300; margin: 0 0 24px 0; font-family: Georgia, serif;">${commission.style} — ${commission.size}</h2>
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 20px; margin-bottom: 28px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">Customer</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${commission.customerName}</td></tr>
          <tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">Email</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${commission.customerEmail}</td></tr>
          ${commission.customerPhone ? `<tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">Phone</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${commission.customerPhone}</td></tr>` : ""}
          <tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">Format</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${commission.format}</td></tr>
          ${commission.extraSubjects > 0 ? `<tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">Extra Subjects</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${commission.extraSubjects}</td></tr>` : ""}
          ${commission.notes ? `<tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);" colspan="2">Notes: ${commission.notes}</td></tr>` : ""}
          <tr><td style="color: #C084FC; font-size: 13px; font-weight: 600; padding: 10px 0 6px;">Total</td><td style="color: #C084FC; font-size: 13px; font-weight: 600; padding: 10px 0 6px; text-align: right;">$${totalPrice.toLocaleString()}</td></tr>
          <tr><td style="color: #B3B3B8; font-size: 12px; padding: 6px 0;">Deposit (50%)</td><td style="color: #F5F5F7; font-size: 12px; padding: 6px 0; text-align: right;">$${depositAmount.toLocaleString()}</td></tr>
        </table>
      </div>
      ${commission.referenceImageUrls?.length > 0 ? `<p style="color: #B3B3B8; font-size: 12px;">Reference images: ${commission.referenceImageUrls.length} uploaded</p>` : ""}
    </div>
  `;
}
