"use client";

import { useEffect, useId, useRef, useState } from "react";

const IMAGES = [
  { src: "/products/shoe-1.svg", view: "side view" },
  { src: "/products/shoe-2.svg", view: "top view" },
  { src: "/products/shoe-3.svg", view: "sole view" },
];
const SIZES = [
  { size: 7, inStock: true },
  { size: 8, inStock: true },
  { size: 9, inStock: true },
  { size: 10, inStock: true },
  { size: 11, inStock: false },
];
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export default function ProductQuickView() {
  const [image, setImage] = useState(0);
  const [size, setSize] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);
  const [cart, setCart] = useState(0);
  const [saved, setSaved] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const firstSize = useRef<HTMLInputElement>(null);
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
    setConfirmation(`Added ${qty} × Trail Runner 2 (size ${size}) to cart`);
  };

  return (
    <>
      <header className="flex items-center justify-between bg-gray-900 px-4 py-2 text-white">
        <span className="font-bold">Stride</span>
        <button type="button" className={`rounded px-2 py-1 ${focusRing}`} aria-label={`Cart, ${cart} items`}>
          <span aria-hidden="true">Cart {cart}</span>
        </button>
      </header>
      <main className="mx-auto grid max-w-4xl gap-6 p-6 md:grid-cols-2">
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
          <p>$129.00</p>
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
          <div className="mt-4 flex items-center gap-2">
            <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} className={`h-8 w-8 border ${focusRing}`}>−</button>
            <label htmlFor="qty">Quantity</label>
            <input id="qty" type="number" min={1} max={5} value={qty} onChange={(e) => setQty(Math.min(5, Math.max(1, Number(e.target.value) || 1)))} className={`w-16 border ${focusRing}`} />
            <button type="button" aria-label="Increase quantity" disabled={qty >= 5} onClick={() => setQty((q) => q + 1)} className={`h-8 w-8 border ${focusRing}`}>+</button>
          </div>
          <button type="button" onClick={add} className={`mt-4 w-full bg-gray-900 py-2 text-white ${focusRing}`}>Add to cart</button>
          <div role="status" aria-live="polite">{confirmation}</div>
        </div>
      </main>
    </>
  );
}
