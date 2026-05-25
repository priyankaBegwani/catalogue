/**
 * Internal Tool: Image Folder Restructure
 *
 * Superadmin uploads a ZIP of client photos (any folder structure).
 * System infers design_no + color_name from paths/filenames, shows a preview
 * tree, superadmin corrects mappings, then uploads to R2 under the target tenant.
 *
 * Supported input structures:
 *   A) design_no/color_name/file.jpg       (2-level: ideal)
 *   B) design_no/file.jpg                  (1-level: color = "default")
 *   C) file.jpg at root (flat)             (parse from filename)
 *   D) any/prefix/design_no/color/file.jpg (deep: take last 2 folder levels)
 *
 * Filename parse fallback: DESIGNNO_COLOR_n.ext or DESIGNNO-COLOR-n.ext
 */

import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import { supabaseAdmin } from '../../config.js';
import { authenticateUser, requireSuperAdmin } from '../../middleware/auth.js';
import { uploadToR2 } from '../../config/r2.js';
import { asyncHandler, AppError } from '../../utils/index.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

function isImage(filename) {
  return IMAGE_EXTS.has(path.extname(filename).toLowerCase());
}

function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

/**
 * Parse design_no and color_name from a ZIP entry path.
 * Returns { design_no, color_name, filename } or null if not an image.
 */
function parsePath(entryName) {
  if (!isImage(entryName)) return null;

  const parts = entryName.split('/').filter(Boolean);
  const filename = parts[parts.length - 1];

  if (parts.length >= 3) {
    // Take second-to-last folder as design_no, last folder as color_name
    return {
      design_no:  parts[parts.length - 3].trim(),
      color_name: parts[parts.length - 2].trim(),
      filename,
    };
  }

  if (parts.length === 2) {
    // design_no/filename — color = "default"
    return {
      design_no:  parts[0].trim(),
      color_name: 'default',
      filename,
    };
  }

  // Flat file — try to parse from filename
  // Patterns: KSCK04_RED_1.jpg  /  KSCK04-RED-1.jpg  /  KSCK04 RED 1.jpg
  const base = path.basename(filename, path.extname(filename));
  const segments = base.split(/[_\- ]+/);
  if (segments.length >= 2) {
    return {
      design_no:  segments[0].trim(),
      color_name: segments[1].trim(),
      filename,
    };
  }

  return { design_no: base.trim(), color_name: 'default', filename };
}

// ─── POST /api/internal/image-restructure/parse ───────────────────────────────
// Upload ZIP → parse structure → return preview tree (no R2 upload yet)
router.post(
  '/parse',
  authenticateUser, requireSuperAdmin,
  upload.single('zip'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('ZIP file required', 400);
    if (!req.body.tenant_id) throw new AppError('tenant_id required', 400);

    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    // Build tree: { [design_no]: { [color_name]: string[] } }
    const tree = {};
    let totalImages = 0;
    let skipped = 0;

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const parsed = parsePath(entry.entryName);
      if (!parsed) { skipped++; continue; }

      totalImages++;
      const { design_no, color_name, filename } = parsed;
      if (!tree[design_no]) tree[design_no] = {};
      if (!tree[design_no][color_name]) tree[design_no][color_name] = [];
      tree[design_no][color_name].push(filename);
    }

    // Flatten to array for frontend table
    const rows = [];
    for (const [design_no, colors] of Object.entries(tree)) {
      for (const [color_name, files] of Object.entries(colors)) {
        rows.push({ design_no, color_name, file_count: files.length, files });
      }
    }

    res.json({
      success: true,
      data: {
        total_images: totalImages,
        skipped_non_images: skipped,
        design_count: Object.keys(tree).length,
        color_variant_count: rows.length,
        rows, // superadmin can edit design_no / color_name before uploading
      },
    });
  })
);

// ─── POST /api/internal/image-restructure/upload ─────────────────────────────
// Re-upload ZIP using confirmed/corrected mapping → streams to R2
// Body: { tenant_id, mapping: [{ design_no, color_name, original_design_no, original_color_name }] }
router.post(
  '/upload',
  authenticateUser, requireSuperAdmin,
  upload.single('zip'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('ZIP file required', 400);
    const { tenant_id, mapping } = req.body;
    if (!tenant_id) throw new AppError('tenant_id required', 400);

    let parsedMapping;
    try {
      parsedMapping = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;
    } catch {
      throw new AppError('Invalid mapping JSON', 400);
    }

    // Build lookup: "orig_design_no::orig_color_name" → { design_no, color_name }
    const remapLookup = {};
    for (const m of (parsedMapping || [])) {
      remapLookup[`${m.original_design_no}::${m.original_color_name}`] = {
        design_no: m.design_no,
        color_name: m.color_name,
      };
    }

    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    const results = { uploaded: 0, failed: 0, skipped: 0, errors: [] };

    // Track URLs per design_no + color_name for DB upsert
    const colorUrls = {}; // { "KSCK04::RED": string[] }

    // Upload concurrently in chunks of 5
    const CONCURRENCY = 5;
    const imageEntries = entries.filter(e => !e.isDirectory && isImage(e.entryName));

    for (let i = 0; i < imageEntries.length; i += CONCURRENCY) {
      const chunk = imageEntries.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (entry) => {
        try {
          const parsed = parsePath(entry.entryName);
          if (!parsed) { results.skipped++; return; }

          const { design_no: rawDno, color_name: rawColor, filename } = parsed;
          const key = `${rawDno}::${rawColor}`;
          const remap = remapLookup[key];
          const design_no  = remap?.design_no  ?? rawDno;
          const color_name = remap?.color_name ?? rawColor;

          const ext = path.extname(filename).toLowerCase();
          const r2Key = `designs/${tenant_id}/${sanitize(design_no)}/${sanitize(color_name)}/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

          const buffer = entry.getData();
          const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };
          const mime = mimeMap[ext] || 'image/jpeg';

          const { publicUrl } = await uploadToR2(buffer, r2Key, mime);

          const ck = `${design_no}::${color_name}`;
          if (!colorUrls[ck]) colorUrls[ck] = [];
          colorUrls[ck].push(publicUrl);
          results.uploaded++;
        } catch (err) {
          results.failed++;
          results.errors.push(`${entry.entryName}: ${err.message}`);
        }
      }));
    }

    // Upsert design_colors rows — preload all design_nos in one query, then batch upsert
    const upsertErrors = [];
    const colorUrlEntries = Object.entries(colorUrls); // [["KSCK04::RED", [url1, url2]], ...]

    if (colorUrlEntries.length > 0) {
      // Bulk fetch design ids for all referenced design_nos
      const designNos = [...new Set(colorUrlEntries.map(([ck]) => ck.split('::')[0]))];
      const { data: tenantDesigns } = await supabaseAdmin
        .from('designs')
        .select('id, design_no')
        .eq('tenant_id', tenant_id)
        .in('design_no', designNos);

      const designIdMap = new Map();
      for (const d of (tenantDesigns || [])) designIdMap.set(d.design_no.toLowerCase(), d.id);

      // Bulk fetch existing design_colors for affected design_ids
      const allDesignIds = [...designIdMap.values()];
      const { data: existingColors } = allDesignIds.length > 0
        ? await supabaseAdmin
            .from('design_colors')
            .select('id, design_id, color_name, image_urls')
            .in('design_id', allDesignIds)
        : { data: [] };

      const existingColorMap = new Map();
      for (const ec of (existingColors || [])) {
        existingColorMap.set(`${ec.design_id}::${ec.color_name.toLowerCase()}`, ec);
      }

      const toInsert = [];
      const toUpdate = []; // { id, image_urls }

      for (const [ck, urls] of colorUrlEntries) {
        const [design_no, color_name] = ck.split('::');
        const design_id = designIdMap.get(design_no.toLowerCase());
        if (!design_id) { upsertErrors.push(`Design not found: ${design_no}`); continue; }

        const existing = existingColorMap.get(`${design_id}::${color_name.toLowerCase()}`);
        if (existing) {
          const merged = [...new Set([...(existing.image_urls || []), ...urls])];
          toUpdate.push({ id: existing.id, image_urls: merged });
        } else {
          toInsert.push({ design_id, color_name, image_urls: urls, tenant_id, in_stock: true });
        }
      }

      // Batch insert new color variants
      if (toInsert.length > 0) {
        const { error } = await supabaseAdmin.from('design_colors').insert(toInsert);
        if (error) upsertErrors.push(`Batch insert design_colors: ${error.message}`);
      }

      // Updates still need to be per-row (different image_urls per row), but parallelised
      const UPDATE_CONCURRENCY = 10;
      for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
        await Promise.all(
          toUpdate.slice(i, i + UPDATE_CONCURRENCY).map(({ id, image_urls }) =>
            supabaseAdmin
              .from('design_colors')
              .update({ image_urls, updated_at: new Date().toISOString() })
              .eq('id', id)
              .then(({ error }) => { if (error) upsertErrors.push(`Update color ${id}: ${error.message}`); })
          )
        );
      }
    }

    // Log internal tool run
    await supabaseAdmin.from('internal_tool_runs').insert({
      run_by:        req.user.id,
      tenant_id,
      tool:          'image_restructure',
      status:        results.failed > 0 && results.uploaded === 0 ? 'failed' : 'complete',
      input_summary: { total_in_zip: imageEntries.length },
      output_summary: { ...results, db_errors: upsertErrors },
    });

    res.json({ success: true, data: { ...results, db_errors: upsertErrors } });
  })
);

export default router;
