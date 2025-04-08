import React, { useState, useEffect, useRef, use } from 'react';
import classNames from 'classnames';
import api from "../../api";

const VisionSettings = () => {
  const [detectionName, setDetectionName] = useState("");
  const [detectionPercent, setDetectionPercent] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);  // Placeholder for image display
  const [debugConsole, setDebugConsole] = useState([]);
  const debugRef = useRef(null);
  const [isContinuousTrigger, setIsContinuousTrigger] = useState(false); // Track continuous trigger state
  
  const [message, setMessage] = useState("");
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
        const blob = event.data;  // The data received is a Blob object
        // console.log("Received Blob:", blob);
        const url = URL.createObjectURL(blob);  // Create a URL for the Blob
        setImageSrc(url);  // Set the image URL for displaying it
        // console.log("Image received and displayed.");

        console.log(url);

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

      // Cleanup: Close WebSocket connection when component unmounts
      return () => {
        if (socket) {
          socket.close();  // Close the WebSocket connection on component unmount
        }
      };
    }, 500);
    return () => clearTimeout(timer);

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
        const response = await api.post("/startContinuous");  // Call the backend to start continuous capture
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
  

  const handleFeatureToggle = () => {
    setShowFeatures(!showFeatures);
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
                className="text-xs px-2 py-1 bg-white/80 border rounded hover:bg-white"
              >
                ⟲ CCW
              </button>
              <button 
                onClick={handleRotateCW}
                className="text-xs px-2 py-1 bg-white/80 border rounded hover:bg-white"
              >
                CW ⟳
              </button>
              <button 
                onClick={handleFlipHorizontal}
                className="text-xs px-2 py-1 bg-white/80 border rounded hover:bg-white"
              >
                ↔ Flip H
              </button>
              <button 
                onClick={handleFlipVertical}
                className="text-xs px-2 py-1 bg-white/80 border rounded hover:bg-white"
              >
                ↕ Flip V
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
        <div className="w-full mb-4">

          <div className="w-full mb-4 grid grid-cols-2 lg:grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] gap-2 sm:gap-4 md:gap-6 lg:gap-4 text-lg md:text-xl">
            <button onClick={triggerOnce} className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer hover:bg-[#f0f8ff] active:bg-[#285082] active:text-white">
              Trigger Once
            </button>
            <button onClick={triggerContinuous} className={classNames("p-2 border rounded-md text-lg md:text-xl", {
                'bg-[#285082] text-white hover:bg-[#1f407a]': isContinuousTrigger,
                'bg-white text-[#285082] hover:bg-[#f0f8ff]': !isContinuousTrigger
              })}>
              {isContinuousTrigger ? "Stop Continuous" : "Start Continuous"}
            </button>
          </div>

          <div className="w-full flex flex-row gap-4 lg:gap-4 text-sm sm:text-base lg:text-lg">
            {/* Show features button */}
            <div className="flex items-center justify-center text-[#285082]">
              {/* Make the button same height as the inputs */}
              <button
                  onClick={handleFeatureToggle}
                  className={classNames(
                    'w-30 h-full text-lg md:text-xl border rounded-md flex items-center justify-center',
                    {
                      'bg-[#285082] text-white hover:bg-[#1f407a]': showFeatures,
                      'bg-white text-[#285082] hover:bg-[#f0f8ff]': !showFeatures,
                    }
                  )}
                >
                  {showFeatures ? "Hide Features" : "Show Features"}
              </button>
            </div>

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
            <div ref={debugRef} className="debug-console overflow-y-auto max-h-70 lg:max-h-[15vw] xl:max-h-[20vw] 2xl:max-h-[30vw]">
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
