import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { partner_code, period_start, period_end } = payload;

        // Get referrals for this partner code in the period
        const allReferrals = await base44.asServiceRole.entities.Referral.list();
        const periodReferrals = allReferrals.filter(r => {
            if (r.partner_code !== partner_code) return false;
            const refDate = new Date(r.created_at);
            return refDate >= new Date(period_start) && refDate <= new Date(period_end);
        });

        // Calculate total commission
        const totalAmount = periodReferrals.reduce((sum, r) => sum + (r.commission_amount || 0), 0);

        // Create settlement
        const settlement = await base44.asServiceRole.entities.Settlement.create({
            organization_id: '',
            partner_code,
            period_start,
            period_end,
            amount: totalAmount,
            status: 'draft',
            created_at: new Date().toISOString()
        });

        // Create settlement lines
        for (const referral of periodReferrals) {
            await base44.asServiceRole.entities.SettlementLine.create({
                settlement_id: settlement.id,
                referral_id: referral.id,
                ref_type: referral.ref_type || '',
                ref_id: referral.ref_id || '',
                amount: referral.commission_amount || 0
            });
        }

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_email: user.email,
            organization_id: '',
            location_id: '',
            patient_id: '',
            module: 'PARTNER_MANAGEMENT',
            action: 'generate_settlement',
            record_type: 'Settlement',
            record_id: settlement.id,
            metadata: {
                partner_code,
                period_start,
                period_end,
                amount: totalAmount,
                referral_count: periodReferrals.length
            }
        });

        return Response.json({ settlement, referral_count: periodReferrals.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});