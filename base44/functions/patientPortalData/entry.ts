import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Secure Patient Portal Data API
 * Validates OTP session token and returns only data scoped to the patient's own record.
 * Endpoint actions: verify_session | get_appointments | get_lab_results | get_medical_history | get_profile
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, session_token, patient_id } = body;

    if (!action || !session_token || !patient_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── Validate session token ─────────────────────────────────────────────────
    const sessions = await base44.asServiceRole.entities.SmsTokenCache.filter({
      token: session_token,
    });

    const session = sessions[0];
    if (!session) {
      return Response.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // Token must not be expired (valid for 8 hours from creation)
    const createdAt = new Date(session.created_at || session.created_date);
    const now = new Date();
    const ageHours = (now - createdAt) / (1000 * 60 * 60);
    if (ageHours > 8) {
      return Response.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
    }

    // Token must belong to this patient
    if (session.patient_id !== patient_id) {
      return Response.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // ── Route to action ────────────────────────────────────────────────────────
    if (action === 'verify_session') {
      // Just validate and return patient name
      const patients = await base44.asServiceRole.entities.Patient.filter({ id: patient_id });
      const patient = patients[0];
      if (!patient) return Response.json({ error: 'Patient not found' }, { status: 404 });
      return Response.json({
        ok: true,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_id: patient.id,
      });
    }

    if (action === 'get_profile') {
      const patients = await base44.asServiceRole.entities.Patient.filter({ id: patient_id });
      const patient = patients[0];
      if (!patient) return Response.json({ error: 'Patient not found' }, { status: 404 });
      // Return safe subset of patient fields only
      return Response.json({
        id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        blood_type: patient.blood_type,
        allergies: patient.allergies,
        chronic_conditions: patient.chronic_conditions,
        email: patient.email,
        phone: patient.phone,
        mobile: patient.mobile,
        phn: patient.phn,
      });
    }

    if (action === 'get_appointments') {
      // Only appointments belonging to this patient
      const appointments = await base44.asServiceRole.entities.Appointment.filter({
        patient_id: patient_id,
      });

      // Enrich with location names
      const locationIds = [...new Set(appointments.map(a => a.location_id).filter(Boolean))];
      let locationMap = {};
      if (locationIds.length > 0) {
        const locations = await base44.asServiceRole.entities.Location.list();
        locations.forEach(l => { locationMap[l.id] = l.name; });
      }

      // Enrich with provider names
      const providerIds = [...new Set(appointments.map(a => a.provider_id).filter(Boolean))];
      let providerMap = {};
      if (providerIds.length > 0) {
        const staff = await base44.asServiceRole.entities.StaffProfile.list();
        staff.forEach(s => {
          providerMap[s.id] = s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
        });
      }

      const enriched = appointments.map(a => ({
        id: a.id,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        type: a.type,
        reason: a.reason,
        is_telehealth: a.is_telehealth,
        telehealth_link: a.telehealth_link,
        location_name: locationMap[a.location_id] || null,
        provider_name: providerMap[a.provider_id] || null,
      }));

      // Sort: upcoming first, then past
      const now2 = new Date();
      const upcoming = enriched
        .filter(a => new Date(a.start_time) >= now2)
        .sort((x, y) => new Date(x.start_time) - new Date(y.start_time));
      const past = enriched
        .filter(a => new Date(a.start_time) < now2)
        .sort((x, y) => new Date(y.start_time) - new Date(x.start_time));

      return Response.json({ upcoming, past });
    }

    if (action === 'get_lab_results') {
      // Only released results for this patient
      const results = await base44.asServiceRole.entities.Result.filter({
        patient_id: patient_id,
        status: 'Released',
      });

      // For each result, get lab entries
      const enriched = await Promise.all(results.map(async (r) => {
        const entries = await base44.asServiceRole.entities.LabResultEntry.filter({
          result_id: r.id,
        });
        return {
          id: r.id,
          result_type: r.result_type,
          result_date: r.result_date,
          narrative_text: r.narrative_text,
          status: r.status,
          entries: entries.map(e => ({
            test_name: e.test_name,
            test_code: e.test_code,
            value_numeric: e.value_numeric,
            value_text: e.value_text,
            unit: e.unit,
            reference_range_text: e.reference_range_text,
            is_abnormal: e.is_abnormal,
            abnormal_flag: e.abnormal_flag,
          })),
        };
      }));

      enriched.sort((a, b) => new Date(b.result_date) - new Date(a.result_date));
      return Response.json({ results: enriched });
    }

    if (action === 'get_medical_history') {
      // SOAP notes (only finalized/signed)
      const notes = await base44.asServiceRole.entities.SOAPNote.filter({
        patient_id: patient_id,
      });
      const visibleNotes = notes
        .filter(n => ['finalized', 'signed'].includes(n.status))
        .map(n => ({
          id: n.id,
          note_date: n.note_date,
          note_type: n.note_type,
          subjective: n.subjective,
          objective: n.objective,
          assessment: n.assessment,
          plan: n.plan,
          status: n.status,
        }))
        .sort((a, b) => new Date(b.note_date) - new Date(a.note_date));

      // Prescriptions
      const prescriptions = await base44.asServiceRole.entities.Prescription.filter({
        patient_id: patient_id,
      });
      const visibleRx = prescriptions
        .filter(p => ['Verified', 'Dispensed'].includes(p.status))
        .map(p => ({
          id: p.id,
          drug_name: p.drug_name,
          strength: p.strength,
          dosage_form: p.dosage_form,
          directions: p.directions,
          quantity: p.quantity,
          status: p.status,
          prescribed_date: p.prescribed_date,
        }))
        .sort((a, b) => new Date(b.prescribed_date) - new Date(a.prescribed_date));

      return Response.json({ notes: visibleNotes, prescriptions: visibleRx });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('patientPortalData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});