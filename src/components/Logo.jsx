import React from "react";
import logo from "../assets/logo.png";


export default function Logo({ size = 16, className = "" }) {
  return (
    <img
      src={logo}
      alt="AtomQuest Logo"
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}