
import { Link } from "react-router-dom";
const Navbar = () => {
  return (
    <div className="w-full h-16 bg-[#111111]">
      <div className="w-[80%] h-full mx-auto flex items-center justify-between">
        <div className="text-white font-bold text-xl">ShopPilot</div>
        <div className="flex items-center gap-4">
          <div className="relative" >
            <Link to="/search">
              <input
                type="text"
                placeholder="Search"
                className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 w-96"

              />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-white hover:text-gray-300 cursor-pointer transition">
            Home
          </div>
          <div className="text-white hover:text-gray-300 cursor-pointer transition">
            Categories
          </div>
          <div className="flex items-center gap-2 text-white hover:text-gray-300 cursor-pointer transition">
            <p>Ask ShopPilot</p>
            <p>🌟</p>
          </div>
          <div className="text-white hover:text-gray-300 cursor-pointer transition">
            <p>user</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
