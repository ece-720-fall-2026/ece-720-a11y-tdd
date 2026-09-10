"use client";

import { useState } from "react";

export default function Modal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" className="open-btn" onClick={() => setIsOpen(true)}>
        Open Settings
      </button>

      {isOpen ? (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Settings</h2>
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
