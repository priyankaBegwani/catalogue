# Design Data Migrator Backend

FastAPI-based backend for transforming design data from source Excel/CSV files to match target schema templates.

## Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

The server will start on `http://localhost:8001`

## API Endpoints

### POST /api/transform-design-data
Main transformation endpoint.

**Request:**
- `source_file`: Source Excel/CSV file (required)
- `template_file`: Target template file with desired columns (required)
- `mapping_config`: JSON string with mapping rules (optional)
- `save_config_as`: Name to save mapping config for reuse (optional)
- `return_file`: Return Excel file instead of JSON (optional, default: false)

**Mapping Config Format:**
```json
{
  "column_mappings": {
    "Design No": "design_no",
    "Name": "name",
    "Price": "price"
  },
  "value_transformations": {
    "design_no": {"type": "uppercase"},
    "price": {"type": "number"},
    "name": {"type": "strip"}
  },
  "default_values": {
    "is_active": true,
    "is_archived": false
  },
  "required_columns": ["design_no", "name"],
  "skip_rows": 1
}
```

**Response (JSON mode):**
```json
{
  "success": true,
  "message": "Successfully transformed 100 rows",
  "preview_rows": [...],
  "total_rows": 100,
  "warnings": [...],
  "errors": [...],
  "transformed_columns": ["design_no", "name", "price"]
}
```

### GET /api/mapping-configs
List all saved mapping configurations.

### GET /api/mapping-config/{config_name}
Get a specific mapping configuration.

### POST /api/mapping-config/{config_name}
Save a mapping configuration.

### GET /health
Health check endpoint.

## Example Usage

```bash
# Test transformation with JSON response
curl -X POST "http://localhost:8001/api/transform-design-data" \
  -F "source_file=@designs.xlsx" \
  -F "template_file=@template.xlsx" \
  -F "mapping_config={\"column_mappings\":{\"Design No\":\"design_no\"}}"

# Download transformed Excel file
curl -X POST "http://localhost:8001/api/transform-design-data" \
  -F "source_file=@designs.xlsx" \
  -F "template_file=@template.xlsx" \
  -F "return_file=true" \
  --output transformed.xlsx
```

## Value Transformation Types

- `uppercase`: Convert to uppercase
- `lowercase`: Convert to lowercase
- `titlecase`: Convert to title case
- `number`: Convert to numeric
- `integer`: Convert to integer
- `date`: Parse as date (with optional format)
- `boolean`: Convert to boolean (true/false/yes/no/1/0)
- `strip`: Remove leading/trailing whitespace
