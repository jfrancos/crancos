import React, { useState, useEffect, useRef } from "react";
import { magic } from "./magic";
import { FaReact } from "react-icons/fa";

// https://react-icons.github.io/react-icons/icons

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(async () => {
    try {
      const response = await fetch("/api/message", { method: "post" });
      const { message } = await response.json();
      setMessage(message);
    } catch {
      setMessage("api inaccessible, try `netlify dev`");
    }
  });

  return (
    <div className="h-full w-full justify-center items-center">
      <div className="grid">
        <FaReact className="grid-overlay h-96 w-96 text-purple-100" />
        <div className="grid-overlay justify-center items-center">
          {message}
        </div>
      </div>
    </div>
  );
}

export default App;
