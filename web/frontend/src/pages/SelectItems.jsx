import React, { useEffect, useState } from "react";
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
    items, setItems
  } = useRFID();

  const [userId, setUserId] = useState(null); // ✅ Add this
  const [userItems, setUserItems] = useState([]);
  const [scannedBoxes, setScannedBoxes] = useState([]);
  const [logComment, setLogComment] = useState("");

  const location = useLocation();
  const userName = location.state?.personName;

  useEffect(() => {
    setUid("");
    setIsScanned(false);
    tryInitializeUntilReady();
  }, []);

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
      const data = res.data;
  
      if (Array.isArray(data)) {
        setUserItems(data);
      } else {
        console.warn("Expected array but got:", data);
        setUserItems([]); // fallback to prevent crash
      }
    } catch (err) {
      console.error("Failed to load user items", err);
      setUserItems([]); // also fallback in case of error
    }
  };
  

  const handleScanRFID = async () => {
    const res = await api.post("/scancont");
    const { uid } = res.data;
    const boxRes = await api.get(`/rfid-box/${uid}`);
    setScannedBoxes(prev => [...prev, boxRes.data]);
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
          <div key={box.uid} className="mb-4">
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
