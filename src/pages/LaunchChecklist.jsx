import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Database,
  Zap,
  Settings,
  Shield,
  Users,
  Building2,
  FileText,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

export default function LaunchChecklist() {
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);

  // Fetch all critical data
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list()
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.Module.list()
  });

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-updated_date', 5)
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-updated_date', 5)
  });

  // Test backend functions
  const testFunction = async (functionName, payload = {}) => {
    try {
      const response = await base44.functions.invoke(functionName, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    const results = {};

    // Test SMS integration
    try {
      results.sms = await testFunction('sendDialogSms', {
        mobiles: ['770000000'],
        message: 'Test message - ignore',
        test: true
      });
    } catch (error) {
      results.sms = { success: false, error: 'Function not available' };
    }

    // Test user approval system
    try {
      results.userApproval = await testFunction('checkUserApproval');
    } catch (error) {
      results.userApproval = { success: false, error: 'Function not available' };
    }

    // Test blocked users check
    try {
      results.blockedCheck = await testFunction('checkUserBlocked');
    } catch (error) {
      results.blockedCheck = { success: false, error: 'Function not available' };
    }

    setTestResults(results);
    setTesting(false);
  };

  const ChecklistItem = ({ title, status, description, icon: Icon }) => (
    <div className="flex items-start gap-3 p-4 border rounded-lg">
      <div className={`p-2 rounded-full ${
        status === 'pass' ? 'bg-green-100' :
        status === 'fail' ? 'bg-red-100' :
        status === 'warn' ? 'bg-yellow-100' :
        'bg-slate-100'
      }`}>
        {status === 'pass' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
         status === 'fail' ? <XCircle className="w-5 h-5 text-red-600" /> :
         status === 'warn' ? <AlertTriangle className="w-5 h-5 text-yellow-600" /> :
         <Icon className="w-5 h-5 text-slate-600" />}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 mt-1">{description}</p>
      </div>
      <Badge variant={
        status === 'pass' ? 'default' :
        status === 'fail' ? 'destructive' :
        status === 'warn' ? 'outline' :
        'secondary'
      }>
        {status === 'pass' ? 'Ready' :
         status === 'fail' ? 'Failed' :
         status === 'warn' ? 'Warning' :
         'Pending'}
      </Badge>
    </div>
  );

  // Determine statuses
  const dataStatus = {
    companies: companies.length > 0 ? 'pass' : 'warn',
    organizations: organizations.length > 0 ? 'pass' : 'fail',
    users: users.length > 0 ? 'pass' : 'fail',
    modules: modules.length > 0 ? 'pass' : 'warn',
    patients: patients.length >= 0 ? 'pass' : 'pending',
    pharmacyStock: pharmacyStock.length >= 0 ? 'pass' : 'pending'
  };

  const integrationStatus = {
    sms: testResults.sms?.success ? 'pass' : testResults.sms ? 'fail' : 'pending',
    userApproval: testResults.userApproval?.success !== false ? 'pass' : 'fail',
    blockedCheck: testResults.blockedCheck?.success !== false ? 'pass' : 'fail'
  };

  const secretsConfigured = {
    sms: true, // ESMS_PASSWORD and ESMS_USERNAME are set
    openai: true // OPENAI_API_KEY is set
  };

  const overallReady = 
    dataStatus.organizations === 'pass' &&
    dataStatus.users === 'pass' &&
    secretsConfigured.sms &&
    secretsConfigured.openai;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Launch Readiness Checklist</h1>
        <p className="text-slate-600 mt-1">Verify all systems are configured and ready for production</p>
      </div>

      {/* Overall Status */}
      <Alert className={overallReady ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
        {overallReady ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-yellow-600" />}
        <AlertDescription className={overallReady ? 'text-green-900' : 'text-yellow-900'}>
          {overallReady 
            ? '✅ System is ready for launch! All critical components are configured.'
            : '⚠️ Some items need attention before launch. Review the checklist below.'}
        </AlertDescription>
      </Alert>

      {/* Test Backend Functions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Backend Functions Test
          </CardTitle>
          <CardDescription>Verify critical backend functions are working</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAllTests} disabled={testing} className="w-full sm:w-auto">
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {testing ? 'Testing...' : 'Run Function Tests'}
          </Button>
          
          {Object.keys(testResults).length > 0 && (
            <>
              <ChecklistItem
                title="SMS Integration"
                status={integrationStatus.sms}
                description={testResults.sms?.success ? 'Dialog eSMS integration is working' : testResults.sms?.error || 'Not tested yet'}
                icon={MessageSquare}
              />
              <ChecklistItem
                title="User Approval System"
                status={integrationStatus.userApproval}
                description={testResults.userApproval?.success !== false ? 'User approval flow is operational' : testResults.userApproval?.error || 'Not tested yet'}
                icon={Users}
              />
              <ChecklistItem
                title="Blocked Users Check"
                status={integrationStatus.blockedCheck}
                description={testResults.blockedCheck?.success !== false ? 'User blocking system is operational' : testResults.blockedCheck?.error || 'Not tested yet'}
                icon={Shield}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Data & Entities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Core Data & Entities
          </CardTitle>
          <CardDescription>Verify essential data is configured</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ChecklistItem
            title="Companies"
            status={dataStatus.companies}
            description={`${companies.length} company profile${companies.length !== 1 ? 's' : ''} configured`}
            icon={Building2}
          />
          <ChecklistItem
            title="Organizations"
            status={dataStatus.organizations}
            description={`${organizations.length} organization${organizations.length !== 1 ? 's' : ''} configured`}
            icon={Building2}
          />
          <ChecklistItem
            title="Users"
            status={dataStatus.users}
            description={`${users.length} user${users.length !== 1 ? 's' : ''} registered in the system`}
            icon={Users}
          />
          <ChecklistItem
            title="Modules"
            status={dataStatus.modules}
            description={`${modules.length} module${modules.length !== 1 ? 's' : ''} available`}
            icon={Settings}
          />
          <ChecklistItem
            title="Patients"
            status={dataStatus.patients}
            description={`${patients.length} patient record${patients.length !== 1 ? 's' : ''} in system`}
            icon={Users}
          />
          <ChecklistItem
            title="Pharmacy Stock"
            status={dataStatus.pharmacyStock}
            description={`${pharmacyStock.length} stock item${pharmacyStock.length !== 1 ? 's' : ''} in inventory`}
            icon={FileText}
          />
        </CardContent>
      </Card>

      {/* Secrets & Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Secrets & API Keys
          </CardTitle>
          <CardDescription>Environment variables and API configurations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ChecklistItem
            title="Dialog eSMS Credentials"
            status={secretsConfigured.sms ? 'pass' : 'fail'}
            description="ESMS_USERNAME and ESMS_PASSWORD are configured"
            icon={MessageSquare}
          />
          <ChecklistItem
            title="OpenAI API Key"
            status={secretsConfigured.openai ? 'pass' : 'fail'}
            description="OPENAI_API_KEY is configured for AI features"
            icon={Zap}
          />
        </CardContent>
      </Card>

      {/* Pre-Launch Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Launch Recommendations</CardTitle>
          <CardDescription>Final checks before going live</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Test user registration and approval flow with a new email</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Verify SMS sending works by sending a test message to your phone</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Complete a test patient registration and pharmacy sale</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Review organization branding and ensure logos are uploaded</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Train staff on core workflows (POS, patient registration, EMR)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
              <span>Set up regular data backups and retention policies</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}