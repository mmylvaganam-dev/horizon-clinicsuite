import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all relevant data
        const [
            organizations,
            modules,
            orgModuleAccess,
            users,
            roles,
            patients,
            orders,
            results,
            invoices,
            auditLogs,
            backupLogs,
            appVersions
        ] = await Promise.all([
            base44.asServiceRole.entities.Organization.list(),
            base44.asServiceRole.entities.Module.list(),
            base44.asServiceRole.entities.OrganizationModuleAccess.list(),
            base44.asServiceRole.entities.User.list(),
            base44.asServiceRole.entities.Role.list(),
            base44.asServiceRole.entities.Patient.list(),
            base44.asServiceRole.entities.Order.list(),
            base44.asServiceRole.entities.Result.list(),
            base44.asServiceRole.entities.Invoice.list(),
            base44.asServiceRole.entities.AuditLog.list(),
            base44.asServiceRole.entities.BackupRunLog.list(),
            base44.asServiceRole.entities.AppVersion.list()
        ]);

        // Calculate audit events in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentAuditLogs = auditLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= thirtyDaysAgo;
        });

        // Module enablement by organization
        const moduleEnablement = {};
        organizations.forEach(org => {
            const orgAccess = orgModuleAccess.filter(a => a.organization_id === org.id);
            moduleEnablement[org.name] = orgAccess.map(a => {
                const module = modules.find(m => m.id === a.module_id);
                return module ? module.module_name : 'Unknown';
            });
        });

        // User/role counts
        const userRoleCounts = {};
        roles.forEach(role => {
            const userCount = users.filter(u => u.role === role.role_name).length;
            userRoleCounts[role.role_name] = userCount;
        });

        // Data volume counts
        const dataVolume = {
            patients: patients.length,
            orders: orders.length,
            results: results.length,
            invoices: invoices.length,
            results_by_type: {
                lab: results.filter(r => r.result_type === 'LAB').length,
                cardio: results.filter(r => r.result_type === 'CARDIO').length,
                pft: results.filter(r => r.result_type === 'PFT').length,
                radiology: results.filter(r => r.result_type === 'RADIOLOGY').length
            }
        };

        // Backup summary
        const successfulBackups = backupLogs.filter(b => b.status === 'success');
        const failedBackups = backupLogs.filter(b => b.status === 'fail');
        const backupSummary = {
            total: backupLogs.length,
            successful: successfulBackups.length,
            failed: failedBackups.length,
            last_successful: successfulBackups.length > 0 ? successfulBackups[0].completed_at : null
        };

        // Current version
        const currentVersion = appVersions.find(v => v.is_current) || appVersions[0];

        const summary = {
            version: currentVersion ? currentVersion.version_tag : 'v1.0',
            version_name: currentVersion ? currentVersion.version_name : 'Asia ClinicSuite',
            generated_at: new Date().toISOString(),
            organizations: organizations.length,
            module_enablement: moduleEnablement,
            users: users.length,
            user_role_counts: userRoleCounts,
            data_volume: dataVolume,
            audit_events_last_30_days: recentAuditLogs.length,
            backup_summary: backupSummary
        };

        // Create DocumentArtifact
        const artifact = await base44.asServiceRole.entities.DocumentArtifact.create({
            organization_id: '',
            location_id: '',
            patient_ref: '',
            artifact_type: 'other',
            source_type: 'SystemSummary',
            source_id: 'v1_summary_' + Date.now(),
            file_ref: `system_summary_v1_${Date.now()}.json`,
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString(),
            metadata_json: {
                report_type: 'system_summary_v1',
                summary
            }
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: '',
            location_id: '',
            patient_id: '',
            module: 'ADMIN',
            action: 'generate_system_summary',
            record_type: 'DocumentArtifact',
            record_id: artifact.id,
            metadata: {
                version: summary.version,
                organizations: summary.organizations,
                users: summary.users
            }
        });

        return Response.json({ summary, artifact_id: artifact.id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});