import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <div className="w-full h-screen">
          {/* <div className="w-full md:w-[80%] h-screen mx-auto bg-red-500"> */}
          <App />
          {/* </div> */}
        </div>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
