import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import LandingPage from "./components/LandingPage.jsx";

function Root() {
  const [authed, setAuthed] = useState(false);

  if (!authed) {
    return <LandingPage onEnter={() => setAuthed(true)} />;
  }
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
