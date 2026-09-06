import { Link, useNavigate } from "react-router-dom";
import { FaMagnifyingGlass } from "react-icons/fa6";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-16 bg-[#111111]">
      <div className="w-[80%] h-full mx-auto flex items-center justify-between">
        <div className="text-white font-bold text-xl">ShopPilot</div>
        <div className="flex items-center gap-4">
          {/*
            This opens the dedicated /search page (which owns the real,
            typeable input) rather than being a text input itself, so
            there is only ever one place the user's keystrokes go.
          */}
          <button
            type="button"
            onClick={() => navigate("/search")}
            aria-label="Search any product or concern"
            className="relative flex items-center bg-gray-800 text-gray-400 hover:text-gray-300 pl-9 pr-4 py-2 rounded-lg border border-gray-700 hover:border-gray-600 focus:outline-none focus:border-blue-500 w-96 text-left cursor-pointer transition-colors"
          >
            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" />
            <span>Search any product or concern</span>
          </button>
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
          <Link
            to="/login"
            className="text-white hover:text-gray-300 cursor-pointer transition"
          >
            <p>Login</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
