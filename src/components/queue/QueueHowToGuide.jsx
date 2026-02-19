import React, { useState } from 'react';
import { Info, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  { letter: 'A', title: 'Create a Counter', detail: 'Click "Add Counter" → give it a name (e.g. "OPD Counter 1"), pick a type (OPD, Lab, Pharmacy…), set a unique code (e.g. OPD1) and a token prefix (e.g. A). Tokens will auto-number as A001, A002…' },
  { letter: 'B', title: 'Activate the Counter', detail: 'In the Counters tab, your new counter is Active by default. You can Pause it (stops new calls but keeps the queue) or set it Inactive to hide it. Edit any counter with the ⚙ button.' },
  { letter: 'C', title: 'Open the Display Board', detail: 'Click "Display Board" to open the full-screen TV view in a new tab. Put that tab on a TV or screen in your waiting area — it refreshes in real time and flashes when a new token is called.' },
  { letter: 'D', title: 'Issue a Token', detail: 'On the Live Queue tab, click "+ Issue Token" on any counter. Search for a registered patient (optional), link today\'s appointment (optional), set priority (Normal / Urgent / Elderly) and click Issue. The token number is assigned automatically.' },
  { letter: 'E', title: 'Call a Patient', detail: 'In the Waiting Queue column, click "Call" on any token. The status changes to Called and the Display Board instantly shows that token number. The patient sees their number on the screen and knows to come in.' },
  { letter: 'F', title: 'Start Serving', detail: 'Once the patient is at the counter, click "Serving". This records the served_at timestamp for wait-time analytics.' },
  { letter: 'G', title: 'Complete or Skip', detail: 'Click "Complete" when done — the token moves to Completed and wait time is logged. Click "Skip" if the patient didn\'t show up — they appear in the Skipped column and can be recalled later.' },
  { letter: 'H', title: 'Recall a Skipped Token', detail: 'In the Skipped / No Show column, click "Recall" to move the token back to Waiting so staff can call them again.' },
  { letter: 'I', title: 'Monitor with Today\'s Log', detail: 'Switch to the "Today\'s Log" tab to see every token issued today across all counters — with patient name, status, priority, and completion time. Great for shift reviews.' },
];

export default function QueueHowToGuide() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  return (
    <>
      {/* Trigger banner */}
      <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
        <Info className="w-5 h-5 text-teal-600 flex-shrink-0" />
        <p className="text-sm text-teal-800 flex-1">
          New to Queue Management? Learn how to set up and operate queues from A–Z.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-semibold text-teal-700 hover:text-teal-900 underline underline-offset-2 whitespace-nowrap"
        >
          View Guide
        </button>
      </div>

      {/* Full guide overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-8 bottom-8 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold">Queue Management — A to Z Guide</h2>
                  <p className="text-teal-200 text-sm mt-0.5">Everything you need to set up and run a queue</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Steps */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {steps.map((step) => (
                  <div
                    key={step.letter}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(expanded === step.letter ? null : step.letter)}
                      className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 font-bold text-lg flex items-center justify-center flex-shrink-0">
                        {step.letter}
                      </span>
                      <span className="font-semibold text-slate-800 flex-1">{step.title}</span>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded === step.letter ? 'rotate-90' : ''}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded === step.letter && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50">
                            {step.detail}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t text-center">
                <button onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-700 underline">
                  Close guide
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}