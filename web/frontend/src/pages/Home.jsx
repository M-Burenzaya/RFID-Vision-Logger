import { useState, useEffect } from "react";
import axios from "axios"; // Import Axios

const Home = () => {
  const [count, setCount] = useState(0);

  // Fetch initial counter value
  useEffect(() => {
    // Use Axios to fetch initial counter value
    axios.get("http://localhost:8000/api/counter")
      .then((response) => {
        setCount(response.data.value);  // Set the count from response
      })
      .catch((error) => {
        console.error("Error fetching the counter:", error);
      });
  }, []);

  const handleClick = async (type) => {
    // Use Axios for POST requests
    try {
      const response = await axios.post(`http://localhost:8000/api/${type}`);
      setCount(response.data.value);  // Set the count from response
    } catch (error) {
      console.error(`Error with ${type} request:`, error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-20 text-[#285082]">
      <h1 className="text-3xl font-bold">Home Page</h1>
      <div className="text-2xl">Count: {count}</div>
      <div className="flex gap-4">
        <button
          onClick={() => handleClick("increment")}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
        >
          Increment
        </button>
        <button
          onClick={() => handleClick("decrement")}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
        >
          Decrement
        </button>
      </div>
    </div>
  );
};

export default Home;
