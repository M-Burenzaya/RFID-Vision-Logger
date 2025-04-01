import React, { useState, useEffect, useRef, use } from 'react';  // Import React and necessary hooks
import api from "../../api";

const RFIDSettings = () => {
  const [uid, setUid] = useState("");
  const [readData, setReadData] = useState("");
  const [writeData, setWriteData] = useState("");
  const [debugConsole, setDebugConsole] = useState([]);
  const debugRef = useRef(null);
  const [selectedReadBlock, setSelectedReadBlock] = useState("4");
  const [selectedWriteBlock, setSelectedWriteBlock] = useState("4");
  
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
  
  // Initialize the reader
  const handleInitialize = async () => {
    try {
      const response = await api.post("/initialize");
      updateDebugConsole("Request sent.", "SUCCESS");

      if (response.data?.message) {
        updateDebugConsole(response.data.message, "INFO");
      } else {
        updateDebugConsole("No message returned from server.", "WARNING");
      }

    } catch {
      updateDebugConsole("Failed to initialize reader.", "ERROR");
    }
  };

  // Halt communication
  const handleHalt = async () => {
    try {
      const response = await api.post("/halt");
      updateDebugConsole("Request sent.", "SUCCESS");

      if (response.data?.message) {
        updateDebugConsole(response.data.message, "INFO");
      }
    } catch (error) {
      updateDebugConsole("Failed to halt communication.", "ERROR");

      if (error.response?.data?.message) {
        updateDebugConsole(`Server error: ${error.response.data.message}`, "ERROR");
      }
    }
  };

  // Reset reader
  const handleReset = async () => {
    try {
      const response = await api.post("/reset");
      updateDebugConsole("Request sent.", "SUCCESS");

      if (response.data?.message) {
        updateDebugConsole(response.data.message, "INFO");
      }
    } catch (error) {
      updateDebugConsole("Failed to reset reader.", "ERROR");

      if (error.response?.data?.message) {
        updateDebugConsole(`Server error: ${error.response.data.message}`, "ERROR");
      }
    }
  };

  // Close reader
  const handleClose = async () => {
    try {
      const response = await api.post("/close");
      updateDebugConsole("Request sent.", "SUCCESS");

      if (response.data?.message) {
        updateDebugConsole(response.data.message, "INFO");
      }
    } catch (error) {
      updateDebugConsole("Failed to close reader.", "ERROR");

      if (error.response?.data?.message) {
        updateDebugConsole(`Server error: ${error.response.data.message}`, "ERROR");
      }
    }
  };
  // Scan RFID tag
  const handleScan = async () => {
    try {
      const response = await api.post("/scan");
      setUid(response.data.uid || "No UID");
      updateDebugConsole("Request sent.", "SUCCESS");

      if (response.data?.message) {
        updateDebugConsole(response.data.message, "MESSAGE");
      }

      if (response.data?.uid) {
        updateDebugConsole(`UID: ${response.data.uid}`, "INFO");
      }
    } catch (error) {
      updateDebugConsole("Failed to scan RFID tag.", "ERROR");

      if (error.response?.data?.message) {
        updateDebugConsole(`Server error: ${error.response.data.message}`, "ERROR");
      }
    }
  };

  // Read data from RFID card
  const handleRead = async () => {
    const block = selectedReadBlock;
    
    try {
      const response = await api.post("/read", { block });
      setReadData(response.data.data);
      updateDebugConsole(`Read successful from block ${block}.`, "SUCCESS");

      if (response.data?.message) {
        updateDebugConsole(response.data.message, "MESSAGE");
      }

      if (response.data?.data) {
        updateDebugConsole(`Data: ${response.data.data}`, "INFO");
      }

    } catch (error) {
      updateDebugConsole("Failed to read data.", "ERROR");

      if (error.response?.data?.message) {
        updateDebugConsole(`Server error: ${error.response.data.message}`, "ERROR");
      }
    }
  };
  
  // Write data to the RFID card
  const handleWrite = async () => {
    const block = selectedWriteBlock;
    let dataToWrite = writeData.trim(); 
  
    if (!dataToWrite) {
      updateDebugConsole("Write data is empty. Please enter data before writing.", "WARNING");
      return;
    }
  
    if (dataToWrite.length > 16) {
      updateDebugConsole("Write data too long. Must be 16 characters or fewer.", "WARNING");
      return;
    }
  
    updateDebugConsole(`Preparing to write to block ${block}.`, "INFO");
    await new Promise((res) => setTimeout(res, 100));
  
    try {
      const response = await api.post("/write", { block, data: dataToWrite });
      updateDebugConsole(`Write successful to block ${block}.`, "SUCCESS");
  
      if (response.data?.message) {
        updateDebugConsole(response.data.message, "MESSAGE");
      }
    } catch (error) {
      updateDebugConsole("Failed to write data.", "ERROR");
  
      if (error.response?.data?.message) {
        updateDebugConsole(`Server error: ${error.response.data.message}`, "ERROR");
      }
    }
  };
  

  return (
    <div className=" flex flex-col md:flex-row md:space-x-10 lg:space-x-15">
      <div className=" flex flex-col w-full md:w-500 lg:w-800 mt-10">
        <p className="mb-4 text-left">
          Click on Initialize to start the process and prepare the system for further actions.
          If you need to stop the current operation, press Halt. To restore the system to its default state, use the Reset button.
          Finally, if you're done and want to exit, click Close to end the session.
        </p>

        <div className="w-full mb-6 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 md:gap-8 lg:gap-12 text-base md:text-lg ">

          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={handleInitialize}>
            Initialize
          </button>
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={handleHalt}>
            Halt
          </button>
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={handleReset}>
            Reset
          </button>
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={handleClose}>
            Close
          </button>

        </div>

        <p className="mb-4 text-left">
          Enter or view the Unique Identifier (UID) for the device.
        </p>
        <div className="w-full mb-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 lg:gap-12 text-sm sm:text-base lg:text-lg">

          <div className="flex flex-row col-span-2 gap-2 sm:gap-4 md:gap-8 lg:gap-12 font-medium text-[#285082] text-center">
            {/* Text Input */}
            <input
              type="text"
              value={uid}
              disabled
              className="w-full border border-[#285082] p-2 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
              placeholder="Unique Identifier (UID)"
            />
          </div>

          {/* Button */}
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={handleScan}>
            Scan
          </button>

        </div>

        <p className="mb-4 text-left">
          Click to read the data associated with the UID.
        </p>
        <div className="w-full mb-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 lg:gap-12 text-sm sm:text-base lg:text-lg">
          
          <div className="flex flex-row col-span-2 gap-2 sm:gap-4 md:gap-8 lg:gap-12 font-medium text-[#285082] text-center">
            
            {/* Combo Input */}
            <select
              value={selectedReadBlock}
              onChange={(e) => setSelectedReadBlock(e.target.value)}
              className="border border-[#285082] p-2 rounded-md text-[#285082] font-medium"
            >
              {[4, 5, 6].map((block) => (
                <option key={block} value={block}>
                  Block {block}
                </option>
              ))}
            </select>
            
            {/* Text Input */}
            <input
              type="text"
              value={readData}
              disabled
              className="w-full border border-[#285082] p-2 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
              placeholder="Read Data (16 bytes)"
            />
          </div>

          {/* Button */}
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={handleRead}>
            Read Data
          </button>

        </div>

        <p className="mb-4 text-left">
          Write data (16 bytes) to the device associated with the UID.
        </p>
        <div className="w-full mb-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 lg:gap-12 text-sm sm:text-base lg:text-lg">

          <div className="flex flex-row col-span-2 gap-2 sm:gap-4 md:gap-8 lg:gap-12 font-medium text-[#285082] text-center">
            
            {/* Combo Input */}
            <select
              value={selectedWriteBlock}
              onChange={(e) => setSelectedWriteBlock(e.target.value)}
              className="border border-[#285082] p-2 rounded-md text-[#285082] font-medium"
            >
              {[4, 5, 6].map((block) => (
                <option key={block} value={block}>
                  Block {block}
                </option>
              ))}
            </select>
            
            {/* Text Input */}
            <input
              type="text"
              value={writeData}
              onChange={(e) => setWriteData(e.target.value)}
              className="w-full border border-[#285082] p-2 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
              placeholder="Write Data (16 bytes)"
            />
          </div>

          {/* Button */}
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={handleWrite}>
            Write Data
          </button>
        </div>

      </div>

      <div className=' w-full  mt-10 flex flex-col flex-grow'>

        <p className="mb-4 text-left">
          View system logs and debug information in this section.
        </p>

        <div className="bg-gray-800 text-white p-4 rounded-md h-full mb-6 ">

          <h3 className="text-lg font-semibold mb-2">Debug Console</h3>

          <div ref={debugRef} className="debug-console overflow-y-auto h-80">
            {debugConsole.map((log, index) => (
              <p key={index} className="text-sm">{log}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RFIDSettings;
