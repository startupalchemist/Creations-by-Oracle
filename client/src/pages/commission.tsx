import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Upload, X, Loader2, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const STYLES = ["Realism", "Fusion", "Oracle"] as const;
const SIZES = [
  "Small (8×10)",
  "Medium (11×14)",
  "Large (16×20)",
  "X-Large (18×24)",
  "XX-Large (24×36)",
  "XXX-Large (30×40+)",
] as const;
const FORMATS = ["Digital", "Paper", "Canvas"] as const;

type Style = typeof STYLES[number];
type Size = typeof SIZES[number];
type Format = typeof FORMATS[number];

interface PricingData {
  matrix: Record<Style, Record<Size, number>>;
  addons: Record<Format, Record<Size, number>>;
  subjectFees: Record<Style, Record<Size, number>>;
}

const STYLE_DESCRIPTIONS: Record<Style, string> = {
  Realism:
    "True-to-life portraiture with meticulous attention to texture, light, and likeness. Perfect for timeless keepsakes.",
  Fusion:
    "A blend of realism and expressive abstraction. Emotionally resonant with a contemporary aesthetic.",
  Oracle:
    "Oracle's signature style — layered symbolism, rich colour fields, and spiritual depth.",
};

const FORMAT_DESCRIPTIONS: Record<Format, string> = {
  Digital: "High-resolution file delivered digitally. Print or share anywhere.",
  Paper: "Archival-quality fine art print on heavyweight cotton rag paper.",
  Canvas:
    "Gallery-wrapped canvas print, ready to hang. Museum-grade inks.",
};

const STEP_LABELS = [
  "Style",
  "Size",
  "Format",
  "Subjects",
  "Reference Photos",
  "Notes",
  "Your Info",
];

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current
              ? "bg-[#C084FC] flex-1"
              : i === current
              ? "bg-[#C084FC] flex-[2]"
              : "bg-white/10 flex-1"
          }`}
        />
      ))}
    </div>
  );
}

function PriceDisplay({
  total,
  deposit,
}: {
  total: number;
  deposit: number;
}) {
  if (!total) return null;
  return (
    <div className="flex items-end gap-4 mb-8">
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
          Total
        </p>
        <p
          data-testid="text-commission-total"
          className="text-3xl font-light text-white"
          style={{ fontFamily: "Georgia, serif" }}
        >
          ${total.toLocaleString()}
        </p>
      </div>
      <div className="mb-1">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
          Deposit Due (50%)
        </p>
        <p
          data-testid="text-commission-deposit"
          className="text-xl font-light text-[#C084FC]"
        >
          ${deposit.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

const stepVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -40 : 40,
    opacity: 0,
  }),
};

export default function Commission() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [style, setStyle] = useState<Style | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [format, setFormat] = useState<Format>("Digital");
  const [extraSubjects, setExtraSubjects] = useState(0);
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [referenceImages, setReferenceImages] = useState<
    { url: string; name: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const params = new URLSearchParams(window.location.search);
  const deposited = params.get("deposited") === "true";
  const cancelled = params.get("cancelled") === "true";

  const { data: pricing } = useQuery<PricingData>({
    queryKey: ["/api/commission/pricing"],
  });

  useEffect(() => {
    if (deposited) {
      toast({
        title: "Deposit received!",
        description:
          "Thank you — your commission is confirmed. Check your email for details.",
      });
    }
    if (cancelled) {
      toast({
        title: "Checkout cancelled",
        description: "Your commission details have been saved. Come back anytime.",
        variant: "destructive",
      });
    }
  }, []);

  const calcPrice = useCallback(() => {
    if (!pricing || !style || !size) return { base: 0, addon: 0, subjFee: 0, total: 0, deposit: 0 };
    const base = pricing.matrix[style]?.[size] || 0;
    const addon = pricing.addons[format]?.[size] || 0;
    const subjectFeePerExtra = pricing.subjectFees[style]?.[size] || 0;
    const subjFee = subjectFeePerExtra * Math.max(0, extraSubjects);
    const total = base + addon + subjFee;
    const deposit = Math.round(total * 50) / 100;
    return { base, addon, subjFee, total, deposit };
  }, [pricing, style, size, format, extraSubjects]);

  const { total, deposit } = calcPrice();

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/commissions", {
        style,
        size,
        format,
        extraSubjects,
        referenceImageUrls: referenceImages.map((r) => r.url),
        notes,
        customerName,
        customerEmail,
        customerPhone,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.requiresPayment && data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Commission request submitted!",
          description: "We'll be in touch shortly to discuss your commission.",
        });
        setLocation("/");
      }
    },
    onError: (e: any) => {
      toast({
        title: "Submission failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadFile = useCallback(
    async (file: File) => {
      if (referenceImages.length >= 5) {
        toast({
          title: "Max 5 reference images",
          variant: "destructive",
        });
        return;
      }
      setUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string).split(",")[1];
          const res = await apiRequest("POST", "/api/upload", {
            imageData: base64,
            filename: file.name,
          });
          const data = await res.json();
          setReferenceImages((prev) => [
            ...prev,
            { url: data.url, name: file.name },
          ]);
          setUploading(false);
        };
        reader.readAsDataURL(file);
      } catch {
        toast({ title: "Upload failed", variant: "destructive" });
        setUploading(false);
      }
    },
    [referenceImages, toast]
  );

  const goNext = () => {
    setDir(1);
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  };
  const goPrev = () => {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const canAdvance = () => {
    if (step === 0) return !!style;
    if (step === 1) return !!size;
    if (step === 6)
      return (
        customerName.trim().length > 0 &&
        customerEmail.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
      );
    return true;
  };

  if (deposited) {
    return (
      <div className="min-h-screen bg-[#08060e] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#C084FC]/20 flex items-center justify-center mx-auto mb-6">
            <Check className="text-[#C084FC]" size={28} />
          </div>
          <h1
            className="text-3xl font-light text-white mb-3"
            style={{ fontFamily: "Georgia, serif" }}
            data-testid="text-deposit-confirmed"
          >
            Commission Confirmed
          </h1>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            Your deposit has been received. Oracle will review your request and
            reach out within 2–3 business days to begin the process.
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="bg-[#C084FC] hover:bg-[#a855f7] text-black font-medium"
            data-testid="button-return-home"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08060e] text-white">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[#C084FC] text-xs uppercase tracking-[4px] mb-3">
            Creations by Oracle
          </p>
          <h1
            className="text-4xl font-light mb-2"
            style={{ fontFamily: "Georgia, serif" }}
            data-testid="text-commission-title"
          >
            Commission a Piece
          </h1>
          <p className="text-white/40 text-sm">
            Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
          </p>
        </div>

        <StepDots current={step} total={STEP_LABELS.length} />

        {/* Price display when available */}
        {total > 0 && step > 0 && (
          <PriceDisplay total={total} deposit={deposit} />
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* Step 0: Style */}
            {step === 0 && (
              <div>
                <h2 className="text-xl font-light mb-6 text-white/80">
                  Choose your style
                </h2>
                <div className="space-y-3">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      data-testid={`button-style-${s.toLowerCase()}`}
                      onClick={() => setStyle(s)}
                      className={`w-full text-left p-5 rounded-lg border transition-all duration-200 ${
                        style === s
                          ? "border-[#C084FC] bg-[#C084FC]/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">{s}</span>
                        {style === s && (
                          <Check size={16} className="text-[#C084FC]" />
                        )}
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed">
                        {STYLE_DESCRIPTIONS[s]}
                      </p>
                      {pricing && (
                        <p className="text-xs text-[#C084FC] mt-2">
                          From ${pricing.matrix[s]?.["Small (8×10)"]?.toLocaleString()}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Size */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-light mb-6 text-white/80">
                  Choose your canvas size
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SIZES.map((s) => {
                    const price = pricing && style ? pricing.matrix[style]?.[s] : null;
                    return (
                      <button
                        key={s}
                        data-testid={`button-size-${s.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                        onClick={() => setSize(s)}
                        className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                          size === s
                            ? "border-[#C084FC] bg-[#C084FC]/10"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{s}</span>
                          {size === s && (
                            <Check size={14} className="text-[#C084FC]" />
                          )}
                        </div>
                        {price !== null && (
                          <p className="text-xs text-[#C084FC] mt-1">
                            ${price?.toLocaleString()}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Format */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-light mb-6 text-white/80">
                  Choose your format
                </h2>
                <div className="space-y-3">
                  {FORMATS.map((f) => {
                    const addon =
                      pricing && size ? pricing.addons[f]?.[size] || 0 : null;
                    return (
                      <button
                        key={f}
                        data-testid={`button-format-${f.toLowerCase()}`}
                        onClick={() => setFormat(f)}
                        className={`w-full text-left p-5 rounded-lg border transition-all duration-200 ${
                          format === f
                            ? "border-[#C084FC] bg-[#C084FC]/10"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white">{f}</span>
                          <div className="flex items-center gap-2">
                            {addon !== null && addon > 0 && (
                              <span className="text-xs text-white/40">
                                +${addon}
                              </span>
                            )}
                            {addon === 0 && (
                              <span className="text-xs text-[#C084FC]">
                                Included
                              </span>
                            )}
                            {format === f && (
                              <Check size={16} className="text-[#C084FC]" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed">
                          {FORMAT_DESCRIPTIONS[f]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Extra Subjects */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-light mb-2 text-white/80">
                  How many subjects?
                </h2>
                <p className="text-white/40 text-sm mb-8">
                  The base price includes 1 subject. Add a fee for each
                  additional person, pet, or figure.
                </p>
                <div className="flex items-center gap-6">
                  <button
                    data-testid="button-subject-decrease"
                    onClick={() => setExtraSubjects((n) => Math.max(0, n - 1))}
                    className="w-12 h-12 rounded-full border border-white/20 text-white text-xl hover:border-[#C084FC] transition-colors"
                    disabled={extraSubjects === 0}
                  >
                    −
                  </button>
                  <div className="text-center">
                    <p
                      data-testid="text-subject-count"
                      className="text-5xl font-light text-white"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {1 + extraSubjects}
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      {extraSubjects === 0
                        ? "1 subject included"
                        : `+${extraSubjects} additional`}
                    </p>
                  </div>
                  <button
                    data-testid="button-subject-increase"
                    onClick={() =>
                      setExtraSubjects((n) => Math.min(9, n + 1))
                    }
                    className="w-12 h-12 rounded-full border border-white/20 text-white text-xl hover:border-[#C084FC] transition-colors"
                  >
                    +
                  </button>
                </div>
                {extraSubjects > 0 && pricing && style && size && (
                  <div className="mt-8 p-4 rounded-lg border border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-2 mb-1">
                      <Info size={12} className="text-white/40" />
                      <p className="text-xs text-white/40">Subject fee breakdown</p>
                    </div>
                    <p className="text-sm text-white/70">
                      {extraSubjects} × ${pricing.subjectFees[style]?.[size]?.toLocaleString()} ={" "}
                      <span className="text-[#C084FC]">
                        ${(extraSubjects * (pricing.subjectFees[style]?.[size] || 0)).toLocaleString()}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Reference Photos */}
            {step === 4 && (
              <div>
                <h2 className="text-xl font-light mb-2 text-white/80">
                  Reference photos
                </h2>
                <p className="text-white/40 text-sm mb-6">
                  Upload up to 5 reference photos. Clear, well-lit photos help
                  achieve the best likeness.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  data-testid="input-reference-upload"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.slice(0, 5 - referenceImages.length).forEach(uploadFile);
                    e.target.value = "";
                  }}
                />

                {referenceImages.length < 5 && (
                  <button
                    data-testid="button-upload-reference"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full border border-dashed border-white/20 rounded-lg p-8 text-center hover:border-[#C084FC]/60 hover:bg-[#C084FC]/5 transition-all duration-200 mb-4"
                  >
                    {uploading ? (
                      <Loader2
                        size={24}
                        className="mx-auto mb-2 text-[#C084FC] animate-spin"
                      />
                    ) : (
                      <Upload
                        size={24}
                        className="mx-auto mb-2 text-white/30"
                      />
                    )}
                    <p className="text-sm text-white/40">
                      {uploading
                        ? "Uploading…"
                        : "Click to upload photos (JPG, PNG, WEBP)"}
                    </p>
                    <p className="text-xs text-white/20 mt-1">
                      {referenceImages.length}/5 uploaded
                    </p>
                  </button>
                )}

                {referenceImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {referenceImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img.url}
                          alt={img.name}
                          data-testid={`img-reference-${i}`}
                          className="w-full h-28 object-cover rounded-lg border border-white/10"
                        />
                        <button
                          data-testid={`button-remove-reference-${i}`}
                          onClick={() =>
                            setReferenceImages((prev) =>
                              prev.filter((_, j) => j !== i)
                            )
                          }
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} className="text-white" />
                        </button>
                        <p className="text-xs text-white/30 mt-1 truncate px-0.5">
                          {img.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {referenceImages.length === 0 && (
                  <p className="text-xs text-white/30 text-center mt-2">
                    Reference photos are optional but recommended
                  </p>
                )}
              </div>
            )}

            {/* Step 5: Notes */}
            {step === 5 && (
              <div>
                <h2 className="text-xl font-light mb-2 text-white/80">
                  Any notes for the artist?
                </h2>
                <p className="text-white/40 text-sm mb-6">
                  Share details about mood, colour preferences, special
                  requests, or the story behind your commission.
                </p>
                <Textarea
                  data-testid="input-commission-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. This is a gift for my mother — she loves warm tones and sunflowers..."
                  className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 min-h-[160px] focus:border-[#C084FC]/50 resize-none"
                />
                <p className="text-xs text-white/20 mt-2 text-right">
                  {notes.length} characters
                </p>
              </div>
            )}

            {/* Step 6: Contact Info */}
            {step === 6 && (
              <div>
                <h2 className="text-xl font-light mb-2 text-white/80">
                  Your contact info
                </h2>
                <p className="text-white/40 text-sm mb-6">
                  We'll reach out to confirm details and process your deposit.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">
                      Full Name *
                    </label>
                    <Input
                      data-testid="input-customer-name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Jane Doe"
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-[#C084FC]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">
                      Email Address *
                    </label>
                    <Input
                      data-testid="input-customer-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-[#C084FC]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">
                      Phone Number
                    </label>
                    <Input
                      data-testid="input-customer-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-[#C084FC]/50"
                    />
                  </div>
                </div>

                {/* Final Summary */}
                {total > 0 && (
                  <div className="mt-8 p-5 rounded-lg border border-white/10 bg-white/[0.02]">
                    <p className="text-xs text-white/40 uppercase tracking-widest mb-3">
                      Order Summary
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-white/70">
                        <span>
                          {style} — {size}
                        </span>
                        <span data-testid="text-summary-base">
                          ${calcPrice().base.toLocaleString()}
                        </span>
                      </div>
                      {calcPrice().addon > 0 && (
                        <div className="flex justify-between text-white/50">
                          <span>{format} format</span>
                          <span>+${calcPrice().addon.toLocaleString()}</span>
                        </div>
                      )}
                      {calcPrice().subjFee > 0 && (
                        <div className="flex justify-between text-white/50">
                          <span>
                            {extraSubjects} extra subject
                            {extraSubjects > 1 ? "s" : ""}
                          </span>
                          <span>+${calcPrice().subjFee.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t border-white/10 pt-2 flex justify-between font-medium text-white">
                        <span>Total</span>
                        <span>${total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#C084FC] text-xs">
                        <span>Deposit due now (50%)</span>
                        <span>${deposit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <button
            data-testid="button-commission-back"
            onClick={goPrev}
            disabled={step === 0}
            className={`flex items-center gap-2 text-sm transition-colors ${
              step === 0
                ? "text-white/20 cursor-not-allowed"
                : "text-white/50 hover:text-white"
            }`}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {step < STEP_LABELS.length - 1 ? (
            <Button
              data-testid="button-commission-next"
              onClick={goNext}
              disabled={!canAdvance()}
              className="bg-[#C084FC] hover:bg-[#a855f7] text-black font-medium px-8 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              data-testid="button-commission-submit"
              onClick={() => submitMutation.mutate()}
              disabled={!canAdvance() || submitMutation.isPending}
              className="bg-[#C084FC] hover:bg-[#a855f7] text-black font-medium px-8 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  Pay Deposit — ${deposit.toLocaleString()}
                  <ChevronRight size={16} className="ml-1" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Trust signals */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-6 justify-center">
          {[
            "50% deposit to begin",
            "Balance due on completion",
            "Satisfaction guaranteed",
            "2–4 week turnaround",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <Check size={12} className="text-[#C084FC]" />
              <span className="text-xs text-white/30">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
