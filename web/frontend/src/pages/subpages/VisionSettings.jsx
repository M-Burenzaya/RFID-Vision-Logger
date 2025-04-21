import React, { useState, useEffect, useRef, use } from 'react';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";
import classNames from 'classnames';
import api from "../../api";

const VisionSettings = () => {
  const [detectionName, setDetectionName] = useState("");
  const [detectionPercent, setDetectionPercent] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);  // Placeholder for image display
  const [debugConsole, setDebugConsole] = useState([]);
  const debugRef = useRef(null);
  const [isContinuousTrigger, setIsContinuousTrigger] = useState(false); // Track continuous trigger state
  
  const [message, setMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [ws, setWs] = useState(null);

  const detectionRef = useRef("");

  const placeholderImage = "/default-placeholder.svg";

  // console.log("Component rendered");
  // Establish WebSocket connection
  useEffect(() => {
    // console.log("Effect mounted");
    const socketRef = { current: null };

    const timer = setTimeout(() => {

      const socket = new WebSocket("ws://localhost:8000/ws");
      // Hope this handle open event
      socket.onopen = () => {
        setConnectionStatus("Connected");
        console.log("WebSocket connected using custom function yay!!!");
        // console.log(imageSrc);
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
          } else if (json.type === "recognition") {

            const formattedName = json.name
              ? json.name.replace(/\b\w/g, c => c.toUpperCase())
              : "Unknown";

              const confidence = json.distance !== null
              ? Math.max(0, Math.min(100, (1.5 - json.distance) * 100)).toFixed(3)  // Example: distance 0.234 → confidence 0.766
              : "0.000";
            
            const logText = `Recognition result: ${formattedName} (${json.distance?.toFixed(3) ?? "N/A"})`;

            if (formattedName === detectionRef.current) {
              replaceDebugConsole(logText);
            } else {
              updateDebugConsole(logText);
            }
            // console.log(`[formatted] "${formattedName}"`);
            // console.log(`[detection] "${detectionRef.current}"`);

            setDetectionPercent(confidence);
            setDetectionName(formattedName);     // still needed for input box
            detectionRef.current = formattedName; // for immediate comparison
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
      setWs(socket);
      socketRef.current = socket;
    }, 500);

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log("Cleaning up WebSocket. Current state:", socketRef.current.readyState);
        socketRef.current.close();
      }
    };

  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/vision-settings");
        setShowFeatures(response.data.is_show_features);
        setAutoCapture(response.data.is_auto_capture);
      } catch (error) {
        console.error("Failed to fetch vision settings:", error);
      }
    };
  
    fetchSettings();
  }, []);

  useEffect(() => {
    if (debugRef.current) {
      debugRef.current.scrollTop = debugRef.current.scrollHeight;
    }
  }, [debugConsole]);

  const updateDebugConsole = (message, level = "INFO") => {
    const prefix = {
      INFO: "INFO:    ",
      SUCCESS: "SUCCESS: ",
      WARNING: "WARNING: ",
      ERROR: "ERROR:   ",
    }[level] || "LOG:     ";
    setDebugConsole((prev) => [...prev, prefix + message]);
  };

  const replaceDebugConsole = (message, level = "INFO") => {
    const prefix = {
      INFO: "INFO:    ",
      SUCCESS: "SUCCESS: ",
      WARNING: "WARNING: ",
      ERROR: "ERROR:   ",
    }[level] || "LOG:     ";
  
    setDebugConsole(prev => {
      const newLine = prefix + message;
      if (prev.length === 0) return [newLine]; // if empty, just add it
      return [...prev.slice(0, -1), newLine];  // replace last line
    });
  };
  

  // Trigger Once function
  const triggerOnce = async () => {
    try {
      updateDebugConsole("Triggering action...");
  
      // Call the backend to trigger the action (capture image)
      const response = await api.post("/triggerOnce");
  
      if (response.status === 200) {
        setIsContinuousTrigger(false);
        // Success: Action was triggered successfully
        updateDebugConsole("Action triggered successfully!", "SUCCESS");

      } else {
        // Failure: Return error from backend
        updateDebugConsole(`Error: ${response.data.message}`, "ERROR");
      }
    } catch (error) {
      // Network errors or exceptions
      updateDebugConsole(`Error occurred while triggering action: ${error.message}`, "ERROR");
    }
  };
  

  const triggerContinuous = async () => {
    setIsContinuousTrigger((prevState) => !prevState); // Toggle state
    
    if (!isContinuousTrigger) {
      // Start continuous capture
      updateDebugConsole("Starting continuous capture...");
      
      try {
        const response = await api.post("/startContinuous");
        if (response.status === 200) {
          updateDebugConsole("Continuous capture started.", "SUCCESS");
        } else {
          updateDebugConsole(response.data.message, "ERROR");
        }
      } catch (error) {
        updateDebugConsole(`Error occurred while starting continuous capture: ${error.message}`, "ERROR");
      }
    } else {
      // Stop continuous capture
      updateDebugConsole("Stopping continuous capture...");
  
      try {
        const response = await api.post("/stopContinuous");  // Call the backend to stop continuous capture
        if (response.status === 200) {
          updateDebugConsole("Continuous capture stopped.", "SUCCESS");
        } else {
          updateDebugConsole(response.data.message, "ERROR");
        }
      } catch (error) {
        updateDebugConsole(`Error occurred while stopping continuous capture: ${error.message}`, "ERROR");
      }
    }
  };
  

  const handleFeatureToggle = async () => {
    const newState = !showFeatures;
    setShowFeatures(newState);
    // console.log("showFeatures (newState):", newState);

    try {
      await api.post("/setShowFeatures", { show_features: newState });
      updateDebugConsole(`show_features updated to ${newState}`);
    } catch (error) {
      console.error("Failed to update show_features:", error);
      updateDebugConsole(`Error occurred while updating show_features: ${error.message}`, "ERROR");
    }
  };


  const handleAutoCaptureToggle = async () => {
    const newState = !autoCapture;
    setAutoCapture(newState);
    // console.log("autoCapture (newState):", newState);

    try {
      await api.post("/setAutoCapture", { auto_capture: newState });
      updateDebugConsole(`auto_capture updated to ${newState}`);
    } catch (error) {
      console.error("Failed to update auto_capture:", error);
      updateDebugConsole(`Error occurred while updating auto_capture: ${error.message}`, "ERROR");
    }
  };

  const handleRotateCCW = async () => {
    updateDebugConsole("Rotating CCW...");
    try {
      const response = await api.post("/rotateCCW");
      if (response.status === 200) {
        updateDebugConsole("Rotation successful.", "SUCCESS");
        if (!isContinuousTrigger) {
          triggerOnce();
        }
      } else {
        updateDebugConsole(response.data.message, "ERROR");
      }
    } catch (error) {
      updateDebugConsole(`Error occurred while rotating CCW: ${error.message}`, "ERROR");
    }
  };
  const handleRotateCW = async () => {
    updateDebugConsole("Rotating CW...");
    try {
      const response = await api.post("/rotateCW");
      if (response.status === 200) {
        updateDebugConsole("Rotation successful.", "SUCCESS");
        if (!isContinuousTrigger) {
          triggerOnce();
        }
      } else {
        updateDebugConsole(response.data.message, "ERROR");
      }
    } catch (error) {
      updateDebugConsole(`Error occurred while rotating CW: ${error.message}`, "ERROR");
    }
  };

  const handleFlipHorizontal = async () => {
    updateDebugConsole("Flipping horizontally...");
    try {
      const response = await api.post("/flipH");
      if (response.status === 200) {
        updateDebugConsole("Flip successful.", "SUCCESS");
        if (!isContinuousTrigger) {
          triggerOnce();
        }
      } else {
        updateDebugConsole(response.data.message, "ERROR");
      }
    } catch (error) {
      updateDebugConsole(`Error occurred while flipping horizontally: ${error.message}`, "ERROR");
    }
  };
  
  const handleFlipVertical = async () => {
    updateDebugConsole("Flipping vertically...");
    try {
      const response = await api.post("/flipV");
      if (response.status === 200) {
        updateDebugConsole("Flip successful.", "SUCCESS");
        if (!isContinuousTrigger) {
          triggerOnce();
        }
      } else {
        updateDebugConsole(response.data.message, "ERROR");
      }
    } catch (error) {
      updateDebugConsole(`Error occurred while flipping vertically: ${error.message}`, "ERROR");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row md:space-x-6 lg:space-x-12 max-w-6xl mx-auto">
      {/* Left side: Image display */}
      <div className="max-w-2xl w-full lg:w-[150vw] mb-2 lg:mb-8 mt-4 lg:mt-8">
        <div className="border rounded-md overflow-hidden">
          {/* Container must be relative to position buttons inside */}
          <div className="relative">
            {/* Floating buttons inside image box */}
            <div className="absolute top-3 right-3 flex gap-2 z-10">
              <button 
                onClick={handleRotateCCW}
                className="p-2 bg-white/80 border rounded hover:bg-white"
                title="Rotate CCW"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </button>
              <button 
                onClick={handleRotateCW}
                className="p-2 bg-white/80 border rounded hover:bg-white"
                title="Rotate CW"
              >
                <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"  />
              </button>
              <button 
                onClick={handleFlipHorizontal}
                className="p-2 bg-white/80 border rounded hover:bg-white"
                title="Flip Horizontal"
              >
                <FlipHorizontal className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"  />
              </button>
              <button 
                onClick={handleFlipVertical}
                className="p-2 bg-white/80 border rounded hover:bg-white"
                title="Flip Vertical"
              >
                <FlipVertical className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"  />
              </button>
            </div>

            {/* Image display */}
            <div className="flex justify-center">
              <img 
                src={imageSrc || placeholderImage} 
                alt="Received from server" 
                className="w-full h-auto aspect-square object-cover" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Buttons and Debug Console */}
      <div className="max-w-2xl flex flex-col mt-4 lg:mt-8 w-full">
        {/* Buttons for trigger actions */}
        <div className="flex flex-col w-full gap-4">

          <div className="w-full grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 lg:gap-4">
            {/* Trigger Once Button */}
            <button
              onClick={triggerOnce}
              className="p-2 border border-[#285082] bg-white 
              text-[#285082] rounded-md cursor-pointer hover:bg-[#f0f8ff] 
              active:bg-[#285082] active:text-white">
                Trigger Once
            </button>
            {/* Continuous Trigger Button */}
            <button 
              onClick={triggerContinuous}
              className={classNames("p-2 border rounded-md whitespace-nowrap",
                {
                  'bg-[#285082] text-white hover:bg-[#1f407a]': isContinuousTrigger,
                  'bg-white text-[#285082] hover:bg-[#f0f8ff]': !isContinuousTrigger
                }
              )}
            >
              {isContinuousTrigger ? "Stop Continuous" : "Start Continuous"}
            </button>

          </div>

          {/* Feature + AutoCapture Buttons (stacked vertically, small) */}
          <div className="w-full grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 lg:gap-4">
            {/* Show Features Button */}
            <button
              onClick={handleFeatureToggle}
              className={classNames(
                'p-2 rounded-md border font-medium min-w-30  whitespace-nowrap',
                {
                  'bg-[#285082] text-white hover:bg-[#1f407a]': showFeatures,
                  'bg-white text-[#285082] hover:bg-[#f0f8ff]': !showFeatures,
                }
              )}
            >
              {showFeatures ? "Hide Features" : "Show Features"}
            </button>

            {/* Auto Capture Button */}
            <button
              onClick={handleAutoCaptureToggle}
              className={classNames(
                'p-2 rounded-md border font-medium whitespace-nowrap',
                {
                  'bg-[#285082] text-white hover:bg-[#1f407a]': autoCapture,
                  'bg-white text-[#285082] hover:bg-[#f0f8ff]': !autoCapture,
                }
              )}
            >
              {autoCapture ? "Auto capture" : "Auto capture"}
            </button>
          </div>
          

          <div className="w-full flex flex-row gap-4 lg:gap-4 text-sm sm:text-base">
            {/* Detection Name and Percent in a single column */}
            <div className="w-full flex flex-col gap-4 text-sm sm:text-base lg:text-lg">
              {/* Detection Name */}
              <div className="flex flex-col text-[#285082]">
                <input
                  type="text"
                  value={detectionName}
                  disabled
                  className="w-full border border-[#285082] p-2 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
                  placeholder="Detection Name"
                />
              </div>
              
              {/* Detection Percent */}
              <div className="w-full flex flex-col text-[#285082]">
                <input
                  type="text"
                  value={detectionPercent + "%"}
                  disabled
                  className="w-full border border-[#285082] p-2 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
                  placeholder="Detection Percent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Debug Console */}
        <div className="w-full mt-4 flex flex-col flex-grow">
          <div className="bg-gray-800 text-white p-4 rounded-md h-full mb-4 lg:mb-8 flex flex-col">
            <h3 className="text-lg md:text-sm lg:text-lg font-semibold mb-2">Debug Console</h3>
            <div ref={debugRef} className="debug-console overflow-y-auto max-h-70 lg:max-h-[15vw] xl:max-h-[20vw]">
              {debugConsole.map((log, index) => (
                <p key={index} className="text-sm">{log}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionSettings;
