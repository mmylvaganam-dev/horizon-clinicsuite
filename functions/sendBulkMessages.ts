import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { templateId, recipientFilter } = payload;

        // Get template
        const templates = await base44.asServiceRole.entities.MessageTemplate.filter({ id: templateId });
        const template = templates[0];

        if (!template) {
            return Response.json({ error: 'Template not found' }, { status: 404 });
        }

        // Get patients
        let patients = await base44.asServiceRole.entities.Patient.list();
        
        if (recipientFilter === 'active') {
            patients = patients.filter(p => p.status === 'active');
        }

        // Get consents
        const consents = await base44.asServiceRole.entities.PortalConsent.filter({
            consent_type: `communications_${template.channel}`
        });

        // Get opt-outs
        const optOuts = await base44.asServiceRole.entities.OptOutLog.list();

        let sent = 0;
        let skipped = 0;

        for (const patient of patients) {
            // Check consent
            const hasConsent = consents.some(c => 
                c.patient_ref === patient.id && c.status === true
            );

            // Check opt-out
            const hasOptedOut = optOuts.some(o => 
                o.recipient_ref === patient.id && 
                (o.channel === template.channel || o.channel === 'all')
            );

            if (!hasConsent || hasOptedOut) {
                skipped++;
                continue;
            }

            // Get recipient contact
            const recipientContact = template.channel === 'email' 
                ? patient.email 
                : patient.phone;

            if (!recipientContact) {
                skipped++;
                continue;
            }

            // Replace variables in template
            let body = template.body
                .replace(/{{patient_name}}/g, `${patient.first_name} ${patient.last_name}`)
                .replace(/{{first_name}}/g, patient.first_name);

            let subject = template.subject || '';
            if (subject) {
                subject = subject
                    .replace(/{{patient_name}}/g, `${patient.first_name} ${patient.last_name}`)
                    .replace(/{{first_name}}/g, patient.first_name);
            }

            // Create outbound message
            await base44.asServiceRole.entities.OutboundMessage.create({
                organization_id: template.organization_id || '',
                channel: template.channel,
                recipient_ref: patient.id,
                recipient_contact: recipientContact,
                template_id: templateId,
                subject,
                body,
                status: 'sent',
                sent_at: new Date().toISOString(),
                metadata_json: {
                    bulk_send: true,
                    sent_by: user.id
                }
            });

            sent++;
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: template.organization_id || '',
            location_id: '',
            patient_id: '',
            module: 'COMMUNICATIONS',
            action: 'bulk_send',
            record_type: 'OutboundMessage',
            record_id: templateId,
            metadata: {
                template_id: templateId,
                template_name: template.name,
                channel: template.channel,
                sent_count: sent,
                skipped_count: skipped,
                recipient_filter: recipientFilter
            }
        });

        return Response.json({ sent, skipped });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});