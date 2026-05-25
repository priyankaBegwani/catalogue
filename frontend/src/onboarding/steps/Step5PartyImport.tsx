import { useState } from 'react';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { OnboardingLayout } from '../OnboardingLayout';
import { useOnboarding } from '../OnboardingContext';
import { ImportWizard, ImportSchema, FieldDef } from '../components/ImportWizard';

const PARTY_FIELDS: FieldDef[] = [
  { key: 'name',         label: 'Party Name',  required: true,  aliases: ['customer', 'client', 'business name', 'firm name', 'shop name', 'party name', 'party'] },
  { key: 'phone_number', label: 'Phone',        required: false, aliases: ['mobile', 'contact', 'phone no', 'mobile no', 'contact no', 'phone', 'mob'] },
  { key: 'gst_number',   label: 'GST No',       required: false, aliases: ['gst', 'gstin', 'gst number', 'tax no', 'gst no'] },
  { key: 'address',      label: 'Address',      required: false, aliases: ['addr', 'street', 'location', 'full address'] },
  { key: 'city',         label: 'City',          required: false, aliases: ['town', 'district'] },
  { key: 'state',        label: 'State',          required: false, aliases: ['province', 'region'] },
  { key: 'email_id',     label: 'Email',          required: false, aliases: ['email id', 'mail', 'email'] },
  { key: 'grade',        label: 'Grade / Type',  required: false, aliases: ['type', 'customer type', 'party type', 'category', 'class'] },
  { key: 'pincode',      label: 'Pincode',       required: false, aliases: ['pin', 'zip', 'postal code', 'zipcode', 'zip code'] },
];

const PARTY_SCHEMA: ImportSchema = {
  entityType:    'parties',
  fields:        PARTY_FIELDS,
  batchEndpoint: '/api/parties/bulk',
  batchKey:      'parties',
  transformRow(row) {
    return {
      name:         String(row.name         ?? '').trim(),
      phone_number: String(row.phone_number ?? '').trim(),
      gst_number:   String(row.gst_number   ?? '').trim(),
      address:      String(row.address      ?? '').trim(),
      city:         String(row.city         ?? '').trim(),
      state:        String(row.state        ?? '').trim(),
      email_id:     String(row.email_id     ?? '').trim(),
      grade:        String(row.grade        ?? '').trim(),
      pincode:      String(row.pincode      ?? '').trim(),
    };
  },
  sampleRows: [
    { name: 'Raj Textiles', phone_number: '9876543210', gst_number: '27AAAAA1234A1Z5', address: '123 Main St', city: 'Mumbai', state: 'Maharashtra', email_id: 'raj@example.com', grade: 'Retailer' },
    { name: 'Patel Fabrics', phone_number: '9123456789', gst_number: '', address: '45 Market Rd', city: 'Surat', state: 'Gujarat', email_id: '', grade: 'Wholesaler' },
  ],
};

const TRANSPORT_FIELDS: FieldDef[] = [
  { key: 'transport_name', label: 'Transporter Name', required: true,  aliases: ['transport name', 'courier', 'company', 'carrier', 'name', 'transporter'] },
  { key: 'phone_number',   label: 'Phone',              required: false, aliases: ['mobile', 'contact', 'phone no'] },
  { key: 'description',    label: 'Description',         required: false, aliases: ['desc', 'notes'] },
  { key: 'city',           label: 'City',                required: false, aliases: ['town'] },
  { key: 'state',          label: 'State',               required: false, aliases: ['province'] },
];

const TRANSPORT_SCHEMA: ImportSchema = {
  entityType:    'transport',
  fields:        TRANSPORT_FIELDS,
  batchEndpoint: '/api/transport/bulk',
  batchKey:      'transporters',
  transformRow(row) {
    return {
      transport_name: String(row.transport_name ?? '').trim(),
      phone_number:   String(row.phone_number   ?? '').trim(),
      description:    String(row.description    ?? '').trim(),
      city:           String(row.city           ?? '').trim(),
      state:          String(row.state          ?? '').trim(),
    };
  },
  sampleRows: [
    { transport_name: 'Delhivery',    phone_number: '1800123456', city: 'Mumbai',  state: 'Maharashtra' },
    { transport_name: 'Blue Dart',    phone_number: '1800345678', city: 'Delhi',   state: 'Delhi' },
  ],
};

type SubStep = 'parties' | 'transport';

export function Step5PartyImport() {
  const { completeStep } = useOnboarding();
  const [subStep,        setSubStep]        = useState<SubStep>('parties');
  const [partiesDone,    setPartiesDone]    = useState(false);
  const [partiesSummary, setPartiesSummary] = useState<{ inserted: number; updated: number } | null>(null);

  const handlePartiesDone = (result: { inserted: number; updated: number }) => {
    setPartiesSummary(result);
    setPartiesDone(true);
  };

  const handlePartiesSkip = () => {
    setPartiesDone(true);
  };

  return (
    <OnboardingLayout
      title={subStep === 'parties' ? 'Import Parties / Customers' : 'Import Transporters'}
      subtitle={
        subStep === 'parties'
          ? 'Upload your customer and party list.'
          : 'Upload your list of transport partners (optional).'
      }
    >
      {subStep === 'parties' ? (
        !partiesDone ? (
          <ImportWizard
            schema={PARTY_SCHEMA}
            onDone={handlePartiesDone}
            onSkip={handlePartiesSkip}
          />
        ) : (
          <div className="space-y-6">
            {partiesSummary && (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-5 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Parties imported</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {partiesSummary.inserted} added · {partiesSummary.updated} updated
                  </p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Import Transporters?</h3>
              <p className="text-xs text-gray-500 mb-4">
                Optionally add your transport/courier partners. You can skip this and add them manually later.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSubStep('transport')}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90"
                >
                  Import Transporters <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => completeStep(5)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Skip & Continue
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <ImportWizard
          schema={TRANSPORT_SCHEMA}
          onDone={() => completeStep(5)}
          onSkip={() => completeStep(5)}
        />
      )}
    </OnboardingLayout>
  );
}
