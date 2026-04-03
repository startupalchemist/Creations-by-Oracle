import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle2, Mail, MessageSquare, Palette } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Valid email required"),
  subject: z.string().min(1, "Please select an inquiry type"),
  message: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
  };
}

function trackEvent(eventType: string) {
  const sid = sessionStorage.getItem("sid") || Math.random().toString(36).slice(2);
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page: "/contact", eventType, sessionId: sid }),
  }).catch(() => {});
}

export default function Contact() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [artworkParam, setArtworkParam] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const aw = params.get("artwork");
    if (aw) setArtworkParam(aw);
    trackEvent("page_view");
  }, []);

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      subject: "",
      message: artworkParam ? `I'm interested in "${artworkParam}"` : "",
      ...getUtmParams(),
    },
  });

  const createLead = useMutation({
    mutationFn: (data: ContactForm) =>
      apiRequest("POST", "/api/leads", data),
    onSuccess: () => {
      setSubmitted(true);
      trackEvent("contact_submit");
    },
    onError: (e: any) => {
      toast({ title: "Submission failed", description: e.message || "Please try again.", variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#08060e] flex items-center justify-center px-6" data-testid="page-contact-success">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-10 h-10 text-[#C084FC] mx-auto mb-6" />
          <h2 className="text-2xl font-light text-white mb-3" style={{ fontFamily: "Georgia, serif" }}>Message received.</h2>
          <p className="text-[#B3B3B8]/60 text-sm leading-relaxed mb-8">
            Thank you for reaching out. I'll be in touch within 1–3 business days to discuss your inquiry.
          </p>
          <a href="/">
            <Button className="bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em]" data-testid="button-return-home">
              Return Home
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08060e]" data-testid="page-contact">
      <title>Contact — Studio | Commissions & Inquiries</title>
      <meta name="description" content="Commission an original artwork, inquire about available works, or get in touch for exhibition opportunities." />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-32 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left */}
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#C084FC]/50 block mb-4">Get in Touch</span>
            <h1 className="text-4xl sm:text-5xl font-light text-white leading-tight mb-6" style={{ fontFamily: "Georgia, serif" }} data-testid="heading-contact">
              Let's start
              <br />
              <span className="italic">a conversation.</span>
            </h1>
            <p className="text-[#B3B3B8]/60 text-sm leading-relaxed mb-10 max-w-sm">
              Whether you're interested in purchasing a work, commissioning something original, or discussing an exhibition — I'd love to hear from you.
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: <Palette className="w-4 h-4" />,
                  label: "Commission Inquiries",
                  desc: "Portrait, abstract, or sculptural commissions. Timelines typically 4–12 weeks depending on scope.",
                },
                {
                  icon: <MessageSquare className="w-4 h-4" />,
                  label: "Available Works",
                  desc: "Inquire about purchasing an available piece or request a studio visit.",
                },
                {
                  icon: <Mail className="w-4 h-4" />,
                  label: "Exhibitions & Press",
                  desc: "Exhibition opportunities, press inquiries, and institutional partnerships.",
                },
              ].map((item) => (
                <div key={item.label} className="flex gap-4" data-testid={`div-contact-type-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="text-[#C084FC]/50 mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-[#F5F5F7] text-sm font-medium mb-0.5">{item.label}</p>
                    <p className="text-[#B3B3B8]/50 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Form */}
          <div>
            <div className="border border-white/8 rounded-sm p-6 sm:p-8" style={{ background: "rgba(255,255,255,0.02)" }}>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createLead.mutate(data))}
                  className="space-y-5"
                  data-testid="form-contact"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em]">Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Your name"
                              className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm focus:border-[#C084FC]/50"
                              data-testid="input-contact-name"
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em]">Phone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Your phone number"
                              className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm focus:border-[#C084FC]/50"
                              data-testid="input-contact-phone"
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em]">Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="your@email.com"
                            className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm focus:border-[#C084FC]/50"
                            data-testid="input-contact-email"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em]">Inquiry Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm" data-testid="select-inquiry-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#141416] border-white/10">
                            <SelectItem value="Commission — Portrait">Commission — Portrait</SelectItem>
                            <SelectItem value="Commission — Abstract Canvas">Commission — Abstract Canvas</SelectItem>
                            <SelectItem value="Commission — Sculpture / Installation">Commission — Sculpture / Installation</SelectItem>
                            <SelectItem value="Purchase Inquiry">Purchase Inquiry</SelectItem>
                            <SelectItem value="Exhibition / Press">Exhibition / Press</SelectItem>
                            <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#B3B3B8]/60 text-xs uppercase tracking-[0.15em]">Message</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Tell me about what you're looking for, any specific ideas, timeline, or questions..."
                            rows={5}
                            className="bg-[#141416] border-white/10 text-[#F5F5F7] text-sm resize-none focus:border-[#C084FC]/50"
                            data-testid="textarea-contact-message"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={createLead.isPending}
                    className="w-full bg-[#C084FC] hover:bg-[#a855f7] text-white border-0 text-xs uppercase tracking-[0.2em] font-semibold py-3 h-auto"
                    data-testid="button-contact-submit"
                  >
                    {createLead.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 mr-2" />
                    )}
                    Send Message
                  </Button>

                  <p className="text-[#B3B3B8]/30 text-[10px] text-center leading-relaxed">
                    I respond to all inquiries within 1–3 business days.
                  </p>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
