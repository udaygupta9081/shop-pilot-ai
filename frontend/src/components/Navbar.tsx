import { Link } from "react-router-dom";
import SearchBox from "./SearchBox";
import CategoryMenu from "./CategoryMenu";
import { useAuth } from "../context/authContext";

const Navbar = () => {
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* server unreachable: stay logged in, the user can try again */
    }
  };

  return (
    <div className="relative z-40 w-full h-16 bg-[#111111]">
      <div className="w-[80%] h-full mx-auto flex items-center justify-between gap-4">
        <Link to="/" className="text-white font-bold text-xl shrink-0">
          ShopPilot
        </Link>
        {/* The one search bar: live suggestions from the product API. */}
        <div className="flex-1 flex justify-center">
          <SearchBox />
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <Link to="/" className="text-white hover:text-gray-300 transition">
            Home
          </Link>
          <CategoryMenu />
          <div className="flex items-center gap-2 text-white hover:text-gray-300 cursor-pointer transition">
            <p>Ask ShopPilot</p>
            <p>🌟</p>
          </div>
          {!loading &&
            (user ? (
              <div className="flex items-center gap-4">
                <span className="text-gray-300 max-w-[10rem] truncate" title={user.email}>
                  Hi, {user.name.split(" ")[0]}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-white hover:text-gray-300 cursor-pointer transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-white hover:text-gray-300 cursor-pointer transition"
              >
                <p>Login</p>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
