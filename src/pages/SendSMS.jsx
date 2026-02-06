import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganization } from '@/components/OrganizationProvider';
import { Send, MessageSquare, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function SendSMS() {
  const { selectedOrgId } = useOrganization();
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState('');
  const [senderMask, setSenderMask] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    try {
      setSending(true);
      setResult(null);

      // Parse recipients (comma or newline separated)
      const mobileList = recipients
        .split(/[\n,]/)
        .map(m => m.trim())
        .filter(m => m.length > 0);

      if (mobileList.length === 0) {
        setResult({ error: 'Please enter at least one mobile number' });
        return;
      }

      if (message.trim().length === 0) {
        setResult({ error: 'Please enter a message' });
        return;
      }

      const response = await base44.functions.invoke('sendDialogSms', {
        mobiles: mobileList,
        message: message.trim(),
        sourceAddress: senderMask.trim() || undefined,
        organizationId: selectedOrgId
      });

      setResult(response.data);

      // Clear form on success
      if (response.data.status === 'success') {
        setRecipients('');
        setMessage('');
      }
    } catch (error) {
      setResult({ error: error.message || 'Failed to send SMS' });
    } finally {
      setSending(false);
    }
  };

  const handleTestSend = () => {
    // Pre-fill with a test number
    setRecipients('771234567');
    setMessage('Test message from Horizon ClinicSuite');
  };

  const messageLength = message.length;
  const smsCount = Math.ceil(messageLength / 160);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-teal-600" />
          Send SMS via Dialog eSMS
        </h1>
        <p className="text-slate-600 mt-2">
          Send bulk SMS messages to patients and customers
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
            <CardDescription>
              Enter mobile numbers (Sri Lankan format: 7XXXXXXXX) separated by commas or new lines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="recipients">Recipients *</Label>
              <Textarea
                id="recipients"
                placeholder="771234567, 772345678&#10;773456789"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                className="mt-2 min-h-[120px] font-mono"
              />
              <p className="text-sm text-slate-500 mt-1">
                {recipients.split(/[\n,]/).filter(m => m.trim().length > 0).length} recipient(s)
              </p>
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Enter your SMS message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 min-h-[150px]"
                maxLength={1000}
              />
              <div className="flex justify-between text-sm text-slate-500 mt-1">
                <span>{messageLength} characters</span>
                <span>{smsCount} SMS part(s)</span>
              </div>
            </div>

            <div>
              <Label htmlFor="mask">Sender Name (Optional)</Label>
              <Input
                id="mask"
                placeholder="e.g., ANANTHAM"
                value={senderMask}
                onChange={(e) => setSenderMask(e.target.value)}
                className="mt-2"
                maxLength={11}
              />
              <p className="text-sm text-slate-500 mt-1">
                Custom sender mask (max 11 characters)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSend}
                disabled={sending || !recipients || !message}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send SMS
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleTestSend}
                disabled={sending}
              >
                Load Test Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Alert variant={result.error || result.status === 'failed' ? 'destructive' : 'default'}>
            {result.error || result.status === 'failed' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <AlertDescription>
              {result.error ? (
                <div>
                  <strong>Error:</strong> {result.error}
                </div>
              ) : result.status === 'failed' ? (
                <div className="space-y-1">
                  <div><strong>Failed to send SMS</strong></div>
                  {result.errCode && <div>Error Code: {result.errCode}</div>}
                  {result.comment && <div>{result.comment}</div>}
                </div>
              ) : (
                <div className="space-y-1">
                  <div><strong>SMS sent successfully!</strong></div>
                  <div>Campaign ID: {result.campaignId}</div>
                  <div>Sent to {result.sentCount} recipient(s)</div>
                  {result.invalidMobiles && (
                    <div className="text-amber-600">
                      Invalid numbers skipped: {result.invalidMobiles.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}