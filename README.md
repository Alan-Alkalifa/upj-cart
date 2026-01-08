# Bemlanja

**Bemlanja** is a full-featured, multi-role e-commerce platform built with Next.js 16, React 19, and Supabase. It features a modern, responsive UI designed with Tailwind CSS and Shadcn UI, supporting three distinct user roles: **Customers**, **Merchants**, and **Admins**.

## 🚀 Tech Stack

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/) (Radix UI)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Backend & Auth:** [Supabase](https://supabase.com/)
- **Form Handling:** React Hook Form + Zod
- **Charts:** Recharts
- **Package Manager:** [Bun](https://bun.sh/)

## ✨ Features

### 🛍️ Customer Storefront
- **Product Discovery:** Search, filter by price/category, and sort products.
- **Shopping Cart:** Full cart management functionality.
- **Reviews:** Product review and rating system.
- **Chat:** Real-time chat with merchants.
- **Merchant Profiles:** View specific merchant storefronts.

### 🏪 Merchant Dashboard
- **Product Management:** Create, edit, and delete products with image uploads.
- **Order Management:** View and manage incoming orders.
- **Coupons:** Create and manage discount coupons.
- **Finance:** Track earnings and request withdrawals.
- **Analytics:** View sales performance and trends.
- **Customer Chat:** Respond to customer inquiries.
- **Settings:** Manage shop profile and staff.

### 🛡️ Admin Dashboard
- **Platform Analytics:** Overview of total users, merchants, and sales.
- **User Management:** Manage all platform users.
- **Merchant Management:** Oversee merchant accounts and approvals.
- **Finance:** Monitor platform-wide financial transactions and payouts.
- **Content Moderation:** Manage products and reviews if necessary.

### 🔐 Authentication & Security
- **Supabase Auth:** Secure sign-up/login flows.
- **Role-Based Access Control (RBAC):** Middleware protection for Admin and Merchant routes.
- **Flows:** Forgot password, Email verification, and Profile management.

## 🛠️ Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed on your machine.
- A [Supabase](https://supabase.com/) project set up.

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/alan-alkalifa/upj-cart.git](https://github.com/alan-alkalifa/upj-cart.git)
   cd upj-cart