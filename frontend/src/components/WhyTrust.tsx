export interface TrustPillar {
  title: string;
  description: string;
}

const defaultPillars: TrustPillar[] = [
  {
    title: "TRUST",
    description: "Nothing earns its place by paying.",
  },
  {
    title: "CHOICE",
    description: "Only the top of every category.",
  },
  {
    title: "CLARITY",
    description: "Every credible source, distilled into one verdict.",
  },
  {
    title: "FIT",
    description: "Built around your skin, specs, budget.",
  },
];

export interface WhyTrustProps {
  brandName?: string;
  pillars?: TrustPillar[];
  punchlinePrefix?: string;
  punchlineHighlight?: string;
}

const WhyTrust = ({
  brandName = "SHOP PILOT",
  pillars = defaultPillars,
  punchlinePrefix = "Built by AI.",
  punchlineHighlight = "Earned by evidence.",
}: WhyTrustProps) => {
  return (
    <section className="w-full bg-[#0d0d0d] text-white py-14 sm:py-16 md:py-20 mt-20 border-t border-neutral-900">
      <div className="w-[80%] mx-auto flex flex-col gap-8 md:gap-10">
        {/* Top Header Tag */}
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-[#38d76a] inline-block" />
          <span className="text-xs font-bold tracking-widest uppercase text-[#38d76a]">
            WHY TRUST {brandName}
          </span>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="bg-[#1c1c1c] hover:bg-[#222222] border border-neutral-800/90 p-6 sm:p-7 flex flex-col justify-start text-left rounded-sm transition-colors duration-200 group shadow-sm"
            >
              <h4 className="text-white font-bold text-xs sm:text-sm tracking-wider uppercase">
                {pillar.title}
              </h4>
              <p className="text-neutral-400 text-xs sm:text-[13px] leading-relaxed mt-3 font-normal">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Centered Punchline */}
        <div className="text-center pt-8 border-t border-neutral-900/90 mt-2">
          <p className="text-base sm:text-lg md:text-xl font-bold tracking-tight">
            <span className="text-white">{punchlinePrefix}</span>{" "}
            <span className="text-[#38d76a]">{punchlineHighlight}</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhyTrust;
