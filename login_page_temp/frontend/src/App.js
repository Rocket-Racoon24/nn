import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Main from "./main";

function App() {
  return (
    <Router>
   <Routes>
  <Route path="/home" element={<Home />} />
  <Route path="/" element={<Main />} />
  <Route path="/login" element={<Login />} />
</Routes>


    </Router>
  );
}

export default App;
