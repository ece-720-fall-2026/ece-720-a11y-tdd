"use client";

import { useEffect, useState } from "react";

const IMAGES = ["/products/shoe-1.svg", "/products/shoe-2.svg", "/products/shoe-3.svg"];
const COLORS = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Black", hex: "#111827" },
  { name: "Grey", hex: "#9ca3af" },
];
const SIZES = [7, 8, 9, 10, 11];
const TABS = [
  ["Details", "Upper: breathable mesh. Outsole: high-traction rubber lugs. Drop: 6 mm. Weight: 280 g."],
  ["Reviews", "Rated 4.6 out of 5 by 128 runners."],
  ["Shipping", "Free shipping on orders over $100. Free 30-day returns."],
];

export default function ProductQuickView() {
  const [image, setImage] = useState(0);
  const [color, setColor] = useState(0);
  const [colorOpen, setColorOpen] = useState(false);
  const [size, setSize] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);
  const [cart, setCart] = useState(0);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");
  const [tip, setTip] = useState(false);
  const [guide, setGuide] = useState(false);
  const [tab, setTab] = useState(0);

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
          <div className="flex items-center gap-2 text-gray-400">
            $129.00
            <span className="relative" onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
              <span className="rounded-full border px-1 text-xs">i</span>
              {tip && <span className="absolute bottom-6 left-0 whitespace-nowrap bg-black px-2 text-xs text-white">Price includes taxes</span>}
            </span>
          </div>
          <div className="absolute right-0 top-0" onClick={() => setSaved(!saved)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? "red" : "none"} stroke="red"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" /></svg>
          </div>
          <div className="mt-4 text-sm">Color</div>
          <div className="relative w-40">
            <div className="flex items-center gap-2 border px-2 py-1" onClick={() => setColorOpen(!colorOpen)}>
              <span className="h-3 w-3 rounded-full" style={{ background: COLORS[color].hex }} />
              <span>{COLORS[color].name}</span>
              <span className="ml-auto">▾</span>
            </div>
            {colorOpen && (
              <div className="absolute z-10 w-40 border bg-white">
                {COLORS.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 px-2 py-1" onClick={() => { setColor(i); setColorOpen(false); }}>
                    <span className="h-3 w-3 rounded-full" style={{ background: c.hex }} />
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-4">
            <span className="font-semibold">Size</span>
            <span className="text-sm text-blue-400 underline" onClick={() => setGuide(true)}>Size guide</span>
          </div>
          <div className="mt-2 flex gap-2">
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
              setMsg(`Added ${qty} × Trail Runner 2 (${COLORS[color].name}, size ${size}) to cart`);
            }}
          >
            Add to cart
          </button>
          {msg && <div>{msg}</div>}
        </div>
      </div>
      <div className="px-6">
        <div className="flex gap-4 border-b">
          {TABS.map(([label], i) => (
            <div key={label} onClick={() => setTab(i)} className={`py-2 ${i === tab ? "border-b-2 border-black" : "text-gray-400"}`}>{label}</div>
          ))}
        </div>
        <div className="py-4">{TABS[tab][1]}</div>
      </div>
      {guide && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50" onClick={() => setGuide(false)}>
          <div className="rounded bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between">
              <div className="text-xl font-bold">Size guide</div>
              <div className="cursor-pointer" onClick={() => setGuide(false)}>×</div>
            </div>
            <table>
              <tbody>
                <tr><td>US</td><td>EU</td><td>Foot length (cm)</td></tr>
                {[[7, 40, "25.0"], [8, 41, "25.7"], [9, 42, "26.7"], [10, 43, "27.3"], [11, 44, "28.0"]].map(([a, b, c]) => (
                  <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
