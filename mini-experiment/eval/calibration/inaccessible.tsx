"use client";

import { useEffect, useState } from "react";

const IMAGES = ["/products/shoe-1.svg", "/products/shoe-2.svg", "/products/shoe-3.svg"];
const SIZES = [7, 8, 9, 10, 11];

export default function ProductQuickView() {
  const [image, setImage] = useState(0);
  const [size, setSize] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);
  const [cart, setCart] = useState(0);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 5000);
    return () => clearTimeout(t);
  }, [msg]);

  return (
    <div>
      <div className="flex justify-between bg-gray-100 px-4 py-2">
        <span className="text-gray-400">Stride</span>
        <div className="relative">
          <svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 3h18l-2 12H5z" /></svg>
          <span className="absolute -right-2 -top-2 text-xs">{cart}</span>
        </div>
      </div>
      <div className="flex gap-6 p-6">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={IMAGES[image]} className="w-80" />
          <div className="flex gap-2">
            {IMAGES.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} onClick={() => setImage(i)} className={`w-16 border ${i === image ? "border-black" : ""}`} />
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="text-2xl font-bold">Trail Runner 2</div>
          <div className="text-gray-400">$129.00</div>
          <div className="absolute right-0 top-0" onClick={() => setSaved(!saved)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? "red" : "none"} stroke="red"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" /></svg>
          </div>
          <div className="mt-4 flex gap-2">
            {SIZES.map((s) => (
              <div
                key={s}
                onClick={() => {
                  if (s === 11) return;
                  setSize(s);
                  setError(false);
                }}
                className={`h-10 w-10 border text-center leading-10 ${size === s ? "bg-black text-white" : ""} ${s === 11 ? "text-gray-300 line-through" : ""}`}
              >
                {s}
              </div>
            ))}
          </div>
          {error && <div className="text-red-400">Please select a size</div>}
          <div className="mt-4 flex items-center gap-2">
            <div onClick={() => setQty(Math.max(1, qty - 1))}>−</div>
            <input value={qty} onChange={(e) => setQty(Math.min(5, Math.max(1, Number(e.target.value) || 1)))} className="w-12 border" />
            <div onClick={() => setQty(Math.min(5, qty + 1))}>+</div>
          </div>
          <button
            className="mt-4 w-full bg-blue-500 py-2 text-white"
            onClick={() => {
              if (size === null) return setError(true);
              setCart(cart + qty);
              setMsg(`Added ${qty} × Trail Runner 2 (size ${size}) to cart`);
            }}
          >
            Add to cart
          </button>
          {msg && <div>{msg}</div>}
        </div>
      </div>
    </div>
  );
}
