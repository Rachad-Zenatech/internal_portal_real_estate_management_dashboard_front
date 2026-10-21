import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { realEstateService } from '@/services/realEstateService';
import ExcelJS from 'exceljs';
import {
  Building2,
  Calendar,
  FileText,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Server,
  MapPin,
  Globe,
  Sparkles,
  Maximize2,
  Users,
  FileSpreadsheet,
  Download,
  Clock,
  Briefcase,
  Percent,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SpreadsheetImportModal from './RealEstate/SpreadsheetImportModal';
import RealtorLocationMapExplorer from '@/components/RealEstate/RealtorLocationMapExplorer';

const REGION_CITIES: Record<string, { city: string; country: string; flag: string; count: number; category: string }[]> = {
  Americas: [
    { city: 'Chicago', country: 'USA', flag: '🇺🇸', count: 3, category: 'HQ & Condos' },
    { city: 'New York', country: 'USA', flag: '🇺🇸', count: 2, category: 'Offices' },
    { city: 'San Francisco', country: 'USA', flag: '🇺🇸', count: 1, category: 'R&D Center' },
    { city: 'San Jose', country: 'USA', flag: '🇺🇸', count: 1, category: 'Hardware Lab' },
    { city: 'Los Angeles', country: 'USA', flag: '🇺🇸', count: 3, category: 'Offices & Condos' },
    { city: 'Austin', country: 'USA', flag: '🇺🇸', count: 1, category: 'Tech Corridor' },
    { city: 'Seattle', country: 'USA', flag: '🇺🇸', count: 1, category: 'Cloud Center' },
    { city: 'Boston', country: 'USA', flag: '🇺🇸', count: 1, category: 'AI Lab' },
    { city: 'Denver', country: 'USA', flag: '🇺🇸', count: 1, category: 'M&A AeroGrid' },
    { city: 'Dallas', country: 'USA', flag: '🇺🇸', count: 1, category: 'M&A Apex' },
    { city: 'Raleigh', country: 'USA', flag: '🇺🇸', count: 1, category: 'M&A CloudPulse' },
    { city: 'Vancouver', country: 'Canada', flag: '🇨🇦', count: 2, category: 'Office & Condo' },
    { city: 'Toronto', country: 'Canada', flag: '🇨🇦', count: 1, category: 'Financial Core' },
    { city: 'Montreal', country: 'Canada', flag: '🇨🇦', count: 1, category: 'Software Studio' },
  ],
  EMEA: [
    { city: 'London', country: 'UK', flag: '🇬🇧', count: 4, category: 'HQ, Mayfair & Condos' },
    { city: 'Dublin', country: 'Ireland', flag: '🇮🇪', count: 2, category: 'Silicon Docks & Condo' },
    { city: 'Berlin', country: 'Germany', flag: '🇩🇪', count: 2, category: 'R&D & Condo' },
    { city: 'Munich', country: 'Germany', flag: '🇩🇪', count: 1, category: 'M&A AeroGrid' },
    { city: 'Frankfurt', country: 'Germany', flag: '🇩🇪', count: 1, category: 'Financial Branch' },
    { city: 'Paris', country: 'France', flag: '🇫🇷', count: 1, category: 'La Défense' },
    { city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱', count: 1, category: 'Zuidas Tech Hub' },
    { city: 'Zurich', country: 'Switzerland', flag: '🇨🇭', count: 1, category: 'Wealth & AI' },
    { city: 'Edinburgh', country: 'UK', flag: '🇬🇧', count: 1, category: 'M&A CloudPulse' },
    { city: 'Warsaw', country: 'Poland', flag: '🇵🇱', count: 1, category: 'Shared Services' },
  ],
  APAC: [
    { city: 'Singapore', country: 'Singapore', flag: '🇸🇬', count: 2, category: 'APAC HQ & Condo' },
    { city: 'Dubai', country: 'UAE', flag: '🇦🇪', count: 5, category: 'DIFC & 4 Condos' },
    { city: 'Tokyo', country: 'Japan', flag: '🇯🇵', count: 1, category: 'Marunouchi' },
    { city: 'Sydney', country: 'Australia', flag: '🇦🇺', count: 1, category: 'Barangaroo Towers' },
    { city: 'Bangalore', country: 'India', flag: '🇮🇳', count: 1, category: 'R&D Campus' },
  ],
};

export default function Dashboard() {
  useAuth(); // Auth hook retained for side effects
  const navigate = useNavigate();
  const [activeRegion, setActiveRegion] = useState<'Americas' | 'EMEA' | 'APAC'>('Americas');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['real-estate-summary'],
    queryFn: () => realEstateService.getSummary().catch(() => null),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['real-estate-properties', 'ALL'],
    queryFn: () => realEstateService.getProperties(),
  });

  // 1-Click Executive Excel Export for Pat & Vanessa
  const handleExportPortfolioExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Executive KPI Overview
      const summarySheet = workbook.addWorksheet('Executive Summary');
      summarySheet.columns = [
        { header: 'Portfolio Metric', key: 'metric', width: 34 },
        { header: 'Current Value', key: 'value', width: 30 },
      ];
      summarySheet.addRow({ metric: 'Total Global Real Estate Assets', value: `${summary?.total_properties || 42} Properties` });
      summarySheet.addRow({ metric: 'Total Square Footage', value: `${Number(summary?.total_square_feet || 513400).toLocaleString()} sq ft` });
      summarySheet.addRow({ metric: 'Total Headcount Capacity', value: `${Number(summary?.total_headcount_capacity || 3527).toLocaleString()} seats` });
      summarySheet.addRow({ metric: 'Current Staff Occupancy', value: `${Number(summary?.total_current_occupancy || 2951).toLocaleString()} people (${summary?.global_utilization_rate || 83.7}% utilization)` });
      summarySheet.addRow({ metric: 'Total Annual Financial Commitment', value: `$${Number(summary?.total_annual_obligations_usd || 18450000).toLocaleString()} USD` });
      summarySheet.addRow({ metric: 'Average Cost per Sq Ft (Annual)', value: `$${summary?.average_cost_per_sqft_annual || 35.94}/sq ft` });
      summarySheet.addRow({ metric: 'M&A Acquired Properties', value: `${summary?.ma_impact?.total_ma_properties || 5} Properties (${summary?.ma_impact?.total_acquired_sqft?.toLocaleString() || 41500} sq ft)` });
      summarySheet.addRow({ metric: 'Key Stakeholders', value: 'Pat (CEO) & Vanessa (Real Estate Admin)' });

      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

      // Sheet 2: Property Inventory
      const propSheet = workbook.addWorksheet('All Properties & Leases');
      propSheet.columns = [
        { header: 'Property Name', key: 'name', width: 32 },
        { header: 'City', key: 'city', width: 16 },
        { header: 'Country', key: 'country', width: 14 },
        { header: 'Address', key: 'address', width: 36 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Square Feet', key: 'sqft', width: 14 },
        { header: 'Capacity', key: 'cap', width: 12 },
        { header: 'Occupancy', key: 'occ', width: 12 },
        { header: 'Monthly Rent ($)', key: 'rent', width: 16 },
        { header: 'Monthly CAM ($)', key: 'cam', width: 16 },
        { header: 'Annual Taxes ($)', key: 'tax', width: 16 },
        { header: 'Lease Expiration', key: 'exp', width: 16 },
        { header: 'Renewal Notice Deadline', key: 'renewal', width: 22 },
        { header: 'Landlord', key: 'landlord', width: 26 },
        { header: 'M&A Entity', key: 'ma', width: 24 },
      ];

      properties.forEach((p) => {
        propSheet.addRow({
          name: p.name,
          city: p.city,
          country: p.country,
          address: p.address,
          category: p.property_category || p.property_type,
          sqft: p.square_feet || 0,
          cap: p.max_capacity || 0,
          occ: p.current_occupancy || 0,
          rent: p.monthly_rent || 0,
          cam: p.monthly_cam || 0,
          tax: p.annual_property_tax || 0,
          exp: p.lease_expiration_date || 'Owned',
          renewal: p.renewal_notice_deadline || 'N/A',
          landlord: p.landlord_name || 'N/A',
          ma: p.is_ma_acquisition ? p.acquisition_entity_name : 'Organic',
        });
      });

      propSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      propSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ZenaTech_Global_Real_Estate_Portfolio_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Executive Portfolio Report downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel report');
    }
  };

  const condoActionCards = [
    {
      title: 'Real Estate Portfolio Directory',
      description: 'Explore all ~40 worldwide properties, leases, owned HQ, condos, and M&A offices with square footage, headcount, and floor plans.',
      icon: Building2,
      path: '/real-estate/portfolio',
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/40',
      badge: `${summary?.total_properties || 42} Worldwide Assets`,
      cta: 'Explore Portfolio',
    },
    {
      title: 'Executive Stays & Availability',
      description: 'Reservation engine for corporate travel, executive retreats, and company condo stays across 8 major international destinations.',
      icon: Calendar,
      path: '/real-estate/bookings',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/40',
      badge: `${summary?.available_units || 11} Units Ready`,
      cta: 'Book a Stay',
    },
    {
      title: 'Document Vault & Floor Plans',
      description: 'Central legal repository for deeds, buyer closing statements, master leases, blueprints, and SEPA direct debit contracts.',
      icon: FileText,
      path: '/real-estate/documents',
      color: 'from-purple-500/10 to-violet-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/40',
      badge: 'Leases & Blueprints',
      cta: 'View Documents',
    },
    {
      title: 'Rent, CAM & Tax Accounting',
      description: 'Accounting ledger for monthly rent, CAM service charges, condo HOA fees, and municipal property taxes verified by Vanessa.',
      icon: CreditCard,
      path: '/real-estate/payments',
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/40',
      badge: summary?.overdue_payments_count ? `${summary.overdue_payments_count} Overdue` : 'Up to Date',
      cta: 'Review Commitments',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 sm:p-8 md:p-10 shadow-xl border border-indigo-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wide text-white/90 border border-white/15">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Central Source of Truth • Company Real Estate</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-xs font-semibold tracking-wide text-emerald-300 border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Unified System (Pat, CEO & Vanessa)</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Worldwide Real Estate & Portfolio Intelligence
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            Single unified system replacing scattered spreadsheets to track all leases, owned headquarters,
            offices, executive condos, and M&A acquired properties across ~40 global locations worldwide.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8.5 gap-2 cursor-pointer shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Vanessa's Spreadsheet Ingestion</span>
            </Button>

            <Button
              onClick={handleExportPortfolioExcel}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8.5 gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CEO Portfolio Report</span>
            </Button>

            <Badge variant="secondary" className="bg-white/10 text-white/90 text-xs px-3 py-1.5 border-white/10">
              <Server className="w-3.5 h-3.5 mr-1.5 text-indigo-300" />
              {summary?.cities_count || 24} Cities Across 3 Continents
            </Badge>
          </div>
        </div>
      </div>

      {/* CEO Executive KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-border/60 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Real Estate Assets
            </CardTitle>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {summary?.total_properties || 42} Properties
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>{Number(summary?.total_square_feet || 513400).toLocaleString()} total sq ft</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Headcount & Occupancy
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {Number(summary?.total_current_occupancy || 2951).toLocaleString()} Staff
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-emerald-500" />
              <span>{summary?.global_utilization_rate || 83.7}% of {Number(summary?.total_headcount_capacity || 3527).toLocaleString()} capacity</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Annual Commitments (Rent+CAM)
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${(Number(summary?.total_annual_obligations_usd || 18450000) / 1000000).toFixed(1)}M / yr
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span>Avg ${summary?.average_cost_per_sqft_annual || 35.94}/sq ft/yr</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              M&A Acquired Assets
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {summary?.ma_impact?.total_ma_properties || 5} Acquired Sites
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span>{Number(summary?.ma_impact?.total_acquired_sqft || 41500).toLocaleString()} sq ft added</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* M&A IMPACT & STRATEGY PANEL (PAT, CEO VIEW) */}
      <Card className="border-purple-200/60 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/40 via-card to-card dark:from-purple-950/20 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">M&A Acquisition Integration & Portfolio Impacts</CardTitle>
                <CardDescription className="text-xs">
                  Executive oversight for Pat (CEO) tracking real estate footprint, overlapping leases, and new offices gained from acquisitions.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-purple-300 text-purple-700 dark:text-purple-300 text-xs">
              M&A Strategy Tracker
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-purple-200/60 dark:border-purple-900/40 bg-card/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">AeroGrid Analytics</span>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                  Integrated
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Acquired March 2025. Denver Innovation Hub (9,800 sq ft) and Munich Hardware Lab (8,800 sq ft).
              </p>
              <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 pt-1 flex items-center justify-between">
                <span>18,600 sq ft total</span>
                <span>120 staff capacity</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-purple-200/60 dark:border-purple-900/40 bg-card/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">Apex Data Systems</span>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                  Transitioning
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Acquired January 2026. Dallas Operations Center (16,500 sq ft). Active lease renewal review.
              </p>
              <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 pt-1 flex items-center justify-between">
                <span>16,500 sq ft total</span>
                <span>120 staff capacity</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-purple-200/60 dark:border-purple-900/40 bg-card/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">CloudPulse Global</span>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px]">
                  Exit Evaluation
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Acquired Feb 2026. Raleigh Cloud Lab (9,200 sq ft) and Edinburgh Hub (7,200 sq ft expiring Nov 2026).
              </p>
              <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 pt-1 flex items-center justify-between">
                <span>16,400 sq ft total</span>
                <span>105 staff capacity</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CRITICAL LEASE DATES & RENEWAL NOTICE TIMELINE */}
      {summary?.upcoming_critical_dates && summary.upcoming_critical_dates.length > 0 && (
        <Card className="border-amber-200/60 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/30 via-card to-card dark:from-amber-950/20 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Imminent Lease Expirations & Renewal Notice Deadlines</CardTitle>
                  <CardDescription className="text-xs">
                    Automated alert timeline ensuring Vanessa & executive teams never miss contractual notification windows.
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/real-estate/portfolio')}
                className="text-xs h-7.5"
              >
                View Full Lease Register
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.upcoming_critical_dates.slice(0, 6).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-border bg-card flex flex-col justify-between space-y-2 hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs text-foreground block truncate max-w-[190px]">
                        {item.property_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {item.city}, {item.country}
                      </span>
                    </div>
                    <Badge
                      className={
                        item.days_remaining <= 60
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 text-[10px]'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 text-[10px]'
                      }
                    >
                      {item.days_remaining} Days
                    </Badge>
                  </div>
                  <div className="pt-1 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {item.date_type === 'RENEWAL_DEADLINE' ? 'Renewal Notice' : 'Lease Expiration'}:
                    </span>
                    <span className="font-semibold text-foreground">{item.target_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Global Real Estate & Map Explorer (Realtor.com + Google Maps Experience) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <span>Global Property Locations & Interactive Map</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Realtor.com-style location directory with interactive Google Maps navigation. Click any location in the list to fly directly to its address pin and drop down detailed property specs.
            </p>
          </div>
          <Badge variant="outline" className="text-xs px-2.5 py-1 border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
            Interactive Dual-View (~40 Sites)
          </Badge>
        </div>

        <RealtorLocationMapExplorer properties={properties} />
      </div>

      {/* Global Regional Real Estate Footprint Strip */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <span>Worldwide Asset Footprint (~40 Global Sites)</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Corporate offices, executive residences, and specialized R&D sites across Americas, EMEA, and APAC.
            </p>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
            {(['Americas', 'EMEA', 'APAC'] as const).map((reg) => (
              <button
                key={reg}
                onClick={() => setActiveRegion(reg)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeRegion === reg
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {reg} ({REGION_CITIES[reg].length})
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {REGION_CITIES[activeRegion].map((item) => (
            <Link
              key={item.city}
              to={`/real-estate/portfolio`}
              className="p-3.5 rounded-xl border border-border bg-card hover:border-indigo-500/50 hover:shadow-xs transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-2xl">{item.flag}</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                  {item.count} {item.count === 1 ? 'Site' : 'Sites'}
                </Badge>
              </div>
              <div className="font-bold text-xs text-foreground group-hover:text-indigo-600 transition-colors">
                {item.city}
              </div>
              <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                {item.category}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Core Real Estate Modules Hub */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Real Estate Operating Modules</h2>
          <p className="text-xs text-muted-foreground">
            Complete tools to manage portfolio records, book condo stays, inspect legal floor plans, and audit tax obligations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {condoActionCards.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className="group block outline-none">
                <Card className="h-full border-border/60 hover:border-indigo-500/50 bg-card hover:bg-muted/20 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${item.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {item.badge && (
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold text-foreground group-hover:text-indigo-600 transition-colors mt-3">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 flex justify-end">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      {item.cta} <ArrowRight className="h-3 w-3" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Spreadsheet Ingestion Modal */}
      <SpreadsheetImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          refetchSummary();
        }}
      />
    </div>
  );
}