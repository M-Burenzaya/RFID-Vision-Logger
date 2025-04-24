import React, { useState, useEffect, useRef, use } from 'react';
import { useLocation } from "react-router-dom"; // ⬅ Make sure this is imported
import { Trash2 } from "lucide-react";
import api from "../api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { useRFID } from "../App";
const SelectItems = () => {
  const {
    uid, setUid,
    isScanned, setIsScanned,
    isReadyToScan, setIsReadyToScan,
    boxName, setBoxName,
    items, setItems,

  } = useRFID();

  const [userId, setUserId] = useState(null); // ✅ Add this
  const [userItems, setUserItems] = useState([]);
  const [scannedBoxes, setScannedBoxes] = useState([]);
  const [logComment, setLogComment] = useState("");

  const location = useLocation();
  const userName = location.state?.personName;

  const mountedRef = useRef(true);
  const hasInitializedRef = useRef(false);

//----------------------------------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      handleStopScan();
    };
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setUid("");
      setIsScanned(false);
      tryInitializeUntilReady();
    }
  }, []);

  const tryInitializeUntilReady = async () => {
    let success = false;
  
    while (!success && mountedRef.current) {
      success = await initializeRFID();
    }
    if (mountedRef.current && success) {
      await handleScan();
      // console.log("[INFO] Scan result:", result);
    }
  };

  const initializeRFID = async () => {

    await handleStopScan();
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
        const scannedUid = response.data.uid;
        setUid(scannedUid);
        setIsScanned(true); // <-- Set scanned to true
        console.log("[INFO] Card UID:", scannedUid);

        await fetchBoxByUid(scannedUid);              // <--- fetch box data

        return true;

      } else if (response.data?.message) {
        console.log("[INFO]", response.data.message);
      }
      return false;
    } catch (error) {
      console.log("[ERROR] Failed to scan RFID card.");

      if (error.response?.data?.message) {
        console.log("[ERROR] Server error:", error.response.data.message);
      }
      return false;
    }
  };

  const handleStopScan = async () => {
    try {
      await api.post('/stopscan');
    } catch (err) {
      console.error('Failed to stop scan:', err);
    }
  };

  const fetchBoxByUid = async (scannedUid) => {
    try {
      const response = await api.get(`/rfid-box/${scannedUid}`);
      
      if (response.data) {
        setBoxName(response.data.box_name || "");
        setItems(response.data.items || []);
        console.log("[INFO] Existing box loaded for UID:", scannedUid);
      } else {
        // UID exists but no data? Clear anyway
        setBoxName("");
        setItems([]);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log("[INFO] No box found for this UID, creating new.");
        setBoxName("");
        setItems([]);
      } else {
        console.log("[ERROR] Failed to fetch box data:", error);
      }
    }
  };

//----------------------------------------------------------------------------------------------
useEffect(() => {
  let interval;

  const startPolling = () => {
    interval = setInterval(async () => {
      try {
        const res = await api.post("/scancont");
        const uid = res.data?.uid;

        if (!uid || uid === "") return;

        const cleanedUid = uid.trim().toLowerCase(); // ✅ Normalize UID
        const alreadyExists = scannedBoxes.some(
          (box) => box.uid?.trim().toLowerCase() === cleanedUid
        );

        if (alreadyExists) {
          console.log("[SKIP] Box already scanned:", uid);
          return;
        }

        console.log("New card scanned:", uid);
        const boxRes = await api.get(`/rfid-box/${uid}`);
        setScannedBoxes((prev) => [...prev, boxRes.data]);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000); // Every 3 seconds
  };

  startPolling();

  return () => clearInterval(interval); // Clean up on unmount
}, [scannedBoxes]); // ⬅ Depend on scannedBoxes to get the latest list



  useEffect(() => {
    if (isScanned && uid) {
      fetchBoxByUid(uid);
    }
  }, [isScanned, uid]);
  
  useEffect(() => {
    if (!location.state?.personName) return;
  
    const fetchUserIdAndItems = async () => {
      try {
        const res = await api.get("/users");
        const user = res.data.find(u => u.name.toLowerCase() === location.state.personName.toLowerCase());
  
        if (user) {
          setUserId(user.id); // <-- Use this when calling /user-items/{user.id}
          fetchUserItems(user.id);  // pass it explicitly
        } else {
          console.warn("User not found");
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
  
    fetchUserIdAndItems();
  }, [location.state?.personName]);
  
  const fetchUserItems = async (id) => {
    try {
      const res = await api.get(`/user-items/${id}`);
      const data = res.data.items || [];  // <-- Safely fallback to empty array
      setUserItems(data);
    } catch (err) {
      console.error("Failed to load user items", err);
      setUserItems([]);
    }
  };
  
  
  const handleScanRFID = async () => {
    try {
      const res = await api.post("/scancont");
      const uid = res.data?.uid;
  
      if (!uid) return;
  
      const cleanedUid = uid.trim().toLowerCase();  // ✅ declare this
      const alreadyExists = scannedBoxes.some(box => box.uid?.toLowerCase() === cleanedUid);
  
      if (alreadyExists) {
        console.log("[SKIP] Box with UID already exists:", uid);
        return; // ✅ Stop adding duplicates
      }
  
      const boxRes = await api.get(`/rfid-box/${uid}`);
      setScannedBoxes(prev => [...prev, boxRes.data]);
    } catch (err) {
      console.error("handleScanRFID error:", err);
    }
  };

  const addItemToUser = (item) => {
    setUserItems((prev) => {
      const existing = prev.find(i => i.item_id === item.item_id);
      if (existing) {
        return prev.map(i =>
          i.item_id === item.item_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const removeItemFromUser = (itemId) => {
    setUserItems((prev) =>
      prev
        .map(i => i.item_id === itemId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0)
    );
  };

  const handleCreateLog = async () => {
    const prevRes = await api.get(`/user-items/${userId}`);
    const previous = prevRes.data;

    const getItemMap = (list) =>
      Object.fromEntries(list.map(i => [i.item_id, i.quantity]));

    const before = getItemMap(previous);
    const after = getItemMap(userItems);

    const itemsAdded = [];
    const itemsReturned = [];

    for (const item of [...new Set([...Object.keys(before), ...Object.keys(after)])]) {
      const prevQty = before[item] || 0;
      const currQty = after[item] || 0;
      if (currQty > prevQty) itemsAdded.push({ item_id: parseInt(item), quantity: currQty - prevQty });
      if (currQty < prevQty) itemsReturned.push({ item_id: parseInt(item), quantity: prevQty - currQty });
    }

    await api.post("/create-log", {
      user_id: userId,
      items_added: itemsAdded,
      items_returned: itemsReturned,
      comment: logComment
    });

    alert("Log saved.");
    fetchUserItems();
    setScannedBoxes([]);
    setLogComment("");
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Panel: User Items */}
      <div className="border p-4 rounded shadow bg-white">
        <h2 className="text-xl font-bold mb-4">🧑‍💻 Items In Use</h2>
        <ul>
          {userItems.map(item => (
            <li key={item.item_id} className="flex justify-between items-center mb-2">
              <span>{item.item_name} - {item.quantity}</span>
              <button onClick={() => removeItemFromUser(item.item_id)} className="text-red-500">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Panel: Scanned Boxes */}
      <div className="border p-4 rounded shadow bg-white">
        <h2 className="text-xl font-bold mb-4">📦 Available Items</h2>
        <button
          onClick={handleScanRFID}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ➕ Scan RFID / Add Box
        </button>

        {scannedBoxes.length === 0 && (
          <p className="text-gray-500">Scan RFID card or click Add to fetch box data</p>
        )}

        {scannedBoxes.map((box, boxIdx) => (
          <div key={box.uid ?? `fallback-${boxIdx}`} className="mb-4">
            <h4 className="font-semibold">{box.box_name} (UID: {box.uid})</h4>
            <ul>
              {box.items.map(item => (
                <li key={item.item_id} className="flex justify-between items-center mt-1">
                  <span>{item.item_name} - {item.quantity} pcs</span>
                  <button
                    onClick={() => addItemToUser(item)}
                    className="text-sm bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Finalize Button */}
      <div className="col-span-2 mt-4">
        <textarea
          value={logComment}
          onChange={(e) => setLogComment(e.target.value)}
          placeholder="Add comment (optional)"
          className="w-full border p-2 mb-4 rounded"
        />
        <button
          onClick={handleCreateLog}
          className="w-full py-3 bg-blue-700 text-white text-lg rounded hover:bg-blue-800"
        >
          ✅ Create Log
        </button>
      </div>
    </div>
  );
};

export default SelectItems;
