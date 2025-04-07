import React, { useState, useEffect, useRef, use } from 'react';
import { Link } from "react-router-dom";
import api from "../../api";

import { useRFID } from "../../App"; // or "../../App" depending on path

const RFIDAdd = () => {
  const {
    uid, setUid,
    isScanned, setIsScanned,
    isReadyToScan, setIsReadyToScan,
    boxName, setBoxName,
    items, setItems
  } = useRFID();

  const handleBoxNameChange = (e) => setBoxName(e.target.value);
  const handleItemsChange = (e) => setItems(e.target.value);

  // useEffect(() => {
  //   if (!isReadyToScan) {
  //     setUid("");
  //     setIsScanned(false);
  //     tryInitializeUntilReady();
  //   }
  // }, []);

  const tryInitializeUntilReady = async () => {
    let success = false;
  
    while (!success) {
      // await new Promise(r => setTimeout(r, 3000));
      success = await initializeRFID();
    }
    // Now that it's definitely initialized
    // await new Promise(r => setTimeout(r, 1000));
    // console.log("Step 3");
    await handleScan();
  };

  const initializeRFID = async () => {
    // console.log("Step 1");
    const closeSuccess = await handleClose();
  
    if (closeSuccess) {
      // await new Promise(r => setTimeout(r, 1000));
      // console.log("Step 2");
      const initSuccess = await handleInitialize();
  
      if (initSuccess) {
        setIsReadyToScan(true); // This is still useful for UI
        // console.log("Initialized successfully");
        return true;
      }
    }
  
    return false;
  };

  // Initialize the reader
  const handleInitialize = async () => {
    // try {
    //   const response = await api.post("/initialize");
    //   console.log("[SUCCESS] Initialize request sent.");

    //   if (response.data?.message) {
    //     console.log("[INFO]", response.data.message);
    //   }

    //   return true;
    // } catch {
    //   console.log("[ERROR] Failed to initialize reader.");
    //   return false;
    // }
  };
  

   // Close reader
  const handleClose = async () => {
    try {
      const response = await api.post("/close");
      // console.log("[SUCCESS] Close request sent.");

      if (response.data?.message) {
        console.log("[INFO]", response.data.message);
      }

      return true;
    } catch (error) {
      console.log("[ERROR] Failed to close reader.");

      if (error.response?.data?.message) {
        console.log("[ERROR] Server error:", error.response.data.message);
      }

      return false;
    }
  };

  // Scan RFID tag
  const handleScan = async () => {
    try {
      const response = await api.post("/scancont");
      console.log("[SUCCESS] Scan request sent.");

      if (response.data?.uid) {
        setUid(response.data.uid);
        setIsScanned(true); // <-- Set scanned to true
        console.log("[INFO] Card UID:", response.data.uid);
      } else if (response.data?.message) {
        console.log("[INFO]", response.data.message);
      }
    } catch (error) {
      console.log("[ERROR] Failed to scan RFID card.");

      if (error.response?.data?.message) {
        console.log("[ERROR] Server error:", error.response.data.message);
      }
    }
  };

  const handleDiscard = (e) => {
    e.preventDefault();
    setBoxName("");
    setItems("");
    setUid("");
    setIsScanned(false);
    setIsReadyToScan(false);
    console.log("[INFO] Discarded changes");
  };
  
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/rfid-box/", {
        uid,
        box_name: boxName
      });
  
      console.log("[SUCCESS] Box saved:", response.data);
  
      // Optional: Add logic to save items if needed
    } catch (error) {
      console.log("[ERROR] Failed to save:", error);
    }
  };


  return(
    <div>
      {!isReadyToScan && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center text-[#285082]">
        <div className="text-9xl mb-4">⚠️</div>
        <h3 className="text-3xl font-bold mb-2">RFID Reader Initialization Failed</h3>
        <p className="text-lg max-w-md">
          Please go to the{" "}
          <Link to="/rfid/settings" className="underline font-semibold text-blue-600 hover:text-blue-800">
            RFID Settings
          </Link>{" "}
          page and manually check the reader.
        </p>
      </div>
      )}

      {isReadyToScan && !isScanned && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center text-[#285082]">
          <div className="text-8xl mb-4 animate-pulse">📡</div>
          <h3 className="text-3xl font-bold mb-2">Waiting for RFID Scan...</h3>
          <p className="text-lg max-w-md">Please scan your RFID tag to continue.</p>
        </div>
      )}

      {isReadyToScan && isScanned && (
        <div>
          <h3>✅ RFID Scanned</h3>
          <p>UID: {uid}</p>

          {/* If UID is found in the database, show existing data */}
          
          <form>
            <label>Box Name</label>
            <input type="text" value={boxName} onChange={handleBoxNameChange} />

            <label>Items Inside</label>
            <textarea value={items} onChange={handleItemsChange}></textarea>

            <button onClick={handleDiscard}>Discard Changes</button>
            <button onClick={handleSave}>Save to Database</button>
          </form>

          
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <h4>🧪 Debug/Test Panel</h4>

        <button onClick={() => setIsReadyToScan(true)} style={{ marginRight: "1rem" }}>
          Set Ready to Scan ✅
        </button>

        <button onClick={() => setIsReadyToScan(false)} style={{ marginRight: "1rem" }}>
          Set Not Ready to Scan ❌
        </button>

        <button onClick={() => {
          setIsScanned(true);
          setUid("TEST123456"); // Set fake UID
        }} style={{ marginRight: "1rem" }}>
          Simulate Scan 🔄
        </button>

        <button onClick={() => {
          setIsScanned(false);
          setUid("");
        }}>
          Reset Scan State 🔁
        </button>
      </div>
    </div>
  );
};
export default RFIDAdd;
