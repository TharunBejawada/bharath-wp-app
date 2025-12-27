// 1. What does a Water Purifier look like?
export interface Product {
  id: string;
  name: string;
  price: number;
  category: "Domestic" | "Commercial" | "Industrial" | "Spares";
  image: string; // URL to image
  description: string;
  inStock: boolean;
}

// 2. What does an Inquiry look like?
export interface Inquiry {
  id: string;
  productId?: string; // Optional (User might just ask general query)
  userId?: string; // Optional (Guest users)
  userPhone: string;
  message: string;
  status: "New" | "Contacted" | "Closed";
  date: string;
  type: "Purchase" | "Service";
}

// 3. Service Booking Slot
export interface ServiceSlot {
  id: string;
  date: string; // ISO Date "2023-10-27"
  isAvailable: boolean;
  bookedBy?: string; // User Name/Phone
}