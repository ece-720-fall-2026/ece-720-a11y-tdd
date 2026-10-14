"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

const IMAGES = [
  { src: "/products/shoe-1.svg", view: "side view" },
  { src: "/products/shoe-2.svg", view: "top view" },
  { src: "/products/shoe-3.svg", view: "sole view" },
];
const COLORS = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Black", hex: "#111827" },
  { name: "Grey", hex: "#9ca3af" },
];
const SIZES = [
  { size: 7, inStock: true },
  { size: 8, inStock: true },
  { size: 9, inStock: true },
  { size: 10, inStock: true },
  { size: 11, inStock: false },
];
const SIZE_CHART = [
  [7, 40, "25.0"],
  [8, 41, "25.7"],
  [9, 42, "26.7"],
  [10, 43, "27.3"],
  [11, 44, "28.0"],
];
const TABS = [
  { id: "details", label: "Details", text: "Upper: breathable mesh. Outsole: high-traction rubber lugs. Drop: 6 mm. Weight: 280 g." },
  { id: "reviews", label: "Reviews", text: "Rated 4.6 out of 5 by 128 runners." },
  { id: "shipping", label: "Shipping", text: "Free shipping on orders over $100. Free 30-day returns." },
];
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

function PriceTooltip() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label="Price information"
        aria-describedby={id}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={`ml-2 h-6 w-6 rounded-full border border-gray-700 text-xs ${focusRing}`}
      >
        <span aria-hidden="true">i</span>
      </button>
      <span id={id} role="tooltip" className={`absolute bottom-8 left-0 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white ${open ? "" : "hidden"}`}>
        Price includes taxes
      </span>
    </span>
  );
}

function ColorListbox({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(value);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const labelId = useId();
  const listId = useId();

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const close = (focusButton: boolean) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };
  const choose = (i: number) => {
    onChange(i);
    close(true);
  };
  const openList = () => {
    setActive(value);
    setOpen(true);
  };
  const onListKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") setActive((a) => Math.min(COLORS.length - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(COLORS.length - 1);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape") close(true);
    else if (e.key === "Tab") close(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  return (
    <div className="relative mt-4">
      <span id={labelId} className="block font-semibold">Color</span>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${listId}-value`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openList();
          }
        }}
        className={`mt-1 flex w-48 items-center gap-2 rounded border border-gray-700 px-3 py-2 ${focusRing}`}
      >
        <span aria-hidden="true" className="h-4 w-4 rounded-full" style={{ background: COLORS[value].hex }} />
        <span id={`${listId}-value`}>{COLORS[value].name}</span>
        <span aria-hidden="true" className="ml-auto">▾</span>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          onBlur={() => setOpen(false)}
          className={`absolute z-10 mt-1 w-48 rounded border border-gray-700 bg-white ${focusRing}`}
        >
          {COLORS.map((c, i) => (
            <li
              key={c.name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              className={`flex items-center gap-2 px-3 py-2 ${i === active ? "bg-gray-200" : ""}`}
            >
              <span aria-hidden="true" className="h-4 w-4 rounded-full" style={{ background: c.hex }} />
              {c.name}
              {i === value && <span aria-hidden="true" className="ml-auto">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SizeGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    }
    if (!open && dialog.open) dialog.close();
    if (!open) document.body.style.overflow = "";
  }, [open]);

  const trap = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const focusable = Array.from(ref.current?.querySelectorAll<HTMLElement>("button, [href], [tabindex='0']") ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onKeyDown={trap}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto rounded-lg p-6 backdrop:bg-black/60"
    >
      <div className="flex items-start justify-between gap-8">
        <h2 id={titleId} className="text-xl font-bold">Size guide</h2>
        <button type="button" aria-label="Close size guide" onClick={onClose} className={`h-8 w-8 ${focusRing}`}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <table className="mt-4">
        <thead>
          <tr>
            <th scope="col" className="px-3">US</th>
            <th scope="col" className="px-3">EU</th>
            <th scope="col" className="px-3">Foot length (cm)</th>
          </tr>
        </thead>
        <tbody>
          {SIZE_CHART.map(([us, eu, cm]) => (
            <tr key={us}>
              <td className="px-3">{us}</td>
              <td className="px-3">{eu}</td>
              <td className="px-3">{cm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </dialog>
  );
}

function DetailsTabs() {
  const [selected, setSelected] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const base = useId();
  const move = (i: number) => {
    const next = (i + TABS.length) % TABS.length;
    setSelected(next);
    refs.current[next]?.focus();
  };
  return (
    <section className="mx-auto max-w-4xl px-6 pb-10">
      <div role="tablist" aria-label="Product details" className="flex gap-4 border-b">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-${t.id}-tab`}
            aria-selected={i === selected}
            aria-controls={`${base}-${t.id}-panel`}
            tabIndex={i === selected ? 0 : -1}
            onClick={() => setSelected(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") move(i + 1);
              else if (e.key === "ArrowLeft") move(i - 1);
              else if (e.key === "Home") move(0);
              else if (e.key === "End") move(TABS.length - 1);
            }}
            className={`px-2 py-2 ${i === selected ? "border-b-2 border-gray-900 font-semibold" : ""} ${focusRing}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {TABS.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-${t.id}-panel`}
          aria-labelledby={`${base}-${t.id}-tab`}
          tabIndex={0}
          hidden={i !== selected}
          className={`py-4 ${focusRing}`}
        >
          {t.text}
        </div>
      ))}
    </section>
  );
}

export default function ProductQuickView() {
  const [image, setImage] = useState(0);
  const [color, setColor] = useState(0);
  const [size, setSize] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);
  const [cart, setCart] = useState(0);
  const [saved, setSaved] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const firstSize = useRef<HTMLInputElement>(null);
  const guideButton = useRef<HTMLButtonElement>(null);
  const errorId = useId();

  useEffect(() => {
    if (!confirmation) return;
    const t = setTimeout(() => setConfirmation(""), 5000);
    return () => clearTimeout(t);
  }, [confirmation]);

  const add = () => {
    if (size === null) {
      setError(true);
      firstSize.current?.focus();
      return;
    }
    setCart((c) => c + qty);
    setConfirmation(`Added ${qty} × Trail Runner 2 (${COLORS[color].name}, size ${size}) to cart`);
  };
  const closeGuide = () => {
    setGuideOpen(false);
    guideButton.current?.focus();
  };

  return (
    <>
      <header className="flex items-center justify-between bg-gray-900 px-4 py-2 text-white">
        <span className="font-bold">Stride</span>
        <button type="button" className={`rounded px-2 py-1 ${focusRing}`} aria-label={`Cart, ${cart} items`}>
          <span aria-hidden="true">Cart {cart}</span>
        </button>
      </header>
      <main>
        <div className="mx-auto grid max-w-4xl gap-6 p-6 md:grid-cols-2">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMAGES[image].src} alt={`Trail Runner 2, ${IMAGES[image].view}`} className="w-full" />
            <div className="mt-2 flex gap-2">
              {IMAGES.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  aria-label={`Show ${img.view}`}
                  aria-pressed={i === image}
                  onClick={() => setImage(i)}
                  className={`w-20 border-4 ${i === image ? "border-gray-900" : "border-transparent"} ${focusRing}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.src} alt="" />
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <h1 className="text-2xl font-bold">Trail Runner 2</h1>
            <p className="flex items-center">
              $129.00
              <PriceTooltip />
            </p>
            <p className="text-gray-700">Lightweight trail running shoe with a grippy outsole and a breathable mesh upper.</p>
            <button
              type="button"
              aria-label="Save to wishlist"
              aria-pressed={saved}
              onClick={() => setSaved((s) => !s)}
              className={`absolute right-0 top-0 h-8 w-8 ${focusRing}`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill={saved ? "#b91c1c" : "none"} stroke="#b91c1c">
                <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
              </svg>
            </button>
            <ColorListbox value={color} onChange={setColor} />
            <fieldset className="mt-4" aria-invalid={error} aria-describedby={error ? errorId : undefined}>
              <legend className="font-semibold">Size</legend>
              <div className="flex gap-2">
                {SIZES.map((s, i) => (
                  <label key={s.size} className={`relative flex h-10 w-10 items-center justify-center border ${size === s.size ? "bg-gray-900 text-white" : ""} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-700`}>
                    <input
                      ref={i === 0 ? firstSize : undefined}
                      type="radio"
                      name="size"
                      value={s.size}
                      disabled={!s.inStock}
                      checked={size === s.size}
                      onChange={() => {
                        setSize(s.size);
                        setError(false);
                      }}
                      className="sr-only"
                    />
                    {s.size}
                    {!s.inStock && <span className="sr-only">, out of stock</span>}
                  </label>
                ))}
              </div>
              {error && <p id={errorId} className="text-red-700">Please select a size</p>}
            </fieldset>
            <button ref={guideButton} type="button" onClick={() => setGuideOpen(true)} className={`mt-2 underline ${focusRing}`}>
              Size guide
            </button>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} className={`h-8 w-8 border ${focusRing}`}>−</button>
              <label htmlFor="qty">Quantity</label>
              <input id="qty" type="number" min={1} max={5} value={qty} onChange={(e) => setQty(Math.min(5, Math.max(1, Number(e.target.value) || 1)))} className={`w-16 border ${focusRing}`} />
              <button type="button" aria-label="Increase quantity" disabled={qty >= 5} onClick={() => setQty((q) => q + 1)} className={`h-8 w-8 border ${focusRing}`}>+</button>
            </div>
            <button type="button" onClick={add} className={`mt-4 w-full bg-gray-900 py-2 text-white ${focusRing}`}>Add to cart</button>
            <div role="status" aria-live="polite">{confirmation}</div>
          </div>
        </div>
        <DetailsTabs />
      </main>
      <SizeGuide open={guideOpen} onClose={closeGuide} />
    </>
  );
}
