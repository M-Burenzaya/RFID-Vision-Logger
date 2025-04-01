import React, { useState, useEffect } from 'react';  // Import React and necessary hooks
import axios from 'axios';  // Make sure axios is imported as well

const RFIDSettings = () => {
  const [uid, setUid] = useState("");
  const [readData, setReadData] = useState("");
  const [writeData, setWriteData] = useState("");
  const [debugConsole, setDebugConsole] = useState([]);

  // Update debug console log
  const updateDebugConsole = (message) => {
    setDebugConsole((prev) => [...prev, message]);
  };

  // Initialize the reader
  const handleInitialize = async () => {
    try {
      await axios.post("/initialize");
      updateDebugConsole("Reader Initialized.");
    } catch (error) {
      updateDebugConsole("Failed to initialize reader.");
    }
  };

  // Halt communication
  const handleHalt = async () => {
    try {
      await axios.post("/halt");
      updateDebugConsole("Communication Halted.");
    } catch (error) {
      updateDebugConsole("Failed to halt communication.");
    }
  };

  // Reset the reader
  const handleReset = async () => {
    try {
      await axios.post("/reset");
      updateDebugConsole("Reader Reset.");
    } catch (error) {
      updateDebugConsole("Failed to reset reader.");
    }
  };

  // Close the reader
  const handleClose = async () => {
    try {
      await axios.post("/close");
      updateDebugConsole("Reader Closed.");
    } catch (error) {
      updateDebugConsole("Failed to close reader.");
    }
  };

  // Scan the RFID tag
  const handleScan = async () => {
    try {
      const response = await axios.post("/scan");
      setUid(response.data.uid || "No RFID card detected.");
      updateDebugConsole(`UID Scanned: ${response.data.uid}`);
    } catch (error) {
      updateDebugConsole("Failed to scan RFID.");
    }
  };

  // Read data from the RFID card
  const handleRead = async () => {
    const block = prompt("Enter block number (0-63):");
    try {
      const response = await axios.post("/read", { block });
      setReadData(response.data.data);
      updateDebugConsole(`Data Read: ${response.data.data}`);
    } catch (error) {
      updateDebugConsole("Failed to read data.");
    }
  };

  // Write data to the RFID card
  const handleWrite = async () => {
    const block = prompt("Enter block number (0-63):");
    try {
      await axios.post("/write", { block, data: writeData });
      updateDebugConsole(`Data Written: ${writeData}`);
    } catch (error) {
      updateDebugConsole("Failed to write data.");
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
          hover:bg-[#285082] hover:text-white" onClick={() => alert('Button 1 clicked')}>
            Initialize
          </button>
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={() => alert('Button 2 clicked')}>
            Halt
          </button>
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={() => alert('Button 3 clicked')}>
            Reset
          </button>
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={() => alert('Button 4 clicked')}>
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
              className="w-full border border-[#285082] p-2 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
              placeholder="Unique Identifier (UID)"
            />
          </div>

          {/* Button */}
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={() => alert('Button 1 clicked')}>
            Scan
          </button>

        </div>

        <p className="mb-4 text-left">
          Click to read the data associated with the UID.
        </p>
        <div className="w-full mb-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 lg:gap-12 text-sm sm:text-base lg:text-lg">

          <div className="flex flex-row col-span-2 gap-2 sm:gap-4 md:gap-8 lg:gap-12 font-medium text-[#285082] text-center">
            {/* Text Input */}
            <input
              type="text"
              className="w-full border border-[#285082] p-2 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
              placeholder="Read Data (16 bytes)"
            />
          </div>

          {/* Button */}
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={() => alert('Button 1 clicked')}>
            Read Data
          </button>

        </div>

        <p className="mb-4 text-left">
          Write data (16 bytes) to the device associated with the UID.
        </p>
        <div className="w-full mb-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 lg:gap-12 text-sm sm:text-base lg:text-lg">

          <div className="flex flex-row col-span-2 gap-2 sm:gap-4 md:gap-8 lg:gap-12 font-medium text-[#285082] text-center">
            {/* Text Input */}
            <input
              type="text"
              className="w-full border border-[#285082] p-2 rounded-md pl-4 sm:pl-6 md:pl-8 lg:pl-10"
              placeholder="Write Data (16 bytes)"
            />
          </div>

          {/* Button */}
          <button className="p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
          hover:bg-[#285082] hover:text-white" onClick={() => alert('Button 1 clicked')}>
            Write Data
          </button>
        </div>

      </div>

      <div className=' w-full  mt-10 flex flex-col flex-grow'>

        <p className="mb-4 text-left">
          View system logs and debug information in this section.
        </p>

        <div className="debug-console bg-gray-800 text-white p-4 rounded-md overflow-y-auto flex-grow mb-6 ">

          <h3 className="text-lg font-semibold mb-2">Debug Console</h3>

          {debugConsole.map((log, index) => (
            <p key={index} className="text-sm">{log}</p>
          ))}
          
        </div>
      </div>
    </div>


  );
};

export default RFIDSettings;

    // <div className="">
    //   <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
    //     RFID Settings
    //   </h2>
    //   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
    //     <button
    //       onClick={handleInitialize}
    //       className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
    //     >
    //       Initialize
    //     </button>
    //     <button
    //       onClick={handleHalt}
    //       className="btn"
    //     >
    //       Halt
    //     </button>
    //     <button
    //       onClick={handleReset}
    //       className="btn"
    //     >
    //       Reset
    //     </button>
    //     <button
    //       onClick={handleClose}
    //       className="btn"
    //     >
    //       Close
    //     </button>
    //     <button
    //       onClick={handleScan}
    //       className="btn col-span-2 md:col-span-1"
    //     >
    //       Scan
    //     </button>
    //   </div>

    //   <div className="mb-6">
    //     <label className="block text-sm font-medium text-gray-700 mb-2">UID</label>
    //     <input
    //       type="text"
    //       value={uid}
    //       disabled
    //       className="w-full p-3 border border-gray-300 rounded-md"
    //       placeholder="UID"
    //     />
    //   </div>

    //   <div className="mb-6">
    //     <button
    //       onClick={handleRead}
    //       className="btn"
    //     >
    //       Read
    //     </button>
    //     <input
    //       type="text"
    //       value={readData}
    //       disabled
    //       className="w-full p-3 mt-2 border border-gray-300 rounded-md"
    //       placeholder="Read Data"
    //     />
    //   </div>

    //   <div className="mb-6">
    //     <button
    //       onClick={handleWrite}
    //       className="btn"
    //     >
    //       Write
    //     </button>
    //     <input
    //       type="text"
    //       value={writeData}
    //       onChange={(e) => setWriteData(e.target.value)}
    //       className="w-full p-3 mt-2 border border-gray-300 rounded-md"
    //       placeholder="Write Data (comma separated)"
    //     />
    //   </div>

    //   <div className="debug-console bg-gray-800 text-white p-4 rounded-md overflow-y-auto max-h-40">
    //     <h3 className="text-lg font-semibold mb-2">Debug Console</h3>
    //     {debugConsole.map((log, index) => (
    //       <p key={index} className="text-sm">{log}</p>
    //     ))}
    //   </div>
    // </div>
