import pandas as pd
import json

# Load Excel (no transformations)
df = pd.read_excel("Item Master.xlsx")

# IMPORTANT: do NOT modify column names unless required
print(df.columns)

# Adjust these ONLY if your headers differ
df.columns = [
    "item",
    "short_name",
    "brand",
    "product",
    "department"
]

item_master = {}

for _, row in df.iterrows():
    key = str(row["item"])  # keep EXACT value

    item_master[key] = {
        "short_name": row["short_name"],
        "brand": row["brand"],
        "product": row["product"],
        "department": row["department"]
    }

final_json = {
    "item_master": item_master
}

# Save output
with open("item_master.json", "w", encoding="utf-8") as f:
    json.dump(final_json, f, indent=2, ensure_ascii=False)

print("JSON created successfully")