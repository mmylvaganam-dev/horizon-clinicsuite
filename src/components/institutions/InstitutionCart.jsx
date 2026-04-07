import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';

export default function InstitutionCart({
  cart,
  institution,
  onRemove,
  onSubmit,
  isSubmitting,
  onClose,
}) {
  const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Shopping Cart</h2>
          <p className="text-slate-500">Review items and submit your order</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {item.name || item.drug_name}
                    </h3>
                    {item.strength && (
                      <p className="text-sm text-slate-500 mt-1">{item.strength}</p>
                    )}
                    {item.dosage_form && (
                      <Badge className="mt-2" variant="secondary">
                        {item.dosage_form}
                      </Badge>
                    )}
                  </div>

                  <div className="text-right space-y-2">
                    <p className="text-2xl font-bold text-blue-600">
                      Rs. {((item.price || 0) * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-500">
                      Rs. {(item.price || 0).toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onRemove(item.id)}
                  className="mt-4 flex items-center gap-2 text-red-600 hover:text-red-700 transition text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Institution Info */}
              <div className="pb-4 border-b border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                  Delivering To
                </p>
                <p className="font-semibold text-slate-900">
                  {institution.institution_name}
                </p>
                {institution.address && (
                  <p className="text-sm text-slate-600 mt-1">{institution.address}</p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Items ({cart.length})</span>
                  <span>Rs. {total.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">Rs. {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Credit Terms:</strong> {institution.credit_terms_days || 30} days
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={onSubmit}
                disabled={isSubmitting || cart.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Order
                  </>
                )}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Order will be reviewed by pharmacy staff
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}