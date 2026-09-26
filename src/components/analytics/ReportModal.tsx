import { useState, useEffect } from 'react'
import { BRAND } from '../../config/app'
import {
  AlertTriangle,
  Award,
  Check,
  Compass,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Globe,
  Leaf,
  Loader2,
  MapPin,
  Printer,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import type { AnalysisBundle, AnalysisParams } from '../../types/analysis'
import { AnalysisApi } from '../../services/analysis'
import { fmt, signed, toBnDigits, type Lang } from './ui'

interface ReportModalProps {
  bundle: AnalysisBundle
  params: AnalysisParams
  lang: Lang
  onClose: () => void
}

const PRESET_NAMES: Record<string, { en: string; bn: string; tagEn: string; tagBn: string }> = {
  '22.1_88.85': {
    en: 'Sajnekhali Wildlife Sanctuary',
    bn: 'সজনেখালি বন্যপ্রাণী অভয়ারণ্য',
    tagEn: 'Interior Core Mangrove',
    tagBn: 'অভ্যন্তরীণ গভীর বন',
  },
  '21.85_88.9': {
    en: 'Sundarban South Wildlife Sanctuary',
    bn: 'দক্ষিণ সুন্দরবন বন্যপ্রাণী অভয়ারণ্য',
    tagEn: 'Tidal Delta Core',
    tagBn: 'ভাটার মূল মোহনা',
  },
  '22.165_88.805': {
    en: 'Gosaba Island Sector',
    bn: 'গোসাবা দ্বীপ সেক্টর',
    tagEn: 'Human Settlement Buffer Zone',
    tagBn: 'জনবসতি বাফার অঞ্চল',
  },
}

export function ReportModal({ bundle, params, lang: initialLang, onClose }: ReportModalProps) {
  const [reportLang, setReportLang] = useState<Lang>(initialLang)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)

  const bn = reportLang === 'bn'

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const b = bundle
  const req = b.request
  const ch = b.change
  const cr = b.carbon
  const sm = b.summary
  const acc = b.accuracy

  // Match preset location name if near one of the standard coordinates
  const presetKey = `${params.lat}_${params.lon}`
  const preset = PRESET_NAMES[presetKey] || {
    en: `Sundarban Sector (${params.lat.toFixed(3)}°N, ${params.lon.toFixed(3)}°E)`,
    bn: `সুন্দরবন সেক্টর (${toBnDigits(params.lat.toFixed(3))}°উ, ${toBnDigits(params.lon.toFixed(3))}°পূ)`,
    tagEn: 'Custom Monitored Sector',
    tagBn: 'কাস্টম নিরীক্ষণ এলাকা',
  }

  const locationTitle = bn ? preset.bn : preset.en

  const netHa = ch.netChangeHa
  const isNetPositive = netHa >= 0

  const startYear = req.startDate.slice(0, 4)
  const endYear = req.endDate.slice(0, 4)
  const deltaYears = Math.max(1, Number(endYear) - Number(startYear))

  const formattedDate = new Date(b.generatedAt).toLocaleDateString(bn ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const docId = `SBC-${b.analysisId.slice(0, 12).toUpperCase()}`

  // Social Cost of Carbon & Economic valuation ($190/t CO2e EPA reference)
  const co2eTons = cr.end.co2eMg
  const valuationUsd = Math.round(co2eTons * 190)
  const valuationInr = Math.round(valuationUsd * 83)
  const annualFootprintEquiv = Math.round(co2eTons / 1.9) // Average Indian annual footprint ~1.9 t CO2e

  // Handle PDF Export
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const blob = await AnalysisApi.exportPdf(bundle, reportLang)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mangrovelens-report-${b.analysisId.slice(0, 8)}-${reportLang}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback cleanly to native browser print to PDF
      window.print()
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Handle JSON export
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sundarban-telemetry-${b.analysisId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Copy shareable executive summary
  const handleCopySummary = async () => {
    const title = bn
      ? 'MangroveLens · ম্যানগ্রোভ ও ব্লু কার্বন মূল্যায়ন প্রতিবেদন'
      : 'MangroveLens · Mangrove & Blue Carbon Assessment Report'
    const summaryText = bn
      ? `${title}\nদলিল নং: ${docId}\nতারিখ: ${formattedDate}\nঅবস্থান: ${locationTitle} (${params.lat}°উ, ${params.lon}°পূ)\nসময়কাল: ${startYear}–${endYear} (${toBnDigits(String(deltaYears))} বছর)\n\n• ম্যানগ্রোভ ক্যানোপি: ${fmt(sm.end.mangroveHa, 1, 'bn')} হেক্টর (${fmt(sm.end.mangrovePct, 1, 'bn')}%)\n• নিট ক্যানোপি পরিবর্তন: ${signed(netHa, 1, 'bn')} হেক্টর (${signed(ch.percentChange, 1, 'bn')}%)\n• মোট ব্লু কার্বন মজুত: ${fmt(cr.end.carbonMgC, 0, 'bn')} Mg C\n• বায়ুমণ্ডলীয় CO₂ সমতুল্য: ${fmt(cr.end.co2eMg, 0, 'bn')} টন CO₂e\n• আর্থিক মূল্যমান (SCC): $${fmt(valuationUsd, 0, 'bn')} (~₹${fmt(valuationInr, 0, 'bn')})\n\nউপগ্রহ সেন্সর: Sentinel-2 MSI L2A (10m)\nপদ্ধতি: IPCC Tier-1 Wetlands Supplement 2013`
      : `${title}\nDoc Ref: ${docId}\nDate: ${formattedDate}\nLocation: ${locationTitle} (${params.lat}°N, ${params.lon}°E)\nObservation Epoch: ${startYear}–${endYear} (${deltaYears} Years)\n\n• Final Mangrove Canopy: ${fmt(sm.end.mangroveHa, 1)} ha (${fmt(sm.end.mangrovePct, 1)}%)\n• Net Canopy Change: ${signed(netHa, 1)} ha (${signed(ch.percentChange, 1)}%)\n• Total Blue Carbon Stock: ${fmt(cr.end.carbonMgC, 0)} Mg C\n• Atmospheric CO₂e Stored: ${fmt(cr.end.co2eMg, 0)} t CO₂e\n• Indicative Natural Capital (SCC): $${fmt(valuationUsd, 0)} (~₹${fmt(valuationInr, 0)})\n\nSensor: Copernicus Sentinel-2 MSI Level-2A (10m)\nStandard: IPCC 2013 Wetlands Supplement Tier-1`

    try {
      await navigator.clipboard.writeText(summaryText)
      setCopiedSummary(true)
      setTimeout(() => setCopiedSummary(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  const narrativeParas = bn ? b.narrative.bn : b.narrative.en
  const nonForestStartHa = Math.max(0, req.aoiAreaHa - sm.start.mangroveHa)
  const nonForestEndHa = Math.max(0, req.aoiAreaHa - sm.end.mangroveHa)
  const nonForestChangeHa = nonForestEndHa - nonForestStartHa

  return (
    <div className="fixed inset-0 z-[2000] flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 lg:p-8 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Modal Card Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-[#d2e4db] overflow-hidden my-4 sm:my-8 print:my-0 print:border-none print:shadow-none print:max-w-none print:rounded-none">
        
        {/* Sticky Action Toolbar (Hidden during print) */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#d8e6df] bg-[#f8fbf9]/95 backdrop-blur-md px-4 sm:px-6 py-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-mono text-xs font-bold text-[#113f37]">
              {bn ? 'অফিসিয়াল স্যাটেলাইট অডিট রিপোর্ট প্রস্তুত' : 'Official Satellite Audit Report Generated'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher inside Report */}
            <div className="flex overflow-hidden rounded-lg border border-[#cde0d5] bg-white font-mono text-[11px] font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setReportLang('en')}
                className={`px-2.5 py-1 transition cursor-pointer ${
                  !bn ? 'bg-[#123c37] text-white' : 'text-[#526a63] hover:bg-[#edf7f2]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setReportLang('bn')}
                className={`px-2.5 py-1 transition cursor-pointer ${
                  bn ? 'bg-[#123c37] text-white' : 'text-[#526a63] hover:bg-[#edf7f2]'
                }`}
              >
                বাং
              </button>
            </div>

            {/* Download PDF via Backend */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 rounded-lg border border-[#16865f] bg-[#16865f] px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#126f4f] transition cursor-pointer disabled:opacity-50"
              title={bn ? 'সরাসরি PDF ফাইল ডাউনলোড করুন' : 'Download official PDF file'}
            >
              {downloadingPdf ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileDown className="size-3.5" />
              )}
              <span className="font-mono text-[11px] font-bold">
                {downloadingPdf ? (bn ? 'ডাউনলোড হচ্ছে…' : 'Downloading…') : (bn ? 'PDF ডাউনলোড' : 'Download PDF')}
              </span>
            </button>

            {/* JSON Export */}
            <button
              type="button"
              onClick={handleExportJson}
              className="hidden md:flex items-center gap-1 rounded-lg border border-[#cde0d5] bg-white px-2.5 py-1 text-xs font-semibold text-[#123f38] shadow-2xs hover:bg-[#edf7f2] transition cursor-pointer"
              title={bn ? 'কাঁচা উপাত্ত JSON ফরম্যাটে নিন' : 'Export raw JSON analysis data'}
            >
              <Download className="size-3 text-[#526a63]" />
              <span className="font-mono text-[11px]">JSON</span>
            </button>

            {/* Copy Summary */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex size-7.5 items-center justify-center rounded-lg border border-[#cde0d5] bg-white text-[#526a63] hover:border-[#16865f] hover:text-[#123f38] hover:bg-[#edf7f2] transition cursor-pointer"
              title={copiedSummary ? (bn ? 'কপি হয়েছে!' : 'Copied!') : (bn ? 'সারাংশ কপি করুন' : 'Copy summary')}
            >
              {copiedSummary ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex size-7.5 items-center justify-center rounded-lg border border-[#d6e6de] bg-white text-[#526a63] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition cursor-pointer"
              aria-label="Close report"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Printable Official Report Document Canvas */}
        <div id="printable-report" className="p-6 sm:p-10 lg:p-12 text-[#123c37] bg-white font-sans">
          
          {/* 1. Official Header & Crest */}
          <div className="border-b-2 border-[#16865f] pb-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <img src={BRAND.logoPng} alt={BRAND.name} className="h-12 w-auto" />
                  <div>
                    <h2 className="sr-only">{BRAND.name}</h2>
                    <p className="font-mono text-[10px] text-[#637d74]">
                      {bn ? 'উপকূলীয় বাস্তুতন্ত্র টেলিমেট্রি ও কার্বন নিরীক্ষা মানমন্দির' : 'Centre for Coastal Biosphere Telemetry & Earth Observation'}
                    </p>
                  </div>
                </div>

                <h1 className="mt-3 font-condensed text-2xl sm:text-3xl lg:text-4xl font-black tracking-wide text-[#072d27]">
                  {bn ? 'স্যাটেলাইট ব্লু কার্বন ও ম্যানগ্রোভ ক্যানোপি মূল্যায়ন প্রতিবেদন' : 'SATELLITE BLUE CARBON & CANOPY AUDIT REPORT'}
                </h1>
                <p className="font-mono text-xs font-medium text-[#46665c]">
                  {bn
                    ? 'স্ট্যান্ডার্ডাইজড বহু-বর্ষীয় ক্যানোপি পরিবর্তন ও আইপিসিসি টিয়ার-১ বায়োমাস হিসাব'
                    : 'Standardized Multi-Epoch Canopy Dynamics & IPCC Tier-1 Biomass Accounting'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Geographic & Satellite Telemetry Coordinates Grid */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-[#d4e6dd] bg-[#f8fbf9] p-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#637d74]">
                {bn ? 'টার্গেট অবস্থান' : 'Target Coordinates'}
              </span>
              <p className="mt-1 font-mono text-xs sm:text-sm font-extrabold text-[#0d3b33]">
                {params.lat.toFixed(4)}°N, {params.lon.toFixed(4)}°E
              </p>
              <p className="font-mono text-[10px] text-[#5f7a71] truncate">{locationTitle}</p>
            </div>

            <div className="rounded-xl border border-[#d4e6dd] bg-[#f8fbf9] p-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#637d74]">
                {bn ? 'নিরীক্ষিত সোয়াথ এলাকা' : 'Monitored Swath'}
              </span>
              <p className="mt-1 font-mono text-xs sm:text-sm font-extrabold text-[#0d3b33]">
                {fmt(req.radiusKm, 1, reportLang)} km {bn ? 'ব্যাসার্ধ' : 'Radius'}
              </p>
              <p className="font-mono text-[10px] text-[#5f7a71]">
                {fmt(req.aoiAreaHa, 1, reportLang)} ha ({fmt(req.aoiAreaHa / 100, 2, reportLang)} km²)
              </p>
            </div>

            <div className="rounded-xl border border-[#d4e6dd] bg-[#f8fbf9] p-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#637d74]">
                {bn ? 'তুলনামূলক সময়কাল' : 'Epoch Comparison'}
              </span>
              <p className="mt-1 font-mono text-xs sm:text-sm font-extrabold text-[#0d3b33]">
                {startYear} → {endYear} ({fmt(deltaYears, 0, reportLang)} {bn ? 'বছর' : 'Yrs'})
              </p>
              <p className="font-mono text-[10px] text-[#5f7a71]">
                {bn ? 'জানু–মার্চ শুষ্ক মৌসুম' : 'Jan–Mar dry-season window'}
              </p>
            </div>

            <div className="rounded-xl border border-[#d4e6dd] bg-[#f8fbf9] p-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#637d74]">
                {bn ? 'উপগ্রহ সেন্সর' : 'Satellite Sensor'}
              </span>
              <p className="mt-1 font-mono text-xs sm:text-sm font-extrabold text-[#0d3b33]">
                Sentinel-2 MSI
              </p>
              <p className="font-mono text-[10px] text-[#5f7a71]">
                {bn ? '১০ মি. রেজোলিউশন (L2A BOA)' : '10m GSD (Level-2A BOA)'}
              </p>
            </div>
          </div>

          {/* 3. Executive Verdict Banner */}
          <div
            className={`mb-6 rounded-2xl border p-5 ${
              isNetPositive
                ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-teal-50/60'
                : 'border-amber-200 bg-gradient-to-r from-amber-50/90 to-orange-50/60'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {isNetPositive ? (
                    <TrendingUp className="size-5 text-emerald-700" />
                  ) : (
                    <TrendingDown className="size-5 text-amber-700" />
                  )}
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#145d47]">
                    {bn ? 'নির্বাহী পরিবেশগত সিদ্ধান্ত' : 'EXECUTIVE ENVIRONMENTAL VERDICT'}
                  </span>
                </div>
                <h3 className="mt-1 font-condensed text-xl sm:text-2xl font-bold tracking-wide text-[#09352c]">
                  {isNetPositive
                    ? bn
                      ? `ক্যানোপি বৃদ্ধি ও সক্রিয় কার্বন শোষণ (+${fmt(netHa, 1, reportLang)} হেক্টর / +${fmt(ch.percentChange, 1, reportLang)}%)`
                      : `Canopy Expansion & Active Carbon Sequestration (+${fmt(netHa, 1, reportLang)} ha / +${fmt(ch.percentChange, 1, reportLang)}%)`
                    : bn
                      ? `ক্যানোপি সংকোচন ও ক্ষয় সতর্কতা (${fmt(netHa, 1, reportLang)} হেক্টর / ${fmt(ch.percentChange, 1, reportLang)}%)`
                      : `Canopy Degradation & Loss Alert (${fmt(netHa, 1, reportLang)} ha / ${fmt(ch.percentChange, 1, reportLang)}%)`}
                </h3>
                <p className="mt-1 text-xs text-[#33564c] leading-relaxed max-w-2xl">
                  {bn
                    ? `${startYear} থেকে ${endYear} সালের মধ্যে নিরীক্ষিত ${locationTitle} অঞ্চলে ম্যানগ্রোভ ক্যানোপির পরিমাণ ${isNetPositive ? 'বৃদ্ধি পেয়েছে' : 'হ্রাস পেয়েছে'}। বায়বীয় ও মাটির কার্বন মজুত মিলে মোট ${fmt(cr.end.co2eMg, 0, reportLang)} টন CO₂ সমতুল্য কার্বন সংরক্ষিত রয়েছে।`
                    : `Between ${startYear} and ${endYear}, mangrove canopy across ${locationTitle} exhibited ${isNetPositive ? 'net expansion' : 'net retraction'}. Total ecosystem blue carbon stands at ${fmt(cr.end.carbonMgC, 0)} Mg C, securing ${fmt(cr.end.co2eMg, 0)} metric tons of atmospheric CO₂ equivalent.`}
                </p>
              </div>

              {/* Verdict KPI pill */}
              <div className="shrink-0 sm:text-right">
                <div className="font-mono text-[11px] font-semibold text-[#5c7a70]">
                  {bn ? 'নিট বাৎসরিক পরিবর্তন হার' : 'Annual Net Rate'}
                </div>
                <div className="font-mono text-2xl font-black text-[#0b3d34]">
                  {signed(ch.annualNetChangeHa, 2, reportLang)} <span className="text-xs font-normal">ha/yr</span>
                </div>
                <div className="font-mono text-[10px] text-[#16865f]">
                  {bn ? 'উপগ্রহে নির্ভুলভাবে চিহ্নিত' : 'Satellite verified'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Primary KPI Summary Cards */}
          <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#d6e6de] bg-white p-4 shadow-2xs">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#637d74]">
                {bn ? 'বর্তমান ম্যানগ্রোভ বন' : 'Final Mangrove Area'}
              </span>
              <p className="mt-1 font-mono text-2xl font-black text-[#0a3930]">
                {fmt(sm.end.mangroveHa, 1, reportLang)} <span className="text-xs font-normal text-[#637d74]">ha</span>
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[#16865f]">
                {fmt(sm.end.mangrovePct, 1, reportLang)}% {bn ? 'সোয়াথের অংশ' : 'of monitored swath'}
              </p>
            </div>

            <div className="rounded-xl border border-[#d6e6de] bg-white p-4 shadow-2xs">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#637d74]">
                {bn ? 'নিট ক্যানোপি পরিবর্তন' : 'Net Canopy Change'}
              </span>
              <p className={`mt-1 font-mono text-2xl font-black ${isNetPositive ? 'text-emerald-700' : 'text-amber-800'}`}>
                {signed(netHa, 1, reportLang)} <span className="text-xs font-normal">ha</span>
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[#527167]">
                {signed(ch.percentChange, 1, reportLang)}% {bn ? '৫-বছরে পরিবর্তন' : 'epoch delta'}
              </p>
            </div>

            <div className="rounded-xl border border-[#d6e6de] bg-white p-4 shadow-2xs">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#637d74]">
                {bn ? 'মোট ব্লু কার্বন মজুত' : 'Total Blue Carbon'}
              </span>
              <p className="mt-1 font-mono text-2xl font-black text-[#0a3930]">
                {fmt(cr.end.carbonMgC, 0, reportLang)} <span className="text-xs font-normal text-[#637d74]">Mg C</span>
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[#16865f]">
                {fmt(cr.methodology.densityMgCPerHa, 1, reportLang)} Mg C/ha (IPCC)
              </p>
            </div>

            <div className="rounded-xl border border-[#d6e6de] bg-white p-4 shadow-2xs">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#637d74]">
                {bn ? 'বায়ুমণ্ডলীয় CO₂ সমতুল্য' : 'Atmospheric CO₂e'}
              </span>
              <p className="mt-1 font-mono text-2xl font-black text-[#0a3930]">
                {fmt(cr.end.co2eMg, 0, reportLang)} <span className="text-xs font-normal text-[#637d74]">t CO₂e</span>
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[#527167]">
                {signed(cr.change.co2eChangeMg, 0, reportLang)} t CO₂e {bn ? 'ফ্লাক্স' : 'flux'}
              </p>
            </div>
          </div>

          {/* 5. Land Cover & Canopy Dynamics Matrix Table */}
          <div className="mb-8">
            <h4 className="font-condensed text-lg sm:text-xl font-bold tracking-wide text-[#083028] mb-3">
              {bn ? '১. ভূমি আচ্ছাদন ও ম্যানগ্রোভ ক্যানোপি গতিশীলতা মেট্রিক্স' : '1. LAND COVER & CANOPY DYNAMICS MATRIX'}
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[#d6e6de]">
              <table className="w-full text-xs font-mono">
                <thead className="bg-[#f0f6f3] border-b border-[#d6e6de] text-[#123f38]">
                  <tr>
                    <th className="py-2.5 px-3 text-left font-bold">{bn ? 'শ্রেণি / ল্যান্ড কভার' : 'Classification Class'}</th>
                    <th className="py-2.5 px-3 text-right font-bold">{startYear} {bn ? 'শুরুতে (ha)' : 'Baseline (ha)'}</th>
                    <th className="py-2.5 px-3 text-right font-bold">{endYear} {bn ? 'শেষে (ha)' : 'Current (ha)'}</th>
                    <th className="py-2.5 px-3 text-right font-bold">{bn ? 'নিট শিফট (ha)' : 'Net Shift (ha)'}</th>
                    <th className="py-2.5 px-3 text-right font-bold">{bn ? 'শতকরা পরিবর্তন' : '% Shift'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5efe9] text-[#1b433b]">
                  <tr className="bg-emerald-50/40 font-semibold">
                    <td className="py-2.5 px-3 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      <span>{bn ? 'ম্যানগ্রোভ বন ক্যানোপি' : 'Mangrove Forest Canopy'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-tabular">{fmt(sm.start.mangroveHa, 1, reportLang)}</td>
                    <td className="py-2.5 px-3 text-right font-tabular">{fmt(sm.end.mangroveHa, 1, reportLang)}</td>
                    <td className={`py-2.5 px-3 text-right font-bold font-tabular ${isNetPositive ? 'text-emerald-700' : 'text-amber-800'}`}>
                      {signed(netHa, 1, reportLang)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold font-tabular ${isNetPositive ? 'text-emerald-700' : 'text-amber-800'}`}>
                      {signed(ch.percentChange, 1, reportLang)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-sky-500" />
                      <span>{bn ? 'অন্যান্য আচ্ছাদন (নদীনালা, কাদাচর ও বসতি)' : 'Non-Mangrove (Water, Mudflats & Matrix)'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-tabular">{fmt(nonForestStartHa, 1, reportLang)}</td>
                    <td className="py-2.5 px-3 text-right font-tabular">{fmt(nonForestEndHa, 1, reportLang)}</td>
                    <td className="py-2.5 px-3 text-right font-tabular">{signed(nonForestChangeHa, 1, reportLang)}</td>
                    <td className="py-2.5 px-3 text-right font-tabular">
                      {nonForestStartHa > 0 ? signed((nonForestChangeHa / nonForestStartHa) * 100, 1, reportLang) : '—'}%
                    </td>
                  </tr>
                  <tr className="bg-[#f0f6f3] font-bold text-[#0c3c32]">
                    <td className="py-2.5 px-3">{bn ? 'সর্বমোট পর্যবেক্ষণ এলাকা (AOI)' : 'Total Swath Boundary (AOI)'}</td>
                    <td className="py-2.5 px-3 text-right font-tabular">{fmt(req.aoiAreaHa, 1, reportLang)}</td>
                    <td className="py-2.5 px-3 text-right font-tabular">{fmt(req.aoiAreaHa, 1, reportLang)}</td>
                    <td className="py-2.5 px-3 text-right font-tabular">0.0</td>
                    <td className="py-2.5 px-3 text-right font-tabular">0.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sub-breakdown badges */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="rounded-lg bg-[#edf6f1] p-2">
                <span className="text-[10px] text-[#637d74]">{bn ? 'স্থির অপরিবর্তিত মূল বন' : 'Stable Core Mangrove'}</span>
                <p className="font-bold text-[#0d3b33]">{fmt(ch.stableMangroveHa, 1, reportLang)} ha</p>
              </div>
              <div className="rounded-lg bg-[#eaf7ee] p-2">
                <span className="text-[10px] text-[#15803d]">{bn ? 'নতুন প্রাকৃতিক পুনর্জন্ম (লাভ)' : 'Gross New Regeneration'}</span>
                <p className="font-bold text-emerald-800">+{fmt(ch.gainHa, 1, reportLang)} ha</p>
              </div>
              <div className="rounded-lg bg-[#fef3f2] p-2">
                <span className="text-[10px] text-[#b91c1c]">{bn ? 'ক্যানোপি ক্ষয় বা অপক্ষয় (ক্ষতি)' : 'Gross Canopy Degradation'}</span>
                <p className="font-bold text-rose-800">-{fmt(ch.lossHa, 1, reportLang)} ha</p>
              </div>
            </div>
          </div>

          {/* 6. IPCC Tier-1 Blue Carbon Biomass Pools */}
          <div className="mb-8">
            <h4 className="font-condensed text-lg sm:text-xl font-bold tracking-wide text-[#083028] mb-3">
              {bn ? '২. আইপিসিসি টিয়ার-১ ব্লু কার্বন মজুত ও বায়োমাস পুল' : '2. IPCC TIER-1 BLUE CARBON POOLS & ASSET INVENTORY'}
            </h4>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Carbon Pools Table */}
              <div className="overflow-hidden rounded-xl border border-[#d6e6de]">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-[#f0f6f3] border-b border-[#d6e6de] text-[#123f38]">
                    <tr>
                      <th className="py-2 px-3 text-left font-bold">{bn ? 'কার্বন পুল' : 'Carbon Biomass Pool'}</th>
                      <th className="py-2 px-3 text-right font-bold">{bn ? 'মজুত (Mg C)' : 'Stock (Mg C)'}</th>
                      <th className="py-2 px-3 text-right font-bold">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5efe9]">
                    {cr.end.pools.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3">{p.name}</td>
                        <td className="py-2 px-3 text-right font-bold font-tabular">{fmt(p.carbonMgC, 0, reportLang)}</td>
                        <td className="py-2 px-3 text-right text-[#637d74] font-tabular">{fmt(p.sharePct, 1, reportLang)}%</td>
                      </tr>
                    ))}
                    <tr className="bg-[#f0f6f3] font-bold text-[#0a382f]">
                      <td className="py-2 px-3">{bn ? 'সর্বমোট ইকোসিস্টেম কার্বন' : 'Total Ecosystem Stock'}</td>
                      <td className="py-2 px-3 text-right font-tabular">{fmt(cr.end.carbonMgC, 0, reportLang)}</td>
                      <td className="py-2 px-3 text-right font-tabular">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Economic & Footprint Valuation Box */}
              <div className="rounded-xl border border-[#d6e6de] bg-[#f8fbf9] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#145d47]">
                    <Award className="size-4 text-emerald-600" />
                    <span>{bn ? 'প্রাকৃতিক মূলধন ও সামাজিক মূল্যায়ন' : 'Natural Capital & Social Valuation'}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#406257] leading-relaxed">
                    {bn
                      ? `যুক্তরাষ্ট্র পরিবেশ সংস্থা (EPA) রেফারেন্স মান ($১৯০/টন CO₂e) অনুসারে এই সোয়াথের সংরক্ষিত ব্লু কার্বনের সামাজিক জলবায়ু মূল্যমান:`
                      : `Based on the Global Social Cost of Carbon (US EPA Benchmark at $190/metric ton CO₂e), the climate capital sequestered in this sector is estimated at:`}
                  </p>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-black text-[#0b3d34]">
                      ${fmt(valuationUsd, 0, reportLang)}
                    </span>
                    <span className="font-mono text-xs text-[#527167]">USD</span>
                    <span className="font-mono text-sm font-bold text-[#1b614b]">
                      (~₹{fmt(valuationInr, 0, reportLang)} INR)
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#d8e6df] text-[11px] font-mono text-[#527167] flex items-center justify-between">
                  <span>{bn ? 'স্থানীয় জনসংখ্যার পদচিহ্ন সমতুল্য:' : 'Equivalent population footprint:'}</span>
                  <span className="font-bold text-[#0c3c33]">{fmt(annualFootprintEquiv, 0, reportLang)} {bn ? 'জন নাগরিক/বছর' : 'citizens/yr'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Forward 5-Year Horizon Scenarios */}
          <div className="mb-8">
            <h4 className="font-condensed text-lg sm:text-xl font-bold tracking-wide text-[#083028] mb-3">
              {bn ? '৩. আগামী ৫ বছরের সম্ভাব্য পূর্বাভাস চিত্র (Horizon 2031)' : '3. NEXT 5-YEAR HORIZON SCENARIOS (FORECAST)'}
            </h4>

            <div className="grid sm:grid-cols-3 gap-3 text-xs font-mono">
              {b.projection?.scenarios?.map((sc) => (
                <div
                  key={sc.id}
                  className={`rounded-xl border p-3.5 shadow-2xs ${
                    sc.id === 'recovery'
                      ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950'
                      : sc.id === 'higher_loss'
                      ? 'border-rose-200 bg-rose-50/50 text-rose-950'
                      : 'border-[#d6e6de] bg-white text-[#113f37]'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                    {bn ? sc.nameBn : sc.name}
                  </span>
                  <p className="mt-1 font-mono text-lg font-black">
                    {fmt(sc.points?.[sc.points.length - 1]?.mangroveHa ?? sm.end.mangroveHa, 1, reportLang)} ha
                  </p>
                  <p className="text-[10.5px] opacity-80 mt-1">
                    {signed(sc.annualNetChangeHa * 5, 1, reportLang)} ha {bn ? '৫-বছরে প্রক্ষেপণ' : '5-yr projection'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 8. Ecosystem Narrative & Ecological Intelligence */}
          <div className="mb-8">
            <h4 className="font-condensed text-lg sm:text-xl font-bold tracking-wide text-[#083028] mb-3">
              {bn ? '৪. বাস্তুতন্ত্র বুদ্ধিমত্তা ও পরিবেশ বিবরণী' : '4. ECOSYSTEM NARRATIVE & STRATEGIC BRIEFING'}
            </h4>
            <div className="rounded-xl border border-[#d6e6de] bg-[#fcfdfc] p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm leading-relaxed text-[#1a443c]">
              {narrativeParas.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              <p className="pt-2 text-[11px] italic text-[#637d74]">
                {bn ? b.narrative.disclaimerBn : b.narrative.disclaimerEn}
              </p>
            </div>
          </div>

          {/* 9. Recommended Stakeholder Action Directives */}
          <div className="mb-8">
            <h4 className="font-condensed text-lg sm:text-xl font-bold tracking-wide text-[#083028] mb-3">
              {bn ? '৫. ক্ষেত্রভিত্তিক প্রস্তাবিত কর্মপরিকল্পনা ও সুপারিশ' : '5. RECOMMENDED STEWARDSHIP & MANAGEMENT DIRECTIVES'}
            </h4>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-[#d6e6de] bg-white p-3.5">
                <div className="flex items-center gap-1.5 font-mono font-bold text-[#113f38] text-[11px]">
                  <span className="flex size-1.5 rounded-full bg-emerald-600" />
                  <span>{bn ? '১. ক্যানোপি সুরক্ষা ও পর্যবেক্ষণ' : '1. Mudflat Accretion Watch'}</span>
                </div>
                <p className="mt-1.5 text-[#406257] leading-relaxed text-[11.5px]">
                  {bn
                    ? 'শনাক্তকৃত স্থিতিশীল কোর ম্যানগ্রোভ অঞ্চলে মানুষের অবৈধ কাঠ কাটা ও চিংড়ি ঘের সম্প্রসারণ রোধে যৌথ বন পরিচালন (JFM) টহল জোরদার করুন।'
                    : 'Reinforce joint forest management (JFM) patrols in core stable zones to halt illegal fuelwood felling and shrimp-pond encroachments.'}
                </p>
              </div>

              <div className="rounded-xl border border-[#d6e6de] bg-white p-3.5">
                <div className="flex items-center gap-1.5 font-mono font-bold text-[#113f38] text-[11px]">
                  <span className="flex size-1.5 rounded-full bg-emerald-600" />
                  <span>{bn ? '২. প্রজাতিভিত্তিক বৃক্ষরোপণ' : '2. Species Restoration'}</span>
                </div>
                <p className="mt-1.5 text-[#406257] leading-relaxed text-[11.5px]">
                  {bn
                    ? 'ভাটার ইন্টারটাইডাল কাদাচরে Avicennia marina ও Rhizophora mucronata চারার নার্সারি গড়ে তুলে বাঁধ ভাঙন প্রতিরোধ প্রাচীর গড়ে তুলুন।'
                    : 'Deploy community nurseries of Avicennia marina and Rhizophora mucronata along mudflats to bind silt and buffer cyclone storm surges.'}
                </p>
              </div>

              <div className="rounded-xl border border-[#d6e6de] bg-white p-3.5">
                <div className="flex items-center gap-1.5 font-mono font-bold text-[#113f38] text-[11px]">
                  <span className="flex size-1.5 rounded-full bg-emerald-600" />
                  <span>{bn ? '৩. উপগ্রহ সতর্কবার্তা ট্র্যাকিং' : '3. Sentinel-2 Cadence'}</span>
                </div>
                <p className="mt-1.5 text-[#406257] leading-relaxed text-[11.5px]">
                  {bn
                    ? 'প্রতি ৫ দিনে নতুন সেন্টিনেল-২ উপগ্রহ চিত্র আসার সাথে সাথে যেকোনো অপ্রত্যাশিত বন কাটার সতর্কতা পরীক্ষা করুন।'
                    : 'Maintain regular 5-day Sentinel-2 revisit telemetry checks to detect early canopy thinning before large-scale degradation occurs.'}
                </p>
              </div>
            </div>
          </div>

          {/* 10. Scientific Accuracy & Formal Sign-off Seal */}
          <div className="border-t-2 border-[#16865f] pt-5 mt-6 text-xs text-[#527167]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-mono text-[10.5px] font-semibold text-[#18483e]">
                  {acc ? (
                    <>
                      {bn ? 'মডেল সামগ্রিক নির্ভুলতা:' : 'Model Overall Accuracy:'} {(acc.overallAccuracy * 100).toFixed(1)}% · Kappa: {acc.kappa.toFixed(3)} · {fmt(acc.sampleCount, 0, reportLang)} {bn ? 'নমুনা বিন্দু' : 'verification points'}
                    </>
                  ) : (
                    <>
                      {bn ? 'ইউরোপীয় মহাকাশ সংস্থা (ESA) কোপার্নিকাস সেন্টিনেল-২ এমএসআই এল২এ মানদণ্ডে বিশ্লেষিত।' : 'Processed via Copernicus Sentinel-2 MSI Level-2A surface reflectance pipeline.'}
                    </>
                  )}
                </p>
                <p className="font-mono text-[9.5px] text-[#6d8a80]">
                  {bn
                    ? 'আইপিসিসি ২০১৩ ওয়েটল্যান্ডস সাপ্লিমেন্ট টিয়ার-১ কার্বন ঘনত্ব মডেল এবং গিরি এট আল. ম্যানগ্রোভ ক্যানোপি অ্যালগরিদম ভিত্তিক।'
                    : 'Grounded on IPCC 2013 Wetlands Supplement Tier-1 parameters and multi-temporal Random Forest spectral classification.'}
                </p>
              </div>

              {/* Digital Certification Stamp */}
              <div className="flex items-center gap-2.5 rounded-xl border border-[#c6dfd2] bg-[#f4f9f6] p-2.5 shrink-0">
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="font-mono text-[10px]">
                  <p className="font-bold text-[#0c3b32]">
                    {bn ? 'সুন্দরবন প্ল্যাটফর্ম প্রত্যয়িত' : 'SBC VERIFIED PLATFORM'}
                  </p>
                  <p className="text-[#597b71]">HASH: {b.analysisId.slice(0, 14)}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
