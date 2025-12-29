import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const validationResults = {
            timestamp: new Date().toISOString(),
            validator: user.email,
            checks: []
        };

        // 1. Check portal release gating
        const releaseRecords = await base44.asServiceRole.entities.ReleaseToPatient.list();
        const portalReleaseCheck = {
            check: 'portal_release_gating',
            status: 'pass',
            message: `ReleaseToPatient entity active with ${releaseRecords.length} release records`
        };
        validationResults.checks.push(portalReleaseCheck);

        // 2. Check organization scoping in entities
        const patients = await base44.asServiceRole.entities.Patient.list();
        const patientsWithOrg = patients.filter(p => p.organization_id).length;
        const orgScopingCheck = {
            check: 'organization_scoping',
            status: patientsWithOrg > 0 ? 'pass' : 'warn',
            message: `${patientsWithOrg} of ${patients.length} patients have organization_id`
        };
        validationResults.checks.push(orgScopingCheck);

        // 3. Check audit logging
        const auditLogs = await base44.asServiceRole.entities.AuditLog.list();
        const auditCheck = {
            check: 'audit_logging',
            status: auditLogs.length > 0 ? 'pass' : 'warn',
            message: `${auditLogs.length} audit log entries present`
        };
        validationResults.checks.push(auditCheck);

        // 4. Check export controls
        const exportBundles = await base44.asServiceRole.entities.ExportBundle.list();
        const exportsWithReason = exportBundles.filter(e => e.export_reason).length;
        const exportCheck = {
            check: 'export_controls',
            status: exportsWithReason === exportBundles.length || exportBundles.length === 0 ? 'pass' : 'warn',
            message: `${exportsWithReason} of ${exportBundles.length} exports have mandatory reason`
        };
        validationResults.checks.push(exportCheck);

        // 5. Check RBAC infrastructure
        const roles = await base44.asServiceRole.entities.Role.list();
        const permissions = await base44.asServiceRole.entities.Permission.list();
        const rbacCheck = {
            check: 'rbac_infrastructure',
            status: roles.length > 0 && permissions.length > 0 ? 'pass' : 'warn',
            message: `${roles.length} roles and ${permissions.length} permissions defined`
        };
        validationResults.checks.push(rbacCheck);

        // 6. Check retention and archive
        const retentionPolicies = await base44.asServiceRole.entities.RetentionPolicy.list();
        const archiveRecords = await base44.asServiceRole.entities.ArchiveRecord.list();
        const retentionCheck = {
            check: 'retention_compliance',
            status: retentionPolicies.length > 0 ? 'pass' : 'warn',
            message: `${retentionPolicies.length} retention policies, ${archiveRecords.length} archived records`
        };
        validationResults.checks.push(retentionCheck);

        // 7. Check backup status
        const backupLogs = await base44.asServiceRole.entities.BackupRunLog.list();
        const successfulBackups = backupLogs.filter(b => b.status === 'completed').length;
        const backupCheck = {
            check: 'backup_status',
            status: successfulBackups > 0 ? 'pass' : 'warn',
            message: `${successfulBackups} successful backups logged`
        };
        validationResults.checks.push(backupCheck);

        // Overall status
        const allPass = validationResults.checks.every(c => c.status === 'pass');
        validationResults.overall_status = allPass ? 'PASS' : 'REVIEW_REQUIRED';
        validationResults.production_ready = allPass;

        // Audit log this validation
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: '',
            location_id: '',
            patient_id: '',
            module: 'ADMIN',
            action: 'security_validation',
            record_type: 'SystemValidation',
            record_id: '',
            metadata: {
                checks_run: validationResults.checks.length,
                overall_status: validationResults.overall_status
            }
        });

        return Response.json(validationResults);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});