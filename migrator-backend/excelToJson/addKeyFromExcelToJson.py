import pandas as pd
import json

# ---- LOAD EXISTING JSON ----
with open("item_master.json", "r", encoding="utf-8") as f:
    data = json.load(f)

item_master = data["item_master"]

# ---- LOAD SIZE EXCEL ----
df = pd.read_excel("sampleExcel/Product.xlsx")

# IMPORTANT: match your actual column names
df.columns = ["Product Name", "Size Group"]

# ---- CREATE LOOKUP DICTIONARY ----
product_size_map = {}

for _, row in df.iterrows():
    product = str(row["Product Name"])
    size_val = row["Size Group"]

    # Convert sizes into list
    if isinstance(size_val, str):
        sizes = [s.strip() for s in size_val.split(",")]
    else:
        sizes = [size_val]

    product_size_map[product] = sizes

# ---- MERGE INTO JSON ----
for item_name, item_data in item_master.items():

    product = item_data.get("product")

    if product in product_size_map:
        item_data["size"] = product_size_map[product]

# ---- SAVE UPDATED JSON ----
with open("item_master_updated.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Updated JSON created successfully")