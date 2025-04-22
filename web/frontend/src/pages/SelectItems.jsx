import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";

const SelectItems = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const personName = location.state?.personName || "Unknown";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6 text-[#285082]">Select Items for {personName}</h1>

      {/* Add/Remove Items buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate("/add-items", { state: { personName } })}
          className="px-6 py-3 bg-[#285082] text-white rounded-md hover:bg-[#1f407a]"
        >
          Add Items
        </button>

        <button
          onClick={() => navigate("/remove-items", { state: { personName } })}
          className="px-6 py-3 bg-white border border-[#285082] text-[#285082] rounded-md hover:bg-[#f0f8ff]"
        >
          Remove Items
        </button>
      </div>

      {/* Maybe later you can add a list of existing items here */}
    </div>
  );
};

export default SelectItems;
