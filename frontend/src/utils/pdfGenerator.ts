import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CartItem } from '../lib/api';

interface GroupedCartItem {
  design: any;
  color: any;
  items: CartItem[];
}

export const generateCartPDF = (cartItems: CartItem[], userInfo?: { name?: string; email?: string }) => {
  const doc = new jsPDF();
  
  // Add company header
  doc.setFillColor(59, 130, 246); // Blue color
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Indie Craft', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Cart Items Quotation Request', 105, 30, { align: 'center' });
  
  // Add date and user info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Date: ${currentDate}`, 14, 50);
  
  if (userInfo?.name) {
    doc.text(`Customer: ${userInfo.name}`, 14, 56);
  }
  if (userInfo?.email) {
    doc.text(`Email: ${userInfo.email}`, 14, 62);
  }
  
  let yPosition = userInfo?.email ? 70 : userInfo?.name ? 64 : 58;
  
  // Group cart items by design and color
  const groupedItems = cartItems.reduce((acc, item) => {
    const key = `${item.design.id}-${item.color.id}`;
    if (!acc[key]) {
      acc[key] = {
        design: item.design,
        color: item.color,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, GroupedCartItem>);
  
  // Prepare table data
  const tableData: any[] = [];
  let itemNumber = 1;
  
  Object.values(groupedItems).forEach((group) => {
    const totalQuantity = group.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = group.items.reduce((sum, item) => sum + (item.color.price * item.quantity), 0);
    const sizes = group.items.map(item => `${item.size} (${item.quantity})`).join(', ');
    
    tableData.push([
      itemNumber++,
      group.design.design_no || 'N/A',
      group.design.name || 'Unnamed Design',
      group.color.color_name || 'N/A',
      sizes,
      totalQuantity,
      `₹${group.color.price.toLocaleString()}`,
      `₹${totalPrice.toLocaleString()}`
    ]);
  });
  
  // Add table
  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'Design No.', 'Design Name', 'Color', 'Sizes (Qty)', 'Total Qty', 'Unit Price', 'Total Price']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 40 },
      3: { cellWidth: 25 },
      4: { cellWidth: 35 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });
  
  // Calculate totals
  const grandTotal = cartItems.reduce((total, item) => {
    return total + (item.color.price * item.quantity);
  }, 0);
  
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueDesigns = Object.keys(groupedItems).length;
  
  // Add summary
  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary:', 14, finalY + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total Designs: ${uniqueDesigns}`, 14, finalY + 16);
  doc.text(`Total Items: ${totalItems}`, 14, finalY + 22);
  
  // Grand total box
  doc.setFillColor(59, 130, 246);
  doc.rect(120, finalY + 8, 76, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', 125, finalY + 16);
  doc.setFontSize(14);
  doc.text(`₹${grandTotal.toLocaleString()}`, 191, finalY + 23, { align: 'right' });
  
  // Add footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const footerY = doc.internal.pageSize.height - 20;
  doc.text('This is a quotation request. Please contact us for final pricing and availability.', 105, footerY, { align: 'center' });
  doc.text('Indie Craft - Premium Quality Kurtas & Traditional Wear', 105, footerY + 5, { align: 'center' });
  doc.text('Contact: +91 98765 43210 | Email: info@indiecraft.com', 105, footerY + 10, { align: 'center' });
  
  return doc;
};

export const downloadCartPDF = (cartItems: CartItem[], userInfo?: { name?: string; email?: string }) => {
  const doc = generateCartPDF(cartItems, userInfo);
  const fileName = `IndeCraft_Cart_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export const getWhatsAppShareLink = (cartItems: CartItem[], userInfo?: { name?: string; email?: string }) => {
  // Business WhatsApp number (from contact page)
  const phoneNumber = '919876543210'; // Format: country code + number without + or spaces
  
  // Group cart items
  const groupedItems = cartItems.reduce((acc, item) => {
    const key = `${item.design.id}-${item.color.id}`;
    if (!acc[key]) {
      acc[key] = {
        design: item.design,
        color: item.color,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, GroupedCartItem>);
  
  // Calculate totals
  const grandTotal = cartItems.reduce((total, item) => {
    return total + (item.color.price * item.quantity);
  }, 0);
  
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueDesigns = Object.keys(groupedItems).length;
  
  // Create message
  let message = `*Quotation Request - Indie Craft*\n\n`;
  
  if (userInfo?.name) {
    message += `Customer: ${userInfo.name}\n`;
  }
  if (userInfo?.email) {
    message += `Email: ${userInfo.email}\n`;
  }
  
  message += `Date: ${new Date().toLocaleDateString('en-IN')}\n\n`;
  message += `*Cart Items:*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  let itemNum = 1;
  Object.values(groupedItems).forEach((group) => {
    const totalQuantity = group.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = group.items.reduce((sum, item) => sum + (item.color.price * item.quantity), 0);
    const sizes = group.items.map(item => `${item.size}(${item.quantity})`).join(', ');
    
    message += `${itemNum}. *${group.design.name}*\n`;
    message += `   Design No: ${group.design.design_no}\n`;
    message += `   Color: ${group.color.color_name}\n`;
    message += `   Sizes: ${sizes}\n`;
    message += `   Quantity: ${totalQuantity}\n`;
    message += `   Price: ₹${totalPrice.toLocaleString()}\n\n`;
    itemNum++;
  });
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `*Summary:*\n`;
  message += `Total Designs: ${uniqueDesigns}\n`;
  message += `Total Items: ${totalItems}\n`;
  message += `*Grand Total: ₹${grandTotal.toLocaleString()}*\n\n`;
  message += `Please provide quotation and availability for the above items. Thank you!`;
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
};
