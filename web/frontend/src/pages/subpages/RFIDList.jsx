  import React, { useEffect, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import { Pencil, Trash2 } from "lucide-react";
  import api from "../../api";

  const RFIDList = () => {
    const [boxes, setBoxes] = useState([]);
    const [selectedBoxUid, setSelectedBoxUid] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
      fetchBoxes();
    }, []);

    const fetchBoxes = async () => {
      try {
        const response = await api.get("/get-all-boxes");
        setBoxes(response.data);
      } catch (err) {
        console.error("Failed to fetch boxes", err);
      }
    };

    const deleteBox = async (uid) => {
      const confirmed = window.confirm("Are you sure you want to delete this box?");
      if (!confirmed) return;

      try {
        const box = boxes.find((b) => b.uid === uid);
        await api.delete(`/delete-box/${box.id}`);
        console.log("[INFO] Box deleted");
        fetchBoxes();
        setSelectedBoxUid(null);
      } catch (err) {
        console.error("Failed to delete box", err);
        alert("Failed to delete box.");
      }
    };

    const handleEdit = (uid) => {
      navigate("/rfid/add", { state: { uid, fromList: true } });
    };

    const toggleSelect = (uid) => {
      setSelectedBoxUid(prev => (prev === uid ? null : uid));
    };

    return (
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {boxes.map((box) => {
            const isSelected = selectedBoxUid === box.uid;

            return (
              <div
                key={box.uid}
                onClick={() => toggleSelect(box.uid)}
                className={`relative border p-4 rounded-xl shadow bg-white cursor-pointer transition-all duration-200 transform hover:shadow-lg ${
                  isSelected ? "ring-1 ring-[#285082]" : ""
                }`}
              >
                {isSelected && (
                  <div
                    className="absolute top-0 left-0 w-full flex justify-between items-center px-4 py-2 bg-[#285082] text-white z-10 rounded-t-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="font-semibold">{box.box_name}</span>
                    <div className="space-x-2 flex items-center">

                      <button
                        onClick={() => handleEdit(box.uid)}
                        className="bg-white text-[#285082] p-1 rounded-full hover:bg-gray-200"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => deleteBox(box.uid)}
                        className="bg-white text-[#285082] p-1 rounded-full hover:bg-gray-200"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                  </div>
                )}

                <div className={`${isSelected ? "opacity-50" : "opacity-100"} select-none`}>
                  <p className="text-xl font-bold">{box.box_name}</p>
                  <p className="text-sm text-gray-500 mt-2">UID: {box.uid}</p>

                  {Array.isArray(box.items) && box.items.length > 0 && (
                    <ul className="mt-4 list-disc list-inside text-gray-700">
                      {box.items.map((item, index) => (
                        <li key={`${box.uid}-${item.item_id || index}`}>
                          {item.item_name} - {item.quantity} pcs
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  export default RFIDList;
