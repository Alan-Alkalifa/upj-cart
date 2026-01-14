// src/app/(dashboard)/merchant-dashboard/orders/types.ts

export type OrderStatus = 'pending' | 'paid' | 'packed' | 'shipped' | 'completed' | 'cancelled';

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
  
  // Delivery
  delivery_method: 'pickup' | 'shipping';
  courier_code: string | null;
  courier_service: string | null;
  tracking_number: string | null;
  weight_total: number | null;
  shipping_cost: number | null;
  insurance_cost: number | null;
  
  // Relations
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
  
  payment?: {
    payment_type: string | null;
    transaction_status: string | null;
  } | null;

  coupon?: {
    code: string;
    discount_percent: number;
  } | null;
}