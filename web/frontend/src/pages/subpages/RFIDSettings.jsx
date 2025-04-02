import React, { useState, useEffect, useRef, use } from 'react';  // Import React and necessary hooks
import api from "../../api";

const RFIDSettings = () => {
  const [uid, setUid] = useState("");
  const [readData, setReadData] = useState("");
  const [writeData, setWriteData] = useState("");
  const [debugConsole, setDebugConsole] = useState([]);
  const debugRef = useRef(null);
  const [selectedReadBlock, setSelectedReadBlock] = useState(4);
  const [selectedWriteBlock, setSelectedWriteBlock] = useState(4);
  const [isScanningUid, setIsScanningUid] = useState(false);
  const [isReadingBlock, setIsReadingBlock] = useState(false);
  const [isWritingBlock, setIsWritingBlock] = useState(false);
  const [scanplaceholder, setScanPlaceholder] = useState("Unique Identifier (UID)");
  const [readPlaceholder, setReadPlaceholder] = useState("Read Data (16 bytes)");
  const [writePlaceholder, setWritePlaceholder] = useState("Read Data (16 bytes)");

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
    setUid("");  // <--- reset UID
    setReadData("");  // <--- reset read data
    setWriteData("");  // <--- reset write data
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
    setUid("");  // <--- reset UID
    setReadData("");  // <--- reset read data
    setWriteData("");  // <--- reset write data
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
    setIsScanningUid(true);
    setUid("");  // <--- reset UID

    setScanPlaceholder("Press RFID card in 5 seconds...");
    setIsScanningUid(true);

    let countdown = 5;
    const intervalId = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        setScanPlaceholder(`Press RFID card in ${countdown} seconds...`);
      }
    }, 1000); // every second


    try {
      const response = await api.post("/scan");
      updateDebugConsole("Request sent.", "SUCCESS");
  
      if (response.data?.uid) {
        setUid(response.data.uid);  // <--- update UID state
        updateDebugConsole(`Card UID: ${response.data.uid}`, "INFO");
      } else if (response.data?.message) {
        updateDebugConsole(response.data.message, "INFO");
      }
  
    } catch (error) {
      updateDebugConsole("Failed to scan RFID card.", "ERROR");
  
      if (error.response?.data?.message) {
        updateDebugConsole(`Server error: ${error.response.data.message}`, "ERROR");
      }
    } finally {
      setIsScanningUid(false);  // Re-enable the button
      setScanPlaceholder("Unique Identifier (UID)");
    }
  }

  // Read data from RFID card
  const handleRead = async () => {
    setUid("");
    setReadData("");
    setScanPlaceholder("Waiting for UID...");
    setReadPlaceholder("Press RFID card in 5 seconds...");
    setIsReadingBlock(true);  // <<--- here
  
    let countdown = 5;
    const intervalId = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        setReadPlaceholder(`Press RFID card in ${countdown} seconds...`);
      }
    }, 1000);
  
    try {
      const response = await api.post("/read", {
        block: selectedReadBlock,
      });
      updateDebugConsole("Request sent.", "SUCCESS");
  
      if (response.data?.uid) {
        setUid(response.data.uid);

        const byteArray = response.data.data;
        const raw = byteArray.join(" ");
        const ascii = String.fromCharCode(...byteArray).replace(/\0/g, '');
        
        // setReadData(`${ascii} (${raw})`); 
        setReadData(`${ascii}`); 

        updateDebugConsole(`Card UID: ${response.data.uid}`, "INFO");
        updateDebugConsole(`Card Data: ${response.data.data.join(" ")}`, "INFO");
      } else if (response.data?.message) {
        setReadPlaceholder(response.data.message);
      }
    } catch (error) {
      setReadPlaceholder("Read failed.");
      if (error.response?.data?.message) {
        updateDebugConsole(`Server error: ${error.response.data.message}`, "ERROR");
      }
    } finally {
      clearInterval(intervalId);
      setIsReadingBlock(false); // <<--- reset when done
      setScanPlaceholder("Unique Identifier (UID)");
      setReadPlaceholder("Read Data (16 bytes)");
    }
  };
  
  // Write data to the RFID card
  const handleWrite = async () => {
    if (!writeData) {
      updateDebugConsole("No data entered. Please enter text to write.", "WARNING");
      setWritePlaceholder("Write Data (16 bytes)");
      return;
    }
  
    if (writeData.length > 16) {
      updateDebugConsole("Data too long. Maximum 16 characters allowed.", "WARNING");
      setWritePlaceholder("Write Data (16 bytes)");
      return;
    }
  
    setIsWritingBlock(true);
    setWritePlaceholder("Waiting for RFID card...");
  
    let countdown = 5;
    const intervalId = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        setWritePlaceholder(`Press RFID card in ${countdown} seconds...`);
      }
    }, 1000);
  
    try {
      const response = await api.post("/write", {
        block: selectedWriteBlock,
        data: writeData,
      });
  
      setUid(response.data.uid);
      setWritePlaceholder("Write successful.");
      updateDebugConsole(`Written to block ${response.data.block}`, "SUCCESS");
    } catch (error) {
      setWritePlaceholder("Write failed.");
      if (error.response?.data?.message) {
        updateDebugConsole(`Server error: ${error.response.data.message}`, "ERROR");
      }
    } finally {
      clearInterval(intervalId);
      setIsWritingBlock(false);
      setWritePlaceholder("Write Data (16 bytes)");
    }
  };
  
  return (
    <div className=" flex flex-col lg:flex-row md:space-x-6 lg:space-x-12">
      <div className=" flex flex-col w-full lg:w-700 mt-4 lg:mt-8 ">
        <p className="mb-4 text-left">
          Click on Initialize to start the process and prepare the system for further actions.
          If you need to stop the current operation, press Halt. To restore the system to its default state, use the Reset button.
          Finally, if you're done and want to exit, click Close to end the session.
        </p>

        <div className="w-full mb-6 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-base md:text-lg ">

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
          Press the Scan RFID button to scan the Unique Identifier (UID) for the device.
        </p>
        <div className="w-full mb-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-sm sm:text-base lg:text-lg">

          <div className="flex flex-row col-span-2 gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-[#285082] text-center">
            {/* Text Input */}
            <input
              type="text"
              value={uid}
              disabled
              className="w-full border border-[#285082] p-2 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
              placeholder={scanplaceholder}
            />
          </div>

          {/* Button */}
          <button onClick={handleScan}disabled={isScanningUid}
                  className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
                  hover:bg-[#285082] hover:text-white">
            {isScanningUid ? "Scanning..." : "Scan RFID"}
          </button>

        </div>

        <p className="mb-4 text-left">
          Click to read the data associated with the UID.
        </p>
        <div className="w-full mb-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-sm sm:text-base lg:text-lg">
          
          <div className="flex flex-row col-span-2 gap-2 md:gap-4 lg:gap-6 text-[#285082] text-center">
            
            {/* Combo Input */}
            <select
              value={selectedReadBlock}
              onChange={(e) => {
                const value = Number(e.target.value);
                setSelectedReadBlock(value);
                updateDebugConsole(`Selected read block: ${value}`, "INFO");
              }}
              className="border border-[#285082] p-2 rounded-md text-[#285082]"
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
              className="w-full border border-[#285082] p-2 pr-1 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
              placeholder={readPlaceholder}
            />
          </div>

          {/* Button */}
          <button onClick={handleRead} disabled={isReadingBlock}
          className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white">
            {isReadingBlock ? "Reading..." : "Read Data"}
          </button>

        </div>

        <p className="mb-4 text-left">
          Write data (16 bytes) to the device associated with the UID.
        </p>
        <div className="w-full mb-4 lg:mb-8 grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-sm sm:text-base lg:text-lg">

          <div className="flex flex-row col-span-2 gap-2 md:gap-4 lg:gap-6 text-[#285082] text-center">
            
            {/* Combo Input */}
            <select
              value={selectedWriteBlock}
              onChange={(e) => {
                const value = Number(e.target.value);
                setSelectedWriteBlock(value);
                updateDebugConsole(`Selected write block: ${value}`, "INFO");
              }}
              className="border border-[#285082] p-2 pr-1 rounded-md text-[#285082]"
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
              maxLength={16}
              className="w-full border border-[#285082] p-2 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
              placeholder={writePlaceholder}
            />
          </div>

          {/* Button */}
          <button onClick={handleWrite} disabled={isWritingBlock}
          className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white">
            {isWritingBlock ? "Writing..." : "Write Data"}
          </button>
        </div>

      </div>

      <div className=' w-full  mt-4 lg:mt-8 flex flex-col flex-grow'>

        {/* <p className="mb-4 text-left">
          View system logs and debug information in this section.
        </p> */}

        <div className="bg-gray-800 text-white p-4 rounded-md h-full mb-4 lg:mb-8">

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
