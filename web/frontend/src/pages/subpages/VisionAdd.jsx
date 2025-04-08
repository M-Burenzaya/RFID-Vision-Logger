import React, { useState, useEffect, useRef } from "react";
import classNames from "classnames";
import api from "../../api";

const VisionAdd = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);
  const [name, setName] = useState("");
  const [imageSrc, setImageSrc] = useState(null);
  const placeholderImage = "/default-placeholder.svg";

  const triggerOnce = async () => {
    try {
      const response = await api.post("/triggerOnce");
      if (response.status === 200) {
        setHasCaptured(true);
      }
    } catch (error) {
      console.error("Trigger Once Error:", error);
    }
  };

  const triggerContinuous = async () => {
    try {
      const response = await api.post("/startContinuous");
      if (response.status === 200) {
        console.log("Continuous started");
      }
    } catch (error) {
      console.error("Start Continuous Error:", error);
    }
  };

  const stopContinuous = async () => {
    try {
      const response = await api.post("/stopContinuous");
      if (response.status === 200) {
        console.log("Continuous stopped");
      }
    } catch (error) {
      console.error("Stop Continuous Error:", error);
    }
  };

  const handleAddPersonClick = () => {
    setIsAdding(true);
    setHasCaptured(false);
    setName("");
  };

  const handleCaptureClick = () => {
    if (hasCaptured) {
      triggerContinuous();
      setHasCaptured(false);
    } else {
      triggerOnce();
    }
  };

  const handleDiscardClick = () => {
    setIsAdding(false);
    setHasCaptured(false);
    setName("");
    stopContinuous();
  };

  const handleAddUserClick = () => {
    if (name.trim() !== "") {
      triggerContinuous();
    }
  };

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws");

    socket.onmessage = (event) => {
      const blob = event.data;
      const url = URL.createObjectURL(blob);
      setImageSrc(url);
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-6 rounded-md text-[#285082]">
      {!isAdding ? (
        <div className="flex flex-col items-center justify-center text-center">
          <img
            src="/add_user_icon.svg"
            alt="Add User"
            className="w-100 h-auto mb-4"
          />
          <button
            onClick={handleAddPersonClick}
            className="bg-[#285082] text-white px-6 py-3 rounded-md text-xl hover:bg-[#1f407a]"
          >
            Add Person
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row md:space-x-6 lg:space-x-12 max-w-6xl mx-auto">
          {/* Image preview */}
          <div className="max-w-2xl w-full lg:w-[150vw] mt-4 lg:mt-8">
            <div className="border rounded-md">
              <div className="flex justify-center">
                <img
                  src={imageSrc || placeholderImage}
                  alt="Received from server"
                  className="w-full h-auto aspect-square object-cover rotate-[${rotation}deg]"
                />
              </div>
            </div>
          </div>
          {/* Form */}
          <div className="flex flex-col border border-[#285082] justify-center mt-4 lg:mt-8 w-full max-w-2xl space-y-4">
            {/* Name input */}
            <div className="flex flex-row items-center space-x-4">
              <label className="text-base lg:text-lg xl:text-xl font-medium">Name:</label>
              <input
                type="text"
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[#285082] p-2 rounded-md"
              />
            </div>
            {/* Capture button */}
            <div className="flex justify-center">
              <button
                onClick={handleCaptureClick}
                className="w-full p-2 bg-[#285082] text-white rounded-md hover:bg-[#1f407a]"
              >
                {hasCaptured ? "Retake Image" : "Capture Image"}
              </button>
            </div>

            <div className="flex flex-row justify-center gap-4 w-full md:mt-10">
              {/* Discard button */}
              <button
                onClick={handleDiscardClick}
                className="w-full p-2 border border-[#285082] text-[#285082] rounded-md hover:bg-[#f0f8ff]"
              >
                Discard
              </button>
              {/* Add user button */}
              <button
                onClick={handleAddUserClick}
                className="w-full p-2 bg-[#285082] text-white rounded-md hover:bg-[#1f407a]"
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
