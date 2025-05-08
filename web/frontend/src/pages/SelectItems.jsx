import React, { useState, useEffect, useRef, use } from 'react';
import { useLocation, useNavigate } from "react-router-dom"; // ⬅ Make sure this is imported
import { Trash2, Minus, Plus, Radio, CircleOff } from "lucide-react";
import api from "../api";
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css";

const SelectItems = () => {

  const navigate = useNavigate();

  const [uid, setUid] = useState("");
  const [isReadyToScan, setIsReadyToScan] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [boxName, setBoxName] = useState("");
  const [items, setItems] = useState([]);

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

  const [allBoxes, setAllBoxes] = useState([]);
  const [showBoxDropdown, setShowBoxDropdown] = useState(false);
  const [originalBoxes, setOriginalBoxes] = useState([]);

  const keyboardContainerRef = useRef(null);
  const commentRef = useRef(null);
  const keyboardRef = useRef(null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const scrollContainerRef = useRef(null);



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

  useEffect(() => {
    if (showKeyboard && keyboardContainerRef.current && !keyboardRef.current) {
      setTimeout(() => {
        if (!keyboardContainerRef.current) return;
  
        keyboardRef.current = new Keyboard({
          rootElement: keyboardContainerRef.current,
          inputName: "comment",

          onChange: input => {
            setLogComment(input);
          },
        
          onKeyPress: button => {
            if (button === "{enter}") {
              // Close keyboard
              if (keyboardRef.current) {
                keyboardRef.current.destroy();
                keyboardRef.current = null;
              }
              setShowKeyboard(false);
              
              // Remove focus from textarea
              if (commentRef.current) {
                commentRef.current.blur();
              }
            }
          }
          
          
        });
        keyboardRef.current.setInput(logComment);
      }, 0);
    }
  
    return () => {
      if (keyboardRef.current) {
        keyboardRef.current.destroy();
        keyboardRef.current = null;
      }
    };
  }, [showKeyboard]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        commentRef.current &&
        !commentRef.current.contains(event.target) &&
        keyboardContainerRef.current &&
        !keyboardContainerRef.current.contains(event.target)
      ) {
        // Close the keyboard
        if (keyboardRef.current) {
          keyboardRef.current.destroy();
          keyboardRef.current = null;
        }
        setShowKeyboard(false);
      }
    };
  
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
  
  const prevUserItemsLengthRef = useRef(userItems.length);

  useEffect(() => {
    const prevLength = prevUserItemsLengthRef.current;
    const newLength = userItems.length;
  
    if (newLength > prevLength && userItemsEndRef.current) {
      userItemsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  
    prevUserItemsLengthRef.current = newLength;
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
      const lowerUid = response.data?.uid?.trim().toLowerCase();
  
      if (!lowerUid) return;
  
      // Move the check and add UID early to avoid race condition
      if (fetchedUIDsRef.current.has(lowerUid)) {
        console.log("[INFO] Skipping duplicate UID:", lowerUid);
        return;
      }
  
      // ✅ Mark as fetched immediately
      fetchedUIDsRef.current.add(lowerUid);
  
      await fetchBoxByUid(lowerUid);  // No need to check again inside this
      setAllBoxes(prev => prev.filter(box => box.uid !== lowerUid));
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

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api.get("/get-all-boxes");
        const data = res.data || [];
        setAllBoxes(data);
        setOriginalBoxes(data); // synced
      } catch (err) {
        console.error("Failed to fetch all boxes:", err);
      }
    };
  
    fetchAll();
  }, []);
  

  const resetBoxList = () => {
    setAllBoxes(originalBoxes);
    fetchedUIDsRef.current.clear();
    setScannedBoxes([]);
  };

  const fetchBoxByUid = async (lowerUid) => {
    try {
      const response = await api.get(`/rfid-box/${lowerUid}`);
  
      if (response.data) {
        setBoxName(response.data.box_name || "");
        setItems(response.data.items || []);
        setScannedBoxes(prev => [...prev, response.data]);
        console.log("[INFO] Box added:", lowerUid);
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
  
  
  const handleAddBox = () => {
    setShowBoxDropdown(prev => !prev); // toggle dropdown visibility
  };
  

  const handleSelectBox = async (uid) => {
    const lowerUid = uid.trim().toLowerCase();
  
    // ✅ Check only fetchedUIDsRef, NOT scannedBoxes
    if (fetchedUIDsRef.current.has(lowerUid)) {
      console.log("[INFO] Box already selected:", lowerUid);
      setShowBoxDropdown(false);
      return;
    }
  
    fetchedUIDsRef.current.add(lowerUid);
    await fetchBoxByUid(lowerUid);
    setAllBoxes(prev => prev.filter(box => box.uid !== lowerUid));
    setIsScanned(true);
    setShowBoxDropdown(false);
  };
  
  //
  
  const handleRemoveBox = (uid) => {
    const lowerUid = uid.trim().toLowerCase();
  
    console.log("[1] Removing box:", lowerUid);
  
    setScannedBoxes(prev => prev.filter(box => box.uid !== lowerUid));
  
    const removed = originalBoxes.find(b => b.uid === lowerUid);
    if (removed) {
      console.log("[2] Merging removed box into all boxes:", removed);
      setAllBoxes(prev => {
        const without = prev.filter(b => b.uid !== lowerUid);
        const merged = [...without, removed];
  
        // Sort to match originalBoxes order
        return originalBoxes.filter(ob => merged.some(b => b.uid === ob.uid));
      });
    } else {
      console.log("[2] Box not found in original boxes:", lowerUid);
    }
  
    fetchedUIDsRef.current.delete(lowerUid);
    console.log("[3] Removing from fetchedUIDsRef:", lowerUid);
  };
  
  

  const addItemToUser = (item) => {
    setUserItems((prev) => {
      const existing = prev.find(i => i.item_id === item.item_id);
      if (existing) {
        if (existing.quantity >= item.quantity) return prev; // cap
        return prev.map(i =>
          i.item_id === item.item_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };
  

  const handleIncrement = (itemId) => {
    const available = getAvailableQuantity(itemId);
    setUserItems((prev) =>
      prev.map(item =>
        item.item_id === itemId
          ? { ...item, quantity: Math.min(item.quantity + 1, available) }
          : item
      )
    );
  };

  const getAvailableQuantity = (itemId) => {
    const all = scannedBoxes.flatMap(b => b.items);
    const found = all.find(i => i.item_id === itemId);
    return found?.quantity || 1;
  };
  
  
  const handleDecrement = (itemId) => {
    setUserItems((prev) =>
      prev.flatMap(item => {
        if (item.item_id === itemId) {
          if (item.quantity > 1) {
            return { ...item, quantity: item.quantity - 1 };
          } else {
            return [];
          }
        }
        return item;
      })
    );
  };
  
  const handleRemove = (itemId) => {
    setUserItems((prev) =>
      prev.filter(item => item.item_id !== itemId)
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
    <div 
      ref={scrollContainerRef}
      className="flex flex-col gap-4 lg:gap-6 justify-center items-center w-full max-w-6xl mx-auto p-8"
    >
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Panel: User Items */}
        <div className="border border-[#285082] p-4 md:p-5 lg:p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-[#285082] p-0 lg:p-3 mb-4">🧑‍💻 Items In Use</h2>
          
          <div className="h-[300px] overflow-y-auto rounded-md p-3 bg-gray-50 shadow-inner">
            <ul className="space-y-3">
              {userItems.map(item => (
                <li
                  key={item.item_id}
                  className="flex justify-between items-center p-3 bg-white rounded-md shadow-sm border border-gray-200 "
                >
                  <span className="font-medium">{item.item_name}</span>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDecrement(item.item_id)}
                        className="border border-gray-300 rounded text-[#285082] hover:bg-gray-100"
                      >
                        <Minus size={16} />
                      </button>
                      
                      <span className="w-20 flex justify-center">
                        <span className="text-gray-400">{getAvailableQuantity(item.item_id)}</span>/
                        {item.quantity}
                      </span>
                      
                      <button
                        onClick={() => handleIncrement(item.item_id)}
                        className="border border-gray-300 rounded text-[#285082] hover:bg-gray-100"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemove(item.item_id)}
                      className="text-[#285082] hover:bg-gray-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
              <div ref={userItemsEndRef} />
            </ul>

            {userItems.length === 0 && (
              <div className="flex flex-col items-center justify-center text-gray-400 text-center py-6">
                <CircleOff size={150} className="mb-2 text-gray-300" />
                <p>No items in use currently</p>
              </div>
            )}

          </div>
        </div>

        {/* Right Panel: Available Boxes */}
        <div className="border border-[#285082] p-4 md:p-5 lg:p-6 rounded-lg">
          <div className="flex flex-row justify-between items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold text-[#285082] p-0 lg:p-3">📦 Available Items</h2>
            
            <div className="relative">
              <button
                onClick={handleAddBox}
                className="px-4 py-2 bg-[#285082] text-white rounded-md hover:bg-[#1f407a] transition"
              >
                ➕ Add Box
              </button>

              {showBoxDropdown && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-[#285082] rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                  {allBoxes.map((box) => (
                    <button
                      key={box.uid}
                      onClick={() => handleSelectBox(box.uid)}
                      className="w-full text-left px-4 py-2 hover:bg-[#f0f8ff] border-b last:border-none"
                    >
                      <div className="font-semibold">{box.box_name}</div>
                      <div className="text-sm text-gray-500">UID: {box.uid}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-[300px] overflow-y-auto rounded-md p-3 bg-gray-50 shadow-inner">
            {scannedBoxes.map((box, boxIdx) => (
              <div
                key={box.uid ?? `fallback-${boxIdx}`}
                className="mb-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold text-[#285082]">
                    {box.box_name}
                    <span className="block text-sm text-gray-500 font-normal">
                      UID: {box.uid}
                    </span>
                  </h4>
                  <button
                    onClick={() => handleRemoveBox(box.uid)}
                    className="text-[#285082] hover:text-red-500 p-1 rounded-full transition"
                    title="Remove Box"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <ul className="space-y-1">
                  {box.items.map(item => (
                    <li
                      key={item.item_id}
                      className="flex justify-between items-center px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition"
                    >
                      <span>{item.item_name} - {item.quantity} pcs</span>
                      <button
                        onClick={() => addItemToUser(item)}
                        className="text-xs bg-[#285082] text-white px-3 py-1 rounded hover:bg-[#1f407a] transition"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {scannedBoxes.length === 0 && (
              <div className="flex flex-col items-center justify-center text-gray-400 text-center py-6">
                <Radio size={150} className="mb-2 text-gray-300" />
                <p>Scan RFID card or click Add to fetch box data</p>
              </div>
            )}

            <div ref={scannedBoxesEndRef} />
          </div>
        </div>
      </div>

      <div className="w-full">
        <textarea
          ref={commentRef}
          value={logComment}
          onChange={(e) => {
            const value = e.target.value;
            setLogComment(value);
            if (keyboardRef.current) {
              keyboardRef.current.setInput(value);
            }
          }}

          onFocus={() => {
            setShowKeyboard(true);
            setTimeout(() => {
              if (commentRef.current && scrollContainerRef.current) {
                commentRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }
            }, 200); // give keyboard time to render
          }}
          
          placeholder="💬 Add comment (optional)"
          className="w-full border border-[#285082] p-3 rounded-md shadow-inner focus:outline-none focus:ring-2 focus:ring-[#285082] transition"
        />
      </div>
  
      {/* Finalize Button */}
      <div className="col-span-2 w-full max-w-xl grid grid-cols-2 gap-4">
        
        <button
          onClick={() => navigate("/")}
          className="w-full py-2 border border-[#285082] text-[#285082] rounded-md hover:bg-[#f0f8ff] transition shadow-sm"
        >
          Discard
        </button>
        <button
          onClick={handleCreateLog}
          className="w-full py-2 bg-[#285082] text-white rounded-md hover:bg-[#1f407a] transition shadow-md hover:shadow-xl"
        >
          Create Log
        </button>
      </div>

      {showKeyboard && (
        <div
          className="w-full h-[30vh]"
        >
        </div>
      )}

      {showKeyboard && (
        <div
          className="fixed bottom-0 left-0 w-full h-[30vh] bg-white z-50 border-t border-gray-300 shadow-md"
        >
          <div
            ref={keyboardContainerRef}
            className="simple-keyboard h-full w-full"
            tabIndex="-1"
          />
        </div>
      )}


    </div>
  );  
};

export default SelectItems;
