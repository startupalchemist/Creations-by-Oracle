import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Users,
  FileText,
  Mail,
  BarChart3,
  Plus,
  Trash2,
  Send,
  Sparkles,
  LogOut,
  Eye,
  EyeOff,
  Search,
  Link2,
  ExternalLink,
  Copy,
  Zap,
  Globe,
  BookOpen,
  X,
  Archive,
  Share2,
  Settings,
  ToggleLeft,
  ToggleRight,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  TrendingUp,
  Gauge,
  Target,
  Tag,
  Pencil,
  Save,
  ChevronUp,
  ChevronDown,
  Wand2,
  Camera,
  Image,
  ShoppingBag,
  Palette,
  FileCheck,
  DollarSign,
  FlipHorizontal,
  Layers,
} from "lucide-react";
import { useLocation } from "wouter";
import TheDyno from "@/components/the-dyno";
import type { Lead, Post, Subscriber, Newsletter, Topic, Webhook, WebhookLog, Service, GallerySection, GalleryItem, Artwork } from "@shared/schema";
import { leadStatuses, webhookEvents, artworkCategories } from "@shared/schema";

const statusColors: Record<string, string> = {
  "New Inquiry": "bg-[#C084FC]/20 text-[#C084FC]",
  "Contacted": "bg-blue-500/20 text-blue-400",
  "Commission Proposed": "bg-violet-500/20 text-violet-400",
  "Commission Accepted": "bg-indigo-500/20 text-indigo-400",
  "In Progress": "bg-amber-500/20 text-amber-400",
  "Awaiting Payment": "bg-orange-500/20 text-orange-400",
  "Delivered": "bg-green-500/20 text-green-400",
  "Closed": "bg-gray-500/20 text-gray-400",
  // Legacy fallback colors
  "New Lead": "bg-blue-500/20 text-blue-400",
  "Sale Closed": "bg-green-600/20 text-green-300",
};

type TabKey = "dyno" | "dashboard" | "leads" | "blog" | "newsletter" | "users" | "integrations" | "seo" | "services" | "gallery" | "shop" | "pages" | "orders";

export default function Admin() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("dyno");

  const [aiTopic, setAiTopic] = useState("");
  const [showAiForm, setShowAiForm] = useState(false);

  const [nlSubject, setNlSubject] = useState("");
  const [nlContent, setNlContent] = useState("");

  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "editor" });

  if (authLoading) {
    return (
      <div className="bg-[#0B0B0D] min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-auth" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const tabs: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
    { key: "dyno", label: "The Dyno", icon: Gauge },
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "shop", label: "Shop", icon: ShoppingBag },
    { key: "orders", label: "Orders", icon: DollarSign },
    { key: "leads", label: "Inquiries", icon: Users },
    { key: "blog", label: "Blog", icon: FileText },
    { key: "newsletter", label: "Newsletter", icon: Mail },
    ...(user.role === "root" || user.role === "admin" ? [{ key: "pages" as TabKey, label: "Pages", icon: FileCheck }] : []),
    ...(user.role === "root" || user.role === "admin" ? [{ key: "users" as TabKey, label: "Users", icon: Users }] : []),
    ...(user.role === "root" || user.role === "admin" ? [{ key: "integrations" as TabKey, label: "Integrations", icon: Zap }] : []),
    ...(user.role === "root" || user.role === "admin" ? [{ key: "seo" as TabKey, label: "SEO", icon: Target }] : []),
    ...(user.role === "root" || user.role === "admin" ? [{ key: "services" as TabKey, label: "Blog Services", icon: Sparkles }] : []),
    ...(user.role === "root" || user.role === "admin" ? [{ key: "gallery" as TabKey, label: "Gallery", icon: Globe }] : []),
  ];

  return (
    <div className="bg-[#0B0B0D] min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#C084FC] font-semibold mb-1">
              Admin Panel
            </p>
            <h1 className="text-2xl font-light text-[#F5F5F7] tracking-[0.2em] uppercase" data-testid="text-admin-headline" style={{ fontFamily: "Georgia, serif" }}>
              Studio
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#B3B3B8]" data-testid="text-admin-user">{user.name}</span>
            <Badge className="bg-[#5D3FD3]/20 text-[#5D3FD3] border-0 no-default-hover-elevate no-default-active-elevate text-xs">
              {user.role}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => { await logout(); navigate("/login"); }}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 text-[#B3B3B8]" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-white/5 pb-4">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              className={activeTab === tab.key ? "bg-[#5D3FD3] text-white" : "text-[#B3B3B8]"}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === "dyno" && <TheDyno />}
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "shop" && <ShopTab toast={toast} />}
        {activeTab === "orders" && <OrdersTab toast={toast} />}
        {activeTab === "pages" && (user.role === "root" || user.role === "admin") && <PagesTab toast={toast} />}
        {activeTab === "leads" && <LeadsTab toast={toast} />}
        {activeTab === "blog" && (
          <BlogTab
            toast={toast}
            aiTopic={aiTopic}
            setAiTopic={setAiTopic}
            showAiForm={showAiForm}
            setShowAiForm={setShowAiForm}
            user={user}
          />
        )}
        {activeTab === "newsletter" && (
          <NewsletterTab
            toast={toast}
            nlSubject={nlSubject}
            setNlSubject={setNlSubject}
            nlContent={nlContent}
            setNlContent={setNlContent}
          />
        )}
        {activeTab === "users" && (user.role === "root" || user.role === "admin") && (
          <UsersTab
            toast={toast}
            showAddUser={showAddUser}
            setShowAddUser={setShowAddUser}
            userForm={userForm}
            setUserForm={setUserForm}
            currentUserId={user.id}
            currentUserRole={user.role}
          />
        )}
        {activeTab === "integrations" && (user.role === "root" || user.role === "admin") && (
          <IntegrationsTab toast={toast} />
        )}
        {activeTab === "seo" && (user.role === "root" || user.role === "admin") && (
          <SeoTab toast={toast} userRole={user.role} />
        )}
        {activeTab === "services" && (user.role === "root" || user.role === "admin") && (
          <ServicesTab toast={toast} />
        )}
        {activeTab === "gallery" && (user.role === "root" || user.role === "admin") && (
          <GalleryTab toast={toast} />
        )}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: stats, isLoading } = useQuery<{
    leads: { total: number };
    posts: { published: number };
    subscribers: { active: number };
    newsletters: { sent: number };
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: backlinkAnalytics = [] } = useQuery<{ platform: string; clicks: number; backlinkCount: number }[]>({
    queryKey: ["/api/backlinks/analytics"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/backlinks/analytics", { credentials: "include" });
        if (!res.ok) return [];
        return res.json();
      } catch { return []; }
    },
  });

  const { data: sentimentSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ["/api/settings", "sentiment_auto_survey"],
    queryFn: async () => {
      const res = await fetch("/api/settings/sentiment_auto_survey", { credentials: "include" });
      if (!res.ok) return { key: "sentiment_auto_survey", value: null };
      return res.json();
    },
  });

  const { data: ratingSummary } = useQuery<{
    total: number;
    average: number;
    distribution: { score: number; count: number }[];
  }>({
    queryKey: ["/api/ratings/summary"],
  });

  const { data: funnelData } = useQuery<{
    totalLeads: number;
    bySource: { source: string; total: number; statuses: Record<string, number> }[];
    byCampaign: { campaign: string; total: number; statuses: Record<string, number> }[];
  }>({
    queryKey: ["/api/analytics/funnel"],
  });

  const toggleSentiment = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("PUT", "/api/settings/sentiment_auto_survey", { value: enabled ? "true" : "false" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings", "sentiment_auto_survey"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-dashboard" />
      </div>
    );
  }

  const metrics = [
    { label: "Total Leads", value: stats?.leads?.total ?? 0, icon: Users },
    { label: "Published Posts", value: stats?.posts?.published ?? 0, icon: FileText },
    { label: "Active Subscribers", value: stats?.subscribers?.active ?? 0, icon: Mail },
    { label: "Newsletters Sent", value: stats?.newsletters?.sent ?? 0, icon: Send },
  ];

  const totalClicks = backlinkAnalytics.reduce((sum, a) => sum + a.clicks, 0);
  const totalBacklinks = backlinkAnalytics.reduce((sum, a) => sum + a.backlinkCount, 0);

  const autoSurveyEnabled = sentimentSetting?.value === "true";
  const maxDistCount = ratingSummary?.distribution ? Math.max(...ratingSummary.distribution.map(d => d.count), 1) : 1;
  const sortedSources = funnelData?.bySource ? [...funnelData.bySource].sort((a, b) => b.total - a.total) : [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="p-6 rounded-md bg-[#141416] border border-white/5"
            data-testid={`stat-${m.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <m.icon className="w-5 h-5 text-[#B3B3B8]/50 mb-3" />
            <div className="text-3xl font-bold text-[#F5F5F7]" data-testid={`value-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {m.value}
            </div>
            <div className="text-xs text-[#B3B3B8]/50 uppercase tracking-wider mt-1">
              {m.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-6 rounded-md bg-[#141416] border border-white/5" data-testid="card-sentiment">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#B3B3B8]/50" />
              <span className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 font-medium">Customer Sentiment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#B3B3B8]/50 uppercase tracking-wider">Auto-survey</span>
              <Switch
                checked={autoSurveyEnabled}
                onCheckedChange={(checked) => toggleSentiment.mutate(checked)}
                data-testid="switch-auto-survey"
              />
            </div>
          </div>

          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-3xl font-bold text-[#F5F5F7]" data-testid="value-average-rating">
              {ratingSummary?.average ?? "—"}
            </span>
            <span className="text-xs text-[#B3B3B8]/50">avg rating</span>
            <span className="text-sm text-[#B3B3B8] ml-auto" data-testid="value-total-responses">
              {ratingSummary?.total ?? 0} responses
            </span>
          </div>

          <div className="space-y-2">
            {(ratingSummary?.distribution ?? []).slice().reverse().map((d) => (
              <div key={d.score} className="flex items-center gap-2" data-testid={`rating-bar-${d.score}`}>
                <span className="text-xs text-[#B3B3B8] w-8 text-right">{d.score} star</span>
                <div className="flex-1 h-2 bg-[#0B0B0D] rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-[#5D3FD3] rounded-sm transition-all"
                    style={{ width: `${(d.count / maxDistCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#B3B3B8]/50 w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-md bg-[#141416] border border-white/5" data-testid="card-utm-funnel">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-[#B3B3B8]/50" />
            <span className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 font-medium">Lead Attribution</span>
          </div>

          {sortedSources.length > 0 ? (
            <div className="space-y-2">
              {sortedSources.slice(0, 8).map((s) => (
                <div
                  key={s.source}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md bg-[#0B0B0D] border border-white/5"
                  data-testid={`funnel-source-${s.source}`}
                >
                  <span className="text-sm text-[#F5F5F7] font-medium">{s.source}</span>
                  <span className="text-sm font-bold text-[#F5F5F7]">{s.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#B3B3B8]/50" data-testid="text-no-funnel-data">No attribution data yet.</p>
          )}
        </div>
      </div>

      {(totalBacklinks > 0 || backlinkAnalytics.length > 0) && (
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-4">Backlink Performance</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-6 rounded-md bg-[#141416] border border-white/5" data-testid="stat-total-backlinks">
              <Globe className="w-5 h-5 text-[#B3B3B8]/50 mb-3" />
              <div className="text-3xl font-bold text-[#F5F5F7]">{totalBacklinks}</div>
              <div className="text-xs text-[#B3B3B8]/50 uppercase tracking-wider mt-1">Total Backlinks</div>
            </div>
            <div className="p-6 rounded-md bg-[#141416] border border-white/5" data-testid="stat-total-clicks">
              <ExternalLink className="w-5 h-5 text-[#B3B3B8]/50 mb-3" />
              <div className="text-3xl font-bold text-[#F5F5F7]">{totalClicks}</div>
              <div className="text-xs text-[#B3B3B8]/50 uppercase tracking-wider mt-1">Total Clicks</div>
            </div>
          </div>
          <div className="space-y-2">
            {backlinkAnalytics.map((a) => (
              <div key={a.platform} className="p-4 rounded-md bg-[#141416] border border-white/5 flex flex-wrap items-center justify-between gap-3" data-testid={`analytics-platform-${a.platform}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[#F5F5F7] text-sm font-semibold">{a.platform}</span>
                  <Badge className="bg-[#5D3FD3]/20 text-[#5D3FD3] border-0 no-default-hover-elevate no-default-active-elevate text-xs">
                    {a.backlinkCount} {a.backlinkCount === 1 ? "link" : "links"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#F5F5F7]">{a.clicks}</span>
                  <span className="text-xs text-[#B3B3B8]/50">clicks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadsTab({ toast }: { toast: any }) {
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/leads/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-leads" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-4" data-testid="text-leads-count">
        {leads.length} leads
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {["Name", "Email", "Phone", "Vehicle", "Insurance", "Status", "Created"].map((h) => (
                <th key={h} className="text-left text-xs uppercase tracking-wider text-[#B3B3B8]/50 py-3 px-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-white/5" data-testid={`row-lead-${lead.id}`}>
                <td className="py-3 px-3">
                  <div className="text-[#F5F5F7] font-medium">{lead.name}</div>
                  {(lead.utmSource || lead.utmCampaign) && (
                    <p className="text-[10px] text-[#B3B3B8]/50 mt-0.5 truncate" data-testid={`utm-badges-${lead.id}`}>
                      {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ")}
                    </p>
                  )}
                </td>
                <td className="py-3 px-3 text-[#B3B3B8]">{lead.email}</td>
                <td className="py-3 px-3 text-[#B3B3B8]">{lead.phone}</td>
                <td className="py-3 px-3 text-[#B3B3B8]">{lead.vehicle}</td>
                <td className="py-3 px-3 text-[#B3B3B8]">{lead.insurance || "—"}</td>
                <td className="py-3 px-3">
                  <Select
                    value={lead.status}
                    onValueChange={(status) => updateLead.mutate({ id: lead.id, status })}
                  >
                    <SelectTrigger
                      className="w-[180px] bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-xs"
                      data-testid={`select-status-${lead.id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141416] border-white/10 max-h-[300px]">
                      {leadStatuses.map((status) => (
                        <SelectItem key={status} value={status} className="text-[#F5F5F7] text-xs">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-3 px-3 text-[#B3B3B8] text-xs">
                  {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {leads.length === 0 && (
        <p className="text-center py-12 text-[#B3B3B8]/50 text-sm" data-testid="text-no-leads">No leads found.</p>
      )}
    </div>
  );
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderMarkdown(md: string) {
  let html = escapeHtml(md);
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-[#F5F5F7] mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-[#F5F5F7] mt-8 mb-3">$1</h2>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#F5F5F7]">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\n\n/g, '</p><p class="text-[#B3B3B8] leading-relaxed mb-4">');
  html = '<p class="text-[#B3B3B8] leading-relaxed mb-4">' + html + '</p>';
  return html;
}

function ArticlePreviewModal({ post, onClose }: { post: Post; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto py-10"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="modal-preview-overlay"
    >
      <div className="w-full max-w-3xl mx-4 bg-[#141416] border border-white/5 rounded-md p-8 relative" data-testid="modal-preview-content">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={onClose}
          data-testid="button-close-preview"
        >
          <X className="w-5 h-5 text-[#B3B3B8]" />
        </Button>

        <h1 className="text-2xl font-bold text-[#F5F5F7] mb-4 pr-10" data-testid="text-preview-title">{post.title}</h1>

        {post.excerpt && (
          <p className="text-[#B3B3B8] italic mb-6 border-l-2 border-[#5D3FD3] pl-4" data-testid="text-preview-excerpt">{post.excerpt}</p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6" data-testid="tags-preview">
            {post.tags.map((tag, i) => (
              <Badge key={i} className="text-xs bg-white/5 text-[#B3B3B8] border-0 no-default-hover-elevate no-default-active-elevate">{tag}</Badge>
            ))}
          </div>
        )}

        <div
          className="mb-8"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content || "") }}
          data-testid="content-preview"
        />

        <div className="border-t border-white/5 pt-6 space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-3">SEO Metadata</p>
          {post.seoTitle && (
            <div>
              <span className="text-xs text-[#B3B3B8]/50">SEO Title:</span>
              <p className="text-sm text-[#F5F5F7]" data-testid="text-preview-seo-title">{post.seoTitle}</p>
            </div>
          )}
          {post.seoDescription && (
            <div>
              <span className="text-xs text-[#B3B3B8]/50">SEO Description:</span>
              <p className="text-sm text-[#F5F5F7]" data-testid="text-preview-seo-description">{post.seoDescription}</p>
            </div>
          )}
          {post.seoKeywords && post.seoKeywords.length > 0 && (
            <div>
              <span className="text-xs text-[#B3B3B8]/50">SEO Keywords:</span>
              <div className="flex flex-wrap gap-2 mt-1" data-testid="tags-preview-seo-keywords">
                {post.seoKeywords.map((kw, i) => (
                  <Badge key={i} className="text-xs bg-blue-500/10 text-blue-400 border-0 no-default-hover-elevate no-default-active-elevate">{kw}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopicPreviewModal({ topic, onClose }: { topic: Topic; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto py-10"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="modal-topic-preview-overlay"
    >
      <div className="w-full max-w-3xl mx-4 bg-[#141416] border border-white/5 rounded-md p-8 relative" data-testid="modal-topic-preview-content">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={onClose}
          data-testid="button-close-topic-preview"
        >
          <X className="w-5 h-5 text-[#B3B3B8]" />
        </Button>

        <h1 className="text-2xl font-bold text-[#F5F5F7] mb-4 pr-10" data-testid="text-topic-preview-title">{topic.title}</h1>

        {topic.overview && (
          <p className="text-[#B3B3B8] leading-relaxed mb-6 border-l-2 border-[#5D3FD3] pl-4" data-testid="text-topic-preview-overview">{topic.overview}</p>
        )}

        {topic.reasoning && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-2">Reasoning</p>
            <p className="text-sm text-[#B3B3B8] leading-relaxed" data-testid="text-topic-preview-reasoning">{topic.reasoning}</p>
          </div>
        )}

        {topic.targetKeywords && topic.targetKeywords.length > 0 && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-2">Target Keywords</p>
            <div className="flex flex-wrap gap-2" data-testid="tags-topic-preview-keywords">
              {topic.targetKeywords.map((kw, i) => (
                <Badge key={i} className="text-xs bg-blue-500/10 text-blue-400 border-0 no-default-hover-elevate no-default-active-elevate">{kw}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          {topic.searchIntent && (
            <div className="p-4 rounded-md bg-[#0B0B0D] border border-white/5">
              <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-1">Search Intent</p>
              <p className="text-sm text-[#F5F5F7] font-semibold" data-testid="text-topic-preview-intent">{topic.searchIntent}</p>
            </div>
          )}
          {topic.estimatedSearchVolume && (
            <div className="p-4 rounded-md bg-[#0B0B0D] border border-white/5">
              <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-1">Search Volume</p>
              <p className="text-sm text-[#F5F5F7] font-semibold" data-testid="text-topic-preview-volume">{topic.estimatedSearchVolume}</p>
            </div>
          )}
          {topic.competitionLevel && (
            <div className="p-4 rounded-md bg-[#0B0B0D] border border-white/5">
              <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-1">Competition</p>
              <p className="text-sm text-[#F5F5F7] font-semibold" data-testid="text-topic-preview-competition">{topic.competitionLevel}</p>
            </div>
          )}
        </div>

        {topic.leadPotential && (
          <div className="border-t border-white/5 pt-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-2">Lead Potential</p>
            <p className="text-sm text-[#B3B3B8] leading-relaxed" data-testid="text-topic-preview-lead-potential">{topic.leadPotential}</p>
          </div>
        )}
      </div>
    </div>
  );
}

type BlogSubTab = "topics" | "queue" | "archive" | "published" | "backlinks" | "settings";

function BlogTab({
  toast,
  aiTopic,
  setAiTopic,
  showAiForm,
  setShowAiForm,
  user,
}: {
  toast: any;
  aiTopic: string;
  setAiTopic: (v: string) => void;
  showAiForm: boolean;
  setShowAiForm: (v: boolean) => void;
  user: { id: number; name: string; email: string; role: string };
}) {
  const [blogSubTab, setBlogSubTab] = useState<BlogSubTab>("topics");
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [previewTopic, setPreviewTopic] = useState<Topic | null>(null);

  const subTabs: { key: BlogSubTab; label: string; icon: typeof BookOpen; adminOnly?: boolean }[] = [
    { key: "topics", label: "Topics", icon: Zap },
    { key: "queue", label: "Queue", icon: FileText },
    { key: "archive", label: "Archive", icon: Archive },
    { key: "published", label: "Published", icon: Globe },
    { key: "backlinks", label: "Backlinks", icon: Link2, adminOnly: true },
    { key: "settings", label: "Blog Settings", icon: Settings, adminOnly: true },
  ];

  const visibleSubTabs = subTabs.filter(t => !t.adminOnly || user.role === "root" || user.role === "admin");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/5 pb-4">
        {visibleSubTabs.map((tab) => (
          <Button
            key={tab.key}
            variant={blogSubTab === tab.key ? "default" : "ghost"}
            className={blogSubTab === tab.key ? "bg-[#5D3FD3] text-white" : "text-[#B3B3B8]"}
            onClick={() => setBlogSubTab(tab.key)}
            data-testid={`subtab-${tab.key}`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {blogSubTab === "topics" && (
        <TopicsSubTab
          toast={toast}
          onPreviewTopic={setPreviewTopic}
          aiTopic={aiTopic}
          setAiTopic={setAiTopic}
          showAiForm={showAiForm}
          setShowAiForm={setShowAiForm}
        />
      )}
      {blogSubTab === "queue" && <PublisherQueueSubTab toast={toast} onPreview={setPreviewPost} />}
      {blogSubTab === "archive" && <ArchiveSubTab />}
      {blogSubTab === "published" && <PublishedSubTab toast={toast} onPreview={setPreviewPost} user={user} />}
      {blogSubTab === "backlinks" && <BacklinksSubTab toast={toast} />}
      {blogSubTab === "settings" && <BlogSettingsSubTab toast={toast} user={user} />}

      {previewPost && <ArticlePreviewModal post={previewPost} onClose={() => setPreviewPost(null)} />}
      {previewTopic && <TopicPreviewModal topic={previewTopic} onClose={() => setPreviewTopic(null)} />}
    </div>
  );
}

function TopicsSubTab({
  toast,
  onPreviewTopic,
  aiTopic,
  setAiTopic,
  showAiForm,
  setShowAiForm,
}: {
  toast: any;
  onPreviewTopic: (topic: Topic) => void;
  aiTopic: string;
  setAiTopic: (v: string) => void;
  showAiForm: boolean;
  setShowAiForm: (v: boolean) => void;
}) {
  const { data: topics = [], isLoading } = useQuery<Topic[]>({
    queryKey: ["/api/topics", "suggested"],
    queryFn: async () => {
      const res = await fetch("/api/topics?status=suggested", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch topics");
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data as Topic[] | undefined;
      if (data && data.some(t => t.status === "generating")) return 5000;
      return false;
    },
  });

  const { data: generatingTopics = [] } = useQuery<Topic[]>({
    queryKey: ["/api/topics", "generating"],
    queryFn: async () => {
      const res = await fetch("/api/topics?status=generating", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data as Topic[] | undefined;
      if (data && data.length > 0) return 5000;
      return false;
    },
  });

  const allTopics = [...topics, ...generatingTopics.filter(gt => !topics.some(t => t.id === gt.id))];

  const getTopics = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/research");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      toast({ title: "Research agent launched, topics incoming" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateArticle = useMutation({
    mutationFn: async (topicId: number) => {
      const res = await apiRequest("POST", `/api/topics/${topicId}/generate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Article generation started" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const archiveTopic = useMutation({
    mutationFn: async (topicId: number) => {
      await apiRequest("PATCH", `/api/topics/${topicId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      toast({ title: "Topic archived" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateSingleArticle = useMutation({
    mutationFn: async (topic: string) => {
      const res = await apiRequest("POST", "/api/ai/generate-article", { topic });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Article generated" });
      setAiTopic("");
      setShowAiForm(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const intentBadge = (intent: string | null) => {
    if (intent === "transactional") return "bg-green-500/20 text-green-400";
    if (intent === "commercial") return "bg-blue-500/20 text-blue-400";
    return "bg-purple-500/20 text-purple-400";
  };

  const volumeBadge = (vol: string | null) => {
    if (vol === "high") return "bg-green-500/20 text-green-400";
    if (vol === "medium") return "bg-yellow-500/20 text-yellow-400";
    return "bg-red-500/20 text-red-400";
  };

  const competitionBadge = (comp: string | null) => {
    if (comp === "low") return "bg-green-500/20 text-green-400";
    if (comp === "medium") return "bg-yellow-500/20 text-yellow-400";
    return "bg-red-500/20 text-red-400";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-topics" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button
          onClick={() => getTopics.mutate()}
          disabled={getTopics.isPending}
          className="bg-[#5D3FD3] text-white"
          data-testid="button-get-topics"
        >
          {getTopics.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
          Get Topics
        </Button>
        <Button
          variant="ghost"
          className="text-[#B3B3B8]"
          onClick={() => setShowAiForm(!showAiForm)}
          data-testid="button-ai-generate"
        >
          <Sparkles className="w-4 h-4 mr-2" /> AI Generate
        </Button>
      </div>

      {showAiForm && (
        <div className="p-6 rounded-md bg-[#141416] border border-white/5 mb-6" data-testid="form-ai-generate">
          <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-4">Generate Single Article with AI</p>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Enter topic..."
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              className="flex-1 min-w-[200px] bg-[#0B0B0D] border-white/10 text-[#F5F5F7]"
              data-testid="input-ai-topic"
            />
            <Button
              onClick={() => aiTopic.trim() && generateSingleArticle.mutate(aiTopic.trim())}
              disabled={generateSingleArticle.isPending || !aiTopic.trim()}
              className="bg-[#5D3FD3] text-white"
              data-testid="button-ai-submit"
            >
              {generateSingleArticle.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {allTopics.map((topic) => (
          <div
            key={topic.id}
            className="p-5 rounded-md bg-[#141416] border border-white/5"
            data-testid={`card-topic-${topic.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-[#F5F5F7] font-semibold text-sm mb-2" data-testid={`text-topic-title-${topic.id}`}>{topic.title}</h3>
                {topic.overview && (
                  <p className="text-xs text-[#B3B3B8] mb-3 line-clamp-2" data-testid={`text-topic-overview-${topic.id}`}>
                    {topic.overview.length > 150 ? topic.overview.slice(0, 150) + "..." : topic.overview}
                  </p>
                )}
                {topic.targetKeywords && topic.targetKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {topic.targetKeywords.slice(0, 5).map((kw, i) => (
                      <Badge key={i} className="text-xs bg-blue-500/10 text-blue-400 border-0 no-default-hover-elevate no-default-active-elevate">{kw}</Badge>
                    ))}
                    {topic.targetKeywords.length > 5 && (
                      <Badge className="text-xs bg-white/5 text-[#B3B3B8] border-0 no-default-hover-elevate no-default-active-elevate">+{topic.targetKeywords.length - 5}</Badge>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {topic.searchIntent && (
                    <Badge className={`text-xs border-0 no-default-hover-elevate no-default-active-elevate ${intentBadge(topic.searchIntent)}`} data-testid={`badge-intent-${topic.id}`}>
                      {topic.searchIntent}
                    </Badge>
                  )}
                  {topic.estimatedSearchVolume && (
                    <Badge className={`text-xs border-0 no-default-hover-elevate no-default-active-elevate ${volumeBadge(topic.estimatedSearchVolume)}`} data-testid={`badge-volume-${topic.id}`}>
                      vol: {topic.estimatedSearchVolume}
                    </Badge>
                  )}
                  {topic.competitionLevel && (
                    <Badge className={`text-xs border-0 no-default-hover-elevate no-default-active-elevate ${competitionBadge(topic.competitionLevel)}`} data-testid={`badge-competition-${topic.id}`}>
                      comp: {topic.competitionLevel}
                    </Badge>
                  )}
                  {topic.status === "generating" && (
                    <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-0 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-generating-${topic.id}`}>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" /> generating
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPreviewTopic(topic)}
                  data-testid={`button-preview-topic-${topic.id}`}
                >
                  <Eye className="w-4 h-4 text-[#B3B3B8]" />
                </Button>
                <Button
                  onClick={() => generateArticle.mutate(topic.id)}
                  disabled={generateArticle.isPending || topic.status === "generating" || topic.status === "generated"}
                  className="bg-[#5D3FD3] text-white"
                  data-testid={`button-generate-article-${topic.id}`}
                >
                  {(generateArticle.isPending || topic.status === "generating") ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Article
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => archiveTopic.mutate(topic.id)}
                  disabled={archiveTopic.isPending}
                  data-testid={`button-archive-topic-${topic.id}`}
                >
                  <Archive className="w-4 h-4 text-[#B3B3B8]" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {allTopics.length === 0 && (
          <p className="text-center py-12 text-[#B3B3B8]/50 text-sm" data-testid="text-no-topics">No suggested topics. Click "Get Topics" to generate research-backed suggestions.</p>
        )}
      </div>
    </div>
  );
}

function PublisherQueueSubTab({ toast, onPreview }: { toast: any; onPreview: (post: Post) => void }) {
  const { data: queuedPosts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts", "queue"],
    queryFn: async () => {
      const res = await fetch("/api/posts/queue", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch queue");
      return res.json();
    },
  });

  const publishPost = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/posts/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Post published" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const discardPost = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Post discarded" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-queue" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-4" data-testid="text-queue-count">
        {queuedPosts.length} queued articles
      </p>
      <div className="space-y-3">
        {queuedPosts.map((post) => (
          <div
            key={post.id}
            className="p-5 rounded-md bg-[#141416] border border-white/5"
            data-testid={`card-queue-post-${post.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-[#F5F5F7] font-semibold text-sm mb-1" data-testid={`text-queue-title-${post.id}`}>{post.title}</h3>
                {post.excerpt && <p className="text-xs text-[#B3B3B8] mb-2" data-testid={`text-queue-excerpt-${post.id}`}>{post.excerpt}</p>}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {post.tags.map((tag, i) => (
                      <Badge key={i} className="text-xs bg-white/5 text-[#B3B3B8] border-0 no-default-hover-elevate no-default-active-elevate">{tag}</Badge>
                    ))}
                  </div>
                )}
                {(post.seoTitle || post.seoDescription) && (
                  <div className="text-xs text-[#B3B3B8]/40 space-y-1">
                    {post.seoTitle && <p>SEO: {post.seoTitle}</p>}
                    {post.seoDescription && <p>{post.seoDescription}</p>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPreview(post)}
                  data-testid={`button-preview-queue-${post.id}`}
                >
                  <Eye className="w-4 h-4 text-[#B3B3B8]" />
                </Button>
                <Button
                  onClick={() => publishPost.mutate(post.id)}
                  disabled={publishPost.isPending}
                  className="bg-[#5D3FD3] text-white"
                  data-testid={`button-publish-${post.id}`}
                >
                  {publishPost.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                  Publish
                </Button>
                <Button
                  variant="ghost"
                  className="text-red-400"
                  onClick={() => discardPost.mutate(post.id)}
                  disabled={discardPost.isPending}
                  data-testid={`button-discard-${post.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Discard
                </Button>
              </div>
            </div>
            <p className="text-xs text-[#B3B3B8]/30 mt-3 italic" data-testid={`text-publish-note-${post.id}`}>
              Publishing triggers SEO optimization, backlink creation, and newsletter delivery.
            </p>
          </div>
        ))}
        {queuedPosts.length === 0 && (
          <p className="text-center py-12 text-[#B3B3B8]/50 text-sm" data-testid="text-no-queued">No queued articles.</p>
        )}
      </div>
    </div>
  );
}

function ArchiveSubTab() {
  const { data: archivedTopics = [], isLoading } = useQuery<Topic[]>({
    queryKey: ["/api/topics", "archived"],
    queryFn: async () => {
      const res = await fetch("/api/topics?status=archived", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch archived topics");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-archive" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-4" data-testid="text-archive-count">
        {archivedTopics.length} archived topics
      </p>
      <div className="space-y-3">
        {archivedTopics.map((topic) => (
          <div
            key={topic.id}
            className="p-5 rounded-md bg-[#141416] border border-white/5"
            data-testid={`card-archived-topic-${topic.id}`}
          >
            <h3 className="text-[#F5F5F7] font-semibold text-sm mb-1" data-testid={`text-archived-title-${topic.id}`}>{topic.title}</h3>
            {topic.overview && (
              <p className="text-xs text-[#B3B3B8] mb-2" data-testid={`text-archived-overview-${topic.id}`}>
                {topic.overview.length > 200 ? topic.overview.slice(0, 200) + "..." : topic.overview}
              </p>
            )}
            <p className="text-xs text-[#B3B3B8]/40">
              {new Date(topic.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        ))}
        {archivedTopics.length === 0 && (
          <p className="text-center py-12 text-[#B3B3B8]/50 text-sm" data-testid="text-no-archived">No archived topics.</p>
        )}
      </div>
    </div>
  );
}

function PublishedSubTab({ toast, onPreview, user }: { toast: any; onPreview: (post: Post) => void; user: { role: string } }) {
  const { data: publishedPosts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts", "published"],
    queryFn: async () => {
      const res = await fetch("/api/posts?status=published", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch published posts");
      return res.json();
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Post deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isAdmin = user.role === "root" || user.role === "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-published" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-4" data-testid="text-published-count">
        {publishedPosts.length} published articles
      </p>
      <div className="space-y-3">
        {publishedPosts.map((post) => (
          <div
            key={post.id}
            className="p-5 rounded-md bg-[#141416] border border-white/5 flex flex-wrap items-center justify-between gap-4"
            data-testid={`card-published-post-${post.id}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <span className="text-[#F5F5F7] font-semibold text-sm" data-testid={`text-published-title-${post.id}`}>{post.title}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <span className="text-xs text-[#B3B3B8]/40" data-testid={`text-published-slug-${post.id}`}>/{post.slug}</span>
                {post.publishedAt && (
                  <span className="text-xs text-[#B3B3B8]/40">
                    {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="text-xs bg-white/5 text-[#B3B3B8] border-0 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-reads-${post.id}`}>
                <Eye className="w-3 h-3 mr-1" />
                {post.readCount ?? 0}
              </Badge>
              <Badge className="text-xs bg-white/5 text-[#B3B3B8] border-0 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-shares-${post.id}`}>
                <Share2 className="w-3 h-3 mr-1" />
                {post.shareCount ?? 0}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPreview(post)}
                data-testid={`button-preview-published-${post.id}`}
              >
                <Eye className="w-4 h-4 text-[#B3B3B8]" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => deletePost.mutate(post.id)}
                  disabled={deletePost.isPending}
                  data-testid={`button-delete-published-${post.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {publishedPosts.length === 0 && (
          <p className="text-center py-12 text-[#B3B3B8]/50 text-sm" data-testid="text-no-published">No published articles yet.</p>
        )}
      </div>
    </div>
  );
}

function BacklinksSubTab({ toast }: { toast: any }) {
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [platformInput, setPlatformInput] = useState("");
  const [platforms, setPlatforms] = useState<any[]>([]);

  const { data: publishedPosts = [] } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const filteredPosts = publishedPosts.filter((p) => p.status === "published");

  const { data: backlinks = [], isLoading: backlinksLoading } = useQuery<any[]>({
    queryKey: ["/api/backlinks", selectedPostId],
    queryFn: async () => {
      if (!selectedPostId) return [];
      const res = await fetch(`/api/backlinks?postId=${selectedPostId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch backlinks");
      return res.json();
    },
    enabled: !!selectedPostId,
  });

  const researchPlatforms = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("POST", "/api/ai/backlink-research", { postId });
      return res.json();
    },
    onSuccess: (data: any) => {
      setPlatforms(data.platforms || []);
      toast({ title: "Platform research complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateBacklink = useMutation({
    mutationFn: async ({ postId, platform }: { postId: number; platform: string }) => {
      const res = await apiRequest("POST", "/api/backlinks/generate", { postId, platform });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backlinks", selectedPostId] });
      toast({ title: "Backlink generated" });
      setPlatformInput("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const authorityBadge = (authority: string) => {
    if (authority === "high") return "bg-green-500/20 text-green-400";
    if (authority === "medium") return "bg-yellow-500/20 text-yellow-400";
    return "bg-red-500/20 text-red-400";
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-3">Select Published Post</p>
        <Select
          value={selectedPostId?.toString() || ""}
          onValueChange={(val) => { setSelectedPostId(parseInt(val)); setPlatforms([]); }}
        >
          <SelectTrigger className="w-full max-w-md bg-[#0B0B0D] border-white/10 text-[#F5F5F7]" data-testid="select-backlink-post">
            <SelectValue placeholder="Choose a published post..." />
          </SelectTrigger>
          <SelectContent className="bg-[#141416] border-white/10 max-h-[300px]">
            {filteredPosts.map((post) => (
              <SelectItem key={post.id} value={post.id.toString()} className="text-[#F5F5F7] text-xs">
                {post.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPostId && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button
              onClick={() => researchPlatforms.mutate(selectedPostId)}
              disabled={researchPlatforms.isPending}
              className="bg-[#5D3FD3] text-white"
              data-testid="button-research-platforms"
            >
              {researchPlatforms.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              Research Platforms
            </Button>
          </div>

          {platforms.length > 0 && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-3">Recommended Platforms</p>
              <div className="space-y-2">
                {platforms.map((p: any, i: number) => (
                  <div key={i} className="p-4 rounded-md bg-[#141416] border border-white/5 flex flex-wrap items-start justify-between gap-3" data-testid={`card-platform-${i}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[#F5F5F7] font-semibold text-sm">{p.platform}</span>
                        <Badge className={`text-xs border-0 no-default-hover-elevate no-default-active-elevate ${authorityBadge(p.authority)}`}>{p.authority}</Badge>
                        <Badge className="text-xs bg-white/5 text-[#B3B3B8] border-0 no-default-hover-elevate no-default-active-elevate">{p.type}</Badge>
                      </div>
                      <p className="text-xs text-[#B3B3B8]">{p.relevance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-3">Generate Backlink</p>
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Platform name..."
                value={platformInput}
                onChange={(e) => setPlatformInput(e.target.value)}
                className="flex-1 min-w-[200px] bg-[#0B0B0D] border-white/10 text-[#F5F5F7]"
                data-testid="input-backlink-platform"
              />
              <Button
                onClick={() => platformInput.trim() && generateBacklink.mutate({ postId: selectedPostId, platform: platformInput.trim() })}
                disabled={generateBacklink.isPending || !platformInput.trim()}
                className="bg-[#5D3FD3] text-white"
                data-testid="button-generate-backlink"
              >
                {generateBacklink.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                Generate
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-3">Existing Backlinks</p>
            {backlinksLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-[#5D3FD3] animate-spin" data-testid="loader-backlinks" />
              </div>
            ) : backlinks.length === 0 ? (
              <p className="text-center py-8 text-[#B3B3B8]/50 text-sm" data-testid="text-no-backlinks">No backlinks yet for this post.</p>
            ) : (
              <div className="space-y-2">
                {backlinks.map((bl: any) => (
                  <div key={bl.id} className="p-4 rounded-md bg-[#141416] border border-white/5 flex flex-wrap items-center justify-between gap-3" data-testid={`card-backlink-${bl.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-[#B3B3B8]/50" />
                        <span className="text-[#F5F5F7] font-semibold text-sm" data-testid={`text-backlink-platform-${bl.id}`}>{bl.platform}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[#B3B3B8] truncate max-w-[300px]" data-testid={`text-backlink-url-${bl.id}`}>{bl.url}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(bl.url)}
                          data-testid={`button-copy-backlink-${bl.id}`}
                        >
                          <Copy className="w-3 h-3 text-[#B3B3B8]" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs bg-white/5 text-[#B3B3B8] border-0 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-clicks-${bl.id}`}>
                        {bl.clicks} clicks
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {filteredPosts.length === 0 && (
        <p className="text-center py-12 text-[#B3B3B8]/50 text-sm" data-testid="text-no-published-posts">No published posts available for backlink research.</p>
      )}
    </div>
  );
}

function NewsletterTab({
  toast,
  nlSubject,
  setNlSubject,
  nlContent,
  setNlContent,
}: {
  toast: any;
  nlSubject: string;
  setNlSubject: (v: string) => void;
  nlContent: string;
  setNlContent: (v: string) => void;
}) {
  const { data: subscribers = [], isLoading: subsLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/subscribers"],
  });

  const { data: newsletters = [], isLoading: nlLoading } = useQuery<Newsletter[]>({
    queryKey: ["/api/newsletters"],
  });

  const deleteSubscriber = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subscribers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      toast({ title: "Subscriber removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createNewsletter = useMutation({
    mutationFn: async (data: { subject: string; htmlContent: string }) => {
      await apiRequest("POST", "/api/newsletters", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      toast({ title: "Newsletter draft saved" });
      setNlSubject("");
      setNlContent("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sendNewsletter = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/newsletters/${id}/send`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      toast({ title: data.message || "Newsletter sent" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = subsLoading || nlLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-newsletter" />
      </div>
    );
  }

  const activeCount = subscribers.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50">Subscribers</p>
          <Badge className="bg-[#5D3FD3]/20 text-[#5D3FD3] border-0 no-default-hover-elevate no-default-active-elevate text-xs" data-testid="badge-subscriber-count">
            {activeCount} active
          </Badge>
        </div>
        <div className="space-y-2">
          {subscribers.map((sub) => (
            <div
              key={sub.id}
              className="p-4 rounded-md bg-[#141416] border border-white/5 flex flex-wrap items-center justify-between gap-3"
              data-testid={`row-subscriber-${sub.id}`}
            >
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-[#F5F5F7] text-sm">{sub.name || "—"}</span>
                <span className="text-[#B3B3B8] text-sm">{sub.email}</span>
                <Badge
                  className={`text-xs border-0 no-default-hover-elevate no-default-active-elevate ${sub.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}
                >
                  {sub.status}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteSubscriber.mutate(sub.id)}
                data-testid={`button-delete-subscriber-${sub.id}`}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          ))}
          {subscribers.length === 0 && (
            <p className="text-center py-8 text-[#B3B3B8]/50 text-sm" data-testid="text-no-subscribers">No subscribers yet.</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-4">Compose Newsletter</p>
        <div className="p-6 rounded-md bg-[#141416] border border-white/5 space-y-4" data-testid="form-newsletter">
          <Input
            placeholder="Subject"
            value={nlSubject}
            onChange={(e) => setNlSubject(e.target.value)}
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7]"
            data-testid="input-newsletter-subject"
          />
          <Textarea
            placeholder="HTML Content"
            value={nlContent}
            onChange={(e) => setNlContent(e.target.value)}
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] min-h-[150px]"
            data-testid="input-newsletter-content"
          />
          <Button
            onClick={() => {
              if (!nlSubject.trim() || !nlContent.trim()) return;
              createNewsletter.mutate({ subject: nlSubject, htmlContent: nlContent });
            }}
            disabled={createNewsletter.isPending || !nlSubject.trim() || !nlContent.trim()}
            className="bg-[#5D3FD3] text-white"
            data-testid="button-newsletter-save"
          >
            {createNewsletter.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Draft
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-4">Newsletters</p>
        <div className="space-y-3">
          {newsletters.map((nl) => (
            <div
              key={nl.id}
              className="p-5 rounded-md bg-[#141416] border border-white/5 flex flex-wrap items-center justify-between gap-4"
              data-testid={`card-newsletter-${nl.id}`}
            >
              <div>
                <span className="text-[#F5F5F7] font-semibold text-sm">{nl.subject}</span>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <Badge
                    className={`text-xs border-0 no-default-hover-elevate no-default-active-elevate ${nl.status === "sent" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}
                  >
                    {nl.status}
                  </Badge>
                  {nl.recipientCount !== null && nl.recipientCount > 0 && (
                    <span className="text-xs text-[#B3B3B8]/40">{nl.recipientCount} recipients</span>
                  )}
                </div>
              </div>
              {nl.status !== "sent" && (
                <Button
                  variant="ghost"
                  onClick={() => sendNewsletter.mutate(nl.id)}
                  disabled={sendNewsletter.isPending}
                  className="text-[#5D3FD3]"
                  data-testid={`button-send-newsletter-${nl.id}`}
                >
                  {sendNewsletter.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send
                </Button>
              )}
            </div>
          ))}
          {newsletters.length === 0 && (
            <p className="text-center py-8 text-[#B3B3B8]/50 text-sm" data-testid="text-no-newsletters">No newsletters yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab({
  toast,
  showAddUser,
  setShowAddUser,
  userForm,
  setUserForm,
  currentUserId,
  currentUserRole,
}: {
  toast: any;
  showAddUser: boolean;
  setShowAddUser: (v: boolean) => void;
  userForm: { name: string; email: string; password: string; role: string };
  setUserForm: (v: any) => void;
  currentUserId: number;
  currentUserRole: string;
}) {
  const isRoot = currentUserRole === "root";
  const { data: users = [], isLoading } = useQuery<{ id: number; name: string; email: string; role: string; createdAt: string }[]>({
    queryKey: ["/api/users"],
  });

  const createUser = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role: string }) => {
      await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created" });
      setShowAddUser(false);
      setUserForm({ name: "", email: "", password: "", role: "editor" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-users" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button
          onClick={() => setShowAddUser(!showAddUser)}
          className="bg-[#5D3FD3] text-white"
          data-testid="button-add-user"
        >
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      {showAddUser && (
        <div className="p-6 rounded-md bg-[#141416] border border-white/5 mb-6 space-y-4" data-testid="form-add-user">
          <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 mb-2">New User</p>
          <Input
            placeholder="Name"
            value={userForm.name}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7]"
            data-testid="input-user-name"
          />
          <Input
            placeholder="Email"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7]"
            data-testid="input-user-email"
          />
          <Input
            placeholder="Password"
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7]"
            data-testid="input-user-password"
          />
          <Select value={userForm.role} onValueChange={(role) => setUserForm({ ...userForm, role })}>
            <SelectTrigger className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7]" data-testid="select-user-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#141416] border-white/10">
              {isRoot && <SelectItem value="root" className="text-[#F5F5F7]">Root</SelectItem>}
              <SelectItem value="admin" className="text-[#F5F5F7]">Admin</SelectItem>
              <SelectItem value="editor" className="text-[#F5F5F7]">Editor</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) return;
                createUser.mutate(userForm);
              }}
              disabled={createUser.isPending || !userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()}
              className="bg-[#5D3FD3] text-white"
              data-testid="button-user-submit"
            >
              {createUser.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create User
            </Button>
            <Button variant="ghost" className="text-[#B3B3B8]" onClick={() => setShowAddUser(false)} data-testid="button-user-cancel">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {users.map((u) => (
          <div
            key={u.id}
            className="p-5 rounded-md bg-[#141416] border border-white/5 flex flex-wrap items-center justify-between gap-4"
            data-testid={`card-user-${u.id}`}
          >
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-[#F5F5F7] font-semibold text-sm">{u.name}</span>
              <span className="text-[#B3B3B8] text-sm">{u.email}</span>
              <Badge className="bg-[#5D3FD3]/20 text-[#5D3FD3] border-0 no-default-hover-elevate no-default-active-elevate text-xs">
                {u.role}
              </Badge>
            </div>
            {u.id !== currentUserId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteUser.mutate(u.id)}
                data-testid={`button-delete-user-${u.id}`}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-center py-8 text-[#B3B3B8]/50 text-sm" data-testid="text-no-users">No users found.</p>
        )}
      </div>
    </div>
  );
}

function IntegrationsTab({ toast }: { toast: any }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[], active: true });
  const [viewLogs, setViewLogs] = useState<number | null>(null);
  const [showSecret, setShowSecret] = useState<number | null>(null);

  const { data: webhooksData = [], isLoading } = useQuery<Webhook[]>({ queryKey: ["/api/webhooks"] });
  const { data: logsData = [] } = useQuery<WebhookLog[]>({
    queryKey: ["/api/webhooks/logs", viewLogs],
    queryFn: async () => {
      const url = viewLogs ? `/api/webhooks/logs?webhookId=${viewLogs}` : "/api/webhooks/logs";
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
    enabled: viewLogs !== null,
  });

  const createWebhook = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/webhooks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook created" });
      setShowAdd(false);
      setForm({ name: "", url: "", events: [], active: true });
    },
    onError: () => toast({ title: "Failed to create webhook", variant: "destructive" }),
  });

  const updateWebhook = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Webhook> }) => {
      const res = await apiRequest("PATCH", `/api/webhooks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook updated" });
      setEditingId(null);
      setForm({ name: "", url: "", events: [], active: true });
    },
    onError: () => toast({ title: "Failed to update webhook", variant: "destructive" }),
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook deleted" });
    },
    onError: () => toast({ title: "Failed to delete webhook", variant: "destructive" }),
  });

  const testWebhook = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/webhooks/${id}/test`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/logs"] });
      if (data.success) {
        toast({ title: "Test delivered", description: `Status ${data.statusCode} in ${data.duration}ms` });
      } else {
        toast({ title: "Test failed", description: data.error || `Status ${data.statusCode}`, variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Test failed", variant: "destructive" }),
  });

  const toggleEvent = (event: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  };

  const startEdit = (hook: Webhook) => {
    setEditingId(hook.id);
    setForm({ name: hook.name, url: hook.url, events: hook.events || [], active: hook.active });
    setShowAdd(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.url || form.events.length === 0) {
      toast({ title: "Name, URL, and at least one event required", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateWebhook.mutate({ id: editingId, data: form });
    } else {
      createWebhook.mutate(form);
    }
  };

  const cancelForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm({ name: "", url: "", events: [], active: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-[#5D3FD3] animate-spin" data-testid="loader-webhooks" />
      </div>
    );
  }

  if (viewLogs !== null) {
    const hookName = webhooksData.find(w => w.id === viewLogs)?.name || "Webhook";
    return (
      <div data-testid="panel-webhook-logs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#5D3FD3] font-semibold mb-1">Delivery Log</p>
            <h2 className="text-xl font-bold text-[#F5F5F7] uppercase tracking-tight">{hookName}</h2>
          </div>
          <Button variant="ghost" onClick={() => setViewLogs(null)} data-testid="button-back-webhooks">
            <X className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
        <div className="space-y-2">
          {logsData.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-md bg-[#141416] border border-white/5 flex flex-wrap items-center justify-between gap-3"
              data-testid={`card-log-${log.id}`}
            >
              <div className="flex items-center gap-3">
                {log.success ? (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <Badge className={`border-0 no-default-hover-elevate no-default-active-elevate text-xs ${log.success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {log.statusCode || "ERR"}
                </Badge>
                <span className="text-[#F5F5F7] text-sm font-medium">{log.event}</span>
              </div>
              <div className="flex items-center gap-4">
                {log.duration && (
                  <span className="text-[#B3B3B8]/50 text-xs">{log.duration}ms</span>
                )}
                <span className="text-[#B3B3B8]/50 text-xs">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {logsData.length === 0 && (
            <p className="text-center py-8 text-[#B3B3B8]/50 text-sm" data-testid="text-no-logs">No delivery logs yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="panel-integrations">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#5D3FD3] font-semibold mb-1">Integrations</p>
          <h2 className="text-xl font-bold text-[#F5F5F7] uppercase tracking-tight">Webhooks</h2>
          <p className="text-[#B3B3B8]/60 text-sm mt-1">Connect your CRM to Zapier, Make, or custom systems</p>
        </div>
        {!showAdd && (
          <Button onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: "", url: "", events: [], active: true }); }} data-testid="button-add-webhook">
            <Plus className="w-4 h-4 mr-2" /> Add Webhook
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="mb-8 p-6 rounded-md bg-[#141416] border border-white/5" data-testid="form-webhook">
          <h3 className="text-sm uppercase tracking-[0.1em] font-semibold text-[#F5F5F7] mb-4">
            {editingId ? "Edit Webhook" : "New Webhook"}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#B3B3B8] uppercase tracking-wider mb-1 block">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Zapier Lead Notification"
                className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7]"
                data-testid="input-webhook-name"
              />
            </div>
            <div>
              <label className="text-xs text-[#B3B3B8] uppercase tracking-wider mb-1 block">Endpoint URL</label>
              <Input
                value={form.url}
                onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://hooks.zapier.com/..."
                className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7]"
                data-testid="input-webhook-url"
              />
            </div>
            <div>
              <label className="text-xs text-[#B3B3B8] uppercase tracking-wider mb-2 block">Events</label>
              <div className="flex flex-wrap gap-2">
                {webhookEvents.map((event) => (
                  <Badge
                    key={event}
                    className={`cursor-pointer border-0 text-xs ${
                      form.events.includes(event)
                        ? "bg-[#5D3FD3]/20 text-[#5D3FD3]"
                        : "bg-white/5 text-[#B3B3B8]/50"
                    }`}
                    onClick={() => toggleEvent(event)}
                    data-testid={`badge-event-${event}`}
                  >
                    {event}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button onClick={handleSubmit} disabled={createWebhook.isPending || updateWebhook.isPending} data-testid="button-save-webhook">
                {(createWebhook.isPending || updateWebhook.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </Button>
              <Button variant="ghost" onClick={cancelForm} data-testid="button-cancel-webhook">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {webhooksData.map((hook) => (
          <div
            key={hook.id}
            className="p-5 rounded-md bg-[#141416] border border-white/5"
            data-testid={`card-webhook-${hook.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-[#F5F5F7] font-semibold text-sm">{hook.name}</span>
                  <Badge className={`border-0 no-default-hover-elevate no-default-active-elevate text-xs ${hook.active ? "bg-green-500/20 text-green-400" : "bg-white/5 text-[#B3B3B8]/50"}`}>
                    {hook.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-[#B3B3B8]/50 text-xs mb-3 break-all">{hook.url}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(hook.events || []).map((ev) => (
                    <Badge key={ev} className="bg-white/5 text-[#B3B3B8] border-0 no-default-hover-elevate no-default-active-elevate text-xs">
                      {ev}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#B3B3B8]/40 text-xs uppercase tracking-wider">Secret</span>
                    {showSecret === hook.id ? (
                      <div className="flex items-center gap-2">
                        <code className="text-[#B3B3B8] text-xs bg-[#0B0B0D] px-2 py-1 rounded font-mono break-all">{hook.secret}</code>
                        <Button variant="ghost" size="icon" onClick={() => setShowSecret(null)} data-testid={`button-hide-secret-${hook.id}`}>
                          <EyeOff className="w-3 h-3 text-[#B3B3B8]" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(hook.secret); toast({ title: "Secret copied" }); }} data-testid={`button-copy-secret-${hook.id}`}>
                          <Copy className="w-3 h-3 text-[#B3B3B8]" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => setShowSecret(hook.id)} data-testid={`button-show-secret-${hook.id}`}>
                        <Eye className="w-3 h-3 text-[#B3B3B8]" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => updateWebhook.mutate({ id: hook.id, data: { active: !hook.active } })}
                  data-testid={`button-toggle-${hook.id}`}
                >
                  {hook.active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-[#B3B3B8]/50" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => testWebhook.mutate(hook.id)}
                  disabled={testWebhook.isPending}
                  data-testid={`button-test-${hook.id}`}
                >
                  {testWebhook.isPending ? <Loader2 className="w-4 h-4 animate-spin text-[#B3B3B8]" /> : <Play className="w-4 h-4 text-[#B3B3B8]" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewLogs(hook.id)} data-testid={`button-logs-${hook.id}`}>
                  <Clock className="w-4 h-4 text-[#B3B3B8]" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => startEdit(hook)} data-testid={`button-edit-${hook.id}`}>
                  <Settings className="w-4 h-4 text-[#B3B3B8]" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteWebhook.mutate(hook.id)} data-testid={`button-delete-webhook-${hook.id}`}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {webhooksData.length === 0 && !showAdd && (
          <div className="text-center py-12" data-testid="text-no-webhooks">
            <Zap className="w-8 h-8 text-[#B3B3B8]/20 mx-auto mb-3" />
            <p className="text-[#B3B3B8]/50 text-sm mb-1">No webhooks configured</p>
            <p className="text-[#B3B3B8]/30 text-xs">Add a webhook to send real-time data to Zapier, Make, or your own systems</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SEO Tab ──────────────────────────────────────────────────────────────────

const RENOVATION_SERVICES_LIBRARY = [
  "Custom Turf Design & Install",
  "Artificial Turf Installation",
  "Foundation Repair",
  "Slab Foundation Repair",
  "Pier & Beam Repair",
  "Interior Remodeling",
  "Kitchen Remodeling",
  "Bathroom Remodeling",
  "Outdoor Remodeling",
  "Deck Building & Repair",
  "Patio Installation",
  "Pergola & Shade Structure",
  "Outdoor Kitchen Installation",
  "Fire Pit Construction",
  "Bespoke Outdoor Living Spaces",
  "Turf & Pavers",
  "Paver Installation",
  "Hardscaping",
  "Landscape Design",
  "Pool Surround Installation",
  "Putting Green Installation",
  "Sports Field Installation",
  "Commercial Turf Installation",
  "Fence Installation",
  "Privacy Fencing",
  "Driveway Renovation",
  "Concrete Work",
  "Foundation Drainage",
  "French Drain Installation",
  "Flooring Installation",
  "Window & Door Replacement",
  "Interior Painting",
  "Exterior Painting",
  "Roofing Repair",
];

type BlogService = { title: string; description: string };

function BlogSettingsSubTab({ toast, user }: { toast: any; user: { role: string } }) {
  const isRoot = user.role === "root";
  const [services, setServices] = useState<BlogService[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const { data: setting, isLoading } = useQuery<{ key: string; value: string | null }>({
    queryKey: ["/api/settings/blog-services"],
    queryFn: async () => {
      const res = await fetch("/api/settings/blog-services", { credentials: "include" });
      if (!res.ok) return { key: "blog_services", value: null };
      return res.json();
    },
  });

  useEffect(() => {
    if (initialized || !setting) return;
    try {
      const parsed: BlogService[] = setting.value ? JSON.parse(setting.value) : [];
      setServices(parsed);
    } catch {
      setServices([]);
    }
    setInitialized(true);
  }, [setting, initialized]);

  const saveServices = useMutation({
    mutationFn: async (list: BlogService[]) => {
      const res = await fetch("/api/settings/blog-services", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: JSON.stringify(list) }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/blog-services"] });
      toast({ title: "Blog services saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const purgeAllPosts = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/posts/purge-all");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: data.message || "All posts deleted" });
      setConfirmPurge(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredSuggestions = inputValue.trim().length === 0
    ? []
    : RENOVATION_SERVICES_LIBRARY.filter(
        (s) =>
          s.toLowerCase().includes(inputValue.toLowerCase()) &&
          !services.some((svc) => svc.title === s)
      );

  const addService = (title: string) => {
    if (services.some((s) => s.title === title)) return;
    setServices((prev) => [...prev, { title, description: "" }]);
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeService = (title: string) => {
    setServices((prev) => prev.filter((s) => s.title !== title));
  };

  const updateDescription = (title: string, description: string) => {
    setServices((prev) => prev.map((s) => s.title === title ? { ...s, description } : s));
  };

  const handleCustomAdd = () => {
    const val = inputValue.trim();
    if (!val || services.some((s) => s.title === val)) return;
    addService(val);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-md bg-[#141416] border border-white/5" data-testid="card-blog-services">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#B3B3B8]/50" />
          <h3 className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 font-medium">Blog Services Context</h3>
        </div>
        <p className="text-xs text-[#B3B3B8]/40 mb-6">
          These services are injected into the AI research and writing agents so every generated article stays aligned with what Reign Services actually offers.
        </p>

        <div className="relative mb-4" data-testid="autocomplete-services">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Search or type a service name..."
              className="flex-1 bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm"
              data-testid="input-service-search"
            />
            <Button
              variant="ghost"
              className="text-[#B3B3B8] shrink-0"
              onClick={handleCustomAdd}
              disabled={!inputValue.trim()}
              data-testid="button-add-custom-service"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#141416] border border-white/10 rounded-md shadow-lg max-h-52 overflow-y-auto" data-testid="suggestions-list">
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#F5F5F7] hover:bg-[#5D3FD3]/20 transition-colors"
                  onMouseDown={() => addService(s)}
                  data-testid={`suggestion-${s.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {services.length > 0 ? (
          <div className="space-y-3 mb-6">
            {services.map((svc) => (
              <div key={svc.title} className="p-4 rounded-md bg-[#0B0B0D] border border-white/5" data-testid={`service-item-${svc.title.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#F5F5F7]">{svc.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#B3B3B8]/40 hover:text-red-400"
                    onClick={() => removeService(svc.title)}
                    data-testid={`button-remove-service-${svc.title.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  value={svc.description}
                  onChange={(e) => updateDescription(svc.title, e.target.value)}
                  placeholder="Short description for AI context (optional)..."
                  className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs resize-none"
                  rows={2}
                  data-testid={`textarea-service-desc-${svc.title.replace(/\s+/g, "-").toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-[#B3B3B8]/30 text-sm mb-6" data-testid="text-no-services">
            No services added yet. Search above or type a custom service name.
          </p>
        )}

        <Button
          className="bg-[#5D3FD3] text-white"
          onClick={() => saveServices.mutate(services)}
          disabled={saveServices.isPending}
          data-testid="button-save-blog-services"
        >
          {saveServices.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Services
        </Button>
      </div>

      {isRoot && (
        <div className="p-6 rounded-md bg-[#141416] border border-red-500/10" data-testid="card-danger-zone">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-red-400/60" />
            <h3 className="text-xs uppercase tracking-[0.3em] text-red-400/60 font-medium">Danger Zone</h3>
          </div>
          <p className="text-xs text-[#B3B3B8]/40 mb-4">
            Delete all blog posts and draft articles. This cannot be undone. Use to clear out outdated PDR-era content.
          </p>
          {!confirmPurge ? (
            <Button
              variant="ghost"
              className="text-red-400 border border-red-500/20 hover:bg-red-500/10"
              onClick={() => setConfirmPurge(true)}
              data-testid="button-purge-posts-trigger"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete All Posts
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-400">Are you sure? This deletes every post permanently.</span>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white text-xs"
                onClick={() => purgeAllPosts.mutate()}
                disabled={purgeAllPosts.isPending}
                data-testid="button-purge-posts-confirm"
              >
                {purgeAllPosts.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Yes, Delete All
              </Button>
              <Button variant="ghost" className="text-[#B3B3B8] text-xs" onClick={() => setConfirmPurge(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SeoGlobal { siteTitle: string; metaDescription: string; ogImageUrl: string; }
interface PageSeo { page: string; route: string; title: string; description: string; keywords: string; }
interface SeoKeyword { id: string; keyword: string; priority: "high" | "medium" | "low"; status: "tracking" | "ranking" | "testing" | "paused"; notes: string; }

const DEFAULT_PAGES: PageSeo[] = [
  { page: "Home", route: "/", title: "Reign Services - DFW's Premier Interior/Exterior Renovations Experts", description: "Residential and commercial renovation specialists serving the Dallas-Fort Worth metroplex.", keywords: "custom turf DFW, renovation contractor Dallas" },
  { page: "About", route: "/about", title: "About Reign Services | DFW Renovation Experts", description: "Meet the Reign Services team — DFW's premier renovation contractor for residential and commercial projects.", keywords: "about Reign Services, DFW contractor" },
  { page: "Contact", route: "/contact", title: "Contact Reign Services | Free Assessment | DFW", description: "Book your free on-site assessment. Our team serves all of Dallas-Fort Worth.", keywords: "contact Reign Services, free assessment DFW" },
  { page: "Services", route: "/services", title: "Renovation Services | Reign Services DFW", description: "Custom turf, foundation repair, interior and outdoor remodeling, outdoor living spaces, and turf & pavers.", keywords: "renovation services DFW, turf and pavers, outdoor living" },
  { page: "Gallery", route: "/gallery", title: "Project Gallery | Reign Services", description: "Real projects across DFW — from backyard turf transformations to commercial installations.", keywords: "turf gallery DFW, renovation photos, outdoor living gallery" },
  { page: "Custom Turf Design & Install", route: "/custom-turf-install", title: "Custom Turf Design & Install | Reign Services DFW", description: "Bespoke artificial turf installations for residential and commercial properties across DFW.", keywords: "custom turf install DFW, artificial turf contractor, turf design Dallas" },
  { page: "Foundation Repair", route: "/foundation-repair", title: "Foundation Repair | Reign Services DFW", description: "Expert foundation repair services for homes and commercial properties across Dallas-Fort Worth.", keywords: "foundation repair DFW, foundation contractor Dallas" },
  { page: "Interior Remodeling", route: "/interior-remodeling", title: "Interior Remodeling | Reign Services DFW", description: "Complete interior renovation services across the Dallas-Fort Worth metroplex.", keywords: "interior remodeling DFW, home renovation Dallas" },
  { page: "Outdoor Remodeling", route: "/outdoor-remodeling", title: "Outdoor Remodeling | Reign Services DFW", description: "Transform your outdoor spaces with Reign Services — professional outdoor remodeling across DFW.", keywords: "outdoor remodeling DFW, backyard renovation Dallas" },
  { page: "Outdoor Living Spaces", route: "/outdoor-living", title: "Bespoke Outdoor Living Spaces | Reign Services DFW", description: "Custom outdoor living spaces — pergolas, covered patios, kitchens, and more across DFW.", keywords: "outdoor living spaces DFW, pergola contractor Dallas" },
  { page: "Turf & Pavers", route: "/turf-and-pavers", title: "Turf & Pavers | Reign Services DFW", description: "Premium turf and paver installations for pools, patios, and commercial properties across Dallas-Fort Worth.", keywords: "turf and pavers DFW, paver contractor Dallas" },
  { page: "Blog", route: "/blog", title: "Blog | Reign Services - DFW Renovation Tips", description: "Expert renovation tips, project spotlights, and industry insights from the Reign Services team.", keywords: "DFW renovation blog, turf tips, outdoor living ideas" },
  { page: "FAQ", route: "/faq", title: "FAQ | Reign Services DFW", description: "Answers to your most common questions about our renovation services and free assessment process.", keywords: "Reign Services FAQ, renovation questions DFW" },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-emerald-500/20 text-emerald-400",
};
const STATUS_COLORS: Record<string, string> = {
  tracking: "bg-[#5D3FD3]/20 text-[#5D3FD3]",
  ranking: "bg-green-500/20 text-green-400",
  testing: "bg-sky-500/20 text-sky-400",
  paused: "bg-gray-500/20 text-gray-400",
};

function SeoTab({ toast, userRole }: { toast: any; userRole: string }) {
  const isRoot = userRole === "root";

  const { data: seoData, isLoading, refetch } = useQuery<{ global: SeoGlobal | null; pages: PageSeo[] | null; keywords: SeoKeyword[] | null }>({
    queryKey: ["/api/seo"],
    queryFn: async () => {
      const res = await fetch("/api/seo", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch SEO");
      return res.json();
    },
  });

  const { data: activeServices = [] } = useQuery<Service[]>({
    queryKey: ["/api/services/public"],
  });

  const [globalForm, setGlobalForm] = useState<SeoGlobal>({ siteTitle: "", metaDescription: "", ogImageUrl: "" });
  const [pages, setPages] = useState<PageSeo[]>(DEFAULT_PAGES);
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [editPageForm, setEditPageForm] = useState<PageSeo | null>(null);
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKw, setNewKw] = useState<Omit<SeoKeyword, "id">>({ keyword: "", priority: "medium", status: "tracking", notes: "" });

  const [initialized, setInitialized] = useState(false);
  if (!initialized && seoData) {
    if (seoData.global) setGlobalForm(seoData.global);
    if (seoData.pages) setPages(seoData.pages);
    if (seoData.keywords) setKeywords(seoData.keywords);
    setInitialized(true);
  }

  const mergedPages: PageSeo[] = [
    ...pages,
    ...activeServices
      .filter((s) => s.slug && !pages.some((p) => p.route === s.slug))
      .map((s) => ({
        page: s.title,
        route: s.slug,
        title: "",
        description: "",
        keywords: "",
      })),
  ];

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const res = await fetch("/api/seo", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seo"] });
      toast({ title: "Saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleGlobalSave = () => saveMutation.mutate({ key: "seo_global", value: globalForm });

  const handlePageEdit = (route: string) => {
    const p = mergedPages.find(p => p.route === route);
    if (p) { setEditingPage(route); setEditPageForm({ ...p }); }
  };

  const handlePageSave = () => {
    if (!editPageForm) return;
    const exists = pages.some(p => p.route === editPageForm.route);
    const updated = exists
      ? pages.map(p => p.route === editPageForm.route ? editPageForm : p)
      : [...pages, editPageForm];
    setPages(updated);
    saveMutation.mutate({ key: "seo_pages", value: updated });
    setEditingPage(null);
    setEditPageForm(null);
  };

  const handleAddKeyword = () => {
    if (!newKw.keyword.trim()) return;
    const updated = [...keywords, { ...newKw, id: Date.now().toString() }];
    setKeywords(updated);
    saveMutation.mutate({ key: "seo_keywords", value: updated });
    setNewKw({ keyword: "", priority: "medium", status: "tracking", notes: "" });
    setShowAddKeyword(false);
  };

  const handleDeleteKeyword = (id: string) => {
    const updated = keywords.filter(k => k.id !== id);
    setKeywords(updated);
    saveMutation.mutate({ key: "seo_keywords", value: updated });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" /></div>;
  }

  return (
    <div className="space-y-10" data-testid="tab-seo-content">
      {!isRoot && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
          <Eye className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-400">You have view-only access to the SEO module. Contact a super admin to make changes.</p>
        </div>
      )}

      <div className="p-6 rounded-md bg-[#141416] border border-white/5" data-testid="card-seo-global">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-4 h-4 text-[#B3B3B8]/50" />
          <h3 className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 font-medium">Global Meta</h3>
        </div>
        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="text-xs text-[#B3B3B8]/50 uppercase tracking-wider block mb-1.5">Site Title Template</label>
            <Input
              value={globalForm.siteTitle}
              onChange={e => setGlobalForm(f => ({ ...f, siteTitle: e.target.value }))}
              disabled={!isRoot}
              placeholder="Reign Services - DFW's Premier Interior/Exterior Renovations Experts"
              className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm"
              data-testid="input-seo-site-title"
            />
          </div>
          <div>
            <label className="text-xs text-[#B3B3B8]/50 uppercase tracking-wider block mb-1.5">Meta Description</label>
            <Textarea
              value={globalForm.metaDescription}
              onChange={e => setGlobalForm(f => ({ ...f, metaDescription: e.target.value }))}
              disabled={!isRoot}
              placeholder="Residential and commercial renovation specialists serving the Dallas-Fort Worth metroplex..."
              className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm resize-none"
              rows={3}
              data-testid="input-seo-meta-description"
            />
            <p className="text-[10px] text-[#B3B3B8]/30 mt-1">{globalForm.metaDescription.length}/160 characters</p>
          </div>
          <div>
            <label className="text-xs text-[#B3B3B8]/50 uppercase tracking-wider block mb-1.5">OG Image URL</label>
            <Input
              value={globalForm.ogImageUrl}
              onChange={e => setGlobalForm(f => ({ ...f, ogImageUrl: e.target.value }))}
              disabled={!isRoot}
              placeholder="/og-image.png"
              className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm"
              data-testid="input-seo-og-image"
            />
          </div>
          {isRoot && (
            <Button
              className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs"
              onClick={handleGlobalSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-seo-global"
            >
              {saveMutation.isPending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}
              Save Global Meta
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 rounded-md bg-[#141416] border border-white/5" data-testid="card-seo-pages">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#B3B3B8]/50" />
            <h3 className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 font-medium">Page SEO Manager</h3>
          </div>
          <span className="text-xs text-[#B3B3B8]/30">{mergedPages.length} pages</span>
        </div>

        {editingPage && editPageForm && isRoot ? (
          <div className="space-y-4 max-w-2xl mb-6 p-4 rounded-md bg-[#0B0B0D] border border-[#5D3FD3]/20">
            <p className="text-sm font-semibold text-[#F5F5F7]">{editPageForm.page} <span className="text-[#B3B3B8]/40 text-xs font-normal">{editPageForm.route}</span></p>
            <div>
              <label className="text-xs text-[#B3B3B8]/50 block mb-1">SEO Title</label>
              <Input value={editPageForm.title} onChange={e => setEditPageForm(f => f ? { ...f, title: e.target.value } : f)}
                className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="input-edit-page-title" />
              <p className="text-[10px] text-[#B3B3B8]/30 mt-1">{editPageForm.title.length}/60</p>
            </div>
            <div>
              <label className="text-xs text-[#B3B3B8]/50 block mb-1">Meta Description</label>
              <Textarea value={editPageForm.description} onChange={e => setEditPageForm(f => f ? { ...f, description: e.target.value } : f)}
                className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm resize-none" rows={2} data-testid="input-edit-page-desc" />
              <p className="text-[10px] text-[#B3B3B8]/30 mt-1">{editPageForm.description.length}/160</p>
            </div>
            <div>
              <label className="text-xs text-[#B3B3B8]/50 block mb-1">Target Keywords (comma separated)</label>
              <Input value={editPageForm.keywords} onChange={e => setEditPageForm(f => f ? { ...f, keywords: e.target.value } : f)}
                className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="input-edit-page-keywords" />
            </div>
            <div className="flex gap-2">
              <Button className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs" onClick={handlePageSave} disabled={saveMutation.isPending} data-testid="button-save-page-seo">
                {saveMutation.isPending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}Save
              </Button>
              <Button variant="ghost" className="text-[#B3B3B8] text-xs" onClick={() => { setEditingPage(null); setEditPageForm(null); }}>Cancel</Button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {["Page", "Route", "Title", "Description", "Keywords", ...(isRoot ? [""] : [])].map(h => (
                  <th key={h} className="text-left text-xs uppercase tracking-wider text-[#B3B3B8]/50 py-3 px-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mergedPages.map((p) => (
                <tr key={p.route} className="border-b border-white/5 align-top" data-testid={`row-page-seo-${p.route.replace(/\//g, "-")}`}>
                  <td className="py-3 px-3 text-[#F5F5F7] font-medium whitespace-nowrap">{p.page}</td>
                  <td className="py-3 px-3 text-[#5D3FD3] text-xs whitespace-nowrap">{p.route}</td>
                  <td className="py-3 px-3 text-[#B3B3B8] text-xs max-w-[200px]">
                    <p className="line-clamp-2">{p.title || <span className="text-[#B3B3B8]/30 italic">Not set</span>}</p>
                  </td>
                  <td className="py-3 px-3 text-[#B3B3B8]/70 text-xs max-w-[220px]">
                    <p className="line-clamp-2">{p.description || <span className="text-[#B3B3B8]/30 italic">Not set</span>}</p>
                  </td>
                  <td className="py-3 px-3 text-[#B3B3B8]/50 text-xs max-w-[160px]">
                    <p className="line-clamp-2">{p.keywords || <span className="italic">—</span>}</p>
                  </td>
                  {isRoot && (
                    <td className="py-3 px-3">
                      <Button variant="ghost" size="icon" onClick={() => handlePageEdit(p.route)} data-testid={`button-edit-page-${p.route.replace(/\//g, "-")}`}>
                        <Pencil className="w-3.5 h-3.5 text-[#B3B3B8]/50" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 rounded-md bg-[#141416] border border-white/5" data-testid="card-seo-keywords">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#B3B3B8]/50" />
            <h3 className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50 font-medium">Keyword Tracker</h3>
          </div>
          {isRoot && (
            <Button className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs" onClick={() => setShowAddKeyword(true)} data-testid="button-add-keyword">
              <Plus className="w-3 h-3 mr-1" /> Add Keyword
            </Button>
          )}
        </div>

        {showAddKeyword && isRoot && (
          <div className="mb-6 p-4 rounded-md bg-[#0B0B0D] border border-[#5D3FD3]/20 space-y-3">
            <p className="text-xs font-semibold text-[#F5F5F7]">New Keyword</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#B3B3B8]/50 block mb-1">Keyword</label>
                <Input value={newKw.keyword} onChange={e => setNewKw(k => ({ ...k, keyword: e.target.value }))}
                  placeholder="e.g. custom turf install DFW" className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="input-new-keyword" />
              </div>
              <div>
                <label className="text-xs text-[#B3B3B8]/50 block mb-1">Notes</label>
                <Input value={newKw.notes} onChange={e => setNewKw(k => ({ ...k, notes: e.target.value }))}
                  placeholder="Target page, volume notes..." className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="input-new-keyword-notes" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#B3B3B8]/50 block mb-1">Priority</label>
                <Select value={newKw.priority} onValueChange={(v) => setNewKw(k => ({ ...k, priority: v as SeoKeyword["priority"] }))}>
                  <SelectTrigger className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs" data-testid="select-new-keyword-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141416] border-white/10">
                    <SelectItem value="high" className="text-[#F5F5F7] text-xs">High</SelectItem>
                    <SelectItem value="medium" className="text-[#F5F5F7] text-xs">Medium</SelectItem>
                    <SelectItem value="low" className="text-[#F5F5F7] text-xs">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-[#B3B3B8]/50 block mb-1">Status</label>
                <Select value={newKw.status} onValueChange={(v) => setNewKw(k => ({ ...k, status: v as SeoKeyword["status"] }))}>
                  <SelectTrigger className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs" data-testid="select-new-keyword-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141416] border-white/10">
                    <SelectItem value="tracking" className="text-[#F5F5F7] text-xs">Tracking</SelectItem>
                    <SelectItem value="ranking" className="text-[#F5F5F7] text-xs">Ranking</SelectItem>
                    <SelectItem value="testing" className="text-[#F5F5F7] text-xs">Testing</SelectItem>
                    <SelectItem value="paused" className="text-[#F5F5F7] text-xs">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs" onClick={handleAddKeyword} data-testid="button-save-keyword">Add</Button>
              <Button variant="ghost" className="text-[#B3B3B8] text-xs" onClick={() => setShowAddKeyword(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {keywords.length === 0 ? (
          <div className="text-center py-10" data-testid="text-no-keywords">
            <Target className="w-8 h-8 text-[#B3B3B8]/20 mx-auto mb-3" />
            <p className="text-[#B3B3B8]/50 text-sm">No keywords tracked yet</p>
            {isRoot && <p className="text-[#B3B3B8]/30 text-xs mt-1">Add target keywords to monitor your SEO strategy</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {keywords.map((kw) => (
              <div key={kw.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-[#0B0B0D] border border-white/5" data-testid={`row-keyword-${kw.id}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[#F5F5F7] text-sm font-medium">{kw.keyword}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${PRIORITY_COLORS[kw.priority]}`}>{kw.priority}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${STATUS_COLORS[kw.status]}`}>{kw.status}</span>
                  {kw.notes && <span className="text-xs text-[#B3B3B8]/40">{kw.notes}</span>}
                </div>
                {isRoot && (
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteKeyword(kw.id)} data-testid={`button-delete-keyword-${kw.id}`}>
                    <Trash2 className="w-3.5 h-3.5 text-[#B3B3B8]/40 hover:text-red-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Services Tab ────────────────────────────────────────────────────────────

function ServicesTab({ toast }: { toast: any }) {
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const [newTitle, setNewTitle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const createService = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/services", { title });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setNewTitle("");
      setShowAddForm(false);
      toast({ title: "Service created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-services" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50" data-testid="text-services-count">
          {services.length} service{services.length !== 1 ? "s" : ""}
        </p>
        <Button
          className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs"
          onClick={() => setShowAddForm(true)}
          data-testid="button-add-service"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Service
        </Button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 rounded-md bg-[#141416] border border-white/10 space-y-3">
          <p className="text-xs text-[#B3B3B8]/70 uppercase tracking-wider">New Service</p>
          <Input
            placeholder="Service title (e.g. Custom Turf Design & Install)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] placeholder:text-[#B3B3B8]/40 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) createService.mutate(newTitle.trim()); }}
            data-testid="input-new-service-title"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs"
              onClick={() => { if (newTitle.trim()) createService.mutate(newTitle.trim()); }}
              disabled={!newTitle.trim() || createService.isPending}
              data-testid="button-confirm-add-service"
            >
              {createService.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
            </Button>
            <Button variant="ghost" className="text-[#B3B3B8] text-xs" onClick={() => { setShowAddForm(false); setNewTitle(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <div className="text-center py-20" data-testid="text-no-services">
          <Sparkles className="w-8 h-8 text-[#B3B3B8]/20 mx-auto mb-3" />
          <p className="text-[#B3B3B8]/50 text-sm">No services yet</p>
          <p className="text-[#B3B3B8]/30 text-xs mt-1">Add services to manage your offerings</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...services].sort((a, b) => a.displayOrder - b.displayOrder).map((service, idx, sorted) => (
            <ServiceCard
              key={service.id}
              service={service}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              prevId={idx > 0 ? sorted[idx - 1].id : null}
              prevOrder={idx > 0 ? sorted[idx - 1].displayOrder : null}
              nextId={idx < sorted.length - 1 ? sorted[idx + 1].id : null}
              nextOrder={idx < sorted.length - 1 ? sorted[idx + 1].displayOrder : null}
              toast={toast}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  isFirst,
  isLast,
  prevId,
  prevOrder,
  nextId,
  nextOrder,
  toast,
}: {
  service: Service;
  isFirst: boolean;
  isLast: boolean;
  prevId: number | null;
  prevOrder: number | null;
  nextId: number | null;
  nextOrder: number | null;
  toast: any;
}) {
  const [draft, setDraft] = useState<Service>({ ...service });
  const [keyDetailInput, setKeyDetailInput] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showGenDialog, setShowGenDialog] = useState(false);
  const [genToggles, setGenToggles] = useState({
    generateDescription: true,
    generatePricing: false,
    generateKeyDetails: true,
  });

  useEffect(() => {
    setDraft({ ...service });
    setDirty(false);
  }, [service]);

  const update = useMutation({
    mutationFn: async (data: Partial<Service>) => {
      const res = await apiRequest("PATCH", `/api/services/${service.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDirty(false);
      toast({ title: "Service saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteService = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/services/${service.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const moveUp = useMutation({
    mutationFn: async () => {
      if (prevId === null || prevOrder === null) return;
      await Promise.all([
        apiRequest("PATCH", `/api/services/${service.id}`, { displayOrder: prevOrder }),
        apiRequest("PATCH", `/api/services/${prevId}`, { displayOrder: service.displayOrder }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
  });

  const moveDown = useMutation({
    mutationFn: async () => {
      if (nextId === null || nextOrder === null) return;
      await Promise.all([
        apiRequest("PATCH", `/api/services/${service.id}`, { displayOrder: nextOrder }),
        apiRequest("PATCH", `/api/services/${nextId}`, { displayOrder: service.displayOrder }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
  });

  const generateContent = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/service-content", {
        serviceTitle: draft.title,
        description: draft.description,
        ...genToggles,
      });
      return res.json();
    },
    onSuccess: (data: { description?: string; price?: string; keyDetails?: string[] }) => {
      setDraft((prev) => ({
        ...prev,
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.keyDetails !== undefined ? { keyDetails: data.keyDetails } : {}),
      }));
      setDirty(true);
      setShowGenDialog(false);
      toast({ title: "Content generated — review and save" });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  function setField<K extends keyof Service>(key: K, value: Service[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function addKeyDetail() {
    const trimmed = keyDetailInput.trim();
    if (!trimmed) return;
    setField("keyDetails", [...(draft.keyDetails || []), trimmed]);
    setKeyDetailInput("");
  }

  function removeKeyDetail(idx: number) {
    setField("keyDetails", (draft.keyDetails || []).filter((_, i) => i !== idx));
  }

  function handleSave() {
    update.mutate({
      title: draft.title,
      badge: draft.badge,
      header: draft.header,
      description: draft.description,
      keyDetails: draft.keyDetails,
      icon: draft.icon,
      slug: draft.slug,
      accentColor: draft.accentColor,
      showPrice: draft.showPrice,
      price: draft.price,
      isActive: draft.isActive,
      displayOrder: draft.displayOrder,
    });
  }

  return (
    <div
      className={`p-5 rounded-md bg-[#141416] border ${draft.isActive ? "border-white/10" : "border-white/5 opacity-60"}`}
      data-testid={`card-service-${service.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <button
              disabled={isFirst || moveUp.isPending}
              onClick={() => moveUp.mutate()}
              className="text-[#B3B3B8]/40 hover:text-[#B3B3B8] disabled:opacity-20 transition-colors"
              data-testid={`button-move-up-${service.id}`}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              disabled={isLast || moveDown.isPending}
              onClick={() => moveDown.mutate()}
              className="text-[#B3B3B8]/40 hover:text-[#B3B3B8] disabled:opacity-20 transition-colors"
              data-testid={`button-move-down-${service.id}`}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div>
            <p className="text-xs text-[#B3B3B8]/40 uppercase tracking-wider mb-1">Title</p>
            <Input
              value={draft.title}
              onChange={(e) => setField("title", e.target.value)}
              className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] font-semibold text-sm w-72"
              data-testid={`input-title-${service.id}`}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#B3B3B8]/50">Active</span>
            <Switch
              checked={draft.isActive}
              onCheckedChange={(v) => {
                setField("isActive", v);
                update.mutate({ isActive: v });
              }}
              data-testid={`switch-active-${service.id}`}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#B3B3B8]/40 hover:text-[#5D3FD3]"
            onClick={() => setShowGenDialog(true)}
            data-testid={`button-generate-${service.id}`}
          >
            <Wand2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#B3B3B8]/40 hover:text-red-400"
            onClick={() => deleteService.mutate()}
            disabled={deleteService.isPending}
            data-testid={`button-delete-service-${service.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-[#B3B3B8]/40 uppercase tracking-wider mb-1">Badge / Tag line</p>
          <Input
            value={draft.badge}
            onChange={(e) => setField("badge", e.target.value)}
            placeholder="e.g. Residential & Commercial"
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm placeholder:text-[#B3B3B8]/30"
            data-testid={`input-badge-${service.id}`}
          />
        </div>
        <div>
          <p className="text-xs text-[#B3B3B8]/40 uppercase tracking-wider mb-1">Header / Subtitle</p>
          <Input
            value={draft.header}
            onChange={(e) => setField("header", e.target.value)}
            placeholder="Section headline on the service page"
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm placeholder:text-[#B3B3B8]/30"
            data-testid={`input-header-${service.id}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-xs text-[#B3B3B8]/40 uppercase tracking-wider mb-1">Icon Name</p>
          <Input
            value={draft.icon ?? ""}
            onChange={(e) => setField("icon", e.target.value)}
            placeholder="e.g. Leaf, Home, Wrench, Sun"
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm placeholder:text-[#B3B3B8]/30"
            data-testid={`input-icon-${service.id}`}
          />
        </div>
        <div>
          <p className="text-xs text-[#B3B3B8]/40 uppercase tracking-wider mb-1">Page Slug</p>
          <Input
            value={draft.slug ?? ""}
            onChange={(e) => setField("slug", e.target.value)}
            placeholder="e.g. /custom-turf-install"
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm placeholder:text-[#B3B3B8]/30"
            data-testid={`input-slug-${service.id}`}
          />
        </div>
        <div>
          <p className="text-xs text-[#B3B3B8]/40 uppercase tracking-wider mb-1">Accent Color</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.accentColor ?? "#5D3FD3"}
              onChange={(e) => setField("accentColor", e.target.value)}
              className="w-9 h-9 rounded cursor-pointer border border-white/10 bg-transparent"
              data-testid={`input-color-${service.id}`}
            />
            <Input
              value={draft.accentColor ?? ""}
              onChange={(e) => setField("accentColor", e.target.value)}
              placeholder="#5D3FD3"
              className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm placeholder:text-[#B3B3B8]/30"
              data-testid={`input-color-text-${service.id}`}
            />
          </div>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-xs text-[#B3B3B8]/40 uppercase tracking-wider mb-1">Description</p>
        <Textarea
          value={draft.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Marketing description of the service…"
          rows={4}
          className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm placeholder:text-[#B3B3B8]/30 resize-none"
          data-testid={`textarea-description-${service.id}`}
        />
      </div>

      <div className="mb-3">
        <p className="text-xs text-[#B3B3B8]/40 uppercase tracking-wider mb-2">Key Details / Feature Bullets</p>
        <div className="space-y-1.5 mb-2">
          {(draft.keyDetails || []).map((kd, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded bg-[#0B0B0D] border border-white/5" data-testid={`key-detail-${service.id}-${i}`}>
              <span className="flex-1 text-sm text-[#F5F5F7]">{kd}</span>
              <button onClick={() => removeKeyDetail(i)} className="text-[#B3B3B8]/40 hover:text-red-400 transition-colors" data-testid={`button-remove-detail-${service.id}-${i}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={keyDetailInput}
            onChange={(e) => setKeyDetailInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyDetail(); } }}
            placeholder="Add a feature bullet…"
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm placeholder:text-[#B3B3B8]/30"
            data-testid={`input-key-detail-${service.id}`}
          />
          <Button
            variant="ghost"
            className="text-[#B3B3B8] border border-white/10 text-xs px-3"
            onClick={addKeyDetail}
            data-testid={`button-add-detail-${service.id}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <p className="text-xs text-[#B3B3B8]/40 uppercase tracking-wider">Show Price</p>
          <Switch
            checked={draft.showPrice}
            onCheckedChange={(v) => setField("showPrice", v)}
            data-testid={`switch-show-price-${service.id}`}
          />
        </div>
        {draft.showPrice && (
          <Input
            value={draft.price || ""}
            onChange={(e) => setField("price", e.target.value)}
            placeholder="e.g. Starting at $8/sq ft"
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm placeholder:text-[#B3B3B8]/30"
            data-testid={`input-price-${service.id}`}
          />
        )}
      </div>

      {dirty && (
        <div className="flex justify-end">
          <Button
            className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs"
            onClick={handleSave}
            disabled={update.isPending}
            data-testid={`button-save-service-${service.id}`}
          >
            {update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save
          </Button>
        </div>
      )}

      {showGenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid={`dialog-generate-${service.id}`}>
          <div className="bg-[#141416] border border-white/10 rounded-lg p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#5D3FD3]" />
                <p className="text-sm font-semibold text-[#F5F5F7]">Generate Content</p>
              </div>
              <button onClick={() => setShowGenDialog(false)} className="text-[#B3B3B8]/50 hover:text-[#B3B3B8] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#B3B3B8]/50 mb-5 leading-relaxed">
              AI will write copy for <span className="text-[#F5F5F7] font-medium">{draft.title}</span>. Select what to generate:
            </p>
            <div className="space-y-3 mb-6">
              <label className="flex items-center justify-between cursor-pointer" data-testid="toggle-gen-description">
                <span className="text-sm text-[#F5F5F7]">Description</span>
                <Switch
                  checked={genToggles.generateDescription}
                  onCheckedChange={(v) => setGenToggles((prev) => ({ ...prev, generateDescription: v }))}
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer" data-testid="toggle-gen-pricing">
                <span className="text-sm text-[#F5F5F7]">Pricing copy</span>
                <Switch
                  checked={genToggles.generatePricing}
                  onCheckedChange={(v) => setGenToggles((prev) => ({ ...prev, generatePricing: v }))}
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer" data-testid="toggle-gen-key-details">
                <span className="text-sm text-[#F5F5F7]">Key details / bullets</span>
                <Switch
                  checked={genToggles.generateKeyDetails}
                  onCheckedChange={(v) => setGenToggles((prev) => ({ ...prev, generateKeyDetails: v }))}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-sm"
                onClick={() => generateContent.mutate()}
                disabled={generateContent.isPending || (!genToggles.generateDescription && !genToggles.generatePricing && !genToggles.generateKeyDetails)}
                data-testid={`button-confirm-generate-${service.id}`}
              >
                {generateContent.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating…</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" />Generate</>
                )}
              </Button>
              <Button variant="ghost" className="text-[#B3B3B8] text-sm" onClick={() => setShowGenDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type GallerySectionWithItems = GallerySection & { items: GalleryItem[] };

function GalleryTab({ toast }: { toast: any }) {
  const adminGallery = useQuery<{ sections: GallerySectionWithItems[] }>({
    queryKey: ["/api/gallery/admin"],
  });

  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [addSectionName, setAddSectionName] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [renamingSectionId, setRenamingSectionId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [itemDraft, setItemDraft] = useState<{ src: string; alt: string; badge: string }>({ src: "", alt: "", badge: "" });
  const [addItemDraft, setAddItemDraft] = useState<{ src: string; alt: string; badge: string; displayOrder: string }>({ src: "", alt: "", badge: "", displayOrder: "" });
  const [addingItemToSection, setAddingItemToSection] = useState<number | null>(null);

  const allSections = adminGallery.data?.sections ?? [];

  const invalidateGallery = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/gallery/admin"] });
    queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    queryClient.invalidateQueries({ queryKey: ["/api/gallery/sections"] });
  };

  const createSection = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = allSections.length > 0 ? Math.max(...allSections.map((s) => s.displayOrder)) + 1 : 0;
      await apiRequest("POST", "/api/gallery/sections", { name, displayOrder: maxOrder });
    },
    onSuccess: () => {
      invalidateGallery();
      setAddSectionName("");
      setAddingSection(false);
      toast({ title: "Section created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<GallerySection>) => {
      await apiRequest("PATCH", `/api/gallery/sections/${id}`, data);
    },
    onSuccess: () => { invalidateGallery(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSection = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gallery/sections/${id}`);
    },
    onSuccess: () => {
      invalidateGallery();
      toast({ title: "Section deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createItem = useMutation({
    mutationFn: async ({ sectionId, src, alt, badge, displayOrder }: { sectionId: number; src: string; alt: string; badge: string; displayOrder: string }) => {
      const parsed = parseInt(displayOrder);
      const sectionItems = allSections.find((s) => s.id === sectionId)?.items ?? [];
      const order = isNaN(parsed) ? (sectionItems.length > 0 ? Math.max(...sectionItems.map((i) => i.displayOrder)) + 1 : 0) : parsed;
      await apiRequest("POST", "/api/gallery/items", { sectionId, src, alt, badge: badge || null, displayOrder: order });
    },
    onSuccess: () => {
      invalidateGallery();
      setAddingItemToSection(null);
      setAddItemDraft({ src: "", alt: "", badge: "", displayOrder: "" });
      toast({ title: "Image added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<GalleryItem>) => {
      await apiRequest("PATCH", `/api/gallery/items/${id}`, data);
    },
    onSuccess: () => {
      invalidateGallery();
      setEditingItem(null);
      toast({ title: "Image updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gallery/items/${id}`);
    },
    onSuccess: () => {
      invalidateGallery();
      toast({ title: "Image removed" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function swapSectionOrder(sectionId: number, direction: "up" | "down") {
    const sorted = [...allSections].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((s) => s.id === sectionId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;
    const swapWith = direction === "up" ? sorted[idx - 1] : sorted[idx + 1];
    const curr = sorted[idx];
    updateSection.mutate({ id: curr.id, displayOrder: swapWith.displayOrder });
    updateSection.mutate({ id: swapWith.id, displayOrder: curr.displayOrder });
  }

  function swapItemOrder(sectionId: number, itemId: number, direction: "up" | "down") {
    const items = [...(allSections.find((s) => s.id === sectionId)?.items ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = items.findIndex((i) => i.id === itemId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === items.length - 1) return;
    const swapWith = direction === "up" ? items[idx - 1] : items[idx + 1];
    const curr = items[idx];
    updateItem.mutate({ id: curr.id, displayOrder: swapWith.displayOrder });
    updateItem.mutate({ id: swapWith.id, displayOrder: curr.displayOrder });
  }

  if (adminGallery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#5D3FD3] animate-spin" data-testid="loader-gallery" />
      </div>
    );
  }

  const sortedSections = [...allSections].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[#B3B3B8]/50">
          {allSections.length} section{allSections.length !== 1 ? "s" : ""}
        </p>
        <Button
          className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs"
          onClick={() => setAddingSection(true)}
          data-testid="button-add-section"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Section
        </Button>
      </div>

      {addingSection && (
        <div className="p-5 rounded-md bg-[#141416] border border-white/10 space-y-3">
          <p className="text-xs uppercase tracking-wider text-[#B3B3B8]/50">New Section</p>
          <Input
            value={addSectionName}
            onChange={(e) => setAddSectionName(e.target.value)}
            placeholder="Section name (e.g. Foundation Repair)"
            className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm"
            data-testid="input-new-section-name"
          />
          <div className="flex gap-2">
            <Button
              className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs"
              disabled={!addSectionName.trim() || createSection.isPending}
              onClick={() => createSection.mutate(addSectionName.trim())}
              data-testid="button-confirm-add-section"
            >
              {createSection.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
            </Button>
            <Button variant="ghost" className="text-[#B3B3B8] text-xs" onClick={() => { setAddingSection(false); setAddSectionName(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {sortedSections.map((section, sIdx) => {
        const sectionItems = [...(section.items)].sort((a, b) => a.displayOrder - b.displayOrder);
        const isExpanded = expandedSection === section.id;
        const isRenaming = renamingSectionId === section.id;

        return (
          <div
            key={section.id}
            className="rounded-md bg-[#141416] border border-white/5 overflow-hidden"
            data-testid={`card-section-${section.id}`}
          >
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => swapSectionOrder(section.id, "up")}
                  disabled={sIdx === 0}
                  className="p-1 text-[#B3B3B8]/40 hover:text-[#B3B3B8] disabled:opacity-20 transition-colors"
                  data-testid={`button-section-up-${section.id}`}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => swapSectionOrder(section.id, "down")}
                  disabled={sIdx === sortedSections.length - 1}
                  className="p-1 text-[#B3B3B8]/40 hover:text-[#B3B3B8] disabled:opacity-20 transition-colors"
                  data-testid={`button-section-down-${section.id}`}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {isRenaming ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    autoFocus
                    className="bg-[#0B0B0D] border-white/10 text-[#F5F5F7] text-sm h-8"
                    data-testid={`input-rename-section-${section.id}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateSection.mutate({ id: section.id, name: renameDraft });
                        setRenamingSectionId(null);
                      }
                      if (e.key === "Escape") setRenamingSectionId(null);
                    }}
                  />
                  <Button
                    className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs h-8 px-3"
                    disabled={!renameDraft.trim() || updateSection.isPending}
                    onClick={() => { updateSection.mutate({ id: section.id, name: renameDraft }); setRenamingSectionId(null); }}
                    data-testid={`button-confirm-rename-section-${section.id}`}
                  >
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" className="text-[#B3B3B8] text-xs h-8 px-2" onClick={() => setRenamingSectionId(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  className="flex-1 flex items-center gap-3 text-left"
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  data-testid={`button-expand-section-${section.id}`}
                >
                  <span className="text-sm font-medium text-[#F5F5F7]">{section.name}</span>
                  <span className="text-xs text-[#B3B3B8]/40">{sectionItems.length} images</span>
                </button>
              )}

              {!isRenaming && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setRenamingSectionId(section.id); setRenameDraft(section.name); }}
                    className="p-1 text-[#B3B3B8]/40 hover:text-[#B3B3B8] transition-colors"
                    data-testid={`button-rename-section-${section.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#B3B3B8]/40 uppercase tracking-wider">Active</span>
                    <Switch
                      checked={section.isActive}
                      onCheckedChange={(v) => updateSection.mutate({ id: section.id, isActive: v })}
                      data-testid={`switch-section-active-${section.id}`}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!confirm(`Delete section "${section.name}" and all its images?`)) return;
                      deleteSection.mutate(section.id);
                    }}
                    className="text-[#B3B3B8]/40 hover:text-red-400 transition-colors"
                    data-testid={`button-delete-section-${section.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                    className="text-[#B3B3B8]/40 hover:text-[#B3B3B8] transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-white/5 px-5 py-4 space-y-3">
                {sectionItems.length === 0 && (
                  <p className="text-sm text-[#B3B3B8]/40 italic" data-testid={`text-no-items-${section.id}`}>No images in this section.</p>
                )}
                {sectionItems.map((item, iIdx) => (
                  <div
                    key={item.id}
                    className={`rounded-md border overflow-hidden ${item.isActive ? "bg-[#0B0B0D] border-white/5" : "bg-[#0B0B0D]/50 border-white/5 opacity-60"}`}
                    data-testid={`card-item-${item.id}`}
                  >
                    {editingItem === item.id ? (
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          {itemDraft.src && (
                            <img src={itemDraft.src} alt="" className="w-14 h-10 object-cover rounded flex-shrink-0" />
                          )}
                          <div className="flex-1 space-y-2">
                            <Input
                              value={itemDraft.src}
                              onChange={(e) => setItemDraft((d) => ({ ...d, src: e.target.value }))}
                              placeholder="/gallery/image.jpg"
                              className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs"
                              data-testid={`input-item-src-${item.id}`}
                            />
                            <Input
                              value={itemDraft.alt}
                              onChange={(e) => setItemDraft((d) => ({ ...d, alt: e.target.value }))}
                              placeholder="Alt text"
                              className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs"
                              data-testid={`input-item-alt-${item.id}`}
                            />
                            <Input
                              value={itemDraft.badge}
                              onChange={(e) => setItemDraft((d) => ({ ...d, badge: e.target.value }))}
                              placeholder="Badge — optional (Before / After / In Progress)"
                              className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs"
                              data-testid={`input-item-badge-${item.id}`}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs"
                            disabled={updateItem.isPending}
                            onClick={() => updateItem.mutate({ id: item.id, src: itemDraft.src, alt: itemDraft.alt, badge: itemDraft.badge || null })}
                            data-testid={`button-save-item-${item.id}`}
                          >
                            {updateItem.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                            Save
                          </Button>
                          <Button variant="ghost" className="text-[#B3B3B8] text-xs" onClick={() => setEditingItem(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3 p-3">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => swapItemOrder(section.id, item.id, "up")}
                            disabled={iIdx === 0}
                            className="p-0.5 text-[#B3B3B8]/30 hover:text-[#B3B3B8] disabled:opacity-20 transition-colors"
                            data-testid={`button-item-up-${item.id}`}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => swapItemOrder(section.id, item.id, "down")}
                            disabled={iIdx === sectionItems.length - 1}
                            className="p-0.5 text-[#B3B3B8]/30 hover:text-[#B3B3B8] disabled:opacity-20 transition-colors"
                            data-testid={`button-item-down-${item.id}`}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        <img
                          src={item.src}
                          alt={item.alt}
                          className="w-14 h-10 object-cover rounded flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#F5F5F7] truncate">{item.alt}</p>
                          <p className="text-[10px] text-[#B3B3B8]/40 truncate">{item.src}</p>
                          {item.badge && (
                            <Badge className="mt-1 bg-[#5D3FD3]/20 text-[#5D3FD3] border-0 no-default-hover-elevate no-default-active-elevate text-[10px]">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={(v) => updateItem.mutate({ id: item.id, isActive: v })}
                            data-testid={`switch-item-active-${item.id}`}
                          />
                          <button
                            onClick={() => {
                              setEditingItem(item.id);
                              setItemDraft({ src: item.src, alt: item.alt, badge: item.badge ?? "" });
                            }}
                            className="p-1 text-[#B3B3B8]/40 hover:text-[#B3B3B8] transition-colors"
                            data-testid={`button-edit-item-${item.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm("Remove this image?")) return;
                              deleteItem.mutate(item.id);
                            }}
                            className="p-1 text-[#B3B3B8]/40 hover:text-red-400 transition-colors"
                            data-testid={`button-delete-item-${item.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {addingItemToSection === section.id ? (
                  <div className="rounded-md bg-[#0B0B0D] border border-dashed border-white/10 p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[#B3B3B8]/40">New Image</p>
                    <Input
                      value={addItemDraft.src}
                      onChange={(e) => setAddItemDraft((d) => ({ ...d, src: e.target.value }))}
                      placeholder="/gallery/image.jpg (path or URL)"
                      className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs"
                      data-testid={`input-new-item-src-${section.id}`}
                    />
                    <Input
                      value={addItemDraft.alt}
                      onChange={(e) => setAddItemDraft((d) => ({ ...d, alt: e.target.value }))}
                      placeholder="Alt text / description"
                      className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs"
                      data-testid={`input-new-item-alt-${section.id}`}
                    />
                    <Input
                      value={addItemDraft.badge}
                      onChange={(e) => setAddItemDraft((d) => ({ ...d, badge: e.target.value }))}
                      placeholder="Badge label — optional (Before / After / In Progress)"
                      className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs"
                      data-testid={`input-new-item-badge-${section.id}`}
                    />
                    <Input
                      value={addItemDraft.displayOrder}
                      onChange={(e) => setAddItemDraft((d) => ({ ...d, displayOrder: e.target.value }))}
                      placeholder={`Display order (leave blank to append after ${sectionItems.length > 0 ? sectionItems[sectionItems.length - 1].displayOrder : 0})`}
                      type="number"
                      className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs"
                      data-testid={`input-new-item-order-${section.id}`}
                    />
                    <div className="flex gap-2 pt-1">
                      <Button
                        className="bg-[#5D3FD3] hover:bg-[#4a32a8] text-white border-0 text-xs"
                        disabled={!addItemDraft.src.trim() || !addItemDraft.alt.trim() || createItem.isPending}
                        onClick={() => createItem.mutate({ sectionId: section.id, ...addItemDraft })}
                        data-testid={`button-confirm-add-item-${section.id}`}
                      >
                        {createItem.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                        Add Image
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-[#B3B3B8] text-xs"
                        onClick={() => { setAddingItemToSection(null); setAddItemDraft({ src: "", alt: "", badge: "", displayOrder: "" }); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full py-3 rounded-md border border-dashed border-white/10 text-xs text-[#B3B3B8]/40 hover:text-[#B3B3B8] hover:border-white/20 transition-colors"
                    onClick={() => { setAddingItemToSection(section.id); setAddItemDraft({ src: "", alt: "", badge: "", displayOrder: "" }); }}
                    data-testid={`button-add-item-${section.id}`}
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    Add Image
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ShopTab ──────────────────────────────────────────────────────────────────

function ShopTab({ toast }: { toast: any }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const [form, setForm] = useState({
    title: "", medium: "", dimensions: "", year: "", description: "", imageUrl: "",
    enhancedImageUrl: "", price: "", forSale: false, category: "Abstract", featured: false,
    seoTitle: "", seoDescription: "", status: "draft",
  });

  const resetForm = () => {
    setForm({ title: "", medium: "", dimensions: "", year: "", description: "", imageUrl: "", enhancedImageUrl: "", price: "", forSale: false, category: "Abstract", featured: false, seoTitle: "", seoDescription: "", status: "draft" });
    setAiResult(null);
    setCapturedImage(null);
    setEditingId(null);
  };

  const { data: artworks, isLoading } = useQuery<Artwork[]>({
    queryKey: ["/api/artworks"],
    queryFn: () => fetch("/api/artworks").then((r) => r.json()),
  });

  const createArtwork = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/artworks", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/artworks"] }); toast({ title: "Artwork created" }); setShowCreate(false); resetForm(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateArtwork = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/artworks/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/artworks"] }); toast({ title: "Artwork updated" }); setEditingId(null); resetForm(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteArtwork = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/artworks/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/artworks"] }); toast({ title: "Artwork deleted" }); },
  });

  const uploadImage = async (base64: string, name: string) => {
    const r = await apiRequest("POST", "/api/upload", { imageData: base64, filename: name });
    const j = await r.json();
    return j.url as string;
  };

  const handleEnhance = async () => {
    const imageUrl = form.imageUrl || capturedImage;
    if (!imageUrl) return toast({ title: "Upload or capture an image first", variant: "destructive" });
    setEnhancing(true);
    try {
      let url = imageUrl;
      if (imageUrl.startsWith("data:")) {
        url = await uploadImage(imageUrl, form.title || "artwork");
        setForm((f) => ({ ...f, imageUrl: url }));
      }
      const r = await apiRequest("POST", "/api/ai/enhance-artwork", { imageUrl: url, title: form.title, medium: form.medium, dimensions: form.dimensions });
      const json = await r.json();
      setAiResult(json);
      setForm((f) => ({ ...f, description: json.description || f.description, seoTitle: json.seoTitle || f.seoTitle, seoDescription: json.seoDescription || f.seoDescription, price: json.suggestedPrice ? String(json.suggestedPrice) : f.price }));
      toast({ title: "AI analysis complete", description: `Capture score: ${json.captureScore}/100` });
    } catch (e: any) {
      toast({ title: "AI analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setEnhancing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const data = ev.target?.result as string; setCapturedImage(data); setForm((f) => ({ ...f, imageUrl: data })); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    let imageUrl = form.imageUrl;
    let enhancedImageUrl = form.enhancedImageUrl;
    if (imageUrl && imageUrl.startsWith("data:")) imageUrl = await uploadImage(imageUrl, form.title || "artwork");
    if (enhancedImageUrl && enhancedImageUrl.startsWith("data:")) enhancedImageUrl = await uploadImage(enhancedImageUrl, (form.title || "artwork") + "-enhanced");
    const payload = { ...form, imageUrl, enhancedImageUrl, year: form.year ? parseInt(form.year) : null, price: form.price || null };
    if (editingId) { updateArtwork.mutate({ id: editingId, data: payload }); } else { createArtwork.mutate(payload); }
  };

  const startEdit = (artwork: Artwork) => {
    setEditingId(artwork.id);
    setForm({ title: artwork.title, medium: artwork.medium || "", dimensions: artwork.dimensions || "", year: artwork.year ? String(artwork.year) : "", description: artwork.description || "", imageUrl: artwork.imageUrl || "", enhancedImageUrl: artwork.enhancedImageUrl || "", price: artwork.price ? String(artwork.price) : "", forSale: artwork.forSale ?? false, category: artwork.category || "Abstract", featured: artwork.featured ?? false, seoTitle: artwork.seoTitle || "", seoDescription: artwork.seoDescription || "", status: artwork.status || "draft" });
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6" data-testid="tab-shop-content">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-[#F5F5F7]">Artwork Manager</h2>
          <p className="text-[#B3B3B8]/50 text-xs mt-0.5">Create, edit, and publish original works for sale</p>
        </div>
        <Button className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs" onClick={() => { resetForm(); setShowCreate(true); }} data-testid="button-create-artwork">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add Artwork
        </Button>
      </div>

      {(showCreate || editingId !== null) && (
        <div className="border border-white/10 rounded-sm p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[#F5F5F7] font-medium text-sm">{editingId ? "Edit Artwork" : "New Artwork"}</h3>
            <button onClick={() => { setShowCreate(false); resetForm(); }} className="text-[#B3B3B8]/40 hover:text-[#B3B3B8]"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em] block mb-2">Artwork Image</label>
                {form.imageUrl && !form.imageUrl.startsWith("data:") ? (
                  <div className="relative aspect-[3/4] rounded-sm overflow-hidden bg-[#1a1225] mb-3">
                    <img src={form.imageUrl} alt="Artwork" className="w-full h-full object-cover" />
                    <button className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-sm" onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}><X className="w-3 h-3" /></button>
                  </div>
                ) : capturedImage ? (
                  <div className="relative aspect-[3/4] rounded-sm overflow-hidden bg-[#1a1225] mb-3">
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                    <button className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-sm" onClick={() => { setCapturedImage(null); setForm((f) => ({ ...f, imageUrl: "" })); }}><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <div className="aspect-[3/4] rounded-sm border border-dashed border-white/15 bg-[#141416] flex flex-col items-center justify-center mb-3 relative overflow-hidden">
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                      <Image className="w-8 h-8 text-white/15 mb-2" />
                      <span className="text-[#B3B3B8]/40 text-xs text-center px-4">Click to upload or drag & drop</span>
                      <span className="text-[#B3B3B8]/25 text-[10px] mt-1">JPG, PNG, WEBP</span>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} data-testid="input-artwork-image-file" />
                    </label>
                  </div>
                )}
                <Input placeholder="Or paste image URL" value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs" data-testid="input-artwork-image-url" />
              </div>

              <div className="space-y-2">
                <Button className="w-full bg-[#C084FC]/20 hover:bg-[#C084FC]/30 text-[#C084FC] border border-[#C084FC]/30 text-xs" onClick={handleEnhance} disabled={enhancing || (!form.imageUrl && !capturedImage)} data-testid="button-ai-enhance">
                  {enhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  {enhancing ? "Analyzing artwork..." : "AI Analyze & Generate Description"}
                </Button>
                {aiResult && (
                  <div className="border border-[#C084FC]/20 rounded-sm p-3 text-xs space-y-1" style={{ background: "rgba(192,132,252,0.05)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C084FC] font-medium">AI Analysis</span>
                      <span className={`text-xs ${(aiResult.captureScore || 0) >= 80 ? "text-green-400" : (aiResult.captureScore || 0) >= 60 ? "text-amber-400" : "text-red-400"}`}>Photo: {aiResult.captureScore}/100</span>
                    </div>
                    {aiResult.captureNotes && <p className="text-[#B3B3B8]/60">{aiResult.captureNotes}</p>}
                    {aiResult.suggestedPrice && <p className="text-[#C084FC]/80">Suggested price: ${aiResult.suggestedPrice?.toLocaleString()}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em] block mb-1">Title *</label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Artwork title" className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="input-artwork-title" />
                </div>
                <div>
                  <label className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em] block mb-1">Category</label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="select-artwork-category"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#141416] border-white/10">{artworkCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em] block mb-1">Medium</label>
                  <Input value={form.medium} onChange={(e) => setForm((f) => ({ ...f, medium: e.target.value }))} placeholder="Oil on canvas" className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="input-artwork-medium" />
                </div>
                <div>
                  <label className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em] block mb-1">Dimensions</label>
                  <Input value={form.dimensions} onChange={(e) => setForm((f) => ({ ...f, dimensions: e.target.value }))} placeholder='24"×36"' className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="input-artwork-dimensions" />
                </div>
                <div>
                  <label className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em] block mb-1">Year</label>
                  <Input value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} placeholder="2024" className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="input-artwork-year" />
                </div>
              </div>

              <div>
                <label className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em] block mb-1">Description</label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Written or AI-generated artwork description" rows={5} className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm resize-none" data-testid="textarea-artwork-description" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em] block mb-1">Price (USD)</label>
                  <Input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="2500" type="number" className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="input-artwork-price" />
                </div>
                <div>
                  <label className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em] block mb-1">Status</label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="select-artwork-status"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#141416] border-white/10">
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.forSale} onCheckedChange={(v) => setForm((f) => ({ ...f, forSale: v }))} data-testid="switch-artwork-forsale" />
                  <label className="text-[#B3B3B8]/70 text-xs">For Sale</label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} data-testid="switch-artwork-featured" />
                  <label className="text-[#B3B3B8]/70 text-xs">Featured on Home</label>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-2">
                <label className="text-[#B3B3B8]/40 text-[10px] uppercase tracking-[0.15em] block">SEO (auto-generated by AI)</label>
                <Input value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} placeholder="SEO title" className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs" data-testid="input-artwork-seo-title" />
                <Input value={form.seoDescription} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} placeholder="SEO description" className="bg-[#141416] border-white/10 text-[#F5F5F7] text-xs" data-testid="input-artwork-seo-desc" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs flex-1" disabled={!form.title || createArtwork.isPending || updateArtwork.isPending} onClick={handleSave} data-testid="button-save-artwork">
                  {(createArtwork.isPending || updateArtwork.isPending) ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  {editingId ? "Update Artwork" : "Save Artwork"}
                </Button>
                <Button variant="ghost" className="text-[#B3B3B8] text-xs border border-white/10" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[#C084FC] animate-spin" /></div>
      ) : !artworks?.length ? (
        <div className="text-center py-16 border border-white/8 rounded-sm">
          <Palette className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-[#B3B3B8]/40 text-sm">No artworks yet. Add your first piece.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {artworks.map((artwork) => (
            <div key={artwork.id} className="border border-white/8 rounded-sm overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }} data-testid={`card-admin-artwork-${artwork.id}`}>
              <div className="aspect-[3/4] bg-[#1a1225] relative">
                {artwork.enhancedImageUrl || artwork.imageUrl ? (
                  <img src={artwork.enhancedImageUrl || artwork.imageUrl} alt={artwork.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Palette className="w-6 h-6 text-white/10" /></div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className={`text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-sm ${artwork.status === "published" ? "bg-green-500/20 text-green-400" : artwork.status === "archived" ? "bg-gray-500/20 text-gray-400" : "bg-amber-500/20 text-amber-400"}`}>{artwork.status}</span>
                  {artwork.forSale && !artwork.sold && <span className="text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-sm bg-[#C084FC]/20 text-[#C084FC]">For Sale</span>}
                  {artwork.sold && <span className="text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-sm bg-gray-500/20 text-gray-400">Sold</span>}
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.15em] text-[#B3B3B8]/40">{artwork.category}</p>
                  <h4 className="text-[#F5F5F7] text-sm font-medium leading-tight">{artwork.title}</h4>
                  {artwork.medium && <p className="text-[#B3B3B8]/40 text-xs">{artwork.medium}</p>}
                  {artwork.price && <p className="text-[#C084FC] text-sm">${parseFloat(String(artwork.price)).toLocaleString()}</p>}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <Button variant="ghost" className="text-[#B3B3B8] text-[10px] px-2 py-1 h-auto border border-white/10" onClick={() => startEdit(artwork)} data-testid={`button-edit-artwork-${artwork.id}`}>
                    <Pencil className="w-3 h-3 mr-1" />Edit
                  </Button>
                  {artwork.status !== "published" && (
                    <Button variant="ghost" className="text-green-400 text-[10px] px-2 py-1 h-auto border border-green-500/20" onClick={() => updateArtwork.mutate({ id: artwork.id, data: { status: "published" } })} data-testid={`button-publish-artwork-${artwork.id}`}>
                      <Globe className="w-3 h-3 mr-1" />Publish
                    </Button>
                  )}
                  <Button variant="ghost" className="text-red-400 text-[10px] px-2 py-1 h-auto border border-red-500/20" onClick={() => { if (confirm("Delete artwork?")) deleteArtwork.mutate(artwork.id); }} data-testid={`button-delete-artwork-${artwork.id}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── OrdersTab ─────────────────────────────────────────────────────────────────

function OrdersTab({ toast }: { toast: any }) {
  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    queryFn: () => fetch("/api/orders").then((r) => r.json()),
  });

  return (
    <div className="space-y-4" data-testid="tab-orders-content">
      <div>
        <h2 className="text-lg font-medium text-[#F5F5F7]">Orders</h2>
        <p className="text-[#B3B3B8]/50 text-xs mt-0.5">Artwork purchases and sales records</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[#C084FC] animate-spin" /></div>
      ) : !orders?.length ? (
        <div className="text-center py-16 border border-white/8 rounded-sm">
          <DollarSign className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-[#B3B3B8]/40 text-sm">No orders yet.</p>
          <p className="text-[#B3B3B8]/25 text-xs mt-1">Orders will appear here when collectors purchase through your shop.</p>
        </div>
      ) : (
        <div className="border border-white/8 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <th className="text-left px-4 py-3 text-[#B3B3B8]/50 text-xs uppercase tracking-[0.15em] font-medium">Artwork</th>
                <th className="text-left px-4 py-3 text-[#B3B3B8]/50 text-xs uppercase tracking-[0.15em] font-medium">Buyer</th>
                <th className="text-left px-4 py-3 text-[#B3B3B8]/50 text-xs uppercase tracking-[0.15em] font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-[#B3B3B8]/50 text-xs uppercase tracking-[0.15em] font-medium">Status</th>
                <th className="text-left px-4 py-3 text-[#B3B3B8]/50 text-xs uppercase tracking-[0.15em] font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} className="border-b border-white/5" data-testid={`row-order-${order.id}`}>
                  <td className="px-4 py-3 text-[#F5F5F7] text-xs">Artwork #{order.artworkId}</td>
                  <td className="px-4 py-3"><p className="text-[#F5F5F7] text-xs">{order.buyerName}</p><p className="text-[#B3B3B8]/40 text-[10px]">{order.buyerEmail}</p></td>
                  <td className="px-4 py-3 text-[#C084FC] text-xs">${parseFloat(String(order.amount || 0)).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm ${order.status === "paid" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>{order.status}</span></td>
                  <td className="px-4 py-3 text-[#B3B3B8]/40 text-xs">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── PagesTab ──────────────────────────────────────────────────────────────────

function PagesTab({ toast }: { toast: any }) {
  const { data: pages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/pages"],
    queryFn: () => fetch("/api/pages").then((r) => r.json()),
  });

  const deletePage = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pages/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pages"] }); toast({ title: "Page removed from registry" }); },
  });

  return (
    <div className="space-y-4" data-testid="tab-pages-content">
      <div>
        <h2 className="text-lg font-medium text-[#F5F5F7]">Page Registry</h2>
        <p className="text-[#B3B3B8]/50 text-xs mt-0.5">All indexed pages — auto-populated when artworks and posts are published</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[#C084FC] animate-spin" /></div>
      ) : !pages?.length ? (
        <div className="text-center py-16 border border-white/8 rounded-sm">
          <FileCheck className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-[#B3B3B8]/40 text-sm">No pages registered yet.</p>
          <p className="text-[#B3B3B8]/25 text-xs mt-1">Pages are auto-created when artworks and blog posts are published.</p>
        </div>
      ) : (
        <div className="border border-white/8 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <th className="text-left px-4 py-3 text-[#B3B3B8]/50 text-xs uppercase tracking-[0.15em] font-medium">Page</th>
                <th className="text-left px-4 py-3 text-[#B3B3B8]/50 text-xs uppercase tracking-[0.15em] font-medium">Type</th>
                <th className="text-left px-4 py-3 text-[#B3B3B8]/50 text-xs uppercase tracking-[0.15em] font-medium">Slug</th>
                <th className="text-left px-4 py-3 text-[#B3B3B8]/50 text-xs uppercase tracking-[0.15em] font-medium">Status</th>
                <th className="text-left px-4 py-3 text-[#B3B3B8]/50 text-xs uppercase tracking-[0.15em] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page: any) => (
                <tr key={page.id} className="border-b border-white/5" data-testid={`row-page-${page.id}`}>
                  <td className="px-4 py-3"><p className="text-[#F5F5F7] text-xs font-medium">{page.title}</p>{page.seoTitle && <p className="text-[#B3B3B8]/30 text-[10px]">{page.seoTitle}</p>}</td>
                  <td className="px-4 py-3"><span className={`text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm ${page.pageType === "artwork" ? "bg-[#C084FC]/20 text-[#C084FC]" : page.pageType === "blog" ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"}`}>{page.pageType}</span></td>
                  <td className="px-4 py-3"><a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" className="text-[#B3B3B8]/60 hover:text-[#C084FC] text-xs flex items-center gap-1 transition-colors">/{page.slug}<ExternalLink className="w-3 h-3" /></a></td>
                  <td className="px-4 py-3"><span className={`text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm ${page.status === "published" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>{page.status}</span></td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" className="text-red-400 text-[10px] px-2 py-1 h-auto border border-red-500/15" onClick={() => { if (confirm("Remove from page registry?")) deletePage.mutate(page.id); }} data-testid={`button-delete-page-${page.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-white/5">
            <p className="text-[#B3B3B8]/25 text-[10px]">{pages.length} page{pages.length !== 1 ? "s" : ""} in registry</p>
          </div>
        </div>
      )}
    </div>
  );
}
