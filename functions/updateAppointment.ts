import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { appointmentId, updates, reason } = payload;

        // Get existing appointment
        const existingAppointments = await base44.asServiceRole.entities.Appointment.filter({ id: appointmentId });
        const existingAppointment = existingAppointments[0];

        if (!existingAppointment) {
            return Response.json({ error: 'Appointment not found' }, { status: 404 });
        }

        // Update the appointment
        const updatedAppointment = await base44.asServiceRole.entities.Appointment.update(appointmentId, updates);

        // If status changed, create status history
        if (updates.status && updates.status !== existingAppointment.status) {
            await base44.asServiceRole.entities.AppointmentStatusHistory.create({
                appointment_id: appointmentId,
                previous_status: existingAppointment.status,
                new_status: updates.status,
                changed_by: user.id,
                changed_by_email: user.email,
                changed_at: new Date().toISOString(),
                reason: reason || 'Status update',
                notes: updates.notes || ''
            });
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: existingAppointment.organization_id || '',
            location_id: existingAppointment.location_id || '',
            patient_id: existingAppointment.patient_id,
            module: 'APPOINTMENTS',
            action: 'update',
            record_type: 'Appointment',
            record_id: appointmentId,
            metadata: {
                updates,
                previous_status: existingAppointment.status,
                new_status: updates.status || existingAppointment.status,
                reason
            }
        });

        return Response.json({ appointment: updatedAppointment });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});