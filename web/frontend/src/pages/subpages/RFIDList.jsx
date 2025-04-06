import React, { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";

const RFIDItemList = () => {
  const [items, setItems] = useState(["Arduino", "LEDs", "Cables"]);
  const [newItem, setNewItem] = useState("");

  // Add new item to list
  const handleAdd = () => {
    if (newItem.trim()) {
      setItems([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  // Delete item by index
  const handleDelete = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  // Handle drag end
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto" }}>
      <h3>📦 Box Items</h3>

      <div style={{ display: "flex", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="New item"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          style={{ flex: 1, marginRight: "0.5rem" }}
        />
        <button onClick={handleAdd}>Add</button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="itemList">
          {(provided) => (
            <ul
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={{ padding: 0, listStyle: "none" }}
            >
              {items.map((item, index) => (
                <Draggable
                  key={item + index}
                  draggableId={item + index}
                  index={index}
                >
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        ...provided.draggableProps.style,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.5rem",
                        marginBottom: "0.5rem",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: "#f9f9f9"
                      }}
                    >
                      <span>{item}</span>
                      <button onClick={() => handleDelete(index)}>❌</button>
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
  );
};

export default RFIDItemList;


// import React, { useState } from "react";
// import {
//   DragDropContext,
//   Droppable,
//   Draggable
// } from "@hello-pangea/dnd";

// const initialData = {
//   boxA: {
//     name: "Box A",
//     items: ["Arduino", "LEDs"]
//   },
//   boxB: {
//     name: "Box B",
//     items: ["Wires", "Sensors"]
//   }
// };

// const MultiBoxDragDrop = () => {
//   const [boxes, setBoxes] = useState(initialData);

//   const handleDragEnd = (result) => {
//     const { source, destination } = result;

//     if (!destination) return;

//     // Skip if dropped in the same spot
//     if (
//       source.droppableId === destination.droppableId &&
//       source.index === destination.index
//     ) return;

//     const sourceBox = boxes[source.droppableId];
//     const destBox = boxes[destination.droppableId];
//     const draggedItem = sourceBox.items[source.index];

//     // Clone source items
//     const sourceItems = Array.from(sourceBox.items);
//     sourceItems.splice(source.index, 1);

//     // Clone destination items
//     const destItems = Array.from(destBox.items);
//     destItems.splice(destination.index, 0, draggedItem);

//     setBoxes({
//       ...boxes,
//       [source.droppableId]: {
//         ...sourceBox,
//         items: sourceItems
//       },
//       [destination.droppableId]: {
//         ...destBox,
//         items: destItems
//       }
//     });
//   };

//   return (
//     <div style={{ display: "flex", gap: "2rem", padding: "2rem" }}>
//       <DragDropContext onDragEnd={handleDragEnd}>
//         {Object.entries(boxes).map(([boxId, box]) => (
//           <Droppable droppableId={boxId} key={boxId}>
//             {(provided) => (
//               <div
//                 ref={provided.innerRef}
//                 {...provided.droppableProps}
//                 style={{
//                   border: "2px solid #ccc",
//                   borderRadius: "8px",
//                   padding: "1rem",
//                   width: "200px",
//                   backgroundColor: "#f9f9f9"
//                 }}
//               >
//                 <h4>{box.name}</h4>
//                 {box.items.map((item, index) => (
//                   <Draggable
//                     key={item + boxId}
//                     draggableId={item + boxId}
//                     index={index}
//                   >
//                     {(provided) => (
//                       <div
//                         ref={provided.innerRef}
//                         {...provided.draggableProps}
//                         {...provided.dragHandleProps}
//                         style={{
//                           ...provided.draggableProps.style,
//                           padding: "0.5rem",
//                           marginBottom: "0.5rem",
//                           border: "1px solid #aaa",
//                           borderRadius: "4px",
//                           backgroundColor: "#fff",
//                           display: "flex",
//                           justifyContent: "space-between",
//                           alignItems: "center"
//                         }}
//                       >
//                         {item}
//                       </div>
//                     )}
//                   </Draggable>
//                 ))}
//                 {provided.placeholder}
//               </div>
//             )}
//           </Droppable>
//         ))}
//       </DragDropContext>
//     </div>
//   );
// };

// export default MultiBoxDragDrop;
