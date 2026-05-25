/**
 * Internal Tool: Design Data Completion
 *
 * Superadmin uploads a raw CSV/Excel from client's ERP (any format).
 * System:
 *   1. Parses the file and detects columns with fuzzy matching
 *   2. Loads tenant's categories / fabric_types / departments
 *   3. Rule-based auto-completion (department, name, tags, category_id, is_active)
 *   4. Returns completion stats + what's still missing
 *   5. Optional AI enhance: fills description, work_type, occasion, collection, tags
 *      with cost estimate shown before running
 *   6. Import: pushes completed rows to designs + design_colors
 */

import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../config.js';
import { authenticateUser, requireSuperAdmin } from '../../middleware/auth.js';
import { asyncHandler, AppError } from '../../utils/index.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Field aliases for fuzzy column detection ─────────────────────────────────
const FIELD_ALIASES = {
  design_no:   ['design no', 'design number', 'design_no', 'code', 'article', 'sku', 'item code', 'product code', 'style no', 'style number'],
  category:    ['item', 'category', 'product type', 'item type', 'type', 'product category', 'cat'],
  department:  ['department', 'dept', 'department name', 'division', 'section'],
  price:       ['mrp', 'price', 'rate', 'cost', 'selling price', 'sale price', 'sp'],
  is_active:   ['active', 'is active', 'status', 'enabled'],
  name:        ['name', 'product name', 'design name', 'title'],
  description: ['description', 'desc', 'details', 'remarks', 'remark'],
  fabric:      ['fabric', 'fabric type', 'material', 'fabric design no', 'fabric no'],
  color:       ['color', 'colour', 'color name', 'colour name'],
  tags:        ['tags', 'keywords', 'labels'],
};

// Department name → our department enum
const DEPT_MAP = {
  menswear: 'mens', mens: 'mens', 'mens wear': 'mens', gents: 'mens', men: 'mens',
  womenswear: 'womens', womens: 'womens', 'womens wear': 'womens', ladies: 'womens', women: 'womens', female: 'womens',
  kids: 'kids', boys: 'boys', girls: 'girls',
  fabric: 'fabric', fabrics: 'fabric',
  unisex: 'unisex',
};

function normalize(str) {
  return String(str ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function detectColumns(headers) {
  const mapping = {};
  for (const header of headers) {
    const n = normalize(header);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (mapping[field]) continue; // already matched
      if (aliases.some(a => n === a || n.includes(a) || a.includes(n))) {
        mapping[field] = header;
        break;
      }
    }
  }
  return mapping;
}

function mapDepartment(raw) {
  if (!raw) return null;
  return DEPT_MAP[normalize(raw)] ?? null;
}

function parseBoolean(val) {
  if (val === undefined || val === null) return true;
  const s = normalize(String(val));
  return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'active';
}

/** Parse CSV/Excel buffer → array of row objects */
function parseFile(buffer, originalname) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rows;
}

/** Apply column mapping + tenant lookups → auto-completed rows */
function autoComplete(rows, colMap, categoryByName, fabricByName) {
  return rows.map((row, idx) => {
    const get = (field) => colMap[field] ? String(row[colMap[field]] ?? '').trim() : '';

    const rawDesignNo   = get('design_no');
    const rawCategory   = get('category');
    const rawDept       = get('department');
    const rawPrice      = get('price');
    const rawActive     = get('is_active');
    const rawName       = get('name');
    const rawDesc       = get('description');
    const rawFabric     = get('fabric');
    const rawColor      = get('color');

    // Rule-based fills
    const department  = mapDepartment(rawDept) ?? null;
    const category_id = categoryByName[normalize(rawCategory)] ?? null;
    const price       = parseFloat(rawPrice) || null;
    const is_active   = parseBoolean(rawActive);
    const fabric_type_id = fabricByName[normalize(rawFabric)] ?? null;

    // Auto-generate name if not present
    const name = rawName || (rawDesignNo && rawCategory
      ? `${rawCategory} ${rawDesignNo}`
      : rawDesignNo || '');

    // Count filled optional fields
    const optional = { department, category_id, price, is_active, fabric_type_id, name };
    const filledCount = Object.values(optional).filter(v => v !== null && v !== undefined && v !== '').length;

    return {
      _row_index: idx,
      design_no:     rawDesignNo,
      name,
      description:   rawDesc || null,
      department,
      category_id,
      price,
      is_active,
      fabric_type_id,
      _color_name:   rawColor || null,      // for design_colors
      _raw_category: rawCategory,           // for UI display
      _filled:       filledCount,
      _total_optional: 6,
      // What's still missing (needs AI or manual)
      _missing: [
        !department    && rawDept    ? null : (!department  ? 'department'  : null),
        !category_id   && rawCategory ? null : (!category_id ? 'category_id' : null),
        !rawDesc       ? 'description' : null,
        'work_type',   // always missing from CSV
        'occasion',    // always missing
        'collection',  // always missing
      ].filter(Boolean),
    };
  }).filter(r => r.design_no); // drop empty rows
}

// ─── POST /api/internal/design-completion/parse ──────────────────────────────
router.post(
  '/parse',
  authenticateUser, requireSuperAdmin,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('CSV/Excel file required', 400);
    const { tenant_id } = req.body;
    if (!tenant_id) throw new AppError('tenant_id required', 400);

    // Parse file
    const rows = parseFile(req.file.buffer, req.file.originalname);
    if (rows.length === 0) throw new AppError('File is empty or unreadable', 400);

    const headers = Object.keys(rows[0]);
    const detectedColMap = detectColumns(headers);

    // Load tenant's categories + fabric types for auto-mapping
    const [{ data: categories }, { data: fabricTypes }] = await Promise.all([
      supabaseAdmin.from('design_categories').select('id, name').eq('tenant_id', tenant_id).eq('is_active', true),
      supabaseAdmin.from('fabric_types').select('id, name').eq('tenant_id', tenant_id).eq('is_active', true),
    ]);

    const categoryByName = {};
    for (const c of (categories || [])) categoryByName[normalize(c.name)] = c.id;

    const fabricByName = {};
    for (const f of (fabricTypes || [])) fabricByName[normalize(f.name)] = f.id;

    const completed = autoComplete(rows, detectedColMap, categoryByName, fabricByName);

    // Unique category values in source for unmapped ones
    const catCol = detectedColMap.category;
    const uniqueSourceCategories = catCol
      ? [...new Set(rows.map(r => String(r[catCol] ?? '').trim()).filter(Boolean))]
      : [];

    const unmappedCategories = uniqueSourceCategories.filter(
      c => !categoryByName[normalize(c)]
    );

    // Completion stats
    const totalRows = completed.length;
    const autoFilledRows = completed.filter(r => r._filled >= 4).length;
    const missingDescription = completed.filter(r => !r.description).length;
    const missingDepartment  = completed.filter(r => !r.department).length;
    const missingCategory    = completed.filter(r => !r.category_id).length;

    // AI enhance cost estimate: GPT-3.5-turbo, ~300 tokens per design, $0.001/1K tokens
    const aiCostUsd = ((totalRows * 300) / 1000) * 0.001;

    res.json({
      success: true,
      data: {
        headers,
        detected_column_map: detectedColMap,
        total_rows: totalRows,
        auto_filled_rows: autoFilledRows,
        stats: {
          missing_description: missingDescription,
          missing_department:  missingDepartment,
          missing_category:    missingCategory,
          missing_work_type:   totalRows, // always missing from CSV
          missing_occasion:    totalRows,
          missing_collection:  totalRows,
        },
        unmapped_categories: unmappedCategories,  // need superadmin to map these to category_ids
        tenant_categories: (categories || []).map(c => ({ id: c.id, name: c.name })),
        ai_enhance: {
          fields: ['description', 'work_type', 'occasion', 'collection', 'tags'],
          estimated_cost_usd: parseFloat(aiCostUsd.toFixed(4)),
          estimated_cost_inr: parseFloat((aiCostUsd * 84).toFixed(2)),
          row_count: totalRows,
        },
        preview: completed.slice(0, 20), // first 20 rows
        // Send completed data token so /execute can retrieve it (store in session-like approach)
        // For simplicity, we return full completed data (frontend holds it)
        all_rows: completed,
      },
    });
  })
);

// ─── POST /api/internal/design-completion/ai-enhance ─────────────────────────
// Takes already-parsed rows, runs AI to fill description/work_type/occasion/collection/tags
router.post(
  '/ai-enhance',
  authenticateUser, requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { rows, tenant_id } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) throw new AppError('rows array required', 400);
    if (!tenant_id) throw new AppError('tenant_id required', 400);

    const BATCH = 20; // designs per OpenAI call
    const enhanced = [];
    let totalTokens = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);

      const prompt = `You are a product data assistant for an ethnic wear fashion catalog.
For each design below, fill in the missing fields. Respond ONLY with a JSON array matching the input order.
Each object must have: description (1 sentence), work_type (one of: plain|printed|embroidered|chikankari|shaded|handwork), occasion (one of: festive|casual|wedding|office wear|daily wear), collection (one of: summer collection|winter collection|puja collection|eid collection or null), tags (array of 3-5 relevant keywords).

Designs:
${JSON.stringify(chunk.map(r => ({ design_no: r.design_no, name: r.name, category: r._raw_category, department: r.department })))}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      totalTokens += response.usage?.total_tokens ?? 0;

      let aiResults = [];
      try {
        const parsed = JSON.parse(response.choices[0].message.content);
        // Handle both array response and {designs: [...]} response
        aiResults = Array.isArray(parsed) ? parsed : (parsed.designs ?? parsed.data ?? []);
      } catch {
        // If parse fails, push empties for this chunk
        aiResults = chunk.map(() => ({}));
      }

      for (let j = 0; j < chunk.length; j++) {
        const ai = aiResults[j] ?? {};
        enhanced.push({
          ...chunk[j],
          description: chunk[j].description || ai.description || null,
          work_type:   ai.work_type   || null,
          occasion:    ai.occasion    || null,
          collection:  ai.collection  || null,
          tags:        Array.isArray(ai.tags) ? ai.tags : [],
          _ai_enhanced: true,
        });
      }
    }

    const actualCostUsd = (totalTokens / 1000) * 0.001;

    res.json({
      success: true,
      data: {
        rows: enhanced,
        actual_cost_usd: parseFloat(actualCostUsd.toFixed(4)),
        actual_cost_inr: parseFloat((actualCostUsd * 84).toFixed(2)),
        tokens_used: totalTokens,
      },
    });
  })
);

// ─── POST /api/internal/design-completion/execute ────────────────────────────
// Import completed rows into a tenant's designs + design_colors tables
router.post(
  '/execute',
  authenticateUser, requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { tenant_id, rows, category_map, ai_used, ai_cost_usd } = req.body;
    if (!tenant_id) throw new AppError('tenant_id required', 400);
    if (!Array.isArray(rows) || rows.length === 0) throw new AppError('rows required', 400);

    // Merge any manual category_map overrides: { "SOURCE_NAME": "category_uuid" }
    const extraCatMap = category_map ?? {};

    // Get superadmin user id for created_by
    const adminUserId = req.user.id;

    const BATCH = 100;
    const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

    // Fetch existing design_nos for this tenant
    const { data: existingDesigns } = await supabaseAdmin
      .from('designs')
      .select('id, design_no')
      .eq('tenant_id', tenant_id);

    const existingMap = new Map();
    (existingDesigns || []).forEach(d => existingMap.set(d.design_no?.toLowerCase(), d.id));

    const colorQueue = []; // { design_no, color_name } pairs to upsert after designs

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const toInsert = [];
      const toUpdate = [];

      for (const row of batch) {
        if (!row.design_no) { results.skipped++; continue; }

        // Resolve category from extra manual map if auto-map failed
        const category_id = row.category_id
          || extraCatMap[row._raw_category]
          || null;

        const record = {
          tenant_id,
          design_no:    String(row.design_no).trim(),
          name:         row.name || String(row.design_no).trim(),
          description:  row.description || null,
          department:   row.department  || null,
          category_id,
          fabric_type_id: row.fabric_type_id || null,
          price:        row.price || 0,
          // Always import as inactive for assisted onboarding — publish step flips them live
          is_active:    false,
          work_type:    row.work_type  || null,
          occasion:     row.occasion   || null,
          collection:   row.collection || null,
          tags:         Array.isArray(row.tags) ? row.tags : [],
          created_by:   adminUserId,
          updated_by:   adminUserId,
        };

        const existingId = existingMap.get(record.design_no.toLowerCase());
        if (existingId) {
          toUpdate.push({ ...record, id: existingId });
        } else {
          toInsert.push(record);
        }

        if (row._color_name) {
          colorQueue.push({ design_no: record.design_no, color_name: row._color_name });
        }
      }

      // Insert new
      if (toInsert.length > 0) {
        const { data: inserted, error } = await supabaseAdmin
          .from('designs')
          .insert(toInsert)
          .select('id, design_no');

        if (error) {
          results.errors.push(`Bulk insert: ${error.message}`);
          results.skipped += toInsert.length;
        } else {
          results.inserted += inserted.length;
          inserted.forEach(d => existingMap.set(d.design_no.toLowerCase(), d.id));
        }
      }

      // Update existing — upsert by id in one batch call
      if (toUpdate.length > 0) {
        const upsertRows = toUpdate.map(d => ({ ...d, updated_at: new Date().toISOString() }));
        const { error } = await supabaseAdmin.from('designs').upsert(upsertRows);
        if (error) {
          results.errors.push(`Bulk update: ${error.message}`);
          results.skipped += toUpdate.length;
        } else {
          results.updated += toUpdate.length;
        }
      }
    }

    // Upsert design_colors — batch all at once instead of N serial calls
    if (colorQueue.length > 0) {
      const colorRows = colorQueue
        .map(({ design_no, color_name }) => {
          const design_id = existingMap.get(design_no.toLowerCase());
          if (!design_id) return null;
          return { design_id, color_name, tenant_id, in_stock: true };
        })
        .filter(Boolean);

      if (colorRows.length > 0) {
        const COLOR_BATCH = 500;
        for (let i = 0; i < colorRows.length; i += COLOR_BATCH) {
          await supabaseAdmin
            .from('design_colors')
            .upsert(colorRows.slice(i, i + COLOR_BATCH), { onConflict: 'design_id,color_name', ignoreDuplicates: true });
        }
      }
    }

    // Log tool run
    await supabaseAdmin.from('internal_tool_runs').insert({
      run_by:         adminUserId,
      tenant_id,
      tool:           'design_completion',
      status:         results.errors.length > 0 && results.inserted === 0 ? 'failed' : 'complete',
      input_summary:  { total_rows: rows.length },
      output_summary: results,
      ai_used:        !!ai_used,
      ai_cost_usd:    ai_cost_usd ?? null,
    });

    res.json({ success: true, data: results });
  })
);

// ─── GET /api/internal/design-completion/tenants ─────────────────────────────
// Returns list of tenants for the superadmin tenant selector
router.get(
  '/tenants',
  authenticateUser, requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { data: tenants, error } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug, subscription_status, onboarding_complete')
      .order('name');

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: tenants });
  })
);

export default router;
