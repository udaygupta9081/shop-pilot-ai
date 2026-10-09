import { useRef } from "react";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";

export interface RankedCard {
  id: number | string;
  src: string;
  alt: string;
  badge: string;
  desc: string;
  sources?: string;
  rank: string;
}

const defaultRankedCards: RankedCard[] = [
  {
    id: 1,
    src: "/7.webp",
    alt: "Best Body Lotions",
    badge: "RE-RANKED 40M AGO",
    desc: "Best Body Lotions",
    sources: "8,171 SOURCES",
    rank: "490 RANKED",
  },
  {
    id: 2,
    src: "/8.webp",
    alt: "Smartphones for Camera & Photography",
    badge: "RE-RANKED 2H AGO",
    desc: "Smartphones for Camera & Photography",
    sources: "4,371 SOURCES",
    rank: "106 RANKED",
  },
  {
    id: 3,
    src: "/10.webp",
    alt: "Best Toothbrushes",
    badge: "RE-RANKED 5H AGO",
    desc: "Best Toothbrushes",
    sources: "3,387 SOURCES",
    rank: "219 RANKED",
  },
  {
    id: 4,
    src: "/12.webp",
    alt: "Baby & Kids Oils",
    badge: "RE-RANKED 9H AGO",
    desc: "Baby & Kids Oils",
    sources: "1,240 SOURCES",
    rank: "183 RANKED",
  },
  {
    id: 5,
    src: "/7.webp",
    alt: "Premium Skincare",
    badge: "RE-RANKED 12H AGO",
    desc: "Top Anti-Aging Serums",
    sources: "5,420 SOURCES",
    rank: "310 RANKED",
  },
  {
    id: 6,
    src: "/8.webp",
    alt: "Wireless Earbuds",
    badge: "RE-RANKED 1D AGO",
    desc: "Noise-Cancelling Earbuds",
    sources: "9,850 SOURCES",
    rank: "520 RANKED",
  },
  {
    id: 7,
    src: "/10.webp",
    alt: "Smart Home Hubs",
    badge: "RE-RANKED 1D AGO",
    desc: "Smart Home Hubs & Plugs",
    sources: "2,980 SOURCES",
    rank: "140 RANKED",
  },
  {
    id: 8,
    src: "/12.webp",
    alt: "Fitness Trackers",
    badge: "RE-RANKED 2D AGO",
    desc: "Health & Activity Trackers",
    sources: "6,150 SOURCES",
    rank: "295 RANKED",
  },
];

export interface RankedProps {
  cards?: RankedCard[];
}

const Ranked = ({ cards = defaultRankedCards }: RankedProps) => {
  const rankedScrollRef = useRef<HTMLDivElement>(null);

  const handleRankedPrev = () => {
    if (!rankedScrollRef.current) return;
    const container = rankedScrollRef.current;
    const cardWidth =
      container.clientWidth >= 1024 ? container.clientWidth / 4 : 300;

    if (container.scrollLeft <= 10) {
      container.scrollTo({ left: container.scrollWidth, behavior: "smooth" });
    } else {
      container.scrollBy({ left: -cardWidth, behavior: "smooth" });
    }
  };

  const handleRankedNext = () => {
    if (!rankedScrollRef.current) return;
    const container = rankedScrollRef.current;
    const cardWidth =
      container.clientWidth >= 1024 ? container.clientWidth / 4 : 300;

    if (
      container.scrollLeft + container.clientWidth >=
      container.scrollWidth - 15
    ) {
      container.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      container.scrollBy({ left: cardWidth, behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full group/ranked">
      {/* Scroll Navigation Buttons */}
      <button
        type="button"
        onClick={handleRankedPrev}
        aria-label="Previous ranked products"
        className="absolute -left-3 md:-left-5 top-1/3 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-800 border border-gray-200 shadow-md hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <FaAngleLeft className="text-sm" />
      </button>

      <button
        type="button"
        onClick={handleRankedNext}
        aria-label="Next ranked products"
        className="absolute -right-3 md:-right-5 top-1/3 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-800 border border-gray-200 shadow-md hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <FaAngleRight className="text-sm" />
      </button>

      {/* Cards Scrollable Carousel Container */}
      <div
        ref={rankedScrollRef}
        className="w-full flex gap-4 md:gap-5 overflow-x-auto scroll-smooth pb-4 select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex-shrink-0 w-[260px] sm:w-[280px] md:w-[calc(33.333%-0.9rem)] lg:w-[calc(25%-0.95rem)] flex flex-col gap-3 group cursor-pointer text-left"
          >
            {/* Image Container with Badge */}
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-neutral-100 border border-gray-200">
              <img
                src={card.src}
                alt={card.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                draggable={false}
              />
              {/* Badge at top-left: RE-RANKED ... */}
              <div className="absolute top-2.5 left-2.5 bg-black/90 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold tracking-wider text-white flex items-center gap-1.5 border border-white/10">
                <span className="w-1.5 h-1.5 bg-emerald-400 inline-block" />
                <span>{card.badge}</span>
              </div>
            </div>

            {/* Text Content */}
            <div className="flex flex-col items-start">
              <h3 className="font-bold text-base sm:text-lg text-black group-hover:text-blue-600 transition-colors line-clamp-2">
                {card.desc}
              </h3>
              <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">
                {card.sources ? `${card.sources} · ` : ""}
                {card.rank}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ranked;
