import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * LabReportPrint - renders a printable lab report matching the Wayamba diagnostic lab format.
 * Props:
 *   reportData: { result, entries, order, patient, branding, specimen }
 *   reportUrl: string  (URL for "Scan to view" QR)
 *   profileUrl: string (URL for "Profile Login" QR)
 */
export default function LabReportPrint({ reportData, reportUrl, profileUrl }) {
  if (!reportData) return null;
  const { result, entries = [], order = {}, patient = {}, branding = {}, specimen = {} } = reportData;

  const orgName = branding.app_display_name || 'Medical Laboratory';
  const orgAddress = branding.address || '';
  const orgPhone = branding.phone_number || '';
  const orgEmail = branding.email || '';
  const orgWebsite = branding.website || '';
  const orgLogo = branding.primary_logo_file_ref || null;

  const patientName = patient.first_name ? `${patient.first_name} ${patient.last_name}`.toUpperCase() : '—';
  const age = patient.date_of_birth
    ? `${Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 3600 * 1000))} Years`
    : '—';
  const sex = patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '—';
  const specimenType = specimen.specimen_type || result.specimen_type || order.specimen_type || 'Blood';

  const fmt = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} / ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}:${String(dt.getSeconds()).padStart(2,'0')}`;
  };

  const printedOn = new Date().toLocaleDateString('en-GB', { year:'numeric', month:'2-digit', day:'2-digit' }) + ' ' +
    new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false });

  // Group entries by panel name if available, else single group using result test_name
  const panelTitle = result.test_name || result.narrative_text?.split('\n')[0] || 'LAB RESULTS';
  const hasNarrativeNotes = result.narrative_text && result.narrative_text.trim().length > 0;

  // Always show ref range column
  const hasRefRange = true;

  return (
    <div
      id="lab-report-print-root"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        background: '#fff',
        color: '#000',
        padding: '8mm 10mm',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* ═══════════ HEADER ═══════════ */}
      <table style={{ width:'100%', borderBottom:'2px solid #1a3c8f', marginBottom:'4px' }}>
        <tbody>
          <tr>
            <td style={{ width:'80px', verticalAlign:'middle', paddingRight:'10px' }}>
              {orgLogo ? (
                <img src={orgLogo} alt="Logo" style={{ width:'72px', height:'auto' }} />
              ) : (
                <div style={{ width:'72px', height:'60px', background:'#1a3c8f', borderRadius:'4px',
                  display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'18px', fontWeight:'bold' }}>
                  {orgName.substring(0,2).toUpperCase()}
                </div>
              )}
            </td>
            <td style={{ verticalAlign:'middle', textAlign:'center' }}>
              <div style={{ fontSize:'22px', fontWeight:'bold', color:'#1a3c8f', lineHeight:1.2 }}>
                {orgName}
              </div>
              {branding.footer_text && (
                <div style={{ fontSize:'10px', fontStyle:'italic', color:'#333', marginTop:'2px' }}>
                  {branding.footer_text}
                </div>
              )}
            </td>
            <td style={{ width:'100px', verticalAlign:'top', textAlign:'right' }}>
              {/* External Quality Assurance badge */}
              <div style={{ border:'1px solid #ccc', borderRadius:'4px', padding:'2px 6px', fontSize:'8px', color:'#555', textAlign:'center' }}>
                <div style={{ fontWeight:'bold', fontSize:'9px' }}>External Quality</div>
                <div style={{ fontWeight:'bold', fontSize:'9px' }}>Assurance</div>
                <div style={{ background:'#e60000', color:'#fff', fontWeight:'bold', fontSize:'10px', padding:'1px 4px', borderRadius:'2px', margin:'2px 0' }}>BIO-RAD</div>
                <div style={{ fontWeight:'bold', fontSize:'10px', letterSpacing:'1px' }}>RIQAS</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Address line */}
      <div style={{ fontSize:'9px', color:'#333', marginBottom:'2px' }}>
        {orgAddress && <span>{orgAddress}. </span>}
        {orgPhone && <span>Tel: {orgPhone}. </span>}
        {orgEmail && <span>E-mail: {orgEmail}. </span>}
        {orgWebsite && <span>Web Site: {orgWebsite}</span>}
      </div>
      {branding.secondary_logo_file_ref && (
        <div style={{ fontSize:'9px', color:'#333', marginBottom:'1px' }}>
          Business Registration: {branding.secondary_logo_file_ref}
        </div>
      )}
      <div style={{ textAlign:'center', fontWeight:'bold', fontSize:'10px', color:'#c00', marginBottom:'6px' }}>
        Confidential Medical Laboratory Report
      </div>

      {/* ═══════════ PATIENT INFO TABLE ═══════════ */}
      <table style={{ width:'100%', border:'1px solid #555', borderCollapse:'collapse', marginBottom:'6px', fontSize:'10px' }}>
        <tbody>
          <tr>
            <td style={{ padding:'3px 6px', borderRight:'1px solid #555', width:'50%', verticalAlign:'top' }}>
              <table style={{ width:'100%' }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight:'bold', width:'110px', paddingRight:'4px' }}>Patient Name</td>
                    <td>: {patientName}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:'bold' }}>Age / Sex</td>
                    <td>: {age} / {sex}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:'bold' }}>Sample ID / Ref</td>
                    <td>: {result.accession_number || order.id?.substring(0,8) || '—'} / {patient.phn || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:'bold' }}>Institute</td>
                    <td>: {orgName.toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:'bold' }}>Ref. Doctor</td>
                    <td>: {order.ordered_by || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td style={{ padding:'3px 6px', width:'50%', verticalAlign:'top' }}>
              <table style={{ width:'100%' }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight:'bold', width:'140px' }}>Patient ID / Billing ID</td>
                    <td>: {patient.mrn || patient.id?.substring(0,8) || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:'bold' }}>Passport / NIC</td>
                    <td>: {patient.nic || patient.passport_number || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:'bold' }}>Sample Collected On</td>
                    <td>: {fmt(specimen.collected_at || order.ordered_at)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:'bold' }}>Registration On</td>
                    <td>: {fmt(result.created_date || order.ordered_at)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:'bold' }}>Reported On</td>
                    <td>: {fmt(result.result_date || result.updated_date)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight:'bold' }}>Specimen</td>
                    <td>: {specimenType}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Analyzer note */}
      {order.notes && (
        <div style={{ fontSize:'9px', color:'#444', marginBottom:'4px' }}>{order.notes}</div>
      )}

      {/* ═══════════ PANEL TITLE ═══════════ */}
      <div style={{
        background:'#e8e8e8', border:'1px solid #555', borderBottom:'none',
        textAlign:'center', fontWeight:'bold', fontSize:'11px',
        padding:'3px', marginBottom:'0'
      }}>
        {panelTitle.toUpperCase()}
      </div>

      {/* ═══════════ RESULTS TABLE ═══════════ */}
      <table style={{ width:'100%', borderCollapse:'collapse', border:'1px solid #555', marginBottom:'6px', fontSize:'10px' }}>
        <thead>
          <tr style={{ background:'#f0f0f0' }}>
            <th style={{ border:'1px solid #555', padding:'3px 6px', textAlign:'left', width:'35%' }}>DESCRIPTION</th>
            <th style={{ border:'1px solid #555', padding:'3px 6px', textAlign:'center', width:'15%' }}>RESULT</th>
            <th style={{ border:'1px solid #555', padding:'3px 6px', textAlign:'center', width:'15%' }}>UNITS</th>
            {hasRefRange && (
              <th style={{ border:'1px solid #555', padding:'3px 6px', textAlign:'center', width:'20%' }}>REF.RANGE</th>
            )}
            <th style={{ border:'1px solid #555', padding:'3px 6px', textAlign:'center', width:'15%' }}>REMARKS</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && result.structured_json ? (
            // Fallback: render from structured_json
            Object.entries(result.structured_json).map(([key, val], i) => (
              <tr key={i}>
                <td style={{ border:'1px solid #555', padding:'3px 8px' }}>{key}</td>
                <td style={{ border:'1px solid #555', padding:'3px 8px', textAlign:'center', fontWeight:'bold' }}>{String(val)}</td>
                <td style={{ border:'1px solid #555', padding:'3px 8px', textAlign:'center' }}>—</td>
                {hasRefRange && <td style={{ border:'1px solid #555', padding:'3px 8px', textAlign:'center' }}>—</td>}
                <td style={{ border:'1px solid #555', padding:'3px 8px', textAlign:'center' }}>—</td>
              </tr>
            ))
          ) : (
            (() => {
              // Sort by sort_order if present
              const sorted = [...entries].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
              const rows = [];
              let lastSubGroup = null;
              sorted.forEach((entry, i) => {
                // Insert sub-group header row when sub_group changes
                if (entry.sub_group && entry.sub_group !== lastSubGroup) {
                  lastSubGroup = entry.sub_group;
                  rows.push(
                    <tr key={`sg-${i}`}>
                      <td colSpan={hasRefRange ? 5 : 4} style={{
                        border:'1px solid #555', padding:'3px 8px',
                        fontWeight:'bold', fontStyle:'italic',
                        textDecoration:'underline', background:'#f5f5f5',
                        fontSize:'10px'
                      }}>
                        {entry.sub_group}
                      </td>
                    </tr>
                  );
                } else if (!entry.sub_group) {
                  lastSubGroup = null;
                }

                const isAbnormal = entry.is_abnormal;
                const resultVal = entry.value_text || (entry.value_numeric !== undefined && entry.value_numeric !== null ? String(entry.value_numeric) : '—');
                const remarks = isAbnormal
                  ? (entry.abnormal_flag === 'high' ? 'High' : entry.abnormal_flag === 'low' ? 'Low' : entry.abnormal_flag === 'critical_high' ? 'Critical High' : entry.abnormal_flag === 'critical_low' ? 'Critical Low' : 'Abnormal')
                  : 'Normal';
                rows.push(
                  <tr key={i} style={{ background: isAbnormal ? '#fff3f3' : 'white' }}>
                    <td style={{ border:'1px solid #555', padding:'3px 8px', fontWeight: isAbnormal ? 'bold' : 'normal' }}>
                      {entry.test_name}
                    </td>
                    <td style={{ border:'1px solid #555', padding:'3px 8px', textAlign:'center',
                      fontWeight:'bold', color: isAbnormal ? '#c00' : '#000' }}>
                      {resultVal}
                    </td>
                    <td style={{ border:'1px solid #555', padding:'3px 8px', textAlign:'center' }}>
                      {entry.unit || '—'}
                    </td>
                    {hasRefRange && (
                      <td style={{ border:'1px solid #555', padding:'3px 8px', textAlign:'center' }}>
                        {entry.reference_range_text || '—'}
                      </td>
                    )}
                    <td style={{ border:'1px solid #555', padding:'3px 8px', textAlign:'center',
                      color: isAbnormal ? '#c00' : '#060', fontWeight: isAbnormal ? 'bold' : 'normal' }}>
                      {entry.notes || remarks}
                    </td>
                  </tr>
                );
              });
              return rows;
            })()
          )}
        </tbody>
      </table>

      {/* ═══════════ EXPECTED VALUES / REFERENCE RANGES (when structured per-test ranges exist) ═══════════ */}
      {entries.some(e => e.reference_ranges_json || e.expected_values_text) && (
        <div style={{ marginBottom:'8px' }}>
          {entries.filter(e => e.reference_ranges_json || e.expected_values_text).map((entry, i) => (
            <div key={i} style={{ marginBottom:'6px' }}>
              <div style={{ fontWeight:'bold', fontSize:'10px', marginBottom:'3px', textDecoration:'underline' }}>
                EXPECTED VALUES{entries.length > 1 ? ` — ${entry.test_name}` : ''}
              </div>
              {entry.expected_values_text ? (
                <div style={{ fontSize:'9px', lineHeight:'1.8', paddingLeft:'8px' }}>
                  {entry.expected_values_text.split('\n').map((line, li) => (
                    <div key={li}>{line}</div>
                  ))}
                </div>
              ) : entry.reference_ranges_json ? (
                <table style={{ fontSize:'9px', borderCollapse:'collapse', marginLeft:'8px' }}>
                  <tbody>
                    {Object.entries(entry.reference_ranges_json).map(([range, label], ri) => (
                      <tr key={ri}>
                        <td style={{ paddingRight:'24px', width:'120px' }}>{range}</td>
                        <td style={{ fontWeight:'bold' }}>{label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ NARRATIVE NOTES (GFR-style long text) ═══════════ */}
      {hasNarrativeNotes && (
        <div style={{ border:'1px solid #aaa', padding:'6px 8px', marginBottom:'6px', fontSize:'9px', lineHeight:'1.5' }}>
          {result.narrative_text.split('\n').map((line, i) => (
            <div key={i} style={{ marginBottom: line.trim() === '' ? '4px' : '0' }}>{line || <br/>}</div>
          ))}
        </div>
      )}

      {/* ═══════════ PHYSICIAN / CLINICAL NOTES ═══════════ */}
      {result.physician_notes && (
        <div style={{ border:'1px solid #aaa', padding:'6px 8px', marginBottom:'8px', fontSize:'9px', lineHeight:'1.6', background:'#fffef0' }}>
          <div style={{ fontWeight:'bold', marginBottom:'3px', fontSize:'10px' }}>Clinical / Physician Notes:</div>
          {result.physician_notes.split('\n').map((line, i) => (
            <div key={i}>{line || <br/>}</div>
          ))}
        </div>
      )}

      {/* END OF REPORT */}
      <div style={{ textAlign:'center', fontWeight:'bold', fontSize:'10px', margin:'8px 0 16px 0' }}>
        **END OF REPORT**
      </div>

      {/* ═══════════ WATERMARK (decorative, behind content in print) ═══════════ */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%, -50%) rotate(-30deg)',
        fontSize:'120px', fontWeight:'bold', color:'rgba(26,60,143,0.04)',
        userSelect:'none', pointerEvents:'none', zIndex:0, whiteSpace:'nowrap'
      }}>
        {orgName.substring(0,4).toUpperCase()}
      </div>

      {/* ═══════════ FOOTER ═══════════ */}
      <div style={{
        position:'absolute', bottom:'28mm', left:'10mm', right:'10mm',
        borderTop:'1px solid #555', paddingTop:'6px'
      }}>
        {/* Printed on + QRs + Signature */}
        <table style={{ width:'100%' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign:'bottom', width:'25%' }}>
                <div style={{ fontSize:'9px' }}>
                  <div>Printed on :</div>
                  <div style={{ marginTop:'2px' }}>{printedOn}</div>
                </div>
              </td>
              <td style={{ textAlign:'center', verticalAlign:'bottom', width:'20%' }}>
                {reportUrl ? (
                  <>
                    <QRCodeSVG value={reportUrl} size={60} />
                    <div style={{ fontSize:'8px', marginTop:'2px' }}>Scan to view</div>
                  </>
                ) : (
                  <div style={{ width:'60px', height:'60px', background:'#eee', margin:'0 auto',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'7px', color:'#999' }}>
                    QR
                  </div>
                )}
              </td>
              <td style={{ textAlign:'center', verticalAlign:'bottom', width:'20%' }}>
                {profileUrl ? (
                  <>
                    <QRCodeSVG value={profileUrl} size={60} />
                    <div style={{ fontSize:'8px', marginTop:'2px' }}>Profile Login</div>
                  </>
                ) : (
                  <div style={{ width:'60px', height:'60px', background:'#eee', margin:'0 auto',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'7px', color:'#999' }}>
                    QR
                  </div>
                )}
              </td>
              <td style={{ textAlign:'center', verticalAlign:'bottom', width:'35%' }}>
                <div style={{ borderTop:'1px solid #000', paddingTop:'2px', display:'inline-block', minWidth:'120px' }}>
                  <div style={{ fontSize:'9px', marginTop:'2px' }}>Medical Laboratory Technologist</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══════════ CONSULTANT DOCTORS STRIP ═══════════ */}
      <div style={{
        position:'absolute', bottom:'0', left:'0', right:'0',
        borderTop:'2px solid #555', padding:'4px 10mm',
        background:'#f5f5f5', fontSize:'8px', color:'#333'
      }}>
        {result.consultants ? (
          <div style={{ display:'flex', gap:'30px' }}>
            {result.consultants.map((c, i) => (
              <div key={i}>
                <div style={{ fontWeight:'bold' }}>{c.name}</div>
                {c.qualifications && <div>{c.qualifications}</div>}
                {c.role && <div style={{ fontStyle:'italic' }}>{c.role}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color:'#888', textAlign:'center' }}>
            Certified Medical Laboratory — {orgName}
          </div>
        )}
      </div>
    </div>
  );
}