"use client";

import { useMemo, useState } from "react";

function moveItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function SortableRecordList({
  items,
  emptyMessage,
  saveAction,
  deleteAction,
  renderMeta
}) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggingId, setDraggingId] = useState(null);
  const orderedIds = useMemo(
    () => JSON.stringify(orderedItems.map((item) => item.id)),
    [orderedItems]
  );

  function moveByOffset(id, offset) {
    setOrderedItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const targetIndex = Math.max(0, Math.min(current.length - 1, index + offset));
      return moveItem(current, index, targetIndex);
    });
  }

  function handleDrop(targetId) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    setOrderedItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === draggingId);
      const toIndex = current.findIndex((item) => item.id === targetId);
      return moveItem(current, fromIndex, toIndex);
    });
    setDraggingId(null);
  }

  if (!orderedItems.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <>
      <form action={saveAction} className="record-save-bar">
        <input name="orderedIds" type="hidden" value={orderedIds} />
        <p className="helper-text">Drag rows into place, then save the new order.</p>
        <button className="button button--solid" type="submit">
          Save Order
        </button>
      </form>

      <div className="record-list">
        {orderedItems.map((item, index) => (
          <article
            className={`record-item record-item--sortable${
              draggingId === item.id ? " record-item--dragging" : ""
            }`}
            draggable
            key={item.id}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggingId(item.id)}
            onDrop={() => handleDrop(item.id)}
          >
            <div className="record-copy">
              <div className="record-copy__top">
                <span className="drag-handle" aria-hidden="true">
                  ::
                </span>
                <span className="record-order">#{index + 1}</span>
              </div>
              <h2>{item.name}</h2>
              {renderMeta(item)}
            </div>
            <div className="record-actions">
              <button
                className="button button--ghost"
                disabled={index === 0}
                onClick={() => moveByOffset(item.id, -1)}
                type="button"
              >
                Up
              </button>
              <button
                className="button button--ghost"
                disabled={index === orderedItems.length - 1}
                onClick={() => moveByOffset(item.id, 1)}
                type="button"
              >
                Down
              </button>
              <form action={deleteAction}>
                <input name="id" type="hidden" value={item.id} />
                <button className="button button--ghost button--danger" type="submit">
                  Delete
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
