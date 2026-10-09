import { useState, useEffect, useCallback } from "react";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";

export interface SlideItem {
  id: number | string;
  src: string;
  alt: string;
}

const defaultSlides: SlideItem[] = [
  {
    id: 1,
    src: "/7.webp",
    alt: "Product 1",
  },
  {
    id: 2,
    src: "/8.webp",
    alt: "Product 2",
  },
  {
    id: 3,
    src: "/10.webp",
    alt: "Product 3",
  },
  {
    id: 4,
    src: "/12.webp",
    alt: "Product 4",
  },
];

interface CorousalProps {
  slides?: SlideItem[];
}

const Corousal = ({ slides = defaultSlides }: CorousalProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const goToSlide = (slideIndex: number) => {
    setCurrentIndex(slideIndex);
  };

  // Autoplay functionality for hero carousel
  useEffect(() => {
    if (isHovered || slides.length <= 1) return;

    const slideTimer = setInterval(() => {
      nextSlide();
    }, 4000);

    return () => clearInterval(slideTimer);
  }, [isHovered, nextSlide, slides.length]);

  // Touch swipe support for hero carousel
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-2xl border border-gray-800 bg-neutral-900 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding Track */}
      <div
        className="flex transition-transform duration-500 ease-out h-[150px] sm:h-[200px] md:h-[250px] lg:h-[350px]"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="min-w-full h-full relative flex items-center justify-center overflow-hidden select-none"
          >
            <img
              src={slide.src}
              alt={slide.alt}
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Subtle bottom gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Left Middle Navigation Icon */}
      {slides.length > 1 && (
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous image"
          className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <FaAngleLeft className="text-xl -translate-x-0.5" />
        </button>
      )}

      {/* Right Middle Navigation Icon */}
      {slides.length > 1 && (
        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next image"
          className="absolute right-3 md:left-auto md:right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <FaAngleRight className="text-xl translate-x-0.5" />
        </button>
      )}

      {/* Pagination Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer h-2 ${
                currentIndex === index
                  ? "w-6 bg-blue-500 shadow-sm shadow-blue-500/50"
                  : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Corousal;
