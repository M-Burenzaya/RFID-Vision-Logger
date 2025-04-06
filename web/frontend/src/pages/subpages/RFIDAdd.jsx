import React, { useState, useEffect, useRef, use } from 'react';
import api from "../../api";
const RFIDAdd = () => {
  const [uid, setUid] = useState("");
  const [isReadyToScan, setIsReadyToScan] = useState(false);
  const [isScanned, setIsScanned] = useState(false); // <-- Added

  const [boxName, setBoxName] = useState("");
  const [items, setItems] = useState("");

  const handleBoxNameChange = (e) => setBoxName(e.target.value);
  const handleItemsChange = (e) => setItems(e.target.value);

  useEffect(() => {
    setUid("");
    setIsScanned(false); // Reset scan status
  
    const initializeRFID = async () => {
      const closeSuccess = await handleClose();
      if (!closeSuccess) {
        setIsReadyToScan(false);
        return;
      }
  
      const initSuccess = await handleInitialize();
      setIsReadyToScan(initSuccess);
  
      if (initSuccess) {
        await handleScan(); // <-- Automatically start scanning!
      }
    };
  
    initializeRFID();
  }, []);

  // Initialize the reader
  const handleInitialize = async () => {
    try {
      const response = await api.post("/initialize");
      console.log("[SUCCESS] Initialize request sent.");

      if (response.data?.message) {
        console.log("[INFO]", response.data.message);
      }

      return true;
    } catch {
      console.log("[ERROR] Failed to initialize reader.");
      return false;
    }
  };
  

   // Close reader
  const handleClose = async () => {
    try {
      const response = await api.post("/close");
      console.log("[SUCCESS] Close request sent.");

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
      const response = await api.post("/scan");
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


  return(
    <div>
      {!isReadyToScan && (
        <div>
          <h3>⚠️ RFID Reader Initialization Failed</h3>
          <p>Please go to the RFID Settings page and manually check the reader.</p>
        </div>
      )}

      {isReadyToScan && !isScanned && (
        <div>
          <h3>Waiting for RFID Scan...</h3>
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
