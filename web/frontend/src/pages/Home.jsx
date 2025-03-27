import { useState, useEffect } from "react";

const Home = () => {
  const [count, setCount] = useState(0);

  // Fetch initial counter value
  useEffect(() => {
    fetch("http://localhost:8000/api/counter")
      .then((res) => res.json())
      .then((data) => setCount(data.value));
  }, []);

  const handleClick = async (type) => {
    const res = await fetch(`http://localhost:8000/api/${type}`, {
      method: "POST",
    });
    const data = await res.json();
    setCount(data.value);
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
