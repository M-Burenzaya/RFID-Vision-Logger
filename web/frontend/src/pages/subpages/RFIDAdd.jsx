import React, { useState, useEffect, useRef, use } from 'react';
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import api from "../../api";

import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";

import { useRFID } from "../../App"; // or "../../App" depending on path

const RFIDAdd = () => {
  const {
    uid, setUid,
    isScanned, setIsScanned,
    isReadyToScan, setIsReadyToScan,
    boxName, setBoxName,
    items, setItems,

  } = useRFID();

  const [newItem, setNewItem] = useState({
    item_name: "",
    item_description: "",
    quantity: 1,
  });

  const [editIndex, setEditIndex] = useState(null);
  const [isChanged, setIsChanged] = useState(false);


  const handleBoxNameChange = (e) => {
    setBoxName(e.target.value)
    setIsChanged(true);
  };
  const handleItemsChange = (e) => setItems(e.target.value);

  useEffect(() => {
    if (!isReadyToScan) {
      setUid("");
      setIsScanned(false);
      tryInitializeUntilReady();
    }
  }, []);

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

//----------------------------------------------------------------------------------------------

  const handleAddItem = () => {
    const { item_name, item_description, quantity } = newItem;

    if (!item_name.trim()) return;

    if (editIndex !== null) {
      // Edit existing item
      const updatedItems = [...items];
      updatedItems[editIndex] = { item_name, item_description, quantity };
      setItems(updatedItems);
      setEditIndex(null); // Reset edit mode
    } else {
      // Add new item
      setItems([...items, { item_name, item_description, quantity }]);
    }

    // Clear form
    setNewItem({ item_name: "", item_description: "", quantity: 1 });
    setIsChanged(true);
  };

  const handleEditItem = (index) => {
    const itemToEdit = items[index];
    setNewItem({ ...itemToEdit });
    setEditIndex(index);
  };
  
  const handleDeleteItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
    setIsChanged(true);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
  };

  const handleSave = async (e) => {
    e.preventDefault();
  
    if (!uid || !boxName || items.length === 0) {
      alert("Please scan an RFID tag and add at least one item.");
      return;
    }
  
    const payload = {
      uid,
      box_name: boxName,
      items: items.map(item => ({
        item_name: item.item_name,
        item_description: item.item_description,
        quantity: parseInt(item.quantity || "0"),
      }))
    };
  
    // console.log("Payload being sent:", payload); // 🪵 See what’s being sent
  
    try {
      const response = await api.post("/rfid-box/", payload);
      alert("Box saved successfully!");
      resetFormState();

      console.log("[INFO] Box saved");
      tryInitializeUntilReady();

      // console.log("[SUCCESS] Box saved:", response.data);
    } catch (error) {
      console.error("[ERROR] Failed to save:", error);
      if (error.response?.data?.detail) {
        alert(`Save failed: ${error.response.data.detail}`);
      } else {
        alert("Unexpected error occurred.");
      }
    }
  };

  const handleDiscard = (e) => {
    e.preventDefault();
    resetFormState();

    console.log("[INFO] Discarded changes");
    tryInitializeUntilReady();
  };

  const resetFormState = () => {
    setUid("");
    setIsScanned(false);
    setIsReadyToScan(false);
    setBoxName("");
    setItems([]);
    setNewItem({ item_name: "", item_description: "", quantity: 1 });
    setEditIndex(null);
    setIsChanged(false);
  };


  return(
    <div className="max-w-6xl mx-auto">
      {!isReadyToScan && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center text-[#285082]">
        <img
          src="/warning_icon.svg"
          alt="Warning Icon"
          className="w-75 h-auto mb-4"
        />
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
          <img
            src="/rfid_icon.svg"
            alt="RFID Icon"
            className="w-100 h-auto mb-4"
          />
          <h3 className="text-3xl font-bold mb-2">Waiting for RFID Scan...</h3>
          <p className="text-lg max-w-md">Please scan your RFID tag to continue.</p>
        </div>
      )}

      {isReadyToScan && isScanned && (
        <div className="mx-auto p-6 mt-6 text-[#285082] select-none">

          <div className="border border-gray-300 mb-6 p-4 rounded-lg">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm md:text-base">
              {/* UID */}
              <div className="flex flex-1 flex-row items-center gap-4">
                <label className="w-20 font-semibold text-[#285082]">UID</label>
                <p className="w-full font-mono text-[#1e3a5f] bg-gray-100 px-3 py-2 rounded-md border border-gray-300 whitespace-nowrap">
                  {uid}
                </p>
              </div>

              {/* Box Name */}
              <div className="flex flex-1 flex-row items-center gap-4">
                <label htmlFor="boxName" className="w-20 font-semibold text-[#285082] whitespace-nowrap">
                  Box Name
                </label>
                <input
                  id="boxName"
                  type="text" 
                  value={boxName}
                  onChange={handleBoxNameChange}
                  className="w-full border border-[#285082] p-2 rounded-md transition"
                  placeholder="Enter box name"
                />
              </div>
            </div>
          </div>
           
          <div className="border border-gray-300 rounded-lg p-4 mb-6">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="itemList">
                {(provided) => (
                  <ul
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6"
                  >
                    {Array.isArray(items) && items.map((item, index) => (
                      <Draggable key={`${item.item_name}-${index}`} draggableId={`${item.item_name}-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex items-center justify-between p-2 sm:p-4 rounded-lg shadow-sm border ${
                              snapshot.isDragging ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-300'
                            }`}
                          >
                            <div className="flex flex-row items-center space-x-2 sm:space-x-4 text-sm sm:text-base">
                              <span className="font-semibold text-[#285082]">{item.item_name}</span>
                              <span className="text-gray-600">{item.item_description}</span>
                              <span className="text-gray-500">x{item.quantity}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleEditItem(index)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                                title="Edit"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(index)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Add Item Form */}
          <div className="border border-gray-300 rounded-lg p-6 bg-white">
            <h2 className="text-xl font-bold mb-4">Add New Item</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Item Name"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                className="border p-2 rounded-md"
              />
              <input
                type="text"
                placeholder="Description"
                value={newItem.item_description}
                onChange={(e) => setNewItem({ ...newItem, item_description: e.target.value })}
                className="border p-2 rounded-md"
              />
              <input
                type="number"
                placeholder="Qty"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value || "1") })}
                className="border p-2 rounded-md"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="bg-[#285082] text-white p-2 rounded-md hover:bg-[#1e3a5f]"
              >
                {editIndex !== null ? "Update" : "Add"}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-4 mt-4">
            <button
              onClick={handleDiscard}
              type="button"
              className="w-full flex items-center justify-center sm:w-auto px-4 py-2 border border-[#285082] text-[#285082] rounded-md hover:bg-[#f0f8ff] transition text-sm font-medium"
            >
              
              {/* Actual visible text */}
              <span className="absolute">
                {isChanged ? "Discard Changes" : "Back"}
              </span>

              {/* Invisible placeholder keeps size stable */}
              <span className="invisible">
                Discard Changes
              </span>

            </button>

            <button
              onClick={handleSave}
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-[#285082] text-white rounded-md hover:bg-[#1e3a5f] transition text-sm font-medium"
            >
              Save to Database
            </button>
          </div>
        </div>
      )}


      {/* <div style={{ marginTop: "2rem" }}>
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
      </div> */}
    </div>
  );
};
export default RFIDAdd;
