# Settings Page Structure

## Overview
The Settings page has been restructured with collapsible sections for better organization and user experience. Each section can be expanded or collapsed independently.

## Sections

### 1. **Branding Configuration** (Blue/Purple Gradient)
**Default State:** Expanded

**Settings:**
- Brand Name
- Logo URL (with preview)
- Primary Color (color picker + hex input)
- Secondary Color (color picker + hex input)
- WhatsApp Number
- Theme Preview (shows primary, secondary, and gradient colors)

**Storage Keys:**
- `brand_name`
- `logo_url`
- `primary_color`
- `secondary_color`
- `whatsapp_number`

---

### 2. **Catalogue Settings** (Green/Teal Gradient)
**Default State:** Collapsed

**Settings:**
- **Price Visibility Toggle**: Control whether product prices are displayed to customers
  - When enabled: Prices visible to all users
  - When disabled: Prices hidden from customers (admins always see prices)
  - Interactive toggle switch with visual feedback
  - Status indicator showing current state

**Storage Key:**
- `show_price_to_customers` (boolean, default: `true`)

**Features:**
- Eye/EyeOff icon indicator
- Clear status text
- Info box explaining admin behavior

---

### 3. **Tawk.to Chat Configuration** (Purple/Pink Gradient)
**Default State:** Collapsed

**Settings:**
- Property ID
- Widget ID
- Instructions for obtaining credentials
- Link to Tawk.to dashboard

**Storage Keys:**
- `tawk_property_id`
- `tawk_widget_id`

**Note:** Optional integration - fields can be left empty

---

### 4. **Save Button Section**
**Always Visible** at the bottom

**Features:**
- Success/Error status messages
- Single "Save All Settings" button
- Saves all settings across all sections
- Prompts for page reload after saving

## User Interface

### Collapsible Headers
- Click anywhere on the colored header to expand/collapse
- ChevronUp/ChevronDown icon indicates current state
- Smooth transitions

### Visual Design
- Each section has a distinct gradient color scheme
- Icon indicators for each section type
- Consistent spacing and padding
- Responsive design for mobile/desktop

## Implementation Details

### State Management
```typescript
const [brandSectionOpen, setBrandSectionOpen] = useState(true);
const [tawkSectionOpen, setTawkSectionOpen] = useState(false);
const [catalogueSectionOpen, setCatalogueSectionOpen] = useState(false);
const [showPriceToCustomers, setShowPriceToCustomers] = useState(true);
```

### Save Handler
The `handleSave()` function:
1. Validates all inputs
2. Saves to localStorage
3. Shows success/error message
4. Prompts for page reload

## Usage

### For Admins
1. Navigate to Settings page
2. Click on any section header to expand/collapse
3. Modify desired settings
4. Click "Save All Settings" at the bottom
5. Reload page when prompted

### Price Visibility Feature
- Toggle the switch in Catalogue Settings
- Green = Prices visible
- Gray = Prices hidden
- Setting applies immediately after save + reload
- Admins always see prices regardless of setting

## Future Enhancements
Additional settings can be easily added by:
1. Creating a new collapsible section
2. Adding state variables
3. Including in the save handler
4. Adding storage keys

## Notes
- All sections are independent
- Settings persist across sessions
- Page reload required for changes to take effect
- Validation ensures data integrity
