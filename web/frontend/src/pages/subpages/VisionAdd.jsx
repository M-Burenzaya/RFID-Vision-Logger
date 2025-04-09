// Updated VisionAdd with autoCapture, showFeatures, and VisionSettings-like triggerContinuous logic
import React, { useState, useEffect } from "react";
import classNames from "classnames";
import api from "../../api";

const VisionAdd = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);
  const [name, setName] = useState("");
  const [imageSrc, setImageSrc] = useState(null);
  const [autoCapture, setAutoCapture] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [isContinuousTrigger, setIsContinuousTrigger] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [ws, setWs] = useState(null);

  const placeholderImage = "/default-placeholder.svg";

  // Establish WebSocket connection
  useEffect(() => {
    const timer = setTimeout(() => {

      const socket = new WebSocket("ws://localhost:8000/ws");

      // Hope this handle open event
      socket.onopen = () => {
        setConnectionStatus("Connected");
        console.log("WebSocket connected using custom function yay!!!");
        console.log(imageSrc);
      };

      // When a message is received
      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          const json = JSON.parse(event.data);
          if (json.type === "auto_trigger") {
            // console.log("Auto-trigger signal:", json.status);
            if (json.status) {
              triggerOnce();
            }
          }
        } else if (event.data instanceof Blob) {
          const url = URL.createObjectURL(event.data);
          // console.log(url);
          setImageSrc(url);
        }

        // setTimeout(() => {
        //   URL.revokeObjectURL(url);  // Free memory used by the previous URL
        // }, 1000);
      };

      // When an error occurs
      socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
      };

      // Hope this close websocket
      socket.onclose = () => {
        setConnectionStatus("Disconnected");
        console.log("WebSocket connection closed.");
      };

      // Set WebSocket instance in state
      // setWs(socket);

      // const handleUnload = () => {
      //   const payload = JSON.stringify({ reason: "page_unload", time: Date.now() });
      //   navigator.sendBeacon("http://localhost:8000/disconnected", payload);
      // };
  
      // window.addEventListener("beforeunload", handleUnload);
  
      // Cleanup
      return () => {
        if (socket)
          socket.close();
        // window.removeEventListener("beforeunload", handleUnload);
      };

    }, 500);
    return () => clearTimeout(timer);

  }, []);

  const triggerOnce = async () => {
    try {
      const response = await api.post("/triggerOnce");
      if (response.status === 200) {
        setHasCaptured(true);
        setIsContinuousTrigger(false);
      }
    } catch (error) {
      console.error("Trigger Once Error:", error);
    }
  };

  const triggerContinuous = async () => {
    setIsContinuousTrigger((prevState) => !prevState);
    if (!isContinuousTrigger) {
      try {
        const response = await api.post("/startContinuous");
        if (response.status === 200) {
          console.log("Continuous started");
        }
      } catch (error) {
        console.error("Start Continuous Error:", error);
      }
    } else {
      try {
        const response = await api.post("/stopContinuous");
        if (response.status === 200) {
          console.log("Continuous stopped");
        }
      } catch (error) {
        console.error("Stop Continuous Error:", error);
      }
    }
  };

  const handleAddPersonClick = () => {
    setIsAdding(true);
    setHasCaptured(false);
    setName("");
    triggerContinuous();
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
    if (isContinuousTrigger) triggerContinuous(); // toggle off
  };

  const handleAddUserClick = () => {
    if (name.trim() !== "") {
      if (!isContinuousTrigger) triggerContinuous();
    }
  };

  const handleFeatureToggle = async () => {
    const newState = !showFeatures;
    setShowFeatures(newState);
    try {
      await api.post("/setShowFeatures", { show_features: newState });
    } catch (err) {
      console.error("Failed to update show_features", err);
    }
  };

  const handleAutoCaptureToggle = async () => {
    const newState = !autoCapture;
    setAutoCapture(newState);
    try {
      await api.post("/setAutoCapture", { auto_capture: newState });
    } catch (err) {
      console.error("Failed to update auto_capture", err);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row md:space-x-6 lg:space-x-12 max-w-6xl mx-auto">
      {!isAdding ? (
        <div className="flex flex-col items-center justify-center text-center">
          <img src="/add_user_icon.svg" alt="Add User" className="w-100 h-auto mb-4" />
          <button
            onClick={handleAddPersonClick}
            className="bg-[#285082] text-white px-6 py-3 rounded-md text-xl hover:bg-[#1f407a]"
          >
            Add Person
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-start lg:flex-row md:space-x-6 lg:space-x-12 max-w-6xl mx-auto">
          <div className="max-w-2xl w-full lg:w-[150vw] mb-2 lg:mb-8 mt-4 lg:mt-8">
            <div className="relative border rounded-md overflow-hidden">
              {!hasCaptured && (
                <img
                  src="/portrait_guide_overlay.svg"
                  alt="Guide Overlay"
                  className="absolute top-0 left-0 w-full h-full object-contain opacity-50 pointer-events-none z-10"
                />
              )}
              <div className="flex justify-center">
                <img
                  src={imageSrc || placeholderImage}
                  alt="Received from server"
                  className="w-full h-auto aspect-square object-cover"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center mt-4 lg:mt-8 w-full max-w-2xl space-y-4">
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

            <div className="flex justify-between gap-2">
              <button
                onClick={handleFeatureToggle}
                className={classNames(
                  "px-4 py-2 rounded-md border",
                  showFeatures ? "bg-[#285082] text-white hover:bg-[#1f407a]" : "bg-white text-[#285082] hover:bg-[#f0f8ff]"
                )}
              >
                {showFeatures ? "Hide Features" : "Show Features"}
              </button>

              <button
                onClick={handleAutoCaptureToggle}
                className={classNames(
                  "px-4 py-2 rounded-md border",
                  autoCapture ? "bg-[#285082] text-white hover:bg-[#1f407a]" : "bg-white text-[#285082] hover:bg-[#f0f8ff]"
                )}
              >
                Auto-Capture: {autoCapture ? "ON" : "OFF"}
              </button>
            </div>

            <button
              onClick={handleCaptureClick}
              className="w-full p-2 bg-[#285082] text-white rounded-md hover:bg-[#1f407a]"
            >
              {hasCaptured ? "Retake Image" : "Capture Image"}
            </button>

            <div className="flex flex-row justify-center gap-4 w-full md:mt-10">
              <button
                onClick={handleDiscardClick}
                className="w-full p-2 border border-[#285082] text-[#285082] rounded-md hover:bg-[#f0f8ff]"
              >
                Discard
              </button>
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
