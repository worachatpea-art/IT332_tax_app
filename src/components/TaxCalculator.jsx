import React, { useState } from "react";
import { motion } from "framer-motion";

// Tax Calculator Component (Thailand - common deductions)
// - TailwindCSS expected to be available
// - Implements common Thai PIT deductions (personal, spouse, children, parents,
//   provident fund / RMF / pension caps, social security, mortgage interest, insurance, etc.)
// NOTE: This implements widely-used rules but some special cases exist (e.g., children born after 2018,
// pregnancy/childbirth medical caps, double deduction donations). Please confirm any special rules you need.

export default function TaxCalculator() {
  // Income inputs (separated)
  const [salary, setSalary] = useState(400000);
  const [bonus, setBonus] = useState(20000);
  const [otherIncome, setOtherIncome] = useState(10000);

  // Basic allowances
  const [hasSpouseNoIncome, setHasSpouseNoIncome] = useState(false);
  const [numChildren, setNumChildren] = useState(0);

  // Parents info (for parental allowance conditions)
  const [hasFather, setHasFather] = useState(false);
  const [fatherAge, setFatherAge] = useState(65);
  const [fatherIncome, setFatherIncome] = useState(0);
  const [hasMother, setHasMother] = useState(false);
  const [motherAge, setMotherAge] = useState(63);
  const [motherIncome, setMotherIncome] = useState(0);

  // Disability dependent count
  const [numDisabledDependents, setNumDisabledDependents] = useState(0);

  // Insurance / investment / contributions
  const [pvd, setPvd] = useState(0); // provident fund
  const [rmf, setRmf] = useState(0);
  const [pensionInsurance, setPensionInsurance] = useState(0); // annuity/pension insurance
  const [socialSecurity, setSocialSecurity] = useState(0);
  const [mortgageInterest, setMortgageInterest] = useState(0);
  const [lifeInsurance, setLifeInsurance] = useState(0);
  const [healthInsurance, setHealthInsurance] = useState(0);

  // Other deductions (donations etc.) kept simple here
  const [donations, setDonations] = useState(0);

  // Misc (user-editable tax brackets preserved)
  const [brackets, setBrackets] = useState([
    { id: 1, upTo: 120000, rate: 0 },
    { id: 2, upTo: 300000, rate: 5 },
    { id: 3, upTo: 500000, rate: 10 },
    { id: 4, upTo: 750000, rate: 15 },
    { id: 5, upTo: 1000000, rate: 20 },
    { id: 6, upTo: Infinity, rate: 25 },
  ]);

  function parseNumber(v) {
    const n = Number(String(v ?? "").replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  // ------ Rules implemented (common, should match official guidance):
  // - Personal allowance: 60,000
  // - Spouse (if spouse has no income): 60,000
  // - Children: 30,000 per child (this code uses 30k per child; if you need special rule for 2nd child born after 2018 -> tell me)
  // - Parents: 30,000 per parent if parent age > 60 and parent income <= 30,000 (per common guidance)
  // - Disabled dependent: 60,000 per person
  // - Provident fund / RMF / pension: combined cap 500,000; PVD limited to 15% of salary (enforced below)
  // - Social security: actual amount but commonly capped at 9,000 shown in UI guidance
  // - Mortgage interest: up to 100,000
  // - Life insurance: up to 100,000 (combined other caps: life+health may be subject to combined limit in some rules)
  // - Health insurance (self): up to 25,000; (parents' health up to 15,000 each - not implemented separately yet)
  // - Donations: simple pass-through, some donations have special double deduction rules (not implemented)

  function calculateDeductions() {
    // Basic allowances
    const personalAllowance = 60000;
    const spouseAllowance = hasSpouseNoIncome ? 60000 : 0;
    const childrenAllowance = Math.max(0, Math.floor(parseNumber(numChildren))) * 30000; // 30k per child

    // Parents allowance: require age>60 and income <=30,000
    let parentsAllowance = 0;
    if (hasFather && fatherAge >= 60 && parseNumber(fatherIncome) <= 30000) parentsAllowance += 30000;
    if (hasMother && motherAge >= 60 && parseNumber(motherIncome) <= 30000) parentsAllowance += 30000;

    // Disabled dependents
    const disabledAllowance = Math.max(0, Math.floor(parseNumber(numDisabledDependents))) * 60000;

    // Social security: typically actual amount up to ~9,000 guidance
    const socialSecurityDeduct = Math.min(parseNumber(socialSecurity), 9000);

    // Mortgage interest
    const mortgageDeduct = Math.min(parseNumber(mortgageInterest), 100000);

    // Life & health insurance caps
    const lifeDeduct = Math.min(parseNumber(lifeInsurance), 100000);
    const healthDeduct = Math.min(parseNumber(healthInsurance), 25000);
    // Some rules say life+health combined <= 100000; we will apply that cap
    const lifeHealthCombined = Math.min(lifeDeduct + healthDeduct, 100000);

    // Retirement/investment related (PVD, RMF, pension) combined cap 500,000
    // PVD cannot exceed 15% of salary (salary here is annual salary)
    const salaryNum = parseNumber(salary);
    const pvdAllowed = Math.min(parseNumber(pvd), salaryNum * 0.15, 500000);
    const rmfNum = parseNumber(rmf);
    const pensionNum = parseNumber(pensionInsurance);
    // Combined cap
    const retirementCombined = Math.min(pvdAllowed + rmfNum + pensionNum, 500000);

    // Donations - simple cap: actual amount (note: tax law often limits donations to 10% of net income for general donations)
    const donationsDeduct = parseNumber(donations);

    const totalOther = socialSecurityDeduct + mortgageDeduct + lifeHealthCombined + retirementCombined + donationsDeduct;

    const totalAllowances = personalAllowance + spouseAllowance + childrenAllowance + parentsAllowance + disabledAllowance;

    const totalDeductions = totalAllowances + totalOther;

    return {
      personalAllowance,
      spouseAllowance,
      childrenAllowance,
      parentsAllowance,
      disabledAllowance,
      socialSecurityDeduct,
      mortgageDeduct,
      lifeHealthCombined,
      retirementCombined,
      donationsDeduct,
      totalAllowances,
      totalOther,
      totalDeductions,
    };
  }

  function calculateTax() {
    // Gross income = salary + bonus + otherIncome
    const gross = parseNumber(salary) + parseNumber(bonus) + parseNumber(otherIncome);
    const dedObj = calculateDeductions();
    const taxable = Math.max(0, gross - dedObj.totalDeductions);

    // compute tax by brackets
    const sorted = [...brackets].sort((a, b) => {
      const aKey = a.upTo === Infinity ? Number.POSITIVE_INFINITY : Number(a.upTo);
      const bKey = b.upTo === Infinity ? Number.POSITIVE_INFINITY : Number(b.upTo);
      return aKey - bKey;
    });

    let remaining = taxable;
    let lower = 0;
    const breakdown = [];
    let totalTax = 0;

    for (const b of sorted) {
      const upper = b.upTo === Infinity ? Infinity : Number(b.upTo);
      const bandSize = upper === Infinity ? Infinity : Math.max(0, upper - lower);
      const taxableInBand = Math.min(remaining, bandSize === Infinity ? remaining : bandSize);
      const taxForBand = taxableInBand * (Number(b.rate) / 100);

      if (taxableInBand > 0) {
        breakdown.push({ lower, upper: upper === Infinity ? "∞" : upper, amount: taxableInBand, rate: Number(b.rate), tax: taxForBand });
      }

      totalTax += taxForBand;
      remaining -= taxableInBand;
      lower = upper === Infinity ? lower : upper;
      if (remaining <= 0) break;
    }

    const net = gross - totalTax;
    const effectiveRate = gross > 0 ? (totalTax / gross) * 100 : 0;

    return { gross, taxable, breakdown, totalTax, net, effectiveRate, deductions: calculateDeductions() };
  }

  const result = calculateTax();

  // Handlers for brackets (unchanged)
  function updateBracket(id, key, value) {
    setBrackets((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  }
  function addBracket() {
    const nextId = Math.max(0, ...brackets.map((b) => b.id)) + 1;
    setBrackets((prev) => [...prev, { id: nextId, upTo: Infinity, rate: 0 }]);
  }
  function removeBracket(id) {
    setBrackets((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="min-h-screen bg-[#f4f9ff] p-6">
      <div className="max-w-5xl mx-auto">
        <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0a2e5c]">Tax Calculator (Thailand)</h1>
          <p className="text-[#5c738f] mt-1">รวมการลดหย่อนตามกฎหมายภาษีไทย (ตัวอย่างทั่วไป) — ปรับได้ตามความต้องการ</p>
        </motion.header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Inputs */}
          <section className="bg-white shadow-md border border-[#e2e8f0] rounded-2xl p-6 shadow-md">
            <h2 className="font-semibold text-xl mb-4">ข้อมูลรายได้</h2>

            <label className="block text-sm text-slate-700">เงินเดือน (บาท)</label>
            <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <label className="block text-sm text-slate-700 mt-4">โบนัส (บาท)</label>
            <input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <label className="block text-sm text-slate-700 mt-4">รายได้อื่นๆ เช่น ฟรีแลนซ์/ขายของออนไลน์ (บาท)</label>
            <input type="number" value={otherIncome} onChange={(e) => setOtherIncome(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <h2 className="font-semibold text-xl mt-8 mb-4">ค่าลดหย่อนครอบครัว</h2>

            <label className="flex items-center gap-3">
              <input type="checkbox" checked={hasSpouseNoIncome} onChange={(e) => setHasSpouseNoIncome(e.target.checked)} />
              คู่สมรสไม่มีรายได้ (ลดหย่อน 60,000 บาท)
            </label>

            <label className="block text-sm text-slate-700 mt-4">จำนวนบุตร</label>
            <input type="number" min={0} value={numChildren} onChange={(e) => setNumChildren(e.target.value)} className="mt-1 w-32 p-2 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <div className="mt-4">
              <h3 className="font-medium">บิดา-มารดา</h3>
              <label className="flex items-center gap-3 mt-2"><input type="checkbox" checked={hasFather} onChange={(e) => setHasFather(e.target.checked)} /> บิดา</label>
              {hasFather && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input type="number" value={fatherAge} onChange={(e) => setFatherAge(e.target.value)} className="p-2 rounded-xl border" placeholder="อายุ" />
                  <input type="number" value={fatherIncome} onChange={(e) => setFatherIncome(e.target.value)} className="p-2 rounded-xl border" placeholder="รายได้ต่อปี" />
                </div>
              )}

              <label className="flex items-center gap-3 mt-3"><input type="checkbox" checked={hasMother} onChange={(e) => setHasMother(e.target.checked)} /> มารดา</label>
              {hasMother && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input type="number" value={motherAge} onChange={(e) => setMotherAge(e.target.value)} className="p-2 rounded-xl border" placeholder="อายุ" />
                  <input type="number" value={motherIncome} onChange={(e) => setMotherIncome(e.target.value)} className="p-2 rounded-xl border" placeholder="รายได้ต่อปี" />
                </div>
              )}

              <p className="text-xs text-slate-500 mt-2">บิดา/มารดาที่อายุ 60 ปีขึ้นไปและมีรายได้ไม่เกิน 30,000 บาท ต่อปี จะได้รับค่าลดหย่อน 30,000 บาท ต่อคน</p>
            </div>

            <div className="mt-6">
              <h3 className="font-medium">ผู้พิการ / ทุพพลภาพ</h3>
              <label className="text-sm">จำนวนผู้พิการที่ต้องการลดหย่อน</label>
              <input type="number" min={0} value={numDisabledDependents} onChange={(e) => setNumDisabledDependents(e.target.value)} className="mt-1 w-32 p-2 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />
              <p className="text-xs text-slate-500 mt-1">ผู้พิการจะได้ลดหย่อน 60,000 บาท ต่อคน (ต้องมีเอกสารรับรอง)</p>
            </div>

            <h2 className="font-semibold text-xl mt-8 mb-4">การลงทุนและเบี้ยประกัน</h2>
            <label className="block text-sm text-slate-700">กองทุนสำรองเลี้ยงชีพ (PVD) - จำนวนเงิน</label>
            <input type="number" value={pvd} onChange={(e) => setPvd(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />
            <p className="text-xs text-slate-500">จำกัด 15% ของเงินเดือน และรวมกับ RMF/ประกันบำนาญไม่เกิน 500,000 บาท</p>

            <label className="block text-sm text-slate-700 mt-4">RMF - จำนวนเงิน</label>
            <input type="number" value={rmf} onChange={(e) => setRmf(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <label className="block text-sm text-slate-700 mt-4">ประกันบำนาญ (Annuity) - จำนวนเงิน</label>
            <input type="number" value={pensionInsurance} onChange={(e) => setPensionInsurance(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <label className="block text-sm text-slate-700 mt-4">เงินประกันสังคม (Social security)</label>
            <input type="number" value={socialSecurity} onChange={(e) => setSocialSecurity(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <label className="block text-sm text-slate-700 mt-4">ดอกเบี้ยเงินกู้/ที่อยู่อาศัย</label>
            <input type="number" value={mortgageInterest} onChange={(e) => setMortgageInterest(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <label className="block text-sm text-slate-700 mt-4">เบี้ยประกันชีวิต</label>
            <input type="number" value={lifeInsurance} onChange={(e) => setLifeInsurance(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <label className="block text-sm text-slate-700 mt-4">เบี้ยประกันสุขภาพ</label>
            <input type="number" value={healthInsurance} onChange={(e) => setHealthInsurance(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <label className="block text-sm text-slate-700 mt-4">บริจาค (ทั่วไป)</label>
            <input type="number" value={donations} onChange={(e) => setDonations(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-[#d4e3f5] focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]" />

            <div className="mt-6">
              <h3 className="font-medium mb-2">ตารางอัตราภาษี (แก้ไขได้)</h3>
              <div className="space-y-3">
                {brackets.map((b) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      className="w-28 p-2 rounded-lg border"
                      value={b.upTo === Infinity ? "∞" : b.upTo}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateBracket(b.id, "upTo", v === "∞" || v.toLowerCase() === "inf" || v === "Infinity" ? Infinity : parseNumber(v));
                      }}
                    />
                    <span className="text-sm">ถึง</span>
                    <input
                      type="number"
                      className="w-20 p-2 rounded-lg border"
                      value={b.rate}
                      onChange={(e) => updateBracket(b.id, "rate", parseFloat(e.target.value))}
                    />
                    <span className="text-sm">%</span>
                    <button onClick={() => removeBracket(b.id)} className="ml-auto text-xs px-3 py-1 rounded-lg bg-rose-100 text-rose-700">ลบ</button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <button onClick={addBracket} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium">เพิ่มช่วง</button>
                  <button onClick={() => setBrackets([
                    { id: 1, upTo: 120000, rate: 0 },
                    { id: 2, upTo: 300000, rate: 5 },
                    { id: 3, upTo: 500000, rate: 10 },
                    { id: 4, upTo: 750000, rate: 15 },
                    { id: 5, upTo: 1000000, rate: 20 },
                    { id: 6, upTo: Infinity, rate: 25 },
                  ])} className="px-4 py-2 rounded-xl bg-slate-200">โหลดตัวอย่าง</button>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-500">หมายเหตุ: นโยบายบางข้อมีเงื่อนไขพิเศษ (เช่น การยกเว้นหรือการหักสองเท่าสำหรับการบริจาคบางประเภท) — หากต้องการให้ผมรองรับเงื่อนไขพิเศษเหล่านี้ ให้บอกได้เลย</p>
          </section>

          {/* Right: Results */}
          <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xl">
            <h2 className="font-semibold text-xl mb-3">ผลการคำนวณ</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white rounded-xl shadow-sm">
                <div className="text-sm text-slate-500">รายได้รวม</div>
                <div className="text-lg font-semibold">{result.gross.toLocaleString()}</div>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-sm">
                <div className="text-sm text-slate-500">ค่าลดหย่อนรวม</div>
                <div className="text-lg font-semibold">{result.deductions.totalDeductions.toLocaleString()}</div>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-sm">
                <div className="text-sm text-slate-500">รายได้ที่ต้องเสียภาษี</div>
                <div className="text-lg font-semibold">{result.taxable.toLocaleString()}</div>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-sm">
                <div className="text-sm text-slate-500">ภาษีรวมที่ต้องจ่าย</div>
                <div className="text-lg font-semibold text-rose-600">{Math.round(result.totalTax).toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-medium">รายละเอียดการลดหย่อน</h3>
              <div className="mt-3 space-y-2 bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between"><span>ค่าลดหย่อนส่วนบุคคล</span><span>{result.deductions.personalAllowance.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>คู่สมรส (ไม่มีรายได้)</span><span>{result.deductions.spouseAllowance.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>ค่าลดหย่อนบุตร</span><span>{result.deductions.childrenAllowance.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>ค่าลดหย่อนบิดา-มารดา</span><span>{result.deductions.parentsAllowance.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>ผู้พิการ</span><span>{result.deductions.disabledAllowance.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>ประกันสังคม</span><span>{result.deductions.socialSecurityDeduct.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>ดอกเบี้ยที่อยู่อาศัย</span><span>{result.deductions.mortgageDeduct.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>เบี้ยประกันชีวิต/สุขภาพ (รวมกัน)</span><span>{result.deductions.lifeHealthCombined.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>กองทุน/ประกันบำนาญ (รวม)</span><span>{result.deductions.retirementCombined.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>บริจาค</span><span>{result.deductions.donationsDeduct.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-xl shadow-md flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">เงินหลังหักภาษี (Net)</div>
                <div className="text-2xl font-bold">{Math.round(result.net).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">อัตราภาระภาษีโดยรวม</div>
                <div className="font-semibold">{result.effectiveRate.toFixed(2)}%</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-500">หมายเหตุ: ข้อจำกัดและเงื่อนไขบางรายการมีรายละเอียดปลีกย่อยมาก — หากต้องการให้ผมเพิ่มเงื่อนไขพิเศษ (เช่น ตรวจสอบปีเกิดบุตร, ตรวจสอบประเภทการบริจาคที่ให้หักสองเท่า ฯลฯ) บอกได้เลย</div>
          </section>
        </div>

        <footer className="mt-8 text-center text-slate-500 text-sm">สร้างโดย Tax Calculator • ปรับแต่งได้ตามต้องการ</footer>
      </div>
    </div>
  );
}
