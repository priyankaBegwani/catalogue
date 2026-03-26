import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transport } from '../../lib/api';

export const generateSampleExcel = () => {
  const sampleData = [
    {
      'Transport Name': 'Express Delivery',
      'Description': 'Fast and reliable delivery service',
      'Address': '123 Main Street',
      'City': 'Mumbai',
      'State': 'Maharashtra',
      'District': 'Mumbai',
      'Pincode': '400001',
      'Phone Number': '9876543210',
      'Email ID': 'express@example.com',
      'GST Number': '27AAAAA0000A1Z5'
    },
    {
      'Transport Name': 'Quick Logistics',
      'Description': 'Nationwide logistics solutions',
      'Address': '456 Park Avenue',
      'City': 'Delhi',
      'State': 'Delhi',
      'District': 'Central Delhi',
      'Pincode': '110001',
      'Phone Number': '9876543211',
      'Email ID': 'quick@example.com',
      'GST Number': '07BBBBB1111B1Z5'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transport Details');
  
  ws['!cols'] = [
    { width: 25 },  // Transport Name
    { width: 35 },  // Description
    { width: 35 },  // Address
    { width: 15 },  // City
    { width: 15 },  // State
    { width: 15 },  // District
    { width: 10 },  // Pincode
    { width: 15 },  // Phone Number
    { width: 25 },  // Email ID
    { width: 20 }   // GST Number
  ];

  XLSX.writeFile(wb, 'transport_details_sample.xlsx');
};

export const exportToExcel = async (token: string): Promise<void> => {
  const response = await fetch('/api/transport/export/excel', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }
  
  const { data } = await response.json();
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transport Details');
  
  ws['!cols'] = [
    { width: 25 },
    { width: 35 },
    { width: 35 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 10 },
    { width: 15 },
    { width: 25 },
    { width: 20 }
  ];
  
  XLSX.writeFile(wb, 'transport_details.xlsx');
};

export const exportToPDF = (transports: Transport[]): void => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Transport Details', 14, 22);
  
  const tableData = transports.map(t => [
    t.transport_name,
    t.description || '-',
    t.phone_number || '-',
    [t.address, t.city, t.state, t.district, t.pincode].filter(Boolean).join(', ') || '-',
    t.gst_number || '-'
  ]);
  
  autoTable(doc, {
    head: [['Name', 'Description', 'Phone', 'Address', 'GST']],
    body: tableData,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 139, 202] }
  });
  
  doc.save('transport_details.pdf');
};

export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

export const validateImportData = (data: any[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data || data.length === 0) {
    errors.push('No data found in file');
    return { valid: false, errors };
  }
  
  data.forEach((row, index) => {
    if (!row['Transport Name']) {
      errors.push(`Row ${index + 1}: Transport Name is required`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const transformImportData = (data: any[]): any[] => {
  return data.map(row => ({
    transport_name: row['Transport Name'] || '',
    description: row['Description'] || '',
    address: row['Address'] || '',
    city: row['City'] || '',
    state: row['State'] || '',
    district: row['District'] || '',
    pincode: row['Pincode'] || '',
    phone_number: row['Phone Number'] || '',
    email_id: row['Email ID'] || '',
    gst_number: row['GST Number'] || ''
  }));
};
