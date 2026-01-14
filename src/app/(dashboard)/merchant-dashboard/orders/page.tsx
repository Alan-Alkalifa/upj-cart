// src/app/(merchant)/dashboard/orders/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client' // Adjust to your client creation
import { OrderDetail } from './types'
import { updateOrderStatus } from './actions'
import { format } from 'date-fns' // You likely need date-fns or moment

// Icons (using Lucide-React, standard in Next.js)
import { Eye, Truck, CheckCircle, AlertCircle, Package } from 'lucide-react'

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<OrderDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [trackingInput, setTrackingInput] = useState('')
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // NOTE: In a real app, you get this from your Auth Context or URL params
  const MERCHANT_ORG_ID = 'your-org-uuid-here' 

  const supabase = createClient()

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, status, total_amount, 
        courier_code, courier_service, tracking_number,
        buyer:profiles(full_name, email, phone, avatar_url),
        shipping_address:user_addresses(recipient_name, phone, street_address, city_name, province_name, postal_code),
        items:order_items(
          id, quantity, price_at_purchase,
          variant:product_variants(
            name,
            product:products(name, image_url)
          )
        )
      `)
      .eq('organization_id', MERCHANT_ORG_ID)
      .order('created_at', { ascending: false })

    if (!error && data) {
      // Cast data to our Type (Supabase types can be loose with deep joins)
      setOrders(data as unknown as OrderDetail[])
    }
    setLoading(false)
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedOrder) return
    
    // Optimistic UI Update (optional, but good UX)
    const result = await updateOrderStatus(selectedOrder.id, newStatus, trackingInput)
    
    if (result.success) {
      alert('Order updated!')
      setIsDetailOpen(false)
      fetchOrders() // Refresh list
    } else {
      alert('Failed to update')
    }
  }

  // Helper for Status Badge Color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-blue-100 text-blue-800'
      case 'processed': return 'bg-yellow-100 text-yellow-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Incoming Orders</h1>

      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(order.created_at), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.buyer?.full_name || 'Guest'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rp {order.total_amount.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedOrder(order)
                        setTrackingInput(order.tracking_number || '')
                        setIsDetailOpen(true)
                      }}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                    >
                      <Eye size={16} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- ORDER DETAIL MODAL --- */}
      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                Order Details #{selectedOrder.id.slice(0, 8)}
              </h3>
              <button onClick={() => setIsDetailOpen(false)} className="text-gray-400 hover:text-gray-500">
                ✕
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Col: Customer Info */}
              <div>
                <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <Package size={18} /> Shipping Info
                </h4>
                <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-900">{selectedOrder.shipping_address?.recipient_name}</p>
                  <p>{selectedOrder.shipping_address?.phone}</p>
                  <p>{selectedOrder.shipping_address?.street_address}</p>
                  <p>{selectedOrder.shipping_address?.city_name}, {selectedOrder.shipping_address?.province_name} {selectedOrder.shipping_address?.postal_code}</p>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p><strong>Courier:</strong> {selectedOrder.courier_code?.toUpperCase()} - {selectedOrder.courier_service}</p>
                    {selectedOrder.tracking_number && (
                      <p className="text-blue-600"><strong>Resi:</strong> {selectedOrder.tracking_number}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Col: Actions */}
              <div>
                <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <AlertCircle size={18} /> Manage Order
                </h4>
                <div className="bg-gray-50 p-3 rounded space-y-3">
                  <p className="text-sm">Current Status: <strong>{selectedOrder.status.toUpperCase()}</strong></p>
                  
                  {/* Action Buttons Logic */}
                  {selectedOrder.status === 'paid' && (
                    <button 
                      onClick={() => handleStatusUpdate('processed')}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded text-sm font-medium"
                    >
                      Process Order
                    </button>
                  )}

                  {selectedOrder.status === 'processed' && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">Enter Resi / Tracking Number</label>
                      <input 
                        type="text" 
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        placeholder="e.g. JP12345678"
                        className="w-full border rounded p-2 text-sm"
                      />
                      <button 
                        onClick={() => handleStatusUpdate('shipped')}
                        disabled={!trackingInput}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded text-sm font-medium flex justify-center items-center gap-2"
                      >
                        <Truck size={16} /> Ship Order
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === 'shipped' && (
                    <div className="text-center text-green-600 text-sm font-medium flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Order Shipped
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product List */}
            <div className="px-6 pb-6">
              <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Items Ordered</h4>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {/* Optional Image */}
                      {item.variant?.product?.image_url && (
                        <img 
                          src={item.variant.product.image_url} 
                          alt={item.variant.product.name} 
                          className="w-12 h-12 object-cover rounded border"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.variant?.product?.name}</p>
                        <p className="text-xs text-gray-500">Variant: {item.variant?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">x{item.quantity}</p>
                      <p className="text-sm text-gray-600">Rp {item.price_at_purchase.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="font-bold text-gray-900">Total Amount</span>
                <span className="font-bold text-xl text-blue-600">Rp {selectedOrder.total_amount.toLocaleString('id-ID')}</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}