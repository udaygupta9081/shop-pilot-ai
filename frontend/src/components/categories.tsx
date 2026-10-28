import { Link } from "react-router-dom";

export interface CategoryItem {
  id: number | string;
  src: string;
  name: string;
  /** Optional internal link, e.g. /categories/main/sub */
  to?: string;
}

export interface CategoriesProps {
  subHeading?: string;
  categories?: CategoryItem[];
}

const Categories = ({
  subHeading,
  categories = [],
}: CategoriesProps) => {
  return (
    <div className="w-full flex flex-col">
      {/* Category Group Subheading (e.g., Beauty & Personal Care) */}
      {subHeading && (
        <div className="text-left mb-4">
          <h3 className="text-base sm:text-lg font-bold text-black">
            {subHeading}
          </h3>
        </div>
      )}

      {/* 9 Categories Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3 md:gap-4 w-full">
        {categories.map((category) => {
          const content = (
            <>
              {/* Square Image Container */}
              <div className="w-full aspect-square bg-[#F7F4EE] rounded-sm overflow-hidden flex items-center justify-center border border-gray-200/70">
                <img
                  src={category.src}
                  alt={category.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "/7.webp";
                  }}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  draggable={false}
                />
              </div>
              {/* Category Name */}
              <p className="text-xs sm:text-xs md:text-[13px] font-medium text-gray-800 group-hover:text-black leading-tight text-left">
                {category.name}
              </p>
            </>
          );
          const cls = "flex flex-col items-start gap-2 group cursor-pointer text-left";
          return category.to ? (
            <Link key={category.id} to={category.to} className={cls}>
              {content}
            </Link>
          ) : (
            <div key={category.id} className={cls}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Categories;