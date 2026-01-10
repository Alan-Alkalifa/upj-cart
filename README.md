# Bemlanja

**Bemlanja** is a full-featured, multi-role e-commerce platform built with Next.js 16, React 19, and Supabase. It features a modern, responsive UI designed with Tailwind CSS and Shadcn UI, supporting three distinct user roles: **Customers**, **Merchants**, and **Admins**.

The platform is integrated with enterprise-grade tools for payments, shipping, and analytics, making it a production-ready solution for the Indonesian market.

## 🚀 Tech Stack

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/) (Radix UI)
- **Backend & Auth:** [Supabase](https://supabase.com/)
- **Payment Gateway:** [Midtrans](https://midtrans.com/) (Snap API)
- **Shipping Logistics:** [RajaOngkir / Komerce](https://komerce.id/)
- **Analytics:** [Google Analytics 4](https://developers.google.com/analytics/devguides/reporting/data/v1) (via Data API)
- **Form Handling:** React Hook Form + Zod
- **Package Manager:** [Bun](https://bun.sh/)

## ✨ Features

### 🛍️ Customer Storefront
- **Product Discovery:** Search, filter by price/category, and sort products.
- **Smart Logistics:** Real-time shipping cost calculation for major couriers (JNE, SiCepat, J&T, Anteraja, etc.) via RajaOngkir.
- **Secure Payments:** Seamless checkout experience using Midtrans Snap.
- **Shopping Cart:** Full cart management functionality.
- **Reviews:** Product review and rating system.
- **Chat:** Real-time chat with merchants.

### 🏪 Merchant Dashboard
- **Product Management:** Create, edit, and delete products with image uploads.
- **Order Management:** View and manage incoming orders.
- **Real-Time Analytics:** View traffic stats, page views, and top-performing pages powered by Google Analytics Data API.
- **Coupons:** Create and manage discount coupons.
- **Finance:** Track earnings and request withdrawals.
- **Customer Chat:** Respond to customer inquiries.

### 🛡️ Admin Dashboard
- **Platform Analytics:** Comprehensive overview of total users, merchants, and sales trends.
- **User Management:** Manage all platform users.
- **Merchant Management:** Oversee merchant accounts and approvals.
- **Finance:** Monitor platform-wide financial transactions and payouts.
- **Content Moderation:** Manage products and reviews if necessary.

### ⚙️ System & Automation
- **Automated Inventory Management:** Smart webhooks automatically restore product stock if an order is cancelled or expires.
- **Coupon Logic:** Automatically restores coupon usage quotas for cancelled transactions.
- **Security:** Signature verification for all payment webhooks (SHA512).

### 🔐 Authentication & Security
- **Supabase Auth:** Secure sign-up/login flows.
- **Role-Based Access Control (RBAC):** Middleware protection for Admin and Merchant routes.
- **Flows:** Forgot password, Email verification, and Profile management.

## 🛠️ Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed on your machine.
- A [Supabase](https://supabase.com/) project set up.
- A [Midtrans](https://midtrans.com/) Account (Server Key & Client Key).
- A [RajaOngkir/Komerce](https://komerce.id/) API Key.
- Google Analytics 4 Property & Service Account Credentials.

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/alan-alkalifa/upj-cart.git](https://github.com/alan-alkalifa/upj-cart.git)
   cd upj-cart