// src/app/(merchant)/dashboard/orders/types.ts

export type OrderStatus = 'pending' | 'paid' | 'processed' | 'shipped' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  variant: {
    name: string;
    product: {
      name: string;
      image_url: string | null;
    } | null;
  } | null;
}

export interface OrderDetail {
  id: string;
  created_at: string;
  status: OrderStatus;
  total_amount: number;
  courier_code: string | null;
  courier_service: string | null;
  tracking_number: string | null;
  buyer: {
    full_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  shipping_address: {
    recipient_name: string | null;
    phone: string | null;
    street_address: string;
    city_name: string | null;
    province_name: string | null;
    postal_code: string;
  } | null;
  items: OrderItem[];
}