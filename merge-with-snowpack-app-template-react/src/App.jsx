import React from "react";
import { Auth } from "./Auth";
import { Provider } from "./Client";
import Controller from "./Controller";

function App() {
  return (
    <Provider>
      <Auth />
      <Controller />
    </Provider>
  );
}

export default App;
