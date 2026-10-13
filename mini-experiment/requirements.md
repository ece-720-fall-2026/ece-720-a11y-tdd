# Product Quick-View: "Trail Runner 2"

Build a product quick-view widget for an online shoe store.

- Component: `components/ProductQuickView.tsx` (default export `ProductQuickView`)
- Route: `/product` (`app/product/page.tsx` renders the component)
- Stack: Next.js App Router, React, Tailwind CSS. Do not add new dependencies.
- The dev server runs on `http://localhost:4001` (`pnpm dev`).

## Product data

| Field       | Value                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Name        | Trail Runner 2                                                         |
| Price       | $129.00                                                                |
| Description | Lightweight trail running shoe with a grippy outsole and a breathable mesh upper. |
| Images      | `/products/shoe-1.svg` (side), `/products/shoe-2.svg` (top), `/products/shoe-3.svg` (sole) |
| Sizes       | 7, 8, 9, 10, 11 (size 11 is out of stock)                              |

## Features

### 1. Store header
- A slim bar at the top of the page showing the store name "Stride" and a cart icon.
- The cart icon shows a small badge with the number of items in the cart. The cart starts empty (0).

### 2. Image gallery
- A large main image of the product. The first image (side) is shown initially.
- Below it, a row of 3 small thumbnails, one per image.
- Clicking a thumbnail shows that image as the main image.
- The thumbnail of the image currently shown has a highlighted border.

### 3. Product information
- The product name, price and description are shown next to the gallery (stacked below it on narrow screens).

### 4. Size picker
- The sizes are shown as a row of square chips with the size number in each chip.
- No size is selected initially.
- Clicking a chip selects that size; only one size can be selected at a time. The selected chip is filled dark with light text.
- Size 11 is out of stock: its chip is greyed out with a diagonal line through it and cannot be selected.

### 5. Quantity stepper
- A "−" button, a numeric field, and a "+" button.
- The quantity starts at 1 and must stay between 1 and 5. The field can also be typed into; values outside the range are clamped.

### 6. Add to cart
- A full-width "Add to cart" button.
- If no size is selected when it is clicked, show the message "Please select a size" in red under the size picker. The message disappears once a size is selected.
- If a size is selected, add the item to the cart:
  - The cart badge increases by the selected quantity.
  - A confirmation message appears under the button, for example "Added 2 × Trail Runner 2 (size 9) to cart". It disappears after 5 seconds.

### 7. Wishlist
- A heart icon button in the top-right corner of the product information area.
- Clicking it toggles the product as saved: an outlined heart when not saved, a filled red heart when saved.
