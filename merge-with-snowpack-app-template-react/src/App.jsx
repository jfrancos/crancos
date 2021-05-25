import React, { useState, useEffect, useRef } from "react";
import { FaReact } from "react-icons/fa";

// https://react-icons.github.io/react-icons/icons

function App() {
  return (
    <div className="h-full w-full justify-center items-center">
      <div className="grid">
        <FaReact className="grid-overlay h-96 w-96 text-purple-100" />
        <div className="grid-overlay justify-center items-center">
          Hello, Crancos!
        </div>
      </div>
    </div>
  );
}

export default App;
