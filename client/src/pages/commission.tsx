import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Upload, X, Loader2, ArrowLeft, Info, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

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

interface PriceBreakdown {
  base: number;
  addon: number;
  subjFee: number;
  total: number;
  deposit: number;
}

const STYLE_DESCRIPTIONS: Record<Style, string> = {
  Realism: "True-to-life portraiture with meticulous attention to texture, light, and likeness. Perfect for timeless keepsakes.",
  Fusion: "A blend of realism and expressive abstraction. Emotionally resonant with a contemporary aesthetic.",
  Oracle: "Oracle's signature style — layered symbolism, rich colour fields, and spiritual depth.",
};

const FORMAT_DESCRIPTIONS: Record<Format, string> = {
  Digital: "High-resolution file delivered digitally. Print or share anywhere.",
  Paper: "Archival-quality fine art print on heavyweight cotton rag paper.",
  Canvas: "Gallery-wrapped canvas print, ready to hang. Museum-grade inks.",
};

const STEP_LABELS = [
  "Style",
  "Size",
  "Format",
  "Subjects",
  "Reference Photos",
  "Your Details",
  "Review & Pay",
];

const CARD_STYLE = {
  style: {
    base: {
      color: "#F5F5F7",
      fontFamily: "Helvetica Neue, Arial, sans-serif",
      fontSize: "14px",
      "::placeholder": { color: "rgba(255,255,255,0.2)" },
    },
    invalid: { color: "#f87171" },
  },
};

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

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

// Stripe card payment sub-component
function CardPaymentForm({
  clientSecret,
  depositAmount,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  depositAmount: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState("");

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;
    setProcessing(true);
    setCardError("");
    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });
    setProcessing(false);
    if (error) {
      setCardError(error.message || "Payment failed. Please try again.");
      onError(error.message || "Payment failed");
    } else {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-white/10 bg-white/[0.03]">
        <CardElement options={CARD_STYLE} />
      </div>
      {cardError && (
        <p className="text-red-400 text-xs" data-testid="text-card-error">
          {cardError}
        </p>
      )}
      <Button
        data-testid="button-pay-deposit"
        onClick={handleSubmit}
        disabled={!stripe || processing}
        className="w-full bg-[#C084FC] hover:bg-[#a855f7] text-black font-medium py-3 h-auto disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {processing ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock size={14} className="mr-2" />
            Pay Deposit — ${depositAmount.toLocaleString()}
          </>
        )}
      </Button>
    </div>
  );
}

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
  const [referenceImages, setReferenceImages] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment state (set when POST /api/commissions returns clientSecret)
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [depositAmountForPayment, setDepositAmountForPayment] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const deposited = searchParams.get("deposited") === "true";
  const cancelled = searchParams.get("cancelled") === "true";

  const { data: pricing } = useQuery<PricingData>({
    queryKey: ["/api/commission/pricing"],
  });

  // Load Stripe publishable key
  useEffect(() => {
    const loadStripeKey = async () => {
      const res = await fetch("/api/stripe/public-key");
      const data = await res.json();
      if (data.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey));
      }
    };
    loadStripeKey();
  }, []);

  useEffect(() => {
    if (deposited) {
      toast({ title: "Deposit received!", description: "Your commission is confirmed. Check your email." });
    }
    if (cancelled) {
      toast({ title: "Checkout cancelled", description: "Come back anytime.", variant: "destructive" });
    }
  }, []);

  const calcPrice = useCallback((): PriceBreakdown => {
    if (!pricing || !style || !size) return { base: 0, addon: 0, subjFee: 0, total: 0, deposit: 0 };
    const base = pricing.matrix[style]?.[size] || 0;
    const addon = pricing.addons[format]?.[size] || 0;
    const subjectFeePerExtra = pricing.subjectFees[style]?.[size] || 0;
    const subjFee = subjectFeePerExtra * Math.max(0, extraSubjects);
    const total = base + addon + subjFee;
    const deposit = Math.round(total / 2);
    return { base, addon, subjFee, total, deposit };
  }, [pricing, style, size, format, extraSubjects]);

  const priceData = calcPrice();
  const { total, deposit } = priceData;

  const initPaymentMutation = useMutation({
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
    onSuccess: (data: { requiresPayment: boolean; clientSecret?: string; depositAmount?: number }) => {
      if (data.requiresPayment && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setDepositAmountForPayment(data.depositAmount || deposit);
      } else {
        // No Stripe configured
        toast({ title: "Commission request submitted!", description: "We'll be in touch shortly." });
        setLocation("/");
      }
    },
    onError: (e: Error) => {
      toast({ title: "Submission failed", description: e?.message || "Please try again.", variant: "destructive" });
    },
  });

  const uploadFile = useCallback(
    (file: File) => {
      if (referenceImages.length >= 5) {
        toast({ title: "Max 5 reference images", variant: "destructive" });
        return;
      }
      setUploading(true);
      const reader = new FileReader();
      reader.onerror = () => {
        toast({ title: "Upload failed", description: "Could not read file.", variant: "destructive" });
        setUploading(false);
      };
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string).split(",")[1];
          const res = await apiRequest("POST", "/api/upload", { imageData: base64, filename: file.name });
          const data = await res.json();
          setReferenceImages((prev) => [...prev, { url: data.url, name: file.name }]);
        } catch {
          toast({ title: "Upload failed", description: "Server error. Please try again.", variant: "destructive" });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
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
    if (step === 5) {
      return (
        customerName.trim().length > 0 &&
        customerEmail.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
      );
    }
    return true;
  };

  // Payment success screen
  if (paymentSuccess || deposited) {
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
            Your deposit has been received. Oracle will review your request and reach out within 2–3 business days to begin.
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
      <div className={`max-w-6xl mx-auto px-4 py-16 ${total > 0 && step < 6 ? "pb-24 lg:pb-16" : ""}`}>
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-12 lg:items-start">

          {/* Left: Main wizard */}
          <div>
            <div className="mb-10">
              <p className="text-[#C084FC] text-xs uppercase tracking-[4px] mb-3">Creations by Oracle</p>
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
                    <h2 className="text-xl font-light mb-6 text-white/80">Choose your style</h2>
                    <div className="space-y-3">
                      {STYLES.map((s) => (
                        <button
                          key={s}
                          data-testid={`button-style-${s.toLowerCase()}`}
                          onClick={() => setStyle(s)}
                          className={`w-full text-left p-5 rounded-lg border transition-all duration-200 ${
                            style === s ? "border-[#C084FC] bg-[#C084FC]/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white">{s}</span>
                            {style === s && <Check size={16} className="text-[#C084FC]" />}
                          </div>
                          <p className="text-xs text-white/40 leading-relaxed">{STYLE_DESCRIPTIONS[s]}</p>
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
                    <h2 className="text-xl font-light mb-6 text-white/80">Choose your canvas size</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SIZES.map((s) => {
                        const price = pricing && style ? pricing.matrix[style]?.[s] : null;
                        return (
                          <button
                            key={s}
                            data-testid={`button-size-${s.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                            onClick={() => setSize(s)}
                            className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                              size === s ? "border-[#C084FC] bg-[#C084FC]/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">{s}</span>
                              {size === s && <Check size={14} className="text-[#C084FC]" />}
                            </div>
                            {price !== null && <p className="text-xs text-[#C084FC] mt-1">${price?.toLocaleString()}</p>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 2: Format */}
                {step === 2 && (
                  <div>
                    <h2 className="text-xl font-light mb-6 text-white/80">Choose your format</h2>
                    <div className="space-y-3">
                      {FORMATS.map((f) => {
                        const addon = pricing && size ? pricing.addons[f]?.[size] || 0 : null;
                        return (
                          <button
                            key={f}
                            data-testid={`button-format-${f.toLowerCase()}`}
                            onClick={() => setFormat(f)}
                            className={`w-full text-left p-5 rounded-lg border transition-all duration-200 ${
                              format === f ? "border-[#C084FC] bg-[#C084FC]/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-white">{f}</span>
                              <div className="flex items-center gap-2">
                                {addon !== null && addon > 0 && <span className="text-xs text-white/40">+${addon}</span>}
                                {addon === 0 && <span className="text-xs text-[#C084FC]">Included</span>}
                                {format === f && <Check size={16} className="text-[#C084FC]" />}
                              </div>
                            </div>
                            <p className="text-xs text-white/40 leading-relaxed">{FORMAT_DESCRIPTIONS[f]}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 3: Subjects */}
                {step === 3 && (
                  <div>
                    <h2 className="text-xl font-light mb-2 text-white/80">How many subjects?</h2>
                    <p className="text-white/40 text-sm mb-8">
                      The base price includes 1 subject. Add a fee for each additional person, pet, or figure.
                    </p>
                    <div className="flex items-center gap-6">
                      <button
                        data-testid="button-subject-decrease"
                        onClick={() => setExtraSubjects((n) => Math.max(0, n - 1))}
                        disabled={extraSubjects === 0}
                        className="w-12 h-12 rounded-full border border-white/20 text-white text-xl hover:border-[#C084FC] transition-colors"
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
                          {extraSubjects === 0 ? "1 subject included" : `+${extraSubjects} additional`}
                        </p>
                      </div>
                      <button
                        data-testid="button-subject-increase"
                        onClick={() => setExtraSubjects((n) => Math.min(9, n + 1))}
                        className="w-12 h-12 rounded-full border border-white/20 text-white text-xl hover:border-[#C084FC] transition-colors"
                      >
                        +
                      </button>
                    </div>
                    {extraSubjects > 0 && pricing && style && size && (
                      <div className="mt-8 p-4 rounded-lg border border-white/10 bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-1">
                          <Info size={12} className="text-white/40" />
                          <p className="text-xs text-white/40">Subject fee</p>
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
                    <h2 className="text-xl font-light mb-2 text-white/80">Reference photos</h2>
                    <p className="text-white/40 text-sm mb-6">
                      Upload up to 5 reference photos. Clear, well-lit images help achieve the best likeness.
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
                          <Loader2 size={24} className="mx-auto mb-2 text-[#C084FC] animate-spin" />
                        ) : (
                          <Upload size={24} className="mx-auto mb-2 text-white/30" />
                        )}
                        <p className="text-sm text-white/40">
                          {uploading ? "Uploading…" : "Click to upload (JPG, PNG, WEBP)"}
                        </p>
                        <p className="text-xs text-white/20 mt-1">{referenceImages.length}/5 uploaded</p>
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
                              onClick={() => setReferenceImages((prev) => prev.filter((_, j) => j !== i))}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} className="text-white" />
                            </button>
                            <p className="text-xs text-white/30 mt-1 truncate px-0.5">{img.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {referenceImages.length === 0 && (
                      <p className="text-xs text-white/30 text-center mt-2">Optional but recommended</p>
                    )}
                  </div>
                )}

                {/* Step 5: Your Details (contact + notes) */}
                {step === 5 && (
                  <div>
                    <h2 className="text-xl font-light mb-2 text-white/80">Your details</h2>
                    <p className="text-white/40 text-sm mb-6">Tell us about yourself and share any notes for the artist.</p>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">Full Name *</label>
                        <Input
                          data-testid="input-customer-name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Jane Doe"
                          className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-[#C084FC]/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">Email Address *</label>
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
                        <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">Phone Number</label>
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
                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">Notes for the Artist</label>
                      <Textarea
                        data-testid="input-commission-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. This is a gift — she loves warm tones and sunflowers..."
                        className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 min-h-[120px] focus:border-[#C084FC]/50 resize-none"
                      />
                      <p className="text-xs text-white/20 mt-1 text-right">{notes.length} characters</p>
                    </div>
                  </div>
                )}

                {/* Step 6: Review & Pay */}
                {step === 6 && (
                  <div>
                    <h2 className="text-xl font-light mb-2 text-white/80">Review your commission</h2>
                    <p className="text-white/40 text-sm mb-8">
                      Confirm details, then enter your card to pay the 50% deposit.
                    </p>

                    {/* Order summary */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden mb-6">
                      <div className="p-5 border-b border-white/10">
                        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Commission</p>
                        <div className="space-y-2">
                          {[
                            { label: "Style", value: style },
                            { label: "Size", value: size },
                            { label: "Format", value: format },
                            { label: "Subjects", value: String(1 + extraSubjects) },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between text-sm">
                              <span className="text-white/60">{label}</span>
                              <span className="text-white font-medium">{value}</span>
                            </div>
                          ))}
                          {referenceImages.length > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/60">Reference Photos</span>
                              <span className="text-white font-medium">{referenceImages.length}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-5 border-b border-white/10">
                        <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Contact</p>
                        <p className="text-sm text-white">{customerName}</p>
                        <p className="text-sm text-white/60">{customerEmail}</p>
                        {customerPhone && <p className="text-sm text-white/60">{customerPhone}</p>}
                        {notes && (
                          <p className="text-xs text-white/40 mt-2 leading-relaxed italic">{notes}</p>
                        )}
                      </div>

                      <div className="p-5">
                        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Pricing</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">{style} {size}</span>
                            <span className="text-white">${priceData.base.toLocaleString()}</span>
                          </div>
                          {priceData.addon > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/60">{format} format</span>
                              <span className="text-white">+${priceData.addon.toLocaleString()}</span>
                            </div>
                          )}
                          {priceData.subjFee > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-white/60">{extraSubjects} extra subject{extraSubjects > 1 ? "s" : ""}</span>
                              <span className="text-white">+${priceData.subjFee.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm pt-2 border-t border-white/10 font-medium">
                            <span className="text-white">Total</span>
                            <span className="text-white" data-testid="text-review-total">${priceData.total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Deposit highlight */}
                    <div className="rounded-xl border border-[#C084FC]/30 bg-[#C084FC]/8 p-5 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-[#C084FC]/70 uppercase tracking-widest mb-1">Deposit Due Today (50%)</p>
                          <p
                            className="text-3xl font-light text-white"
                            style={{ fontFamily: "Georgia, serif" }}
                            data-testid="text-review-deposit"
                          >
                            ${priceData.deposit.toLocaleString()}
                          </p>
                          <p className="text-xs text-white/40 mt-1">
                            Remaining ${(priceData.total - priceData.deposit).toLocaleString()} due on completion
                          </p>
                        </div>
                        <Lock size={20} className="text-[#C084FC]/60" />
                      </div>

                      {/* Card payment area */}
                      {!clientSecret ? (
                        <Button
                          data-testid="button-commission-submit"
                          onClick={() => initPaymentMutation.mutate()}
                          disabled={initPaymentMutation.isPending}
                          className="w-full bg-[#C084FC] hover:bg-[#a855f7] text-black font-medium py-3 h-auto"
                        >
                          {initPaymentMutation.isPending ? (
                            <>
                              <Loader2 size={16} className="mr-2 animate-spin" />
                              Preparing payment…
                            </>
                          ) : (
                            <>
                              <Lock size={14} className="mr-2" />
                              Enter Card Details
                            </>
                          )}
                        </Button>
                      ) : stripePromise ? (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                          <CardPaymentForm
                            clientSecret={clientSecret}
                            depositAmount={depositAmountForPayment || priceData.deposit}
                            onSuccess={() => setPaymentSuccess(true)}
                            onError={(msg) => toast({ title: "Payment failed", description: msg, variant: "destructive" })}
                          />
                        </Elements>
                      ) : (
                        <div className="flex items-center gap-2 text-white/40 text-sm">
                          <Loader2 size={14} className="animate-spin" />
                          Loading payment form…
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-white/30 text-xs">
                      <Shield size={12} />
                      <span>Payments processed securely via Stripe. Your card details are never stored on our servers.</span>
                    </div>
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
                  step === 0 ? "text-white/20 cursor-not-allowed" : "text-white/50 hover:text-white"
                }`}
              >
                <ArrowLeft size={16} />
                Back
              </button>

              {step < STEP_LABELS.length - 1 && (
                <Button
                  data-testid="button-commission-next"
                  onClick={goNext}
                  disabled={!canAdvance()}
                  className="bg-[#C084FC] hover:bg-[#a855f7] text-black font-medium px-8 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              )}
            </div>

            {/* Trust signals */}
            <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-6 justify-center lg:justify-start">
              {["50% deposit to begin", "Balance due on completion", "Satisfaction guaranteed", "2–4 week turnaround"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check size={12} className="text-[#C084FC]" />
                  <span className="text-xs text-white/30">{item}</span>
                </div>
              ))}
            </div>
          </div>{/* end left column */}

          {/* Right: Sticky summary (desktop) */}
          <div className="hidden lg:block">
            <div
              data-testid="div-sticky-price-summary"
              className="sticky top-8 rounded-xl border border-white/10 bg-white/[0.02] p-6"
            >
              <p className="text-xs text-white/40 uppercase tracking-widest mb-5">Your Commission</p>

              <div className="space-y-3 mb-6">
                {style ? (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Style</span>
                    <span className="text-xs text-white font-medium">{style}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/30">Style</span>
                    <span className="text-xs text-white/20">—</span>
                  </div>
                )}
                {size ? (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Size</span>
                    <span className="text-xs text-white font-medium">{size}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/30">Size</span>
                    <span className="text-xs text-white/20">—</span>
                  </div>
                )}
                {step >= 2 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Format</span>
                    <span className="text-xs text-white font-medium">{format}</span>
                  </div>
                )}
                {step >= 3 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Subjects</span>
                    <span className="text-xs text-white font-medium">{1 + extraSubjects}</span>
                  </div>
                )}
              </div>

              {total > 0 ? (
                <>
                  <div className="border-t border-white/10 pt-4 space-y-2">
                    {priceData.base > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Base</span>
                        <span className="text-white/70">${priceData.base.toLocaleString()}</span>
                      </div>
                    )}
                    {priceData.addon > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">{format}</span>
                        <span className="text-white/70">+${priceData.addon.toLocaleString()}</span>
                      </div>
                    )}
                    {priceData.subjFee > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Extra subjects</span>
                        <span className="text-white/70">+${priceData.subjFee.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-white/10 mt-3 pt-4">
                    <div className="flex justify-between items-baseline mb-3">
                      <span className="text-xs text-white/50">Total</span>
                      <p
                        data-testid="text-sticky-total"
                        className="text-2xl font-light text-white"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        ${total.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#C084FC]/10 border border-[#C084FC]/20">
                      <p className="text-xs text-white/40 mb-0.5">Deposit due now (50%)</p>
                      <p data-testid="text-sticky-deposit" className="text-xl font-light text-[#C084FC]">
                        ${deposit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-white/20 text-center">Select a style and size to see pricing</p>
                </div>
              )}

              <div className="mt-5 space-y-2">
                {["Secure card payment via Stripe", "Balance due on completion", "2–4 week turnaround"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check size={10} className="text-[#C084FC] flex-shrink-0" />
                    <span className="text-xs text-white/30">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile bottom-sticky price panel */}
      {total > 0 && step < 6 && (
        <div
          data-testid="div-mobile-sticky-price"
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-white/10 bg-[#08060e]/95 backdrop-blur-md px-4 py-3"
        >
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Total</p>
              <p
                data-testid="text-commission-total"
                className="text-lg font-light text-white"
                style={{ fontFamily: "Georgia, serif" }}
              >
                ${total.toLocaleString()}
              </p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Deposit (50%)</p>
              <p
                data-testid="text-commission-deposit"
                className="text-lg font-light text-[#C084FC]"
                style={{ fontFamily: "Georgia, serif" }}
              >
                ${deposit.toLocaleString()}
              </p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-right">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Step</p>
              <p className="text-sm text-white/50">{step + 1}/7</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
