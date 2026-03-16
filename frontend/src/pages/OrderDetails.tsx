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
  ImageIcon,
  Plus,
  AlertCircle,
  Trash2,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { api, Order } from '../lib/api';
import { Breadcrumb } from '../components';
import { useAuth } from '../contexts/AuthContext';

export default function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markedDesigns, setMarkedDesigns] = useState<Set<string>>(new Set());
  const [designImages, setDesignImages] = useState<Record<string, string>>({});
  const [fulfilledSizes, setFulfilledSizes] = useState<Record<string, Set<string>>>({});
  const [substituteModal, setSubstituteModal] = useState<{ groupKey: string; designNumber: string; color: string; pendingSizes: { size: string; quantity: number }[]; originalDesign?: any } | null>(null);
  const [substituteNotes, setSubstituteNotes] = useState<Record<string, { designs: { designNo: string; color: string; sizes: { size: string; quantity: number }[] }[]; note: string }>>({});
  const [newSubNote, setNewSubNote] = useState('');
  const [availableDesigns, setAvailableDesigns] = useState<any[]>([]);
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<{ design: any; color: string; sizes: { size: string; quantity: number }[] }[]>([]);
  const [subFilterCategory, setSubFilterCategory] = useState<string>('');
  const [subFilterStyle, setSubFilterStyle] = useState<string>('');
  const [subFilterFabric, setSubFilterFabric] = useState<string>('');
  const [subFilterColor, setSubFilterColor] = useState<string>('');
  const [subFilterSearch, setSubFilterSearch] = useState<string>('');
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [subStyles, setSubStyles] = useState<any[]>([]);
  const [subFabrics, setSubFabrics] = useState<any[]>([]);
  const [subAdding, setSubAdding] = useState(false);
  const [subFiltersOpen, setSubFiltersOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { user } = useAuth();
  const canEdit = user?.role === 'admin';

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
      // Load per-size fulfillment
      const savedFulfillment = localStorage.getItem(`order_size_fulfillment_${orderId}`);
      if (savedFulfillment) {
        try {
          const parsed: Record<string, string[]> = JSON.parse(savedFulfillment);
          const converted: Record<string, Set<string>> = {};
          Object.entries(parsed).forEach(([k, v]) => { converted[k] = new Set(v); });
          setFulfilledSizes(converted);
        } catch {}
      }
      // Load substitute notes
      const savedSubs = localStorage.getItem(`order_substitutes_${orderId}`);
      if (savedSubs) {
        try { setSubstituteNotes(JSON.parse(savedSubs)); } catch {}
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

  const saveMarks = (newSet: Set<string>) => {
    if (orderId) localStorage.setItem(`order_marks_${orderId}`, JSON.stringify(Array.from(newSet)));
  };

  const saveFulfillment = (next: Record<string, Set<string>>) => {
    if (orderId) {
      const s: Record<string, string[]> = {};
      Object.entries(next).forEach(([k, v]) => { s[k] = Array.from(v); });
      localStorage.setItem(`order_size_fulfillment_${orderId}`, JSON.stringify(s));
    }
  };

  const toggleSizeFulfilled = (groupKey: string, size: string, allSizes: { size: string; quantity: number }[]) => {
    setFulfilledSizes(prev => {
      const groupSizes = new Set(prev[groupKey] || []);
      if (groupSizes.has(size)) groupSizes.delete(size);
      else groupSizes.add(size);
      const next = { ...prev, [groupKey]: groupSizes };
      saveFulfillment(next);
      // Auto-mark group complete when all sizes fulfilled
      const allFulfilled = allSizes.length > 0 && allSizes.every(sq => groupSizes.has(sq.size));
      setMarkedDesigns(prevMarks => {
        const newSet = new Set(prevMarks);
        if (allFulfilled) newSet.add(groupKey);
        else newSet.delete(groupKey);
        saveMarks(newSet);
        return newSet;
      });
      return next;
    });
  };

  const markAllSizesFulfilled = (groupKey: string, allSizes: { size: string; quantity: number }[]) => {
    setFulfilledSizes(prev => {
      const next = { ...prev, [groupKey]: new Set(allSizes.map(sq => sq.size)) };
      saveFulfillment(next);
      return next;
    });
    setMarkedDesigns(prev => {
      const newSet = new Set(prev);
      newSet.add(groupKey);
      saveMarks(newSet);
      return newSet;
    });
  };

  const unmarkDesign = (groupKey: string) => {
    setMarkedDesigns(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupKey);
      saveMarks(newSet);
      return newSet;
    });
    setFulfilledSizes(prev => {
      const next = { ...prev };
      delete next[groupKey];
      saveFulfillment(next);
      return next;
    });
  };

  const handleDeleteDesign = (group: ReturnType<typeof groupOrderItems>[0]) => {
    if (!orderId) return;
    setDeleteConfirm({
      title: 'Delete Design',
      message: `Remove "${group.design_number} · ${group.color}" (${group.totalQty} pcs) from this order? This cannot be undone.`,
      onConfirm: async () => {
        await Promise.all(group.items.map(item => api.deleteOrderItem(orderId, item.id)));
        await fetchOrderDetails();
      }
    });
  };

  const handleDeleteSize = (group: ReturnType<typeof groupOrderItems>[0], size: string) => {
    if (!orderId) return;
    const sizeEntry = group.allSizes.find(s => s.size === size);
    setDeleteConfirm({
      title: 'Delete Size',
      message: `Remove size "${size}" (qty: ${sizeEntry?.quantity ?? 0}) from ${group.design_number} · ${group.color}? This cannot be undone.`,
      onConfirm: async () => {
        for (const item of group.items) {
          if (!item.sizes_quantities) continue;
          const hasSize = item.sizes_quantities.some(sq => sq.size === size);
          if (!hasSize) continue;
          const newSizes = item.sizes_quantities.filter(sq => sq.size !== size);
          if (newSizes.length === 0) {
            await api.deleteOrderItem(orderId, item.id);
          } else {
            await api.updateOrderItemSizes(orderId, item.id, newSizes);
          }
        }
        await fetchOrderDetails();
      }
    });
  };

  const saveSubstituteNote = (groupKey: string) => {
    const configured = selectedSubstitutes.filter(s => s.color && s.sizes.some(sq => sq.quantity > 0));
    if (configured.length === 0) return;
    const notes = {
      ...substituteNotes,
      [groupKey]: {
        designs: configured.map(s => ({
          designNo: s.design.design_no || s.design.design_number,
          color: s.color,
          sizes: s.sizes.filter(sq => sq.quantity > 0)
        })),
        note: newSubNote.trim()
      }
    };
    setSubstituteNotes(notes);
    if (orderId) localStorage.setItem(`order_substitutes_${orderId}`, JSON.stringify(notes));
    setSubstituteModal(null);
    setNewSubNote('');
    setSelectedSubstitutes([]);
  };

  const removeSubstituteNote = (groupKey: string) => {
    const notes = { ...substituteNotes };
    delete notes[groupKey];
    setSubstituteNotes(notes);
    if (orderId) localStorage.setItem(`order_substitutes_${orderId}`, JSON.stringify(notes));
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
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-8">
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-600">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-8">
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-2 sm:pb-8">
      <Breadcrumb
        items={[
          { label: 'Orders', path: '/orders' },
          { label: 'Order Details' }
        ]}
      />
      {/* Header */}
      <div className="mb-6 -mt-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-gray-900">{order.order_number}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/orders')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>

            <button
              onClick={printOrderDetails}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Printer className="w-5 h-5" />
              <span>Print</span>
            </button>
          </div>
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
          <div className="text-sm text-right">
            <span className="text-gray-500">{groupOrderItems(order.order_items).length} designs</span>
            {markedDesigns.size > 0 && (
              <span className="ml-2 text-green-600 font-medium">{markedDesigns.size} completed</span>
            )}
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
                      
                      <div className="flex flex-col items-end gap-1.5">
                        {(() => {
                          const fulfilled = fulfilledSizes[groupKey] || new Set();
                          const fulfilledQty = group.allSizes.filter(sq => fulfilled.has(sq.size)).reduce((s, sq) => s + sq.quantity, 0);
                          if (fulfilledQty === 0 || group.allSizes.length === 0) return null;
                          const pct = Math.round((fulfilledQty / group.totalQty) * 100);
                          return (
                            <span className="text-xs font-medium text-green-600">{fulfilledQty}/{group.totalQty} pcs ({pct}%)</span>
                          );
                        })()}
                        <button
                          onClick={() => {
                            if (isMarked) {
                              unmarkDesign(groupKey);
                            } else {
                              markAllSizesFulfilled(groupKey, group.allSizes);
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
                            isMarked
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {isMarked ? (
                            <><Check className="w-5 h-5" />Completed</>
                          ) : (
                            <><X className="w-5 h-5" />Mark Complete</>
                          )}
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteDesign(group)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 text-xs font-medium transition-colors"
                            title="Delete this design from order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Design
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sizes and Quantities */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Sizes & Quantities
                        </h4>
                        {group.allSizes.length > 0 && (() => {
                          const fulfilled = fulfilledSizes[groupKey] || new Set();
                          const fulfilledCount = group.allSizes.filter(sq => fulfilled.has(sq.size)).length;
                          return (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              fulfilledCount === group.allSizes.length
                                ? 'bg-green-100 text-green-700'
                                : fulfilledCount > 0
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {fulfilledCount}/{group.allSizes.length} sizes
                            </span>
                          );
                        })()}
                      </div>
                      {group.allSizes.length > 0 ? (
                        <>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-3">
                            {group.allSizes.map((sq, idx) => {
                              const fulfilled = fulfilledSizes[groupKey] || new Set();
                              const isFulfilled = fulfilled.has(sq.size);
                              return (
                                <div key={idx} className="relative group/size">
                                  <button
                                    type="button"
                                    onClick={() => toggleSizeFulfilled(groupKey, sq.size, group.allSizes)}
                                    title={isFulfilled ? 'Click to mark as pending' : 'Click to mark as fulfilled'}
                                    className={`w-full relative rounded-lg p-3 text-center border-2 transition-all ${
                                      isFulfilled
                                        ? 'bg-green-50 border-green-400 shadow-sm'
                                        : 'bg-white border-gray-200 hover:border-primary hover:shadow-sm'
                                    }`}
                                  >
                                    {isFulfilled && (
                                      <Check className="w-3 h-3 text-green-500 absolute top-1 right-1" />
                                    )}
                                    <div className={`text-xs font-semibold uppercase mb-1 ${
                                      isFulfilled ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                      {sq.size}
                                    </div>
                                    <div className={`text-2xl font-bold ${
                                      isFulfilled ? 'text-green-700' : 'text-gray-900'
                                    }`}>
                                      {sq.quantity}
                                    </div>
                                  </button>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSize(group, sq.size)}
                                      title={`Delete size ${sq.size}`}
                                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover/size:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center shadow z-10"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Pending Summary + Substitute */}
                          {(() => {
                            const fulfilled = fulfilledSizes[groupKey] || new Set();
                            const pending = group.allSizes.filter(sq => !fulfilled.has(sq.size));
                            const sub = substituteNotes[groupKey];
                            if (pending.length === 0 && !sub) return null;
                            const pendingQty = pending.reduce((s, sq) => s + sq.quantity, 0);
                            return (
                              <div className="pt-3 border-t border-gray-200 space-y-2">
                                {pending.length > 0 && (
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                      <span>
                                        <span className="font-semibold">Pending:</span>{' '}
                                        {pending.map(sq => `${sq.size}(${sq.quantity})`).join(' · ')}{' '}
                                        <span className="text-amber-600">= {pendingQty} pcs</span>
                                      </span>
                                    </div>
                                    {!sub ? (
                                      <button
                                        onClick={async () => {
                                          try {
                                            const [designs, categories, styles, fabrics] = await Promise.all([
                                              api.getDesigns(),
                                              api.getDesignCategories(),
                                              api.getDesignStyles(),
                                              api.getFabricTypes()
                                            ]);
                                            const originalDesign = designs.find((d: any) =>
                                              (d.design_no || d.design_number) === group.design_number
                                            );
                                            setAvailableDesigns(designs);
                                            setSubCategories(categories || []);
                                            setSubStyles(styles || []);
                                            setSubFabrics(fabrics || []);
                                            setSubstituteModal({
                                              groupKey,
                                              designNumber: group.design_number,
                                              color: group.color,
                                              pendingSizes: pending,
                                              originalDesign
                                            });
                                            setSelectedSubstitutes([]);
                                            setSubFilterCategory(originalDesign?.category_id || '');
                                            setSubFilterStyle('');
                                            setSubFilterFabric('');
                                            setSubFilterColor('');
                                            setSubFilterSearch('');
                                            setNewSubNote('');
                                            setSubFiltersOpen(false);
                                          } catch (err) {
                                            console.error('Failed to fetch designs:', err);
                                          }
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-medium transition"
                                      >
                                        <Plus className="w-3 h-3" />
                                        Add Substitute
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => removeSubstituteNote(groupKey)}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition"
                                      >
                                        <X className="w-3 h-3" /> Clear
                                      </button>
                                    )}
                                  </div>
                                )}
                                {sub && (() => {
                                  // Normalize: support both old single-design and new multi-design format
                                  const subDesigns = (sub as any).designs ||
                                    ((sub as any).designNo ? [{ designNo: (sub as any).designNo, color: (sub as any).color, sizes: (sub as any).sizes || [] }] : []);
                                  return (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          const [designs, categories, styles, fabrics] = await Promise.all([
                                            api.getDesigns(),
                                            api.getDesignCategories(),
                                            api.getDesignStyles(),
                                            api.getFabricTypes()
                                          ]);
                                          const originalDesign = designs.find((d: any) =>
                                            (d.design_no || d.design_number) === group.design_number
                                          );
                                          setAvailableDesigns(designs);
                                          setSubCategories(categories || []);
                                          setSubStyles(styles || []);
                                          setSubFabrics(fabrics || []);
                                          setSubstituteModal({
                                            groupKey,
                                            designNumber: group.design_number,
                                            color: group.color,
                                            pendingSizes: pending,
                                            originalDesign
                                          });
                                          const preloaded = subDesigns.map((d: any) => ({
                                            design: designs.find((x: any) => (x.design_no || x.design_number) === d.designNo) || { design_no: d.designNo, design_colors: [] },
                                            color: d.color || '',
                                            sizes: d.sizes?.length ? d.sizes : pending.map((p: any) => ({ size: p.size, quantity: p.quantity }))
                                          }));
                                          setSelectedSubstitutes(preloaded);
                                          setSubFilterCategory(originalDesign?.category_id || '');
                                          setSubFilterStyle(''); setSubFilterFabric(''); setSubFilterColor(''); setSubFilterSearch('');
                                          setNewSubNote(sub.note || '');
                                          setSubFiltersOpen(false);
                                        } catch (err) {
                                          console.error('Failed to load substitute for editing:', err);
                                        }
                                      }}
                                      className="w-full flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 hover:bg-blue-100 transition text-left"
                                    >
                                      <Package className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <div className="font-semibold mb-1">Substitutes ({subDesigns.length})</div>
                                        {subDesigns.map((d: any, i: number) => (
                                          <div key={i} className="">
                                            <span className="font-medium">{d.designNo}</span>
                                            {d.color && <span> · {d.color}</span>}
                                            {d.sizes?.length > 0 && <span className="text-blue-600"> · {d.sizes.map((s: any) => `${s.size}(${s.quantity})`).join(' ')}</span>}
                                          </div>
                                        ))}
                                        {sub.note && <div className="mt-1 italic text-blue-500">{sub.note}</div>}
                                        <div className="mt-1 text-blue-400 text-[10px] uppercase font-semibold tracking-wide">Tap to edit</div>
                                      </div>
                                    </button>
                                  );
                                })()}
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-center">
                          <div className="text-yellow-800 font-semibold text-sm mb-1">No size/quantity data</div>
                          <div className="text-xs text-yellow-700">Edit the order to add size details.</div>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{deleteConfirm.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{deleteConfirm.message}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteConfirm.onConfirm();
                    setDeleteConfirm(null);
                  } catch (err) {
                    console.error('Delete failed:', err);
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting…</>
                ) : (
                  <><Trash2 className="w-4 h-4" />Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Substitute Design Modal */}
      {substituteModal && (() => {
        const orig = substituteModal.originalDesign;
        const defaultSizes = substituteModal.pendingSizes.map(p => ({ size: p.size, quantity: p.quantity }));

        // Build unique color list
        const allColors = Array.from(new Set(
          availableDesigns.flatMap(d => (d.design_colors || []).map((c: any) => c.color_name))
        )).sort();

        // Filter designs
        const hasActiveFilter = subFilterCategory || subFilterStyle || subFilterFabric || subFilterColor || subFilterSearch.trim();
        const filteredDesigns = availableDesigns.filter(d => {
          const dn = d.design_no || d.design_number;
          if (dn === substituteModal.designNumber) return false;
          if (subFilterSearch.trim() && !dn.toLowerCase().includes(subFilterSearch.toLowerCase()) &&
              !(d.name || '').toLowerCase().includes(subFilterSearch.toLowerCase())) return false;
          if (subFilterCategory && d.category_id !== subFilterCategory) return false;
          if (subFilterStyle && d.style_id !== subFilterStyle) return false;
          if (subFilterFabric && d.fabric_type_id !== subFilterFabric) return false;
          if (subFilterColor && !(d.design_colors || []).some((c: any) => c.color_name === subFilterColor)) return false;
          return true;
        });
        const displayDesigns = hasActiveFilter ? filteredDesigns : filteredDesigns.filter(d => {
          if (!orig) return true;
          return (orig.category_id && d.category_id === orig.category_id) ||
                 (orig.style_id && d.style_id === orig.style_id) ||
                 (orig.fabric_type_id && d.fabric_type_id === orig.fabric_type_id);
        });

        // Multi-select helpers
        const isDesignSelected = (dn: string) => selectedSubstitutes.some(s => (s.design.design_no || s.design.design_number) === dn);
        const toggleDesign = (design: any) => {
          const dn = design.design_no || design.design_number;
          if (isDesignSelected(dn)) {
            setSelectedSubstitutes(prev => prev.filter(s => (s.design.design_no || s.design.design_number) !== dn));
          } else {
            setSelectedSubstitutes(prev => [...prev, {
              design,
              color: subFilterColor || '',
              sizes: [...defaultSizes.map(s => ({ ...s }))]
            }]);
          }
        };
        const updateColor = (dn: string, color: string) =>
          setSelectedSubstitutes(prev => prev.map(s => (s.design.design_no || s.design.design_number) === dn ? { ...s, color } : s));
        const updateSize = (dn: string, idx: number, qty: number) =>
          setSelectedSubstitutes(prev => prev.map(s => {
            if ((s.design.design_no || s.design.design_number) !== dn) return s;
            const sizes = s.sizes.map((sq, i) => i === idx ? { ...sq, quantity: qty } : sq);
            return { ...s, sizes };
          }));

        const readyCount = selectedSubstitutes.filter(s => s.color && s.sizes.some(sq => sq.quantity > 0)).length;
        const clearFilters = () => { setSubFilterCategory(''); setSubFilterStyle(''); setSubFilterFabric(''); setSubFilterColor(''); setSubFilterSearch(''); };
        const activeFilterCount = [subFilterCategory, subFilterStyle, subFilterFabric, subFilterColor].filter(Boolean).length;

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSubstituteModal(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
              style={{ maxHeight: '94vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle (mobile) */}
              <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Add Substitutes</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    For <span className="font-semibold text-gray-700">{substituteModal.designNumber} · {substituteModal.color}</span>
                    <span className="mx-1 text-gray-300">·</span>
                    <span className="text-amber-600 font-medium">{substituteModal.pendingSizes.map(s => `${s.size}×${s.quantity}`).join(' ')}</span>
                  </p>
                </div>
                <button onClick={() => setSubstituteModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition mt-0.5 flex-shrink-0">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto flex-1">

                {/* ── Filter Section ── */}
                <div className="px-5 pt-4 pb-3 border-b border-gray-100 space-y-2.5">

                  {/* Filter toggle button */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSubFiltersOpen(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        subFiltersOpen
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : activeFilterCount > 0
                          ? 'border-primary/30 bg-primary/5 text-primary'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${subFiltersOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 font-medium transition">
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Collapsible filter panel */}
                  {subFiltersOpen && (
                    <div className="space-y-3">
                      {/* Search bar */}
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search design number or name…"
                          value={subFilterSearch}
                          onChange={e => setSubFilterSearch(e.target.value)}
                          className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
                        />
                        {subFilterSearch && (
                          <button onClick={() => setSubFilterSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown filters in two rows */}
                      <div className="space-y-2.5">
                        {/* Row 1: Category + Style */}
                        <div className="grid grid-cols-2 gap-3">
                          {subCategories.length > 0 && (
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                              <select
                                value={subFilterCategory}
                                onChange={e => setSubFilterCategory(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
                              >
                                <option value="">All Categories</option>
                                {subCategories.map((c: any) => (
                                  <option key={c.id} value={c.id}>{c.category_name || c.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {subStyles.length > 0 && (
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Style</label>
                              <select
                                value={subFilterStyle}
                                onChange={e => setSubFilterStyle(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
                              >
                                <option value="">All Styles</option>
                                {subStyles.map((s: any) => (
                                  <option key={s.id} value={s.id}>{s.style_name || s.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Row 2: Fabric + Color */}
                        <div className="grid grid-cols-2 gap-3">
                          {subFabrics.length > 0 && (
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fabric</label>
                              <select
                                value={subFilterFabric}
                                onChange={e => setSubFilterFabric(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
                              >
                                <option value="">All Fabrics</option>
                                {subFabrics.map((f: any) => (
                                  <option key={f.id} value={f.id}>{f.fabric_name || f.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {allColors.length > 0 && (
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Color</label>
                              <select
                                value={subFilterColor}
                                onChange={e => setSubFilterColor(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
                              >
                                <option value="">All Colors</option>
                                {allColors.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Clear filters button */}
                        {activeFilterCount > 0 && (
                          <div className="flex justify-end">
                            <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 font-medium transition">
                              Clear all filters
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Results count */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-xs text-gray-400">
                      {hasActiveFilter
                        ? <>{displayDesigns.length} result{displayDesigns.length !== 1 ? 's' : ''}</>
                        : <>Similar designs &middot; <button className="text-primary hover:underline font-medium" onClick={() => setSubFilterSearch(' ')}>Show all</button></>}
                    </span>
                    <span className="text-xs text-gray-300">{displayDesigns.length}</span>
                  </div>
                </div>

                {/* ── Design Grid ── */}
                <div className="px-5 py-4">
                  {displayDesigns.length === 0 ? (
                    <div className="text-center py-10">
                      <ImageIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No designs found</p>
                      <button onClick={clearFilters} className="mt-2 text-xs text-primary hover:underline">Clear filters</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                      {displayDesigns.slice(0, 20).map(design => {
                        const dn = design.design_no || design.design_number;
                        const sel = isDesignSelected(dn);
                        const colorMatch = subFilterColor ? (design.design_colors || []).find((c: any) => c.color_name === subFilterColor) : null;
                        const imgUrl = colorMatch?.image_urls?.[0] || design.design_colors?.[0]?.image_urls?.[0];
                        return (
                          <button
                            key={design.id}
                            type="button"
                            onClick={() => toggleDesign(design)}
                            className={`relative rounded-xl overflow-hidden border-2 transition-all text-left group ${
                              sel
                                ? 'border-primary shadow-md ring-1 ring-primary/20'
                                : 'border-gray-150 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="aspect-square bg-gray-100 overflow-hidden">
                              {imgUrl ? (
                                <img src={imgUrl} alt={dn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-300" />
                                </div>
                              )}
                            </div>
                            {/* Selection badge */}
                            {sel && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className="p-1.5">
                              <p className="text-[11px] font-bold text-gray-900 truncate leading-tight">{dn}</p>
                              {design.category && (
                                <p className="text-[10px] text-gray-400 truncate leading-tight">{design.category.category_name || design.category.name}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Selected Designs Configuration ── */}
                {selectedSubstitutes.length > 0 && (
                  <div className="px-5 pb-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs font-semibold text-gray-500 flex-shrink-0">Selected ({selectedSubstitutes.length})</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {selectedSubstitutes.map((sel, selIdx) => {
                      const dn = sel.design.design_no || sel.design.design_number;
                      const colors: any[] = sel.design.design_colors || [];
                      const imgUrl = sel.color
                        ? colors.find(c => c.color_name === sel.color)?.image_urls?.[0]
                        : colors[0]?.image_urls?.[0];
                      return (
                        <div key={dn} className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-3">
                          {/* Design header row */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                              {imgUrl ? (
                                <img src={imgUrl} alt={dn} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900">{dn}</p>
                              {sel.color
                                ? <p className="text-xs text-gray-500">{sel.color}</p>
                                : <p className="text-xs text-amber-600 font-medium">Select a color ↓</p>
                              }
                            </div>
                            <button
                              onClick={() => setSelectedSubstitutes(prev => prev.filter((_, i) => i !== selIdx))}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Color chips */}
                          {colors.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {colors.map((dc: any, ci: number) => (
                                <button
                                  key={ci}
                                  type="button"
                                  onClick={() => updateColor(dn, dc.color_name)}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                                    sel.color === dc.color_name
                                      ? 'border-primary bg-primary text-white shadow-sm'
                                      : 'border-gray-300 text-gray-600 hover:border-gray-400 bg-white'
                                  }`}
                                >
                                  {dc.image_urls?.[0] && (
                                    <img src={dc.image_urls[0]} alt="" className="w-3 h-3 rounded-full object-cover" />
                                  )}
                                  {dc.color_name}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Size inputs */}
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {sel.sizes.map((sq, si) => (
                              <div key={si} className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-center">
                                <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase">{sq.size}</div>
                                <input
                                  type="number"
                                  min="0"
                                  value={sq.quantity}
                                  onChange={e => updateSize(dn, si, parseInt(e.target.value) || 0)}
                                  className="w-full text-center text-sm font-semibold text-gray-900 border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary rounded"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Note */}
                    <div className="pt-1">
                      <input
                        type="text"
                        value={newSubNote}
                        onChange={e => setNewSubNote(e.target.value)}
                        placeholder="Add a note (optional)…"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-5 py-4 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setSubstituteModal(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  disabled={readyCount === 0 || subAdding}
                  onClick={async () => {
                    if (!orderId || readyCount === 0) return;
                    setSubAdding(true);
                    try {
                      const itemsToAdd = selectedSubstitutes
                        .filter(s => s.color && s.sizes.some(sq => sq.quantity > 0))
                        .map(s => ({
                          design_number: s.design.design_no || s.design.design_number,
                          color: s.color,
                          sizes_quantities: s.sizes.filter(sq => sq.quantity > 0)
                        }));
                      await api.addItemsToOrder(orderId, itemsToAdd);
                      saveSubstituteNote(substituteModal.groupKey);
                      await fetchOrderDetails();
                    } catch (err) {
                      console.error('Failed to add substitutes to order:', err);
                    } finally {
                      setSubAdding(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {subAdding ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Adding…</>
                  ) : readyCount === 0 ? (
                    'Select a design'
                  ) : (
                    <><Plus className="w-4 h-4" />Add {readyCount} design{readyCount > 1 ? 's' : ''} to Order</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
