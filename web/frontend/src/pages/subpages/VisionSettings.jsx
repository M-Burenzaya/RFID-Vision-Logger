import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import api from "../../api";

const VisionSettings = () => {
  const [detectionName, setDetectionName] = useState("");
  const [detectionPercent, setDetectionPercent] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);
  const [imageSrc, setImageSrc] = useState("");  // Placeholder for image display
  const [debugConsole, setDebugConsole] = useState([]);
  const debugRef = useRef(null);

  useEffect(() => {
    if (debugRef.current) {
      debugRef.current.scrollTop = debugRef.current.scrollHeight;
    }
    // Fetch camera image on component mount
    fetchCameraImage();
  }, []);

  const updateDebugConsole = (message, level = "INFO") => {
    const prefix = {
      INFO: "INFO:    ",
      SUCCESS: "SUCCESS: ",
      WARNING: "WARNING: ",
      ERROR: "ERROR:   ",
    }[level] || "LOG:     ";
    setDebugConsole((prev) => [...prev, prefix + message]);
  };

  const triggerOnce = async () => {
    // Call API or logic to trigger a single detection
    updateDebugConsole("Triggered once.");
  };

  const triggerContinuous = async () => {
    // Call API or logic to trigger continuous detection
    updateDebugConsole("Continuous trigger started.");
  };

  const fetchCameraImage = async () => {
    // Fetch the camera image (replace with your API or image source)
    try {
      const response = await api.get("/camera");
      setImageSrc(response.data.imageUrl);
      updateDebugConsole("Camera image fetched.", "SUCCESS");
    } catch (error) {
      updateDebugConsole("Failed to fetch camera image.", "ERROR");
    }
  };

  const handleFeatureToggle = () => {
    setShowFeatures(!showFeatures);
  };

  return (
    <div className="flex flex-col lg:flex-row md:space-x-6 lg:space-x-12">
      {/* Left side: Image display */}
      <div className="w-full lg:w-[150vw] mb-2 lg:mb-8 mt-4 lg:mt-8">
        <div className="border rounded-md">
          {/* Image display */}
          <div className="flex justify-center">
            <img 
              src={imageSrc || "default-placeholder.png"} 
              alt="Camera" 
              className="w-full h-auto aspect-square object-cover"
            />
          </div>
        </div>
      </div>

      {/* Right side: Buttons and Debug Console */}
      <div className="flex flex-col mt-4 lg:mt-8 w-full">
        {/* Buttons for trigger actions */}
        <div className="w-full mb-4">

          <div className="w-full mb-4 grid grid-cols-2 lg:grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] gap-2 sm:gap-4 md:gap-6 lg:gap-4 text-base md:text-lg">
            <button onClick={triggerOnce} className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer hover:bg-[#285082] hover:text-white">
              Trigger Once
            </button>
            <button onClick={triggerContinuous} className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer hover:bg-[#285082] hover:text-white">
              Continuous Trigger
            </button>
          </div>

          <div className="w-full flex flex-row gap-4 lg:gap-4 text-sm sm:text-base lg:text-lg">
            {/* Show features button */}
            <div className="flex items-center justify-center text-[#285082]">
              {/* Make the button same height as the inputs */}
              <button
                  onClick={handleFeatureToggle}
                  className={classNames(
                    'w-30 h-full text-xl font-semibold border rounded-md flex items-center justify-center',
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
