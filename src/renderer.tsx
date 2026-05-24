import { createRoot } from "react-dom/client";
import { useState } from "react";

function App() {
  return (
    <>
      <button onClick={() => electron.startAuth()}>Start Authentication</button>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
