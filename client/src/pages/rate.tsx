import { useParams, useSearch } from "wouter";
import { CheckCircle2 } from "lucide-react";
const logoMark = "/favicon.png";

const faces = [
  { score: 5, label: "Excellent", emoji: "\u{1F603}" },
  { score: 4, label: "Good", emoji: "\u{1F642}" },
  { score: 3, label: "Okay", emoji: "\u{1F610}" },
  { score: 2, label: "Poor", emoji: "\u{1F615}" },
  { score: 1, label: "Bad", emoji: "\u{1F61E}" },
];

export default function Rate() {
  const { token } = useParams<{ token: string }>();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const done = params.get("done");
  const submittedScore = params.get("score");

  if (done) {
    const face = faces.find(f => f.score === Number(submittedScore));
    return (
      <div className="bg-[#0B0B0D] min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <img src={logoMark} alt="Creations by Oracle" className="h-8 mx-auto mb-8 opacity-60" />
          <CheckCircle2 className="w-12 h-12 text-[#5D3FD3] mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-[#F5F5F7] uppercase tracking-tight mb-3" data-testid="text-rating-thanks">
            Thank you
          </h1>
          {face && (
            <p className="text-[#B3B3B8] text-sm mb-2">
              You rated us: <span className="text-[#F5F5F7] font-semibold">{face.label}</span>
            </p>
          )}
          <p className="text-[#B3B3B8]/60 text-sm">
            Your feedback helps us maintain the standard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0B0D] min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <img src={logoMark} alt="Creations by Oracle" className="h-8 mx-auto mb-8 opacity-60" />
        <h1 className="text-2xl font-bold text-[#F5F5F7] uppercase tracking-tight mb-3" data-testid="text-rating-headline">
          How was your experience?
        </h1>
        <p className="text-[#B3B3B8] text-sm mb-10">
          Tap a face to let us know.
        </p>
        <div className="flex items-center justify-center gap-5">
          {faces.map(f => (
            <a
              key={f.score}
              href={`/api/rate/${token}?leadId=${params.get("leadId") || ""}&score=${f.score}`}
              className="flex flex-col items-center gap-2 group cursor-pointer"
              data-testid={`button-rate-${f.score}`}
            >
              <span className="text-4xl transition-transform group-hover:scale-110">{f.emoji}</span>
              <span className="text-[10px] uppercase tracking-wider text-[#B3B3B8]/50 group-hover:text-[#F5F5F7] transition-colors">
                {f.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
