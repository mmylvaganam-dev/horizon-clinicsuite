import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch security-related data
        const [
            roles,
            permissions,
            rolePermissions,
            auditLogs,
            breakGlassLogs,
            releases,
            organizations
        ] = await Promise.all([
            base44.asServiceRole.entities.Role.list(),
            base44.asServiceRole.entities.Permission.list(),
            base44.asServiceRole.entities.RolePermission.list(),
            base44.asServiceRole.entities.AuditLog.list('-timestamp', 100),
            base44.asServiceRole.entities.BreakGlassLog.list('-started_at'),
            base44.asServiceRole.entities.ReleaseToPatient.list('-created_date', 100),
            base44.asServiceRole.entities.Organization.list()
        ]);

        // Analyze security posture
        const auditLoggingActive = auditLogs.length > 0;
        const breakGlassEnabled = breakGlassLogs.length > 0;
        const portalGatingActive = releases.length > 0;

        // High-risk permissions
        const highRiskPermissions = permissions.filter(p => 
            p.permission_name.toLowerCase().includes('export') ||
            p.permission_name.toLowerCase().includes('print') ||
            p.permission_name.toLowerCase().includes('delete') ||
            p.permission_name.toLowerCase().includes('void')
        );

        // Role analysis
        const roleAnalysis = roles.map(role => {
            const rolePerms = rolePermissions.filter(rp => rp.role_id === role.id);
            const perms = rolePerms.map(rp => permissions.find(p => p.id === rp.permission_id)).filter(Boolean);
            const highRiskPerms = perms.filter(p => highRiskPermissions.some(hr => hr.id === p.id));
            
            return {
                role_name: role.role_name,
                role_id: role.id,
                total_permissions: perms.length,
                high_risk_permissions: highRiskPerms.map(p => p.permission_name),
                risk_level: highRiskPerms.length > 3 ? 'HIGH' : highRiskPerms.length > 0 ? 'MEDIUM' : 'LOW'
            };
        });

        // Recent audit activity
        const last24hAudits = auditLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            const now = new Date();
            const hoursDiff = (now - logDate) / (1000 * 60 * 60);
            return hoursDiff <= 24;
        });

        // Recent break-glass activity
        const last30dBreakGlass = breakGlassLogs.filter(log => {
            const logDate = new Date(log.started_at);
            const now = new Date();
            const daysDiff = (now - logDate) / (1000 * 60 * 60 * 24);
            return daysDiff <= 30;
        });

        // Build report summary
        const reportSummary = {
            generated_at: new Date().toISOString(),
            generated_by: user.email,
            security_controls: {
                audit_logging: auditLoggingActive ? 'ACTIVE' : 'INACTIVE',
                break_glass_logging: breakGlassEnabled ? 'ENABLED' : 'NOT_USED',
                portal_result_gating: portalGatingActive ? 'ACTIVE' : 'NOT_USED'
            },
            role_analysis: roleAnalysis,
            high_risk_roles: roleAnalysis.filter(r => r.risk_level === 'HIGH').length,
            activity_metrics: {
                audit_logs_24h: last24hAudits.length,
                break_glass_events_30d: last30dBreakGlass.length,
                total_roles: roles.length,
                total_permissions: permissions.length
            },
            organizations_count: organizations.length,
            security_score: [
                auditLoggingActive,
                breakGlassEnabled || breakGlassLogs.length === 0,
                portalGatingActive,
                roleAnalysis.filter(r => r.risk_level === 'HIGH').length === 0
            ].filter(Boolean).length
        };

        // Create DocumentArtifact
        const artifact = await base44.asServiceRole.entities.DocumentArtifact.create({
            organization_id: '',
            location_id: '',
            patient_ref: '',
            artifact_type: 'security_report',
            source_type: 'SecurityPosture',
            source_id: 'system',
            file_ref: `security_report_${new Date().toISOString()}_${user.id}`,
            created_by: user.id,
            created_by_email: user.email,
            created_at: new Date().toISOString()
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: '',
            location_id: '',
            patient_id: '',
            module: 'SECURITY',
            action: 'generate_security_report',
            record_type: 'DocumentArtifact',
            record_id: artifact.id,
            metadata: {
                security_score: reportSummary.security_score,
                high_risk_roles: reportSummary.high_risk_roles,
                audit_logs_24h: reportSummary.activity_metrics.audit_logs_24h
            }
        });

        return Response.json({ artifact, summary: reportSummary });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});