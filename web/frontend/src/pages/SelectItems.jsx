import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api"; // Assuming you have an api helper setup

const SelectItems = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get personName from navigation state, default to "Unknown" if not provided
  const personName = location.state?.personName || "Unknown";

  // State to hold the items associated with the person
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch items associated with the person when the component mounts
  useEffect(() => {
    const fetchItems = async () => {
      if (personName === "Unknown") {
          setError("Person name is missing.");
          setIsLoading(false);
          return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // --- TODO: Replace with your actual API endpoint ---
        // This assumes an endpoint like GET /api/persons/{personName}/items
        // or similar to fetch items for a specific person.
        // Adjust the endpoint and data handling as per your backend API structure.
        const response = await api.get(`/api/persons/${encodeURIComponent(personName)}/items`);
        setItems(response.data || []); // Assuming the API returns an array of items in response.data
      } catch (err) {
        console.error("Error fetching items:", err);
        setError("Failed to fetch items. Please try again later.");
        setItems([]); // Clear items on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [personName]); // Re-fetch if personName changes (though unlikely in this flow)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-[#285082]">
          Manage Items for {personName}
        </h1>

        {/* Add/Remove Items buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => navigate("/add-items", { state: { personName } })}
            className="px-6 py-3 bg-[#285082] text-white rounded-md shadow hover:bg-[#1f407a] transition duration-150 ease-in-out"
          >
            Add Items
          </button>

          <button
            onClick={() => navigate("/remove-items", { state: { personName } })}
            className="px-6 py-3 bg-white border border-[#285082] text-[#285082] rounded-md shadow hover:bg-blue-50 transition duration-150 ease-in-out"
          >
            Remove Items
          </button>
        </div>

        {/* Display Existing Items */}
        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Current Items:</h2>
          {isLoading && <p className="text-center text-gray-500">Loading items...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          {!isLoading && !error && (
            <>
              {items.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                  {/* --- TODO: Adjust based on your item object structure --- */}
                  {items.map((item, index) => (
                    <li key={item.id || index} className="text-gray-800">
                      {item.name || `Item ${index + 1}`} {/* Adjust property access based on your item data */}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500">No items associated with {personName} yet.</p>
              )}
            </>
          )}
        </div>
         {/* Back Button */}
         <div className="mt-8 text-center">
            <button
                onClick={() => navigate(-1)} // Go back to the previous page
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-150 ease-in-out"
            >
                Back
            </button>
        </div>
      </div>
    </div>
  );
};

export default SelectItems;
