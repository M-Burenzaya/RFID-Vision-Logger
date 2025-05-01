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


  const fetchedUIDsRef = useRef(new Set());

  const userItemsEndRef = useRef(null);
  const scannedBoxesEndRef = useRef(null);  


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
  
  useEffect(() => {
    if (userItemsEndRef.current) {
      userItemsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [userItems]);
  
  useEffect(() => {
    if (scannedBoxesEndRef.current) {
      scannedBoxesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scannedBoxes]);

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
      const scannedUid = response.data?.uid?.trim().toLowerCase();
  
      if (!scannedUid) return;
  
      // Move the check and add UID early to avoid race condition
      if (fetchedUIDsRef.current.has(scannedUid)) {
        console.log("[INFO] Skipping duplicate UID:", scannedUid);
        return;
      }
  
      // ✅ Mark as fetched immediately
      fetchedUIDsRef.current.add(scannedUid);
  
      await fetchBoxByUid(scannedUid);  // No need to check again inside this
      setIsScanned(true);
      return true;
  
    } catch (error) {
      console.error("[ERROR] Failed to scan:", error);
      return false;
    }
  };
  

  useEffect(() => {
    const interval = setInterval(() => {
      handleScan();
    }, 3000); // every second

    return () => clearInterval(interval);
  }, []);

  // useEffect(() => {
  //   if (isScanned) {
  //     setIsScanned(false);
  //     handleScan();
  //   }
  //   return;
  // }, [isScanned]); // No scannedBoxes dependency here
  

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
        setScannedBoxes(prev => [...prev, response.data]);
        console.log("[INFO] Box added:", scannedUid);
      } else {
        setBoxName("");
        setItems([]);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setBoxName("");
        setItems([]);
      } else {
        console.error("[ERROR] Failed to fetch box data:", error);
      }
    }
  };
  
  

//----------------------------------------------------------------------------------------------

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
  
  
  const handleAddBox = async () => {

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
    seenUIDsRef.current.clear();
    setLogComment("");
  };

  return (
    <div className="flex flex-col justify-center items-center max-w-6xl mx-auto p-8">
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {/* Left Panel: User Items */}
        <div className="border border-[#285082] p-6 rounded-md">
          <h2 className="text-xl font-bold mb-4 text-[#285082]">🧑‍💻 Items In Use</h2>
          <div className="h-[200px] md:h-[300px] lg:h-[400px] overflow-y-auto rounded-md p-2 sm:p-3 md:p-4 shadow">
            <ul>
              {userItems.map(item => (
                <li
                  key={item.item_id}
                  className="flex justify-between items-center mb-2 p-2 bg-gray-100 hover:bg-gray-200 rounded transition"
                >
                  <span>{item.item_name} - {item.quantity}</span>
                  <button
                    onClick={() => removeItemFromUser(item.item_id)}
                    className="text-[#285082] hover:text-[#1f407a] transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
              <div ref={userItemsEndRef} />
            </ul>
          </div>
        </div>
    
        {/* Right Panel: Scanned Boxes */}
        <div className="border border-[#285082] p-6 rounded-md">
          
          <h2 className="text-xl font-bold mb-4 text-[#285082]">📦 Available Items</h2>

          <div className="h-[200px] md:h-[300px] lg:h-[400px] overflow-y-auto rounded-md p-2 sm:p-3 md:p-4 shadow">
            {scannedBoxes.length === 0 && (
              <p className="text-gray-500">Scan RFID card or click Add to fetch box data</p>
            )}
      
            {scannedBoxes.map((box, boxIdx) => (
              <div key={box.uid ?? `fallback-${boxIdx}`} className="mb-4 p-3 border border-gray-200 rounded-lg shadow-sm bg-white">
                <h4 className="font-semibold text-[#285082]">{box.box_name} (UID: {box.uid})</h4>
                <ul>
                  {box.items.map(item => (
                    <li
                      key={item.item_id}
                      className="flex justify-between items-center mt-1 p-2 hover:bg-gray-50 rounded transition"
                    >
                      <span>{item.item_name} - {item.quantity} pcs</span>
                      <button
                        onClick={() => addItemToUser(item)}
                        className="text-sm bg-[#285082] text-white px-2 py-1 rounded-md hover:bg-[#1f407a] transition"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div ref={scannedBoxesEndRef} />
            
            {/* Fixed scan button under scroll box */}
            <div className="flex gap-2">
              <button
                onClick={handleAddBox}
                className="px-4 py-2 bg-[#285082] text-white rounded-md hover:bg-[#1f407a] transition"
              >
                ➕ Scan RFID / Add Box
              </button>
              {/* <button
                onClick={() => {
                  setScannedBoxes([]);
                  fetchedUIDsRef.current.clear();
                }}
                className="px-4 py-2 border border-[#285082] text-[#285082] rounded-md hover:bg-[#f0f8ff] transition"
              >
                🗑️ Clear
              </button> */}
            </div>
            
          </div>
        </div>
      </div>
  
      {/* Finalize Button */}
      <div className="col-span-2 mt-4">
        <textarea
          value={logComment}
          onChange={(e) => setLogComment(e.target.value)}
          placeholder="💬 Add comment (optional)"
          className="w-full border border-[#285082] p-3 mb-4 rounded-md shadow-inner focus:outline-none focus:ring-2 focus:ring-[#285082] transition"
        />
        <button
          onClick={handleCreateLog}
          className="w-full py-3 bg-[#285082] text-white text-lg rounded-md hover:bg-[#1f407a] transition shadow-md hover:shadow-xl"
        >
          ✅ Create Log
        </button>
      </div>
    </div>
  );  
};

export default SelectItems;
