import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Party } from '../../lib/api';

export const generateSampleExcel = () => {
  const sampleData = [
    {
      'Party Name': 'ABC Textiles Ltd',
      'Description': 'Leading textile manufacturer',
      'Address': '123 Industrial Area, Sector 5',
      'City': 'Mumbai',
      'District': 'Mumbai',
      'State': 'Maharashtra',
      'Pincode': '400001',
      'Phone Number': '9876543210',
      'Email ID': 'abc@textiles.com',
      'GST Number': '27AAAAA0000A1Z5',
      'Grade': 'A+',
      'Preferred Transport 1': 'Express Delivery',
      'Preferred Transport 2': 'Standard Cargo',
      'Default Discount': 'gold'
    },
    {
      'Party Name': 'XYZ Fabrics Pvt Ltd',
      'Description': 'Premium fabric supplier',
      'Address': '456 Textile Hub, Block B',
      'City': 'Surat',
      'District': 'Surat',
      'State': 'Gujarat',
      'Pincode': '395007',
      'Phone Number': '9123456789',
      'Email ID': 'xyz@fabrics.com',
      'GST Number': '24BBBBB1111B2Y6',
      'Grade': 'A',
      'Preferred Transport 1': 'Fast Logistics',
      'Preferred Transport 2': '',
      'Default Discount': 'silver'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Party Details');
  
  ws['!cols'] = [
    { width: 25 },  // Party Name
    { width: 30 },  // Description
    { width: 35 },  // Address
    { width: 15 },  // City
    { width: 15 },  // District
    { width: 15 },  // State
    { width: 10 },  // Pincode
    { width: 15 },  // Phone Number
    { width: 25 },  // Email ID
    { width: 20 },  // GST Number
    { width: 10 },  // Grade
    { width: 20 },  // Preferred Transport 1
    { width: 20 },  // Preferred Transport 2
    { width: 15 }   // Default Discount
  ];

  XLSX.writeFile(wb, 'party_details_sample.xlsx');
};

export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const transformedData = jsonData.map((row: any, index: number) => ({
          rowNumber: index + 2,
          name: row['Party Name'] || '',
          description: row['Description'] || '',
          address: row['Address'] || '',
          city: row['City'] || '',
          district: row['District'] || '',
          state: row['State'] || '',
          pincode: row['Pincode'] || '',
          phone_number: row['Phone Number'] || '',
          email_id: row['Email ID'] || '',
          gst_number: row['GST Number'] || '',
          grade: row['Grade'] || '',
          preferred_transport_1: row['Preferred Transport 1'] || '',
          preferred_transport_2: row['Preferred Transport 2'] || '',
          default_discount: row['Default Discount'] || '',
          isValid: !!(row['Party Name'])
        }));
        
        resolve(transformedData);
      } catch (err) {
        reject(new Error('Failed to read Excel file. Please check the file format.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export const validateImportData = (data: any[]) => {
  const errors: string[] = [];
  const validRows = data.filter(row => row.isValid);
  
  if (validRows.length === 0) {
    errors.push('No valid rows found. At least Party Name is required.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    validCount: validRows.length,
    totalCount: data.length
  };
};

export const transformImportData = (data: any[]) => {
  return data.filter(row => row.isValid).map(row => ({
    name: row.name,
    description: row.description,
    address: row.address,
    city: row.city,
    district: row.district,
    state: row.state,
    pincode: row.pincode,
    phone_number: row.phone_number,
    email_id: row.email_id,
    gst_number: row.gst_number,
    grade: row.grade,
    preferred_transport_1: row.preferred_transport_1,
    preferred_transport_2: row.preferred_transport_2,
    default_discount: row.default_discount
  }));
};

export const exportToExcel = (parties: Party[]) => {
  const exportData = parties.map(party => ({
    'Party ID': party.party_id,
    'Party Name': party.name,
    'Description': party.description,
    'Address': party.address,
    'City': party.city,
    'State': party.state,
    'Pincode': party.pincode,
    'Phone Number': party.phone_number,
    'Email ID': party.email_id || '',
    'GST Number': party.gst_number,
    'Grade': party.grade || '',
    'Default Discount': party.default_discount || '',
    'Created By': party.user_profiles?.full_name || '',
    'Created At': new Date(party.created_at).toLocaleDateString('en-IN')
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Parties');
  
  ws['!cols'] = [
    { width: 15 },
    { width: 25 },
    { width: 30 },
    { width: 35 },
    { width: 15 },
    { width: 15 },
    { width: 10 },
    { width: 15 },
    { width: 25 },
    { width: 20 },
    { width: 10 },
    { width: 15 },
    { width: 20 },
    { width: 15 }
  ];

  XLSX.writeFile(wb, `parties_export_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToPDF = (parties: Party[]): void => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Party Details', 14, 22);
  
  const tableData = parties.map(party => [
    party.party_id || '-',
    party.name,
    party.phone_number || '-',
    party.email_id || '-',
    party.city || '-',
    party.state || '-',
    party.gst_number || '-',
    party.grade || '-'
  ]);
  
  autoTable(doc, {
    head: [['Party ID', 'Name', 'Phone', 'Email', 'City', 'State', 'GST', 'Grade']],
    body: tableData,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [76, 175, 80] }
  });
  
  doc.save(`parties_export_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};
