import React, { useState } from 'react';
import { admin1Service } from '../services/admin1Service';

interface StudentPromotionWizardProps {
  student: any;
  onClose: () => void;
  onSuccess: (updatedStudent: any) => void;
  onToast: (msg: string) => void;
}

export const StudentPromotionWizard: React.FC<StudentPromotionWizardProps> = ({
  student,
  onClose,
  onSuccess,
  onToast
}) => {
  const [step, setStep] = useState<number>(1); // 1: Audit, 2: Verification, 3: Fee Setup, 4: Confirm

  // Step 2: Verification
  const [securityPassword, setSecurityPassword] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');

  // Step 3: Promotion Config
  const [nextAcademicYear, setNextAcademicYear] = useState<string>('2027-28');
  const [nextCourseYear, setNextCourseYear] = useState<string>('2nd Year');
  const [hostelStatus] = useState<string>(student?.hostelStatus || 'Day Scholar');
  const [transportStatus] = useState<string>(student?.transportStatus || 'Self Transport');

  // Fee Structure
  const [tuitionFee, setTuitionFee] = useState<number>(student?.tuitionFee || 120000);
  const [booksFee, setBooksFee] = useState<number>(student?.booksFee || 10000);
  const [uniformFees, setUniformFees] = useState<number>(student?.uniformFees || 5000);
  const [hostelFee, setHostelFee] = useState<number>(student?.hostelFee || 85000);
  const [transportFee, setTransportFee] = useState<number>(student?.transportFee || 0);
  const [miscellaneousFee, setMiscellaneousFee] = useState<number>(student?.miscellaneousFee || 5000);

  // Waivers
  const [tuitionWaiver, setTuitionWaiver] = useState<number>(student?.tuitionWaiver || 0);
  const [hostelWaiver, setHostelWaiver] = useState<number>(student?.hostelWaiver || 0);
  const [transportWaiver, setTransportWaiver] = useState<number>(student?.transportWaiver || 0);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Read-only previous pending carried forward
  const previousPending = Number(student?.remainingBalance || 0);

  // Totals calculation
  const newYearFeesTotal = tuitionFee + booksFee + uniformFees + hostelFee + transportFee + miscellaneousFee;
  const totalWaivers = tuitionWaiver + hostelWaiver + transportWaiver;
  const grandTotalPayable = Math.max(0, newYearFeesTotal + previousPending - totalWaivers);

  const currentAcademicYear = student?.academicYear || '2026-27';

  const handleVerificationNext = () => {
    if (!securityPassword.trim() || !otpInput.trim()) {
      onToast('Security Password and OTP Verification Code are required.');
      return;
    }
    setStep(3);
  };

  const handleExecutePromotion = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        securityPassword: securityPassword.trim(),
        otpInput: otpInput.trim(),
        nextAcademicYear,
        nextCourseYear,
        hostelStatus,
        transportStatus,
        newFeeStructure: {
          tuitionFee,
          booksFee,
          uniformFees,
          hostelFee,
          transportFee,
          miscellaneousFee
        },
        waivers: {
          tuitionWaiver,
          hostelWaiver,
          transportWaiver
        }
      };

      const res = await admin1Service.promoteStudent(student._id || student.id || student.admissionNumber, payload);
      if (res && res.status === 'success') {
        onToast(`🎉 Promotion successful! Student promoted to ${nextAcademicYear} (${nextCourseYear}).`);
        onSuccess(res.data);
        onClose();
      } else {
        onToast(res?.message || 'Promotion failed.');
      }
    } catch (err: any) {
      onToast(err.message || 'Promotion failed. Please check security verification credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: '#FFFFFF', width: '100%', maxWidth: '720px', borderRadius: '24px', padding: '28px', boxShadow: '0 25px 65px rgba(0,0,0,0.3)', border: '1px solid #CBD5E1', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Wizard Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #F1F5F9', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#3B82F6', color: '#FFFFFF', fontWeight: 900, fontSize: '11px', textTransform: 'uppercase' }}>
                Promotion Wizard
              </span>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
                Step {step} of 4
              </span>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', margin: '6px 0 0 0' }}>
              Promote Student: {student?.name}
            </h2>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
              Adm No: <strong>{student?.admissionNumber || student?.studentId}</strong> | Course: <strong>{student?.course}</strong> | Campus: <strong>{student?.branch}</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        {/* Step Progress Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
          {['1. Audit', '2. Security OTP', '3. Fee Setup', '4. Review & Confirm'].map((label, idx) => {
            const stepNum = idx + 1;
            const isDone = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div
                key={label}
                style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  backgroundColor: isCurrent ? '#0F172A' : isDone ? '#ECFDF5' : '#F1F5F9',
                  color: isCurrent ? '#FFFFFF' : isDone ? '#047857' : '#64748B',
                  fontWeight: 800,
                  fontSize: '11px',
                  textAlign: 'center',
                  border: isDone ? '1px solid #10B981' : '1px solid transparent'
                }}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* --- STEP 1: AUDIT CURRENT ACADEMIC YEAR --- */}
        {step === 1 && (
          <div>
            <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
                Current Session Summary ({currentAcademicYear})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Current Course Year</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{student?.section || '1st Year'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Total Fees Paid</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>Rs.{(student?.totalPaid || 0).toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Pending Due Balance</div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: previousPending > 0 ? '#DC2626' : '#059669' }}>
                    Rs.{previousPending.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '24px', fontSize: '13px', color: '#7F1D1D', lineHeight: '1.5' }}>
              📌 <strong>Automatic Carry Forward Policy:</strong> The current pending balance of <strong>Rs.{previousPending.toLocaleString('en-IN')}</strong> will be carried forward automatically into the new academic year as <strong>Previous Due</strong>. Historical records for {currentAcademicYear} will remain permanently sealed and accessible.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={onClose}
                style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#0F172A', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
              >
                Continue to Verification →
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 2: SECURITY PASSWORD & OTP VERIFICATION --- */}
        {step === 2 && (
          <div>
            <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF', marginBottom: '4px' }}>
                🔒 Security Verification Mandatory
              </div>
              <div style={{ fontSize: '12px', color: '#1E3A8A' }}>
                Student promotion modifies academic ledgers. Please authenticate with Security Password and 6-digit OTP verification.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Security Password *
                </label>
                <input
                  type="password"
                  placeholder="Enter security password..."
                  value={securityPassword}
                  onChange={(e) => setSecurityPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', fontWeight: 700, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  OTP Authorization Code *
                </label>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP (e.g. 784920)"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', fontWeight: 800, letterSpacing: '0.1em', textAlign: 'center', fontFamily: 'monospace', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={() => setStep(1)}
                style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={handleVerificationNext}
                style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#0F172A', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
              >
                Verify & Setup Fees →
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: PROMOTION & NEW FEE STRUCTURE SETUP --- */}
        {step === 3 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Target Academic Year
                </label>
                <select
                  value={nextAcademicYear}
                  onChange={(e) => setNextAcademicYear(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 800 }}
                >
                  <option value="2027-28">2027-28 (Next Session)</option>
                  <option value="2028-29">2028-29</option>
                  <option value="2026-27">2026-27</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Target Course Year
                </label>
                <select
                  value={nextCourseYear}
                  onChange={(e) => setNextCourseYear(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 800 }}
                >
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="Final Year">Final Year</option>
                </select>
              </div>
            </div>

            {/* Fee Breakdown Inputs */}
            <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', marginBottom: '12px' }}>
                New Academic Year Fee Structure
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Tuition Fee (Rs.)</label>
                  <input type="number" value={tuitionFee} onChange={(e) => setTuitionFee(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Books & Study Material</label>
                  <input type="number" value={booksFee} onChange={(e) => setBooksFee(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Uniform & ID Card</label>
                  <input type="number" value={uniformFees} onChange={(e) => setUniformFees(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Hostel Fee (Rs.)</label>
                  <input type="number" value={hostelFee} onChange={(e) => setHostelFee(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Transport Bus Fee</label>
                  <input type="number" value={transportFee} onChange={(e) => setTransportFee(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Miscellaneous Fee</label>
                  <input type="number" value={miscellaneousFee} onChange={(e) => setMiscellaneousFee(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }} />
                </div>
              </div>

              {/* Concessions / Waivers */}
              <div style={{ paddingTop: '12px', borderTop: '1px dashed #CBD5E1' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: '8px' }}>Scholarships & Waivers</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#059669' }}>Tuition Waiver</label>
                    <input type="number" value={tuitionWaiver} onChange={(e) => setTuitionWaiver(Number(e.target.value))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #A7F3D0', fontWeight: 700, backgroundColor: '#ECFDF5' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#059669' }}>Hostel Waiver</label>
                    <input type="number" value={hostelWaiver} onChange={(e) => setHostelWaiver(Number(e.target.value))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #A7F3D0', fontWeight: 700, backgroundColor: '#ECFDF5' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#059669' }}>Transport Waiver</label>
                    <input type="number" value={transportWaiver} onChange={(e) => setTransportWaiver(Number(e.target.value))} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #A7F3D0', fontWeight: 700, backgroundColor: '#ECFDF5' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#0F172A', color: '#FFFFFF', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Previous Year Carried Over Due:</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#F87171' }}>+ Rs.{previousPending.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>New Year Gross Fees:</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#FBBF24' }}>+ Rs.{newYearFeesTotal.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Total Scholarships & Waivers:</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#34D399' }}>- Rs.{totalWaivers.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#FFFFFF' }}>Grand Total Payable ({nextAcademicYear}):</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38BDF8' }}>Rs.{grandTotalPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={() => setStep(2)}
                style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#0F172A', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
              >
                Review & Confirm →
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 4: REVIEW & CONFIRM --- */}
        {step === 4 && (
          <div>
            <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#ECFDF5', border: '1.5px solid #10B981', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#065F46', marginTop: 0, marginBottom: '8px' }}>
                Ready to Promote Student
              </h4>
              <p style={{ fontSize: '13px', color: '#047857', margin: 0, lineHeight: '1.5' }}>
                Promoting <strong>{student?.name}</strong> to <strong>{nextAcademicYear} ({nextCourseYear})</strong> with a Grand Total Payable of <strong>Rs.{grandTotalPayable.toLocaleString('en-IN')}</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={() => setStep(3)}
                style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
              >
                ← Edit Fees
              </button>
              <button
                onClick={handleExecutePromotion}
                disabled={isSubmitting}
                style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
              >
                {isSubmitting ? 'Promoting...' : '🚀 Execute Promotion'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
