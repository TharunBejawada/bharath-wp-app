import { Product } from "./types";

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Bharath RO Premier",
    price: 12500,
    category: "Domestic",
    image: "https://via.placeholder.com/150", // We will replace this later
    description: "10L Storage, Copper + Zinc filter technology.",
    inStock: true,
  },
  {
    id: "2",
    name: "Industrial 50L Plant",
    price: 45000,
    category: "Industrial",
    image: "https://via.placeholder.com/150",
    description: "High capacity plant for offices and factories.",
    inStock: true,
  },
  {
    id: "3",
    name: "Alkaline Filter Kit",
    price: 2500,
    category: "Spares",
    image: "https://via.placeholder.com/150",
    description: "Replacement kit for standard RO systems.",
    inStock: true,
  },
];