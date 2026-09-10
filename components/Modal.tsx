"use client";

import { useEffect, useRef, useState } from "react";

export default function Modal() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus();
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      close();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = [closeRef, saveRef];
    const currentIndex = focusable.findIndex(
      (ref) => ref.current === document.activeElement,
    );
    if (currentIndex === -1) return;

    event.preventDefault();
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex =
      (currentIndex + direction + focusable.length) % focusable.length;
    focusable[nextIndex].current?.focus();
  };

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)}>
        Open Modal
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="settings-heading"
          aria-modal="true"
          onKeyDown={handleDialogKeyDown}
        >
          <h2 id="settings-heading">Settings</h2>
          <button ref={saveRef} type="button">Save Changes</button>
          <button ref={closeRef} type="button" onClick={close}>
            Close
          </button>
        </div>
      )}
    </>
  );
}
