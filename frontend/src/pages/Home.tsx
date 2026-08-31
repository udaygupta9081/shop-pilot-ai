import Corousal from "../components/Corousal";
import Ranked from "../components/Ranked";
import TopRatedAllCategories from "../components/TopRatedAllCategories";
import Categories from "../components/categories";
import WhyTrust from "../components/WhyTrust";

const Home = () => {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] pb-16">
      <div className="w-full h-fit flex flex-col">
        {/* Hero Section */}
        <section className="w-[80%] mx-auto flex flex-col items-start mt-10">
          {/* Main Hero Heading & Subtitle */}
          <div className="mb-8 flex flex-col gap-2 text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-black">
              Not every product. <span className="text-blue-600">Only the top 1%.</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-500">
              Agents read everything, several times over — so you buy right the first time.
            </p>
          </div>
          {/* Reusable Hero Carousel */}
          <Corousal />
        </section>

        {/* Freshly Re-ranked Section */}
        <section className="w-[80%] mx-auto flex flex-col items-start mt-16">
          {/* Section Heading */}
          <div className="flex justify-between items-center w-full mb-6">
            <div className="flex flex-col gap-1 text-left">
              <p className="text-xs sm:text-sm font-semibold tracking-wider text-gray-500 uppercase">
                LIVE · THE AGENTS NEVER STOP
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
                Freshly re-ranked
              </h2>
            </div>
          </div>
          {/* Reusable Ranked Cards Carousel */}
          <Ranked />
        </section>

        {/* Browse by Category Section */}
        <section className="w-[80%] mx-auto flex flex-col mt-16">
          {/* Top Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-4 pb-6">
            <div className="flex flex-col gap-1 text-left">
              <p className="text-xs sm:text-sm font-semibold tracking-wider text-gray-500 uppercase">
                BROWSE BY CATEGORY
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
                Explore the shortlist
              </h2>
            </div>
            <div>
              <button
                type="button"
                className="border border-black bg-white hover:bg-black text-black hover:text-white px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center gap-2 cursor-pointer group shadow-sm active:scale-95"
              >
                <span>BROWSE ALL CATEGORIES</span>
                <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </button>
            </div>
          </div>

          {/* Reusable Categories Grid with subHeading passed as props */}
          <Categories subHeading="Beauty & Personal Care" />
          <Categories subHeading="Electronics and Appliances" />
          <Categories subHeading="Sports & Fitness" />
        </section>

        {/* All Categories Top Cards Section */}
        <section className="w-[80%] mx-auto flex flex-col mt-16">
          {/* Top Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-4 pb-6">
            <div className="flex flex-col gap-1 text-left">
              <h2 className="text-xl sm:text-3xl font-bold text-black tracking-tight">
                Where Most People Start
              </h2>
              <p className="text-xs sm:text-sm font-semibold tracking-wider text-gray-500">
                One strong shortlist from every aisle on Shop Pilot.
              </p>
            </div>
            <div>
              <button
                type="button"
                className="border border-black bg-white hover:bg-black text-black hover:text-white px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center gap-2 cursor-pointer group shadow-sm active:scale-95"
              >
                <span>BROWSE ALL CATEGORIES</span>
                <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </button>
            </div>
          </div>

          {/* Reusable Top Rated All Categories */}
          <TopRatedAllCategories />
        </section>

        {/* Why Trust Section */}
        <WhyTrust brandName="SHOP PILOT" />
      </div>
    </div>
  );
};

export default Home;

