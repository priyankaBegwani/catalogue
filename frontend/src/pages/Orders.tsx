import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  Calendar, 
  Truck, 
  FileText, 
  ChevronDown,
  CheckCircle,
  Printer,
  Filter,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api, Order, CreateOrderData, Party, DesignColor } from '../lib/api';

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(10);
  const [columnFilters, setColumnFilters] = useState({
    orderNumber: '',
    partyName: '',
    designNumber: '',
    orderDateFrom: '',
    orderDateTo: '',
    transport: '',
    status: '',
  });
  const [columnFilterVisible, setColumnFilterVisible] = useState({
    orderNumber: false,
    partyName: false,
    designNumber: false,
    dates: false,
    transport: false,
    status: false,
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeDesignPopover, setActiveDesignPopover] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Data states
  const [parties, setParties] = useState<Party[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [transportOptions, setTransportOptions] = useState<any[]>([]);
  const [partiesError, setPartiesError] = useState('');
  const [designsError, setDesignsError] = useState('');
  const [transportError, setTransportError] = useState('');

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const [formData, setFormData] = useState({
    party_name: '',
    date_of_order: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    transport: '',
    remarks: '',
    status: 'pending',
    order_items: [
      { design_number: '', color: '', sizes_quantities: [] as { size: string; quantity: number }[] }
    ],
    order_remarks: [''] as string[]
  });

  // Data fetching functions
  const refreshParties = async () => {
    try {
      const data = await api.fetchParties();
      setParties(data.parties);
      setPartiesError('');
    } catch (err) {
      setPartiesError(err instanceof Error ? err.message : 'Failed to fetch parties');
    }
  };
  
  const refreshDesigns = async () => {
    try {
      const data = await api.getDesigns(undefined, undefined, true); // Only fetch active designs
      const normalizedDesigns = data.map((design: any) => {
        const designNumber = design.design_number ?? design.design_no ?? design.designNo ?? '';
        const normalizedColors = (design.design_colors ?? design.colors ?? []).map((color: any) => ({
          ...color,
          color_name: color.color_name ?? color.colorName ?? color.name ?? '',
        }));
        return {
          ...design,
          design_number: designNumber,
          name: design.name ?? designNumber,
          design_colors: normalizedColors,
        };
      });
      setDesigns(normalizedDesigns);
      setDesignsError('');
    } catch (err) {
      setDesignsError(err instanceof Error ? err.message : 'Failed to fetch designs');
    }
  };
  
  const refreshTransport = async () => {
    try {
      const data = await api.getTransportOptions();
      setTransportOptions(data);
      setTransportError('');
    } catch (err) {
      setTransportError(err instanceof Error ? err.message : 'Failed to fetch transport options');
    }
  };

  // Standard apparel sizes
  const commonSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

  const fetchOrders = async () => {
   try{
      setLoading(true);
      const data = await api.fetchOrders();
      const ordersData = Array.isArray(data) ? data : data.orders || [];
      setOrders(ordersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
   fetchOrders();
   refreshParties();
   refreshDesigns();
   refreshTransport();
  }, []);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  // Set errors from data context
  useEffect(() => {
    if (partiesError) setError(partiesError);
    if (designsError) setError(designsError);
    if (transportError) setError(transportError);
  }, [partiesError, designsError, transportError]);
  
  const getAvailableColors = (designNumber: string) => {
    const design = designs.find((d) => d.design_number === designNumber);
    return design ? design.design_colors ?? [] : [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Either design items OR order remarks must be provided
    const hasValidDesignItems = formData.order_items.some(item => 
      item.design_number && 
      item.color && 
      item.sizes_quantities && 
      item.sizes_quantities.length > 0 &&
      item.sizes_quantities.some(sq => sq.quantity > 0)
    );
    
    const hasValidOrderRemarks = formData.order_remarks.some(remark => 
      remark && remark.trim().length > 0
    );
    
    if (!hasValidDesignItems && !hasValidOrderRemarks) {
      setError('Please add either design items or order remarks (or both)');
      return;
    }
    
    setLoading(true);

    try {
      const orderData: CreateOrderData = {
        party_name: formData.party_name,
        date_of_order: formData.date_of_order,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        transport: formData.transport,
        remarks: formData.remarks,
        status: formData.status,
        order_items: formData.order_items,
        order_remarks: formData.order_remarks
      };

      if (editingOrder) {
        await api.updateOrder(editingOrder.id, orderData);
      } else {
        await api.createOrder(orderData);
      }

      resetForm();
      fetchOrders();
      
      // Refresh parties if a new custom party was added
      if (!editingOrder && !parties.find(p => p.name === formData.party_name)) {
        refreshParties();
      }
      refreshTransport(); // Refresh transport options
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingOrder ? 'update' : 'create'} order`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      party_name: order.party_name,
      date_of_order: order.date_of_order,
      expected_delivery_date: order.expected_delivery_date || '',
      transport: order.transport,
      remarks: order.remarks,
      status: order.status,
      order_items: order.order_items.length > 0 ? order.order_items.map(item => ({
        design_number: item.design_number,
        color: item.color,
        sizes_quantities: item.sizes_quantities
      })) : [
        { design_number: '', color: '', sizes_quantities: [] }
      ],
      order_remarks: order.order_remarks?.map(r => r.remark) || []
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to delete order "${orderNumber}"?`)) return;

    try {
      await api.deleteOrder(id);
      fetchOrders();
      refreshParties(); // Refresh in case party was updated
      refreshTransport(); // Refresh transport options
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete order');
    }
  };

  const handleCompleteOrder = async (order: Order) => {
    if (!confirm(`Mark order "${order.order_number}" as completed?`)) return;

    try {
      await api.completeOrder(order);
      fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete order');
    }
  };
  const resetForm = () => {
    setFormData({
      party_name: '',
      date_of_order: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      transport: '',
      remarks: '',
      status: 'pending',
      order_items: [
        { design_number: '', color: '', sizes_quantities: [] }
      ],
      order_remarks: ['']
    });
    setShowCreateForm(false);
    setEditingOrder(null);
    setError('');
  };

  const addOrderItem = () => {
    setFormData(prev => ({
      ...prev,
      order_items: [...prev.order_items, { design_number: '', color: '', sizes_quantities: [] }]
    }));
  };

  const removeOrderItem = (index: number) => {
    if (formData.order_items.length > 1) {
      setFormData(prev => ({
        ...prev,
        order_items: prev.order_items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOrderItem = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      order_items: prev.order_items.map((item, i) => {
        if (i !== index) return item;
        if (field === 'design_number') {
          return {
            ...item,
            design_number: value as string,
            color: '',
            sizes_quantities: [],
          };
        }
        return { ...item, [field]: value };
      })
    }));
  };

  const updateOrderItemSizeQuantity = (itemIndex: number, size: string, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      order_items: prev.order_items.map((item, i) => {
        if (i !== itemIndex) return item;
        
        const existingSizes = item.sizes_quantities || [];
        const sizeIndex = existingSizes.findIndex(sq => sq.size === size);
        
        if (quantity > 0) {
          // Add or update size quantity
          if (sizeIndex >= 0) {
            existingSizes[sizeIndex].quantity = quantity;
          } else {
            existingSizes.push({ size, quantity });
          }
        } else {
          // Remove size if quantity is 0
          if (sizeIndex >= 0) {
            existingSizes.splice(sizeIndex, 1);
          }
        }
        
        return { ...item, sizes_quantities: existingSizes };
      })
    }));
  };

  const getSizeQuantity = (itemIndex: number, size: string): number => {
    const item = formData.order_items[itemIndex];
    const sizeQuantity = item.sizes_quantities?.find(sq => sq.size === size);
    return sizeQuantity?.quantity || 0;
  };

  const addOrderRemark = () => {
    setFormData(prev => ({
      ...prev,
      order_remarks: [...prev.order_remarks, '']
    }));
  };

  const updateOrderRemark = (remarkIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      order_remarks: prev.order_remarks.map((remark, i) => 
        i === remarkIndex ? value : remark
      )
    }));
  };

  const removeOrderRemark = (remarkIndex: number) => {
    setFormData(prev => ({
      ...prev,
      order_remarks: prev.order_remarks.filter((_, i) => i !== remarkIndex)
    }));
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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDesignTooltip = (order: Order, designNumber: string) => {
    const itemsForDesign = (order.order_items || []).filter(item => item.design_number === designNumber);
    if (itemsForDesign.length === 0) return '';

    const byColor: Record<string, { size: string; quantity: number }[]> = {};
    itemsForDesign.forEach(item => {
      const colorKey = item.color || 'No color';
      if (!byColor[colorKey]) {
        byColor[colorKey] = [];
      }
      (item.sizes_quantities || []).forEach(sq => {
        if (sq.quantity > 0) {
          byColor[colorKey].push({ size: sq.size, quantity: sq.quantity });
        }
      });
    });

    const parts: string[] = [];
    Object.entries(byColor).forEach(([color, sizes]) => {
      if (sizes.length === 0) return;
      const sizeText = sizes.map(s => `${s.size}×${s.quantity}`).join(', ');
      parts.push(`${color}: ${sizeText}`);
    });

    return parts.join(' | ');
  };

  const filteredOrders = orders.filter(order => {
    const orderNumberMatch = !columnFilters.orderNumber ||
      order.order_number.toLowerCase().includes(columnFilters.orderNumber.toLowerCase());

    const partyNameMatch = !columnFilters.partyName ||
      order.party_name.toLowerCase().includes(columnFilters.partyName.toLowerCase());

    const designNumberMatch = !columnFilters.designNumber ||
      (order.order_items || []).some(item =>
        item.design_number.toLowerCase().includes(columnFilters.designNumber.toLowerCase())
      );

    const orderDate = new Date(order.date_of_order);
    const fromMatch = !columnFilters.orderDateFrom ||
      orderDate >= new Date(columnFilters.orderDateFrom);
    const toMatch = !columnFilters.orderDateTo ||
      orderDate <= new Date(columnFilters.orderDateTo);

    const transportMatch = !columnFilters.transport ||
      order.transport === columnFilters.transport;

    const statusMatch = !columnFilters.status ||
      order.status === columnFilters.status;

    return (
      orderNumberMatch &&
      partyNameMatch &&
      designNumberMatch &&
      fromMatch &&
      toMatch &&
      transportMatch &&
      statusMatch
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  // Print functions
  const printOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .order-info { margin-bottom: 20px; }
            .order-info table { width: 100%; border-collapse: collapse; }
            .order-info td { padding: 8px; border: 1px solid #ddd; }
            .order-info td:first-child { font-weight: bold; background: #f5f5f5; width: 30%; }
            .items-section { margin-top: 30px; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items-table th, .items-table td { border: 1px solid #333; padding: 10px; text-align: left; }
            .items-table th { background: #333; color: white; }
            .size-badge { display: inline-block; background: #e8f5e9; border: 1px solid #4caf50; padding: 3px 8px; margin: 2px; border-radius: 3px; font-size: 12px; }
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
            <table class="items-table">
              <thead>
                <tr>
                  <th>Design Number</th>
                  <th>Color</th>
                  <th>Sizes & Quantities</th>
                  <th>Total Qty</th>
                </tr>
              </thead>
              <tbody>
                ${order.order_items.map(item => {
                  const totalQty = item.sizes_quantities?.reduce((sum, sq) => sum + sq.quantity, 0) || 0;
                  return `
                    <tr>
                      <td><strong>${item.design_number}</strong></td>
                      <td>${item.color}</td>
                      <td>
                        ${item.sizes_quantities?.map(sq => `<span class="size-badge">${sq.size} × ${sq.quantity}</span>`).join(' ') || 'No sizes'}
                      </td>
                      <td><strong>${totalQty}</strong></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
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

  const printAllOrders = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Orders (Page ${currentPage} of ${totalPages})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .order-card { page-break-inside: avoid; margin-bottom: 30px; border: 2px solid #333; padding: 15px; }
            .order-header { background: #333; color: white; padding: 10px; margin: -15px -15px 15px -15px; }
            .order-info { margin-bottom: 15px; }
            .order-info table { width: 100%; border-collapse: collapse; }
            .order-info td { padding: 5px; border: 1px solid #ddd; font-size: 12px; }
            .order-info td:first-child { font-weight: bold; background: #f5f5f5; width: 25%; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            .items-table th, .items-table td { border: 1px solid #333; padding: 8px; text-align: left; }
            .items-table th { background: #666; color: white; }
            .size-badge { display: inline-block; background: #e8f5e9; border: 1px solid #4caf50; padding: 2px 6px; margin: 1px; border-radius: 3px; font-size: 10px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ORDERS LIST</h1>
            <p>Page ${currentPage} of ${totalPages} (${ordersPerPage} orders per page)</p>
            <p>Total Orders: ${filteredOrders.length}</p>
          </div>
          
          ${currentOrders.map(order => `
            <div class="order-card">
              <div class="order-header">
                <h2 style="margin: 0;">${order.order_number}</h2>
              </div>
              
              <div class="order-info">
                <table>
                  <tr><td>Party Name</td><td>${order.party_name}</td></tr>
                  <tr><td>Order Date</td><td>${formatDate(order.date_of_order)}</td></tr>
                  ${order.expected_delivery_date ? `<tr><td>Expected Delivery</td><td>${formatDate(order.expected_delivery_date)}</td></tr>` : ''}
                  ${order.transport ? `<tr><td>Transport</td><td>${order.transport}</td></tr>` : ''}
                  <tr><td>Status</td><td style="text-transform: uppercase;">${order.status}</td></tr>
                </table>
              </div>

              <div>
                <strong>Design Items:</strong>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Design</th>
                      <th>Color</th>
                      <th>Sizes & Quantities</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${order.order_items.map(item => {
                      const totalQty = item.sizes_quantities?.reduce((sum, sq) => sum + sq.quantity, 0) || 0;
                      return `
                        <tr>
                          <td><strong>${item.design_number}</strong></td>
                          <td>${item.color}</td>
                          <td>
                            ${item.sizes_quantities?.map(sq => `<span class="size-badge">${sq.size} × ${sq.quantity}</span>`).join(' ') || 'No sizes'}
                          </td>
                          <td><strong>${totalQty}</strong></td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}

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

  const exportToExcel = (ordersToExport: Order[], filename: string) => {
    // Flatten orders data for Excel with one row per design item
    const excelData: any[] = [];
    
    ordersToExport.forEach(order => {
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach(item => {
          // Create a row for each size in the item
          if (item.sizes_quantities && item.sizes_quantities.length > 0) {
            item.sizes_quantities.forEach(sq => {
              excelData.push({
                'Order Number': order.order_number,
                'Party Name': order.party_name,
                'Order Date': formatDate(order.date_of_order),
                'Expected Delivery': order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '',
                'Transport': order.transport || '',
                'Status': order.status.toUpperCase(),
                'Design Number': item.design_number,
                'Color': item.color,
                'Size': sq.size,
                'Quantity': sq.quantity,
                'Remarks': order.remarks || ''
              });
            });
          } else {
            // If no sizes, still show the design item
            excelData.push({
              'Order Number': order.order_number,
              'Party Name': order.party_name,
              'Order Date': formatDate(order.date_of_order),
              'Expected Delivery': order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '',
              'Transport': order.transport || '',
              'Status': order.status.toUpperCase(),
              'Design Number': item.design_number,
              'Color': item.color,
              'Size': '',
              'Quantity': '',
              'Remarks': order.remarks || ''
            });
          }
        });
      } else {
        // Orders without design items
        excelData.push({
          'Order Number': order.order_number,
          'Party Name': order.party_name,
          'Order Date': formatDate(order.date_of_order),
          'Expected Delivery': order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '',
          'Transport': order.transport || '',
          'Status': order.status.toUpperCase(),
          'Design Number': '',
          'Color': '',
          'Size': '',
          'Quantity': '',
          'Remarks': order.remarks || ''
        });
      }
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths for better readability
    const columnWidths = [
      { wch: 15 }, // Order Number
      { wch: 20 }, // Party Name
      { wch: 12 }, // Order Date
      { wch: 15 }, // Expected Delivery
      { wch: 15 }, // Transport
      { wch: 12 }, // Status
      { wch: 15 }, // Design Number
      { wch: 15 }, // Color
      { wch: 8 },  // Size
      { wch: 10 }, // Quantity
      { wch: 30 }  // Remarks
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    // Generate and download file
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportAll = () => {
    exportToExcel(orders, 'all_orders');
    setShowExportMenu(false);
  };

  const handleExportFiltered = () => {
    exportToExcel(filteredOrders, 'filtered_orders');
    setShowExportMenu(false);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-600">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-gray-600">Manage and track all orders with multiple design items</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
        >
          <Plus className="mr-2 h-5 w-5" />
          New Order
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => setError('')}
            className="text-red-800 hover:text-red-900 text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Print and Pagination Controls */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button 
              onClick={printAllOrders}
              className="flex items-center rounded-lg bg-green-600 text-white px-4 py-2 transition-colors duration-200 hover:bg-green-700"
            >
              <Printer className="mr-2 h-5 w-5" />
              Print Page
            </button>
            
            {/* Export Orders Dropdown */}
            <div className="relative export-menu-container">
              <button 
                onClick={() => setShowExportMenu(prev => !prev)}
                className="flex items-center rounded-lg bg-blue-600 text-white px-4 py-2 transition-colors duration-200 hover:bg-blue-700"
              >
                <Download className="mr-2 h-5 w-5" />
                Export Orders
                <ChevronDown className="ml-2 h-4 w-4" />
              </button>
              
              {showExportMenu && (
                <div className="absolute left-0 top-full mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                  <button
                    onClick={handleExportAll}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
                  >
                    Export All Orders
                  </button>
                  <button
                    onClick={handleExportFiltered}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-b-md border-t border-gray-200"
                  >
                    Export Filtered Orders
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg bg-white shadow-sm overflow-visible">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center gap-1">
                    <span>Order Details</span>
                    <button
                      type="button"
                      onClick={() => setColumnFilterVisible(prev => ({ ...prev, orderNumber: !prev.orderNumber }))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Filter className="h-3 w-3" />
                    </button>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center gap-1">
                    <span>Party Name</span>
                    <button
                      type="button"
                      onClick={() => setColumnFilterVisible(prev => ({ ...prev, partyName: !prev.partyName }))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Filter className="h-3 w-3" />
                    </button>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center gap-1">
                    <span>Design Items</span>
                    <button
                      type="button"
                      onClick={() => setColumnFilterVisible(prev => ({ ...prev, designNumber: !prev.designNumber }))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Filter className="h-3 w-3" />
                    </button>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center gap-1">
                    <span>Dates</span>
                    <button
                      type="button"
                      onClick={() => setColumnFilterVisible(prev => ({ ...prev, dates: !prev.dates }))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Filter className="h-3 w-3" />
                    </button>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center gap-1">
                    <span>Transport</span>
                    <button
                      type="button"
                      onClick={() => setColumnFilterVisible(prev => ({ ...prev, transport: !prev.transport }))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Filter className="h-3 w-3" />
                    </button>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <button
                      type="button"
                      onClick={() => setColumnFilterVisible(prev => ({ ...prev, status: !prev.status }))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Filter className="h-3 w-3" />
                    </button>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
              <tr className="bg-gray-50 align-top">
                <th className="px-6 py-2 text-left text-xs text-gray-500">
                  {columnFilterVisible.orderNumber && (
                    <input
                      type="text"
                      placeholder="Order no."
                      value={columnFilters.orderNumber}
                      onChange={(e) => setColumnFilters({ ...columnFilters, orderNumber: e.target.value })}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </th>
                <th className="px-6 py-2 text-left text-xs text-gray-500">
                  {columnFilterVisible.partyName && (
                    <input
                      type="text"
                      placeholder="Party name"
                      value={columnFilters.partyName}
                      onChange={(e) => setColumnFilters({ ...columnFilters, partyName: e.target.value })}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </th>
                <th className="px-6 py-2 text-left text-xs text-gray-500">
                  {columnFilterVisible.designNumber && (
                    <input
                      type="text"
                      placeholder="Design no."
                      value={columnFilters.designNumber}
                      onChange={(e) => setColumnFilters({ ...columnFilters, designNumber: e.target.value })}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </th>
                <th className="px-6 py-2 text-left text-xs text-gray-500">
                  {columnFilterVisible.dates && (
                    <div className="flex flex-col gap-1">
                      <input
                        type="date"
                        value={columnFilters.orderDateFrom}
                        onChange={(e) => setColumnFilters({ ...columnFilters, orderDateFrom: e.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="date"
                        value={columnFilters.orderDateTo}
                        onChange={(e) => setColumnFilters({ ...columnFilters, orderDateTo: e.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </th>
                <th className="px-6 py-2 text-left text-xs text-gray-500">
                  {columnFilterVisible.transport && (
                    <select
                      value={columnFilters.transport}
                      onChange={(e) => setColumnFilters({ ...columnFilters, transport: e.target.value })}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      {transportOptions.map((transport) => (
                        <option key={transport.id} value={transport.transport_name}>
                          {transport.transport_name}
                        </option>
                      ))}
                    </select>
                  )}
                </th>
                <th className="px-6 py-2 text-left text-xs text-gray-500">
                  {columnFilterVisible.status && (
                    <select
                      value={columnFilters.status}
                      onChange={(e) => setColumnFilters({ ...columnFilters, status: e.target.value })}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </th>
                <th className="px-6 py-2 text-left text-xs text-gray-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {currentOrders.map((order) => (
                <tr 
                  key={order.id} 
                  className="transition-colors duration-200 hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Package className="mr-2 h-4 w-4 text-gray-400" />
                      <div>
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="rounded bg-gray-100 px-2 py-1 font-mono text-sm font-medium text-gray-900 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                        >
                          {order.order_number}
                        </button>
                        {/* Show order remarks if they exist */}
                        {order.order_remarks && order.order_remarks.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            <div className="mb-1 flex items-center">
                              <FileText className="mr-1 h-3 w-3" />
                              <span className="font-medium">Remarks:</span>
                            </div>
                            <div className="space-y-1">
                              {order.order_remarks.slice(0, 2).map((remark, index) => (
                                <div key={remark.id} className="rounded border bg-yellow-50 px-2 py-1 text-xs">
                                  {remark.remark.length > 40 ? `${remark.remark.substring(0, 40)}...` : remark.remark}
                                </div>
                              ))}
                              {order.order_remarks.length > 2 && (
                                <div className="text-xs italic text-gray-400">
                                  +{order.order_remarks.length - 2} more remarks
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.party_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    {order.order_items && order.order_items.length > 0 ? (
                      <div className="max-w-md text-xs text-gray-900">
                        {Array.from(new Set(order.order_items.map(item => item.design_number))).map((designNumber, index, arr) => {
                          const popoverKey = `${order.id}-${designNumber}`;
                          const tooltipText = getDesignTooltip(order, designNumber);
                          return (
                            <span key={designNumber} className="relative inline-flex items-center">
                              <span
                                className="cursor-pointer font-mono text-xs text-blue-600 hover:underline"
                                onMouseEnter={() => setActiveDesignPopover(popoverKey)}
                                onMouseLeave={() => setActiveDesignPopover(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDesignPopover(prev => (prev === popoverKey ? null : popoverKey));
                                }}
                              >
                                {designNumber}
                              </span>
                              {activeDesignPopover === popoverKey && (
                                <div 
                                  className="absolute left-full top-0 z-50 ml-3 min-w-[200px] rounded-md border-2 border-blue-500 bg-white p-3 text-xs shadow-2xl"
                                  onMouseEnter={() => setActiveDesignPopover(popoverKey)}
                                  onMouseLeave={() => setActiveDesignPopover(null)}
                                >
                                  <div className="mb-2 font-bold text-gray-900">Sizes by color</div>
                                  {tooltipText ? (
                                    tooltipText.split(' | ').map((segment, idx) => (
                                      <div key={idx} className="mb-1 text-gray-700">
                                        {segment}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-gray-500 italic">No size details</div>
                                  )}
                                </div>
                              )}
                              {index < arr.length - 1 && <span className="mx-1 text-gray-500">,</span>}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs italic text-gray-500">
                        No design items
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="mb-1 flex items-center text-gray-900">
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDate(order.date_of_order)}
                      </div>
                      {order.expected_delivery_date && (
                        <div className="text-xs text-gray-600">
                          Expected: {formatDate(order.expected_delivery_date)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {order.transport && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Truck className="mr-1 h-3 w-3" />
                        {order.transport}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          printOrder(order);
                        }}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                        title="Print order"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      {order.status !== 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteOrder(order);
                          }}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Mark as completed"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(order);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit order"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(order.id, order.order_number);
                        }}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">No orders found</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="mt-6 rounded-lg bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Orders per page:</span>
            <select
              value={ordersPerPage}
              onChange={(e) => {
                setOrdersPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600 text-center">
            Showing {indexOfFirstOrder + 1}-{Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {/* Mobile Filters Toggle */}
          <div className="border-b bg-white px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Filters</span>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(prev => !prev)}
              className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Filter className="h-3 w-3" />
              <span>{mobileFiltersOpen ? 'Hide' : 'Show'}</span>
            </button>
          </div>
          {mobileFiltersOpen && (
            <div className="border-b bg-white px-4 py-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Order no."
                    value={columnFilters.orderNumber}
                    onChange={(e) => setColumnFilters({ ...columnFilters, orderNumber: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Party name"
                    value={columnFilters.partyName}
                    onChange={(e) => setColumnFilters({ ...columnFilters, partyName: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Design no."
                  value={columnFilters.designNumber}
                  onChange={(e) => setColumnFilters({ ...columnFilters, designNumber: e.target.value })}
                  className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={columnFilters.orderDateFrom}
                    onChange={(e) => setColumnFilters({ ...columnFilters, orderDateFrom: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={columnFilters.orderDateTo}
                    onChange={(e) => setColumnFilters({ ...columnFilters, orderDateTo: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={columnFilters.transport}
                    onChange={(e) => setColumnFilters({ ...columnFilters, transport: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All transports</option>
                    {transportOptions.map((transport) => (
                      <option key={transport.id} value={transport.transport_name}>
                        {transport.transport_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={columnFilters.status}
                    onChange={(e) => setColumnFilters({ ...columnFilters, status: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {currentOrders.map((order) => (
                <div key={order.id} className="rounded-lg border bg-gray-50 p-4">
                  {/* Order Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="mr-2 h-4 w-4 text-gray-400" />
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="rounded bg-white px-2 py-1 font-mono text-sm font-medium text-gray-900 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                      >
                        {order.order_number}
                      </button>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Party Name */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-900">{order.party_name}</p>
                  </div>

                  {/* Design Items */}
                  <div className="mb-3">
                    <p className="mb-2 text-xs font-medium text-gray-700">Design Items:</p>
                    {order.order_items && order.order_items.length > 0 ? (
                      <div className="flex flex-wrap gap-1 text-xs text-gray-900">
                        {Array.from(new Set(order.order_items.map(item => item.design_number))).map((designNumber, index, arr) => {
                          const popoverKey = `${order.id}-${designNumber}-mobile`;
                          const tooltipText = getDesignTooltip(order, designNumber);
                          return (
                            <span key={popoverKey} className="relative inline-flex items-center">
                              <span
                                className="cursor-pointer font-mono text-xs text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDesignPopover(prev => (prev === popoverKey ? null : popoverKey));
                                }}
                              >
                                {designNumber}
                              </span>
                              {activeDesignPopover === popoverKey && (
                                <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border-2 border-blue-500 bg-white p-3 text-xs shadow-2xl">
                                  <div className="mb-2 font-bold text-gray-900">Sizes by color</div>
                                  {tooltipText ? (
                                    tooltipText.split(' | ').map((segment, idx) => (
                                      <div key={idx} className="mb-1 text-gray-700">
                                        {segment}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-gray-500 italic">No size details</div>
                                  )}
                                </div>
                              )}
                              {index < arr.length - 1 && <span className="mx-1 text-gray-500">,</span>}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs italic text-gray-500">No design items</div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="mb-3">
                    <div className="mb-1 flex items-center text-sm text-gray-900">
                      <Calendar className="mr-1 h-3 w-3" />
                      <span className="mr-2 text-xs text-gray-600">Order:</span>
                      {formatDate(order.date_of_order)}
                    </div>
                    {order.expected_delivery_date && (
                      <div className="ml-4 text-xs text-gray-600">
                        Expected: {formatDate(order.expected_delivery_date)}
                      </div>
                    )}
                  </div>

                  {/* Transport */}
                  {order.transport && (
                    <div className="mb-3">
                      <div className="flex items-center text-sm text-gray-900">
                        <Truck className="mr-1 h-3 w-3" />
                        <span className="mr-2 text-xs text-gray-600">Transport:</span>
                        {order.transport}
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  {order.remarks && (
                    <div className="mb-3">
                      <div className="flex items-start text-sm text-gray-900">
                        <FileText className="mr-1 mt-0.5 h-3 w-3" />
                        <div>
                          <span className="mr-2 text-xs text-gray-600">Remarks:</span>
                          <span className="text-xs">{order.remarks}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Remarks */}
                  {order.order_remarks && order.order_remarks.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-2 text-xs font-medium text-gray-700">
                        <FileText className="mr-1 inline h-3 w-3" />
                        Order Remarks:
                      </div>
                      <div className="space-y-1">
                        {order.order_remarks.map((remark, index) => (
                          <div key={remark.id} className="rounded border bg-yellow-50 px-2 py-1 text-xs">
                            {remark.remark}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 border-t pt-2">
                    <button
                      onClick={() => printOrder(order)}
                      className="text-purple-600 hover:text-purple-900 p-2 rounded hover:bg-purple-50"
                      title="Print order"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    {order.status !== 'completed' && (
                      <button
                        onClick={() => handleCompleteOrder(order)}
                        className="text-green-600 hover:text-green-900 p-2 rounded hover:bg-green-50"
                        title="Mark as completed"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(order)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                      title="Edit order"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(order.id, order.order_number)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                      title="Delete order"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Order Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {editingOrder ? 'Edit Order' : 'Create New Order'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Order Information */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Party Name *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.party_name}
                      onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      required
                    >
                      <option value="">Select a party</option>
                      {parties.map((party) => (
                        <option key={party.id} value={party.name}>
                          {party.party_id} - {party.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="-translate-y-1/2 pointer-events-none absolute right-3 top-1/2 h-5 w-5 transform text-gray-400" />
                  </div>
                  {parties.length === 0 && (
                    <p className="mt-1 text-sm text-gray-500">
                      No parties found. Please create parties first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Or Enter Custom Party Name
                  </label>
                  <input
                    type="text"
                    value={formData.party_name}
                    onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter custom party name"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use this field if the party is not in the dropdown above
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Date of Order *
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_order}
                    onChange={(e) => setFormData({ ...formData, date_of_order: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Transport
                  </label>
                  <div className="relative">
                    <select
                      value={formData.transport}
                      onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">Select transport method</option>
                      {transportOptions.map((transport) => (
                        <option key={transport.id} value={transport.transport_name}>
                          {transport.transport_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="-translate-y-1/2 pointer-events-none absolute right-3 top-1/2 h-5 w-5 transform text-gray-400" />
                  </div>
                  {transportOptions.length === 0 && (
                    <p className="mt-1 text-sm text-gray-500">
                      No transport options available.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Or Enter Custom Transport
                  </label>
                  <input
                    type="text"
                    value={formData.transport}
                    onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter custom transport method"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use this field if the transport method is not in the dropdown above
                  </p>
                </div>

                {editingOrder && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Remarks
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter any remarks or notes"
                  rows={3}
                />
              </div>

              {/* Order Items */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Design Items
                  </label>
                  <button
                    type="button"
                    onClick={addOrderItem}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    + Add Item
                  </button>
                </div>
                <p className="mb-3 text-xs text-gray-500">
                  Add design items with sizes and quantities. Either design items or order remarks (or both) are required.
                </p>

                <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-gray-200 p-4">
                  {formData.order_items.map((item, index) => (
                    <div key={index} className="rounded-lg border bg-gray-50 p-4">
                      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Design</label>
                          <select
                            value={item.design_number}
                            onChange={(e) => updateOrderItem(index, 'design_number', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
                          >
                            <option value="">Select Design</option>
                            {designs
                              .filter((design) => Boolean(design.design_number))
                              .map((design) => {
                                const hasDistinctName = design.name && design.name !== design.design_number;
                                const designLabel = hasDistinctName
                                  ? `${design.name} (${design.design_number})`
                                  : design.name || design.design_number;

                                return (
                                  <option
                                    key={design.id ?? design.design_number}
                                    value={design.design_number}
                                  >
                                    {designLabel || 'Unnamed Design'}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Color</label>
                          <select
                            value={item.color}
                            onChange={(e) => updateOrderItem(index, 'color', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
                            disabled={!item.design_number}
                          >
                            <option value="">Select Color</option>
                            {getAvailableColors(item.design_number).map((color: DesignColor) => (
                              <option key={color.id} value={color.color_name}>
                                {color.color_name}
                              </option>
                            ))}
                          </select>
                          {!item.design_number && (
                            <p className="mt-1 text-xs text-gray-500">
                              Select a design first
                            </p>
                          )}
                        </div>
                        <div className="flex items-end">
                          {formData.order_items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOrderItem(index)}
                              className="px-3 py-1 text-red-600 hover:text-red-800 text-sm border border-red-300 rounded hover:bg-red-50"
                            >
                              Remove Item
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Size Quantity Grid */}
                      {item.design_number && item.color && (
                        <div>
                          <label className="mb-2 block text-xs font-medium text-gray-700">
                            Sizes & Quantities
                          </label>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                            {commonSizes.map((size) => {
                              const quantity = getSizeQuantity(index, size);
                              return (
                                <div key={size} className="flex flex-col items-center">
                                  <label className="mb-1 text-xs font-medium text-gray-600">
                                    {size}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quantity}
                                    onChange={(e) => updateOrderItemSizeQuantity(index, size, parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Enter quantities for each size. Leave blank or 0 for sizes not needed.
                          </p>
                        </div>
                      )}

                      {(!item.design_number || !item.color) && (
                        <div className="py-4 text-center text-sm text-gray-500">
                          Select design and color to choose sizes and quantities
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Remarks Section */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Order Remarks
                  </label>
                  <button
                    type="button"
                    onClick={addOrderRemark}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    + Add Remark
                  </button>
                </div>
                <p className="mb-3 text-xs text-gray-500">
                  Add general remarks for this order. Either design items or order remarks (or both) are required.
                </p>
                <div className="max-h-32 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-4">
                  {formData.order_remarks.map((remark, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={remark}
                        onChange={(e) => updateOrderRemark(index, e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter remark for this order"
                      />
                      {formData.order_remarks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOrderRemark(index)}
                          className="text-red-600 hover:text-red-800 text-sm px-3 py-2 border border-red-300 rounded-lg hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors duration-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingOrder ? 'Update Order' : 'Create Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Orders;