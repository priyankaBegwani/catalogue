from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import io
import json
import os
from datetime import datetime

app = FastAPI(title="Design Data Migrator API", version="1.0.0")

# Default mapping configuration
DEFAULT_MAPPING_CONFIG = {
    "column_mappings": {
        # "source_column": "target_column"
        # Example: "Design No": "design_no",
        # Example: "Name": "name",
    },
    "value_transformations": {
        # "target_column": {"type": "uppercase|lowercase|number|date|boolean", "format": "optional"}
    },
    "default_values": {
        # "target_column": "default_value"
        "is_active": True,
        "is_archived": False,
    },
    "required_columns": [],
    "skip_rows": 0,  # Number of header rows to skip
}


class TransformResponse(BaseModel):
    success: bool
    message: str
    preview_rows: List[Dict[str, Any]]
    total_rows: int
    warnings: List[Dict[str, Any]]
    errors: List[Dict[str, Any]]
    transformed_columns: List[str]


class MappingConfig(BaseModel):
    column_mappings: Dict[str, str] = {}
    value_transformations: Dict[str, Dict[str, str]] = {}
    default_values: Dict[str, Any] = {}
    required_columns: List[str] = []
    skip_rows: int = 0


# Persist mapping configs (in-memory storage, can be replaced with database)
SAVED_CONFIGS: Dict[str, Dict] = {}


def load_saved_config(config_name: str = "default") -> Dict:
    """Load saved mapping configuration"""
    return SAVED_CONFIGS.get(config_name, DEFAULT_MAPPING_CONFIG)


def save_mapping_config(config: Dict, config_name: str = "default") -> None:
    """Save mapping configuration for future use"""
    SAVED_CONFIGS[config_name] = config
    # Also save to file for persistence
    config_path = f"configs/{config_name}_mapping.json"
    os.makedirs("configs", exist_ok=True)
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)


def apply_column_mapping(df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
    """Apply column name mappings from source to target"""
    # Create reverse mapping (source -> target)
    column_mapping = {}
    for source_col, target_col in mapping.items():
        # Find matching column in dataframe (case-insensitive)
        for df_col in df.columns:
            if df_col.strip().lower() == source_col.strip().lower():
                column_mapping[df_col] = target_col
                break
    
    # Rename columns
    df = df.rename(columns=column_mapping)
    return df


def apply_value_transformations(df: pd.DataFrame, transformations: Dict[str, Dict[str, str]]) -> pd.DataFrame:
    """Apply value transformations to columns"""
    for col, transform in transformations.items():
        if col not in df.columns:
            continue
            
        transform_type = transform.get("type", "")
        
        if transform_type == "uppercase":
            df[col] = df[col].astype(str).str.upper()
        elif transform_type == "lowercase":
            df[col] = df[col].astype(str).str.lower()
        elif transform_type == "titlecase":
            df[col] = df[col].astype(str).str.title()
        elif transform_type == "number":
            df[col] = pd.to_numeric(df[col], errors="coerce")
        elif transform_type == "integer":
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
        elif transform_type == "date":
            format_str = transform.get("format", None)
            df[col] = pd.to_datetime(df[col], format=format_str, errors="coerce")
        elif transform_type == "boolean":
            df[col] = df[col].map({
                "true": True, "yes": True, "1": True, "y": True,
                "false": False, "no": False, "0": False, "n": False
            }).fillna(False)
        elif transform_type == "strip":
            df[col] = df[col].astype(str).str.strip()
    
    return df


def apply_default_values(df: pd.DataFrame, defaults: Dict[str, Any]) -> pd.DataFrame:
    """Apply default values for missing columns"""
    for col, value in defaults.items():
        if col not in df.columns:
            df[col] = value
        else:
            # Fill empty/NaN values with default
            df[col] = df[col].fillna(value)
    return df


def validate_required_columns(df: pd.DataFrame, required: List[str]) -> List[Dict[str, Any]]:
    """Validate that required columns are present and have values"""
    errors = []
    
    for col in required:
        if col not in df.columns:
            errors.append({
                "row": None,
                "column": col,
                "error": f"Required column '{col}' is missing"
            })
        else:
            # Check for empty values
            empty_mask = df[col].isna() | (df[col].astype(str).str.strip() == "")
            empty_count = empty_mask.sum()
            if empty_count > 0:
                empty_rows = df[empty_mask].index.tolist()
                errors.append({
                    "row": empty_rows,
                    "column": col,
                    "error": f"Required column '{col}' has {empty_count} empty values at rows: {empty_rows[:10]}"
                })
    
    return errors


def generate_warnings(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Generate warnings for data quality issues"""
    warnings = []
    
    for col in df.columns:
        # Check for mixed types
        if df[col].dtype == "object":
            non_null = df[col].dropna()
            if len(non_null) > 0:
                # Check if column has mixed numeric and text
                numeric_count = pd.to_numeric(non_null, errors="coerce").notna().sum()
                if 0 < numeric_count < len(non_null):
                    warnings.append({
                        "column": col,
                        "warning": f"Column '{col}' contains mixed data types (numeric and text)"
                    })
        
        # Check for extremely long text
        if df[col].dtype == "object":
            max_len = df[col].astype(str).str.len().max()
            if max_len > 500:
                warnings.append({
                    "column": col,
                    "warning": f"Column '{col}' contains very long text (max {max_len} characters)"
                })
    
    return warnings


def reorder_columns_to_template(df: pd.DataFrame, template_columns: List[str]) -> pd.DataFrame:
    """Reorder columns to match template structure"""
    # Keep only columns that exist in template, in template order
    existing_cols = [col for col in template_columns if col in df.columns]
    
    # Add any extra columns at the end
    extra_cols = [col for col in df.columns if col not in template_columns]
    
    ordered_cols = existing_cols + extra_cols
    return df[ordered_cols]


def read_excel_file(file: UploadFile) -> pd.DataFrame:
    """Read uploaded Excel/CSV file into DataFrame"""
    contents = file.file.read()
    file.file.seek(0)  # Reset for potential re-read
    
    filename = file.filename.lower()
    
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(contents))
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use .csv, .xlsx, or .xls")
    
    return df


def read_template_file(file: UploadFile) -> List[str]:
    """Read template file and extract column names"""
    contents = file.file.read()
    file.file.seek(0)
    
    filename = file.filename.lower()
    
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(contents))
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        raise HTTPException(status_code=400, detail="Unsupported template format. Use .csv, .xlsx, or .xls")
    
    return df.columns.tolist()


def dataframe_to_excel_bytes(df: pd.DataFrame) -> bytes:
    """Convert DataFrame to Excel bytes"""
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    return output.getvalue()


@app.post("/api/transform-design-data")
async def transform_design_data(
    source_file: UploadFile = File(..., description="Source Excel/CSV file with design data"),
    template_file: UploadFile = File(..., description="Target template file with desired columns"),
    mapping_config: Optional[str] = Form(None, description="JSON string of mapping configuration"),
    save_config_as: Optional[str] = Form(None, description="Name to save this mapping config for future use"),
    return_file: bool = Form(False, description="Return transformed Excel file instead of JSON")
):
    """
    Transform design data from source file to match target template structure.
    
    - Reads source Excel/CSV file
    - Applies column mappings and value transformations
    - Matches output structure to template columns/order
    - Returns transformed data with preview and optional downloadable file
    """
    try:
        # Parse mapping configuration
        if mapping_config:
            try:
                config = json.loads(mapping_config)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON in mapping_config")
        else:
            config = DEFAULT_MAPPING_CONFIG.copy()
        
        # Read source file
        try:
            df = read_excel_file(source_file)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading source file: {str(e)}")
        
        original_row_count = len(df)
        
        # Skip rows if specified
        skip_rows = config.get("skip_rows", 0)
        if skip_rows > 0 and skip_rows < len(df):
            df = df.iloc[skip_rows:].reset_index(drop=True)
        
        # Read template file for target structure
        try:
            template_columns = read_template_file(template_file)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading template file: {str(e)}")
        
        # Apply transformations
        errors = []
        
        # 1. Column mapping
        column_mappings = config.get("column_mappings", {})
        if column_mappings:
            df = apply_column_mapping(df, column_mappings)
        
        # 2. Value transformations
        value_transformations = config.get("value_transformations", {})
        if value_transformations:
            df = apply_value_transformations(df, value_transformations)
        
        # 3. Apply default values
        default_values = config.get("default_values", {})
        if default_values:
            df = apply_default_values(df, default_values)
        
        # 4. Reorder columns to match template
        df = reorder_columns_to_template(df, template_columns)
        
        # 5. Validate required columns
        required_columns = config.get("required_columns", [])
        validation_errors = validate_required_columns(df, required_columns)
        errors.extend(validation_errors)
        
        # 6. Generate warnings
        warnings = generate_warnings(df)
        
        # Save config if requested
        if save_config_as:
            save_mapping_config(config, save_config_as)
        
        # Prepare response
        preview_rows = df.head(10).to_dict(orient="records")
        
        # Return Excel file if requested
        if return_file:
            excel_bytes = dataframe_to_excel_bytes(df)
            return StreamingResponse(
                io.BytesIO(excel_bytes),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=transformed_designs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
                }
            )
        
        return TransformResponse(
            success=len(errors) == 0,
            message=f"Successfully transformed {len(df)} rows from {original_row_count} source rows",
            preview_rows=preview_rows,
            total_rows=len(df),
            warnings=warnings,
            errors=errors,
            transformed_columns=df.columns.tolist()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transformation failed: {str(e)}")


@app.get("/api/mapping-configs")
async def list_mapping_configs():
    """List all saved mapping configurations"""
    return {
        "configs": list(SAVED_CONFIGS.keys()),
        "configs_dir": "configs/"
    }


@app.get("/api/mapping-config/{config_name}")
async def get_mapping_config(config_name: str):
    """Get a specific mapping configuration"""
    config = load_saved_config(config_name)
    if config == DEFAULT_MAPPING_CONFIG and config_name not in SAVED_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Config '{config_name}' not found")
    return config


@app.post("/api/mapping-config/{config_name}")
async def save_mapping_config_endpoint(config_name: str, config: MappingConfig):
    """Save a mapping configuration"""
    save_mapping_config(config.dict(), config_name)
    return {"message": f"Configuration '{config_name}' saved successfully"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "design-data-migrator"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
