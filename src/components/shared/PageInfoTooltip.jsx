import React from 'react';
import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export default function PageInfoTooltip({ title, description, useCases = [], bestPractices = [] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Info className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-lg text-slate-900 mb-1">{title}</h4>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
          
          {useCases.length > 0 && (
            <div>
              <h5 className="font-semibold text-sm text-slate-900 mb-2">When to Use:</h5>
              <ul className="space-y-1">
                {useCases.map((useCase, idx) => (
                  <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {bestPractices.length > 0 && (
            <div>
              <h5 className="font-semibold text-sm text-slate-900 mb-2">Best Practices:</h5>
              <ul className="space-y-1">
                {bestPractices.map((practice, idx) => (
                  <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{practice}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}