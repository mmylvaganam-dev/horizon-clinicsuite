import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { appointmentData } = payload;

        // Create the appointment
        const appointment = await base44.asServiceRole.entities.Appointment.create(appointmentData);

        // Create status history
        await base44.asServiceRole.entities.AppointmentStatusHistory.create({
            appointment_id: appointment.id,
            previous_status: null,
            new_status: appointmentData.status || 'scheduled',
            changed_by: user.id,
            changed_by_email: user.email,
            changed_at: new Date().toISOString(),
            reason: 'Initial creation'
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: appointmentData.organization_id || '',
            location_id: appointmentData.location_id || '',
            patient_id: appointmentData.patient_id,
            module: 'APPOINTMENTS',
            action: 'create',
            record_type: 'Appointment',
            record_id: appointment.id,
            metadata: {
                provider_id: appointmentData.provider_id,
                start_time: appointmentData.start_time,
                status: appointmentData.status || 'scheduled',
                type: appointmentData.type
            }
        });

        return Response.json({ appointment });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});