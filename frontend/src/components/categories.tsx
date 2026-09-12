export interface CategoryItem {
  id: number | string;
  src: string;
  name: string;
}

const defaultCategories: CategoryItem[] = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80",
    name: "Face Wash",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=300&auto=format&fit=crop&q=80",
    name: "Shampoos",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1608248597359-2ffb233a7587?w=300&auto=format&fit=crop&q=80",
    name: "Hair Oils",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&auto=format&fit=crop&q=80",
    name: "Conditioners",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80",
    name: "Foundations",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=300&auto=format&fit=crop&q=80",
    name: "Lipsticks",
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80",
    name: "Hair Growth Treatments",
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&auto=format&fit=crop&q=80",
    name: "Face Primers",
  },
  {
    id: 9,
    src: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=300&auto=format&fit=crop&q=80",
    name: "Setting Sprays",
  },
];

export interface CategoriesProps {
  subHeading?: string;
  categories?: CategoryItem[];
}

const Categories = ({
  subHeading,
  categories = defaultCategories,
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
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex flex-col items-start gap-2 group cursor-pointer text-left"
          >
            {/* Square Image Container */}
            <div className="w-full aspect-square bg-[#F7F4EE] rounded-sm overflow-hidden flex items-center justify-center border border-gray-200/70">
              <img
                src={category.src}
                alt={category.name}
                onError={(e) => {
                  e.currentTarget.src = "/7.webp";
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                draggable={false}
              />
            </div>
            {/* Category Name */}
            <p className="text-xs sm:text-xs md:text-[13px] font-medium text-gray-800 group-hover:text-black leading-tight text-left">
              {category.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categories;