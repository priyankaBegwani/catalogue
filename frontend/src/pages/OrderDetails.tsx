import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  Truck, 
  CheckCircle, 
  Printer,
  Check,
  X,
  ImageIcon
} from 'lucide-react';
import { api, Order } from '../lib/api';

export default function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markedDesigns, setMarkedDesigns] = useState<Set<string>>(new Set());
  const [designImages, setDesignImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const orders = await api.fetchOrders();
      const ordersData = Array.isArray(orders) ? orders : orders.orders || [];
      const foundOrder = ordersData.find((o: Order) => o.id === orderId);
      
      if (!foundOrder) {
        setError('Order not found');
        return;
      }
      
      setOrder(foundOrder);
      
      // Fetch design images for all designs in the order
      await fetchDesignImages(foundOrder);
      
      // Load marked designs from localStorage
      const savedMarks = localStorage.getItem(`order_marks_${orderId}`);
      if (savedMarks) {
        setMarkedDesigns(new Set(JSON.parse(savedMarks)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const fetchDesignImages = async (order: Order) => {
    try {
      const designs = await api.getDesigns();
      const imageMap: Record<string, string> = {};
      
      order.order_items.forEach(item => {
        const design = designs.find((d: any) => 
          (d.design_no || d.design_number) === item.design_number
        );
        
        if (design && design.design_colors && design.design_colors.length > 0) {
          // Find the matching color
          const colorMatch = design.design_colors.find((c: any) => 
            c.color_name === item.color
          );
          
          if (colorMatch && colorMatch.image_urls && colorMatch.image_urls.length > 0) {
            imageMap[`${item.design_number}_${item.color}`] = colorMatch.image_urls[0];
          } else if (design.design_colors[0].image_urls && design.design_colors[0].image_urls.length > 0) {
            // Fallback to first color's first image
            imageMap[`${item.design_number}_${item.color}`] = design.design_colors[0].image_urls[0];
          }
        }
      });
      
      setDesignImages(imageMap);
    } catch (err) {
      console.error('Failed to fetch design images:', err);
    }
  };

  // Group order items by design number and color
  const groupOrderItems = (items: Order['order_items']) => {
    const grouped: Record<string, {
      design_number: string;
      color: string;
      items: Order['order_items'];
      totalQty: number;
      allSizes: { size: string; quantity: number }[];
    }> = {};

    items.forEach(item => {
      const key = `${item.design_number}_${item.color}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          design_number: item.design_number,
          color: item.color,
          items: [],
          totalQty: 0,
          allSizes: []
        };
      }
      
      grouped[key].items.push(item);
      
      // Aggregate sizes and quantities
      if (item.sizes_quantities && Array.isArray(item.sizes_quantities) && item.sizes_quantities.length > 0) {
        item.sizes_quantities.forEach(sq => {
          const existingSize = grouped[key].allSizes.find(s => s.size === sq.size);
          if (existingSize) {
            existingSize.quantity += sq.quantity;
          } else {
            grouped[key].allSizes.push({ size: sq.size, quantity: sq.quantity });
          }
          grouped[key].totalQty += sq.quantity;
        });
      }
    });

    // Sort sizes in logical order
    Object.values(grouped).forEach(group => {
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', 'FREE'];
      group.allSizes.sort((a, b) => {
        const aIndex = sizeOrder.indexOf(a.size.toUpperCase());
        const bIndex = sizeOrder.indexOf(b.size.toUpperCase());
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        return a.size.localeCompare(b.size);
      });
    });

    return Object.values(grouped);
  };

  const toggleMarkDesign = (itemId: string) => {
    setMarkedDesigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      
      // Save to localStorage
      if (orderId) {
        localStorage.setItem(`order_marks_${orderId}`, JSON.stringify(Array.from(newSet)));
      }
      
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const printOrderDetails = () => {
    if (!order) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order ${order.order_number} - Details</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .order-info { margin-bottom: 30px; }
            .order-info table { width: 100%; border-collapse: collapse; }
            .order-info td { padding: 10px; border: 1px solid #ddd; }
            .order-info td:first-child { font-weight: bold; background: #f5f5f5; width: 30%; }
            .items-section { margin-top: 30px; }
            .item-card { border: 2px solid #333; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; }
            .item-header { background: #333; color: white; padding: 10px; margin: -15px -15px 15px -15px; font-size: 18px; font-weight: bold; }
            .sizes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-top: 10px; }
            .size-box { border: 1px solid #333; padding: 8px; text-align: center; }
            .size-label { font-weight: bold; font-size: 14px; }
            .size-qty { font-size: 20px; color: #0066cc; }
            .marked { background: #d4edda; border-color: #28a745; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ORDER DETAILS</h1>
            <h2>${order.order_number}</h2>
          </div>
          
          <div class="order-info">
            <table>
              <tr><td>Party Name</td><td>${order.party_name}</td></tr>
              <tr><td>Order Date</td><td>${formatDate(order.date_of_order)}</td></tr>
              ${order.expected_delivery_date ? `<tr><td>Expected Delivery</td><td>${formatDate(order.expected_delivery_date)}</td></tr>` : ''}
              ${order.transport ? `<tr><td>Transport</td><td>${order.transport}</td></tr>` : ''}
              <tr><td>Status</td><td style="text-transform: uppercase;">${order.status}</td></tr>
              ${order.remarks ? `<tr><td>Remarks</td><td>${order.remarks}</td></tr>` : ''}
            </table>
          </div>

          <div class="items-section">
            <h3>Design Items</h3>
            ${order.order_items.map(item => {
              const totalQty = item.sizes_quantities?.reduce((sum, sq) => sum + sq.quantity, 0) || 0;
              const isMarked = markedDesigns.has(item.id);
              return `
                <div class="item-card ${isMarked ? 'marked' : ''}">
                  <div class="item-header">
                    ${item.design_number} - ${item.color} ${isMarked ? '✓ MARKED' : ''}
                  </div>
                  <div>
                    <p><strong>Total Quantity:</strong> ${totalQty} pieces</p>
                    <div class="sizes-grid">
                      ${item.sizes_quantities?.map(sq => `
                        <div class="size-box">
                          <div class="size-label">${sq.size}</div>
                          <div class="size-qty">${sq.quantity}</div>
                        </div>
                      `).join('') || '<p>No sizes specified</p>'}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${order.order_remarks && order.order_remarks.length > 0 ? `
            <div class="items-section">
              <h3>Order Remarks</h3>
              <ul>
                ${order.order_remarks.map(remark => `<li>${remark.remark}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="footer">
            <p>Printed on ${new Date().toLocaleString()}</p>
          </div>

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #333; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Print</button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 10px;">Close</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-600">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error || 'Order not found'}</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 text-red-800 hover:text-red-900 font-medium"
          >
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Orders
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{order.order_number}</h1>
            <p className="mt-1 text-gray-600">Order Details</p>
          </div>
          
          <button
            onClick={printOrderDetails}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Printer className="w-5 h-5 mr-2" />
            Print Details
          </button>
        </div>
      </div>

      {/* Order Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Order Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Party Name</p>
              <p className="font-semibold text-gray-900">{order.party_name}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Order Date</p>
              <p className="font-semibold text-gray-900">{formatDate(order.date_of_order)}</p>
            </div>
          </div>
          
          {order.expected_delivery_date && (
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Expected Delivery</p>
                <p className="font-semibold text-gray-900">{formatDate(order.expected_delivery_date)}</p>
              </div>
            </div>
          )}
          
          {order.transport && (
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Transport</p>
                <p className="font-semibold text-gray-900">{order.transport}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                {order.status.toUpperCase()}
              </span>
            </div>
          </div>
          
          {order.remarks && (
            <div className="flex items-start gap-3 md:col-span-2">
              <div>
                <p className="text-sm text-gray-600">Remarks</p>
                <p className="text-gray-900">{order.remarks}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Design Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Design Items</h2>
          <div className="text-sm text-gray-600">
            Total Items: {order.order_items.length} | Marked: {markedDesigns.size} of {groupOrderItems(order.order_items).length}
          </div>
        </div>

        {order.order_items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No design items in this order
          </div>
        ) : (
          <div className="space-y-6">
            {groupOrderItems(order.order_items).map((group) => {
            const groupKey = `${group.design_number}_${group.color}`;
            const imageUrl = designImages[groupKey];
            const isMarked = markedDesigns.has(groupKey);

            return (
              <div
                key={groupKey}
                className={`border-2 rounded-lg p-4 sm:p-6 transition-all ${
                  isMarked 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                  {/* Design Image */}
                  <div className="flex-shrink-0">
                    <div className="w-full lg:w-56 h-56 bg-gray-100 rounded-lg overflow-hidden shadow-md">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`${group.design_number} - ${group.color}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon className="w-16 h-16 mb-2" />
                          <span className="text-sm">No image</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Design Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{group.design_number}</h3>
                        <p className="text-lg text-gray-600 mt-1">{group.color}</p>
                        <div className="mt-2 inline-block bg-primary bg-opacity-10 px-3 py-1 rounded-full">
                          <p className="text-sm font-semibold text-primary">Total: {group.totalQty} pieces</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleMarkDesign(groupKey)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
                          isMarked
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {isMarked ? (
                          <>
                            <Check className="w-5 h-5" />
                            Completed
                          </>
                        ) : (
                          <>
                            <X className="w-5 h-5" />
                            Mark Complete
                          </>
                        )}
                      </button>
                    </div>

                    {/* Sizes and Quantities */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wide flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Sizes & Quantities to Fulfill
                      </h4>
                      {group.allSizes.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {group.allSizes.map((sq, idx) => (
                            <div
                              key={idx}
                              className="bg-white border-3 border-gray-400 rounded-xl p-4 text-center shadow-md hover:shadow-lg hover:border-primary transition-all"
                            >
                              <div className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 bg-gray-100 py-1 px-2 rounded">
                                SIZE {sq.size}
                              </div>
                              <div className="text-5xl font-extrabold text-primary my-2">{sq.quantity}</div>
                              <div className="text-sm font-semibold text-gray-600 uppercase">Pieces</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
                          <div className="text-yellow-800 font-semibold mb-2">
                            ⚠️ No size/quantity data available for this design
                          </div>
                          <div className="text-sm text-yellow-700">
                            This order was created without size and quantity information. Please edit the order to add size details.
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              </div>
               </div>
            );
          })}
         </div>
        )}
      </div>

      {/* Order Remarks */}
      {order.order_remarks && order.order_remarks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Remarks</h2>
          <ul className="space-y-2">
            {order.order_remarks.map((remark, idx) => (
              <li key={remark.id} className="flex items-start gap-2">
                <span className="text-gray-400">{idx + 1}.</span>
                <span className="text-gray-700">{remark.remark}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
