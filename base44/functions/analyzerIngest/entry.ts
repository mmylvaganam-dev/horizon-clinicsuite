import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ─── Parsers ───────────────────────────────────────────────────────────────

function parseHL7(raw) {
  const segments = raw.split(/\r?\n/).filter(Boolean);
  const results = [];
  let specimenId = null;
  let patientId = null;
  let testName = null;

  for (const seg of segments) {
    const fields = seg.split('|');
    const type = fields[0];

    if (type === 'PID') {
      patientId = fields[3] || null; // PID-3: Patient ID
    }
    if (type === 'OBR') {
      specimenId = fields[3] || null; // OBR-3: Specimen/Filler order number
      testName = fields[4]?.split('^')[1] || fields[4] || null;
    }
    if (type === 'OBX') {
      const paramCode = fields[3]?.split('^')[0] || '';
      const paramName = fields[3]?.split('^')[1] || paramCode;
      const value = fields[5] || '';
      const unit = fields[6]?.split('^')[0] || '';
      const refRange = fields[7] || '';
      const abnormalFlag = fields[8] || '';
      const status = fields[11] || '';
      results.push({ code: paramCode, name: paramName, value, unit, ref_range: refRange, abnormal_flag: abnormalFlag, status });
    }
  }

  return { specimen_id: specimenId, patient_id: patientId, test_name: testName, parameters: results };
}

function parseASTM(raw) {
  const records = raw.split(/\r?\n/).filter(Boolean);
  const results = [];
  let specimenId = null;
  let testName = null;

  for (const rec of records) {
    const fields = rec.split('|');
    const type = fields[0]?.[0];

    if (type === 'O') { // Order record
      specimenId = fields[3] || null;
      testName = fields[5]?.split('^')[1] || fields[5] || null;
    }
    if (type === 'R') { // Result record
      const paramCode = fields[2]?.split('^')[0] || '';
      const paramName = fields[2]?.split('^')[1] || paramCode;
      const value = fields[3] || '';
      const unit = fields[4] || '';
      const refRange = fields[5] || '';
      const abnormalFlag = fields[6] || '';
      results.push({ code: paramCode, name: paramName, value, unit, ref_range: refRange, abnormal_flag: abnormalFlag });
    }
  }

  return { specimen_id: specimenId, patient_id: null, test_name: testName, parameters: results };
}

function parseCSV(raw) {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { specimen_id: null, test_name: 'CSV Import', parameters: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const parameters = [];
  let specimenId = null;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

    if (!specimenId) specimenId = row['specimen_id'] || row['sample_id'] || row['accession'] || null;

    const name = row['test_name'] || row['parameter'] || row['analyte'] || headers[0];
    const value = row['result'] || row['value'] || '';
    const unit = row['unit'] || row['units'] || '';
    const refRange = row['reference_range'] || row['ref_range'] || row['normal_range'] || '';
    const abnormalFlag = row['flag'] || row['abnormal'] || '';

    if (name && value) {
      parameters.push({ code: name.toUpperCase().replace(/\s/g, '_'), name, value, unit, ref_range: refRange, abnormal_flag: abnormalFlag });
    }
  }

  return { specimen_id: specimenId, test_name: 'CSV Result Import', parameters };
}

// ─── Critical Value Check ──────────────────────────────────────────────────

const CRITICAL_THRESHOLDS = {
  WBC: { low: 2.0, high: 30.0 },
  HGB: { low: 7.0, high: 20.0 },
  PLT: { low: 50, high: 1000 },
  GLUCOSE: { low: 2.5, high: 25.0 },
  SODIUM: { low: 120, high: 160 },
  POTASSIUM: { low: 2.5, high: 6.5 },
  CREATININE: { high: 800 },
  UREA: { high: 30 },
};

function checkCritical(parameters) {
  for (const p of parameters) {
    const code = p.code?.toUpperCase();
    const val = parseFloat(p.value);
    if (isNaN(val)) continue;
    const threshold = CRITICAL_THRESHOLDS[code];
    if (!threshold) continue;
    if ((threshold.low !== undefined && val < threshold.low) ||
        (threshold.high !== undefined && val > threshold.high)) {
      return true;
    }
  }
  return false;
}

// ─── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { analyzer_id, message_type, raw_message, organization_id, location_id, api_key } = body;

    // Validate required fields
    if (!analyzer_id || !message_type || !raw_message || !organization_id) {
      return Response.json({ error: 'Missing required fields: analyzer_id, message_type, raw_message, organization_id' }, { status: 400 });
    }

    // Verify analyzer exists and belongs to org
    const analyzers = await base44.asServiceRole.entities.AnalyzerRegistry.filter({ id: analyzer_id, organization_id });
    if (!analyzers.length) {
      return Response.json({ error: 'Analyzer not found or unauthorized' }, { status: 404 });
    }
    const analyzer = analyzers[0];

    // Parse the message
    let parsed;
    const msgType = message_type.toLowerCase();
    if (msgType === 'hl7') {
      parsed = parseHL7(raw_message);
    } else if (msgType === 'astm') {
      parsed = parseASTM(raw_message);
    } else if (msgType === 'csv') {
      parsed = parseCSV(raw_message);
    } else {
      parsed = { specimen_id: null, test_name: message_type, parameters: [] };
    }

    // Try to match specimen
    let specimenRecord = null;
    let matchedPatientId = null;
    let matchedOrderId = null;

    if (parsed.specimen_id) {
      const specimens = await base44.asServiceRole.entities.Specimen.filter({
        organization_id,
        accession_number: parsed.specimen_id
      });
      if (specimens.length > 0) {
        specimenRecord = specimens[0];
        matchedPatientId = specimenRecord.patient_id;
        matchedOrderId = specimenRecord.order_id;
      }
    }

    const isCritical = checkCritical(parsed.parameters || []);

    // Create inbox record
    const inboxRecord = await base44.asServiceRole.entities.AnalyzerInbox.create({
      organization_id,
      location_id: location_id || null,
      analyzer_id,
      message_type: msgType,
      received_at: new Date().toISOString(),
      raw_message,
      parsed_data: parsed,
      specimen_id: specimenRecord?.id || null,
      status: specimenRecord ? 'matched' : 'parsed',
    });

    // If matched, auto-create a Result record in "Entered" status
    let resultRecord = null;
    if (specimenRecord && matchedPatientId) {
      resultRecord = await base44.asServiceRole.entities.Result.create({
        organization_id,
        location_id: location_id || null,
        order_id: matchedOrderId || '',
        patient_id: matchedPatientId,
        result_type: 'LAB',
        test_name: parsed.test_name || analyzer.analyzer_name,
        accession_number: parsed.specimen_id || '',
        specimen_type: specimenRecord?.specimen_type || '',
        result_date: new Date().toISOString(),
        structured_json: { parameters: parsed.parameters || [], analyzer_id, analyzer_name: analyzer.analyzer_name, message_type: msgType },
        status: 'Entered',
        is_critical: isCritical,
        entered_by: `analyzer:${analyzer.analyzer_name}`,
      });

      // Mark inbox as applied
      await base44.asServiceRole.entities.AnalyzerInbox.update(inboxRecord.id, {
        status: 'applied',
        result_id: resultRecord.id,
        processed_at: new Date().toISOString(),
        processed_by: `auto:${analyzer.analyzer_name}`,
      });
    }

    return Response.json({
      success: true,
      inbox_id: inboxRecord.id,
      status: inboxRecord.status,
      matched: !!specimenRecord,
      result_id: resultRecord?.id || null,
      is_critical: isCritical,
      parameters_count: parsed.parameters?.length || 0,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});