import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <div className="w-full h-screen">
        {/* <div className="w-full md:w-[80%] h-screen mx-auto bg-red-500"> */}
        <App />
        {/* </div> */}
      </div>
    </BrowserRouter>
  </StrictMode>,
);
