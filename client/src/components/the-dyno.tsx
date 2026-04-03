import { useQuery } from "@tanstack/react-query";
import { Loader2, Eye, TrendingUp } from "lucide-react";

const ACCENT = "#C084FC";

interface ArtStats {
  artworkViews30d: number;
  artworkViews30dMax: number;
  shopConversionRate: number;
  commissionRate: number;
  revenue30d: number;
  revenue30dMax: number;
  returningVisitorRate: number;
  topArtworks: { id: number; title: string; slug: string; viewCount: number; forSale: boolean; sold: boolean }[];
  totalArtworks: number;
  publishedArtworks: number;
  soldArtworks: number;
  totalOrders: number;
  subscriberCount: number;
  publishedPosts: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function GaugeSVG({
  value,
  max,
  label,
  unit,
  displayValue,
  size = 180,
  startAngle = -225,
  endAngle = 45,
  color = ACCENT,
  warningZone = 0.8,
  tickCount = 10,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  displayValue: string;
  size?: number;
  startAngle?: number;
  endAngle?: number;
  color?: string;
  warningZone?: number;
  tickCount?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 20;
  const innerR = r - 8;
  const totalAngle = endAngle - startAngle;
  const pct = Math.min(value / Math.max(max, 1), 1);
  const needleAngle = startAngle + pct * totalAngle;

  const ticks = [];
  for (let i = 0; i <= tickCount; i++) {
    const angle = startAngle + (i / tickCount) * totalAngle;
    const isWarning = i / tickCount >= warningZone;
    const outer = polarToCartesian(cx, cy, r - 2, angle);
    const inner = polarToCartesian(cx, cy, r - (i % 2 === 0 ? 14 : 9), angle);
    const tickLabelOffset = Math.round(size * 0.12);
    const labelPos = polarToCartesian(cx, cy, r - tickLabelOffset, angle);
    ticks.push(
      <g key={i}>
        <line
          x1={outer.x}
          y1={outer.y}
          x2={inner.x}
          y2={inner.y}
          stroke={isWarning ? ACCENT : "#4A4A50"}
          strokeWidth={i % 2 === 0 ? 2 : 1}
          strokeLinecap="round"
        />
        {i % 2 === 0 && (
          <text
            x={labelPos.x}
            y={labelPos.y}
            fill={isWarning ? ACCENT : "#666"}
            fontSize={Math.max(Math.round(size * 0.04), 6)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Manrope, sans-serif"
          >
            {Math.round((i / tickCount) * max)}
          </text>
        )}
      </g>
    );
  }

  const needleTip = polarToCartesian(cx, cy, r - 16, needleAngle);
  const needleBase1 = polarToCartesian(cx, cy, 6, needleAngle + 90);
  const needleBase2 = polarToCartesian(cx, cy, 6, needleAngle - 90);
  const needleTail = polarToCartesian(cx, cy, 16, needleAngle + 180);

  return (
    <div className="relative flex flex-col items-center" data-testid={`gauge-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1A1A1E" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#111113" strokeWidth="1" />

        <path
          d={describeArc(cx, cy, r, startAngle, endAngle)}
          fill="none"
          stroke="#222226"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {pct > 0 && (
          <path
            d={describeArc(cx, cy, r, startAngle, startAngle + pct * totalAngle)}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            filter={`url(#glow-${label})`}
            opacity="0.8"
          />
        )}

        {ticks}

        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleTail.x},${needleTail.y} ${needleBase2.x},${needleBase2.y}`}
          fill={color}
          opacity="0.9"
          filter={`url(#glow-${label})`}
        />
        <circle cx={cx} cy={cy} r="8" fill="#0B0B0D" stroke="#333" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="4" fill={color} opacity="0.6" />

        <text
          x={cx}
          y={cy + size * 0.17}
          fill="#F5F5F7"
          fontSize={Math.round(size * 0.11)}
          fontWeight="700"
          textAnchor="middle"
          fontFamily="Manrope, sans-serif"
        >
          {displayValue}
        </text>
        <text
          x={cx}
          y={cy + size * 0.25}
          fill="#666"
          fontSize={Math.max(Math.round(size * 0.04), 6)}
          textAnchor="middle"
          fontFamily="Manrope, sans-serif"
          letterSpacing="0.1em"
        >
          {unit}
        </text>
      </svg>
      <span className="text-[10px] uppercase tracking-[0.25em] text-[#B3B3B8]/60 mt-1 font-medium">
        {label}
      </span>
    </div>
  );
}

function VerticalBar({
  value,
  max,
  label,
  displayValue,
  color = ACCENT,
}: {
  value: number;
  max: number;
  label: string;
  displayValue: string;
  color?: string;
}) {
  const pct = Math.min(value / Math.max(max, 1), 1) * 100;
  return (
    <div className="flex flex-col items-center gap-1" data-testid={`bar-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <span className="text-xs font-bold text-[#F5F5F7]">{displayValue}</span>
      <div className="w-3 h-20 bg-[#1A1A1E] rounded-full overflow-hidden relative border border-white/5">
        <div
          className="absolute bottom-0 w-full rounded-full transition-all duration-1000"
          style={{ height: `${pct}%`, background: `linear-gradient(to top, ${color}, ${color}88)`, boxShadow: `0 0 8px ${color}44` }}
        />
      </div>
      <span className="text-[8px] uppercase tracking-[0.2em] text-[#B3B3B8]/40 font-medium text-center leading-tight max-w-[48px]">
        {label}
      </span>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center" data-testid={`info-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="text-lg font-bold text-[#F5F5F7] tabular-nums">{value}</div>
      <div className="text-[8px] uppercase tracking-[0.2em] text-[#B3B3B8]/40 font-medium">{label}</div>
    </div>
  );
}

export default function TheDyno() {
  const { data: stats, isLoading } = useQuery<ArtStats>({
    queryKey: ["/api/stats/art"],
    refetchInterval: 30000,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} data-testid="loader-dyno" />
      </div>
    );
  }

  const revenueDisplay = stats.revenue30d >= 1000
    ? `$${(stats.revenue30d / 1000).toFixed(1)}k`
    : `$${stats.revenue30d.toFixed(0)}`;

  const gaugeColor = (isHigh: boolean) => isHigh ? "#22C55E" : ACCENT;

  return (
    <div className="space-y-6" data-testid="the-dyno">
      <div className="relative rounded-md bg-[#0A0A0C] border border-white/5 overflow-visible">
        <div className="absolute inset-0 rounded-md" style={{
          background: `radial-gradient(ellipse at 50% 30%, ${ACCENT}08 0%, transparent 70%)`,
        }} />

        <div className="relative z-10 px-4 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px flex-1 max-w-16" style={{ background: `linear-gradient(to right, transparent, ${ACCENT}33)` }} />
            <span className="text-[10px] uppercase tracking-[0.4em] font-semibold" style={{ color: `${ACCENT}66` }}>
              The Dyno
            </span>
            <div className="h-px flex-1 max-w-16" style={{ background: `linear-gradient(to left, transparent, ${ACCENT}33)` }} />
          </div>
          <p className="text-center text-[9px] uppercase tracking-[0.3em] text-[#B3B3B8]/30 mb-8">
            Art Performance Instrument Cluster
          </p>

          <div className="flex items-end justify-center gap-2 lg:gap-3">
            <div className="hidden lg:flex flex-col gap-2 shrink-0">
              <VerticalBar
                value={stats.publishedArtworks}
                max={Math.max(stats.totalArtworks, 10)}
                label="Published"
                displayValue={String(stats.publishedArtworks)}
                color="#22C55E"
              />
              <VerticalBar
                value={stats.soldArtworks}
                max={Math.max(stats.publishedArtworks, 5)}
                label="Sold"
                displayValue={String(stats.soldArtworks)}
                color={ACCENT}
              />
            </div>

            <GaugeSVG
              value={stats.artworkViews30d}
              max={stats.artworkViews30dMax}
              label="Views"
              unit="30D"
              displayValue={stats.artworkViews30d >= 1000 ? `${(stats.artworkViews30d / 1000).toFixed(1)}k` : String(stats.artworkViews30d)}
              size={120}
              color="#22C55E"
              warningZone={0.9}
              tickCount={8}
            />

            <GaugeSVG
              value={stats.shopConversionRate}
              max={100}
              label="Shop Conv."
              unit="% VIEWS→CTA"
              displayValue={`${stats.shopConversionRate}%`}
              size={150}
              color={ACCENT}
              warningZone={0.8}
            />

            <GaugeSVG
              value={stats.commissionRate}
              max={100}
              label="Commission"
              unit="% OF INQUIRIES"
              displayValue={`${stats.commissionRate}%`}
              size={170}
              color="#F59E0B"
              warningZone={0.95}
              tickCount={10}
            />

            <GaugeSVG
              value={stats.revenue30d}
              max={stats.revenue30dMax}
              label="Revenue"
              unit="30D USD"
              displayValue={revenueDisplay}
              size={150}
              color={gaugeColor(stats.revenue30d > 0)}
              warningZone={0.2}
            />

            <GaugeSVG
              value={stats.returningVisitorRate}
              max={100}
              label="Returning"
              unit="% VISITORS"
              displayValue={`${stats.returningVisitorRate}%`}
              size={120}
              color="#3B82F6"
              warningZone={0.95}
              tickCount={8}
            />

            <div className="hidden lg:flex flex-col gap-2 shrink-0">
              <VerticalBar
                value={stats.subscriberCount}
                max={Math.max(stats.subscriberCount, 50)}
                label="Subscribers"
                displayValue={String(stats.subscriberCount)}
                color="#F59E0B"
              />
              <VerticalBar
                value={stats.publishedPosts}
                max={Math.max(stats.publishedPosts, 20)}
                label="Posts"
                displayValue={String(stats.publishedPosts)}
                color="#3B82F6"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-6">
              <InfoCell label="Total Artworks" value={stats.totalArtworks} />
              <InfoCell label="Published" value={stats.publishedArtworks} />
              <InfoCell label="Sold" value={stats.soldArtworks} />
              <InfoCell label="Total Orders" value={stats.totalOrders} />
              <InfoCell label="Newsletter Subscribers" value={stats.subscriberCount} />
              <InfoCell label="Blog Posts Published" value={stats.publishedPosts} />
            </div>
          </div>

          <div className="lg:hidden mt-6 pt-4 border-t border-white/5">
            <div className="grid grid-cols-4 gap-3">
              <InfoCell label="Published" value={stats.publishedArtworks} />
              <InfoCell label="Sold" value={stats.soldArtworks} />
              <InfoCell label="Subscribers" value={stats.subscriberCount} />
              <InfoCell label="Posts" value={stats.publishedPosts} />
            </div>
          </div>

          {stats.topArtworks.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3 h-3" style={{ color: ACCENT }} />
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#B3B3B8]/40 font-semibold">Top Works</span>
              </div>
              <div className="space-y-2" data-testid="top-works-list">
                {stats.topArtworks.map((work, i) => (
                  <a
                    key={work.id}
                    href={`/shop/${work.slug}`}
                    className="flex items-center gap-3 group"
                    data-testid={`top-work-${work.id}`}
                  >
                    <span className="text-[10px] tabular-nums text-[#B3B3B8]/30 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#F5F5F7]/80 truncate group-hover:text-[#F5F5F7] transition-colors">
                        {work.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Eye className="w-2.5 h-2.5 text-[#B3B3B8]/30" />
                      <span className="text-[10px] tabular-nums text-[#B3B3B8]/50">{work.viewCount}</span>
                      {work.sold ? (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E]/70 uppercase tracking-wider">Sold</span>
                      ) : work.forSale ? (
                        <span className="text-[8px] px-1 py-0.5 rounded uppercase tracking-wider" style={{ background: `${ACCENT}18`, color: `${ACCENT}99` }}>For Sale</span>
                      ) : (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-[#B3B3B8]/40 uppercase tracking-wider">Gallery</span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 pb-4">
          {[
            { c: "#22C55E", l: "Views" },
            { c: ACCENT, l: "Shop Conv." },
            { c: "#F59E0B", l: "Commission" },
            { c: "#22C55E", l: "Revenue" },
            { c: "#3B82F6", l: "Returning" },
          ].map((item) => (
            <div key={item.l} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.c, boxShadow: `0 0 4px ${item.c}44` }} />
              <span className="text-[8px] uppercase tracking-[0.15em] text-[#B3B3B8]/40">{item.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
