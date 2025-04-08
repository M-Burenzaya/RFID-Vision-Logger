import React, { useState } from "react";
import classNames from "classnames";
import VisionSettings from "./VisionSettings";

const VisionAdd = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);
  const [name, setName] = useState("");
  const [rotation, setRotation] = useState(0);

  const handleAddPersonClick = () => {
    setIsAdding(true);
    setHasCaptured(false);
    setName("");
  };

  const handleCaptureClick = () => {
    if (hasCaptured) {
      // Retake image - Start continuous again
      window.triggerContinuous();
      setHasCaptured(false);
    } else {
      // Capture single image
      window.triggerOnce();
      setHasCaptured(true);
    }
  };

  const handleDiscardClick = () => {
    setIsAdding(false);
    setHasCaptured(false);
    setName("");
    window.stopContinuous && window.stopContinuous();
  };

  const handleAddUserClick = () => {
    if (name.trim() !== "") {
      window.triggerContinuous();
    }
  };

  const rotateCW = () => setRotation((prev) => (prev + 90) % 360);
  const rotateCCW = () => setRotation((prev) => (prev - 90 + 360) % 360);

  return (
    <div className="max-w-6xl mx-auto mt-6 p-4 bg-white rounded-md shadow-md text-[#285082]">
      {!isAdding ? (
        <div className="flex flex-col items-center justify-center text-center">
          <button
            onClick={handleAddPersonClick}
            className="bg-[#285082] text-white px-6 py-3 rounded-md text-xl hover:bg-[#1f407a]"
          >
            Add Person
          </button>
        </div>
      ) : (
        <div>
          <VisionSettings />

          <div className="mt-4 space-y-4">
            <input
              type="text"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#285082] p-2 rounded-md"
            />

            <div className="flex justify-between gap-4">
              <button
                onClick={handleCaptureClick}
                className="flex-1 p-2 bg-[#285082] text-white rounded-md hover:bg-[#1f407a]"
              >
                {hasCaptured ? "Retake Image" : "Capture Image"}
              </button>

              <button
                onClick={rotateCCW}
                className="px-4 py-2 border border-[#285082] rounded-md"
              >
                Rotate CCW
              </button>
              <button
                onClick={rotateCW}
                className="px-4 py-2 border border-[#285082] rounded-md"
              >
                Rotate CW
              </button>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={handleDiscardClick}
                className="p-2 border border-[#285082] text-[#285082] rounded-md hover:bg-[#f0f8ff]"
              >
                Discard
              </button>
              <button
                onClick={handleAddUserClick}
                className="p-2 bg-[#285082] text-white rounded-md hover:bg-[#1f407a]"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisionAdd;
