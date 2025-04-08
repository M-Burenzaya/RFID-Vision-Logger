import React, { useState, useEffect, useRef, use } from 'react';
import { Link } from "react-router-dom";
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
    items, setItems
  } = useRFID();

  const [newItem, setNewItem] = useState({
    item_name: "",
    item_description: "",
    quantity: 1,
  });


  const handleBoxNameChange = (e) => setBoxName(e.target.value);
  const handleItemsChange = (e) => setItems(e.target.value);

  useEffect(() => {
    if (!isReadyToScan) {
      setUid("");
      setIsScanned(false);
      tryInitializeUntilReady();
    }
  }, []);

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

//----------------------------------------------------------------------------------------------

  const handleAddItem = () => {
    const { item_name, item_description, quantity } = newItem;

    if (item_name.trim()) {
      setItems([...items, { item_name, item_description, quantity }]);
      setNewItem({ item_name: "", item_description: "", quantity: 1 });
    }
  };


  const handleDeleteItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
  };


  const handleDiscard = (e) => {
    e.preventDefault();
    setBoxName("");
    setItems([]); // ← Fix is here
    setUid("");
    setIsScanned(false);
    setIsReadyToScan(false);
    console.log("[INFO] Discarded changes");

    tryInitializeUntilReady();
  };
  
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        uid,
        box_name: boxName,
        items: items.map((item) => ({
          item_name: item.item_name,
          item_description: item.item_description,
          quantity: item.quantity
        }))
      };
  
      const response = await api.post("/rfid-box/", payload);
      console.log("[SUCCESS] Box saved:", response.data);
    } catch (error) {
      console.log("[ERROR] Failed to save:", error);
    }
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
        <div className="max-w-3xl mx-auto p-6 mt-6 bg-white text-[#285082]">
          <h2 className="text-2xl font-bold mb-2">RFID Scanned</h2>
          <p className="text-sm mb-6">UID: <span className="font-mono">{uid}</span></p>

          <form>
            <label className="block font-semibold mb-1">Box Name</label>
            <input
              type="text"
              value={boxName}
              onChange={handleBoxNameChange}
              className="w-full border border-[#285082] p-2 rounded-md mb-6"
              placeholder="Enter box name"
            />

            <label className="block font-semibold mb-2">Add Item</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
              <input
                type="text"
                placeholder="Item Name"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                className="border p-2 rounded-md col-span-1"
              />
              <input
                type="text"
                placeholder="Description"
                value={newItem.item_description}
                onChange={(e) => setNewItem({ ...newItem, item_description: e.target.value })}
                className="border p-2 rounded-md col-span-1"
              />
              <input
                type="number"
                placeholder="Qty"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value || "1") })}
                className="border p-2 rounded-md col-span-1"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="bg-[#285082] text-white p-2 rounded-md hover:bg-[#1e3a5f] col-span-1"
              >
                Add
              </button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="itemList">
                {(provided) => (
                  <ul
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 mb-6"
                  >
                    {Array.isArray(items) && items.map((item, index) => (
                      <Draggable key={`${item.item_name}-${index}`} draggableId={`${item.item_name}-${index}`} index={index}>
                        {(provided) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex justify-between items-center p-3 border border-gray-300 rounded-md bg-gray-50"
                          >
                            <span>
                              <strong>{item.item_name}</strong> - {item.item_description} (x{item.quantity})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(index)}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ❌
                            </button>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>

            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <button
                onClick={handleDiscard}
                type="button"
                className="p-2 border border-[#285082] text-[#285082] rounded-md hover:bg-[#f0f8ff]"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSave}
                type="submit"
                className="p-2 bg-[#285082] text-white rounded-md hover:bg-[#1e3a5f]"
              >
                Save to Database
              </button>
            </div>
          </form>
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
