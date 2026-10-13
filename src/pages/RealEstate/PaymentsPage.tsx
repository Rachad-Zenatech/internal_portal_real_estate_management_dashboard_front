import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realEstateService } from '@/services/realEstateService';
import type { PropertyObligation } from '@/types/realEstate';
import { useAuth } from '@/lib/AuthContext';
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  Plus,
  Search,
  Check,
  ShieldAlert,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const { user, hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const canVerifyPayments =
    isSuperAdmin ||
    hasPermission('REAL_ESTATE_ACCOUNTING') ||
    user?.department?.toLowerCase().includes('finance') ||
    user?.department?.toLowerCase().includes('accounting');

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Mark Paid Dialog State
  const [selectedObligation, setSelectedObligation] = useState<PropertyObligation | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payFormData, setPayFormData] = useState({
    paid_date: new Date().toISOString().split('T')[0],
    paid_by: user?.full_name || 'Accounting Team',
    reference_invoice: '',
    notes: '',
  });

  // Add Obligation Dialog State
  const [isAddObligationOpen, setIsAddObligationOpen] = useState(false);
  const [newObligation, setNewObligation] = useState({
    unit_id: '',
    obligation_type: 'HOA_CONDO_FEE',
    frequency: 'MONTHLY',
    amount: 500,
    currency: 'USD',
    due_date: new Date().toISOString().split('T')[0],
    payment_status: 'PENDING',
    paid_by: '',
    reference_invoice: '',
    notes: '',
  });

  // Load Obligations
  const { data: obligations = [], isLoading } = useQuery({
    queryKey: ['real-estate-obligations', statusFilter, typeFilter],
    queryFn: () =>
      realEstateService.getObligations({
        status: statusFilter,
        obligation_type: typeFilter,
      }),
  });

  // Load Units for dropdown
  const { data: units = [] } = useQuery({
    queryKey: ['real-estate-units-all'],
    queryFn: () => realEstateService.getUnits(),
  });

  // Load Summary
  const { data: summary } = useQuery({
    queryKey: ['real-estate-summary'],
    queryFn: () => realEstateService.getSummary(),
  });

  // Mark Paid Mutation
  const markPaidMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof payFormData }) =>
      realEstateService.markObligationPaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-summary'] });
      toast.success('Payment verified and marked as PAID');
      setIsPayModalOpen(false);
      setSelectedObligation(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update payment');
    },
  });

  // Create Obligation Mutation
  const createObligationMutation = useMutation({
    mutationFn: (data: typeof newObligation) => realEstateService.createObligation(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-summary'] });
      toast.success('Payment obligation recorded');
      setIsAddObligationOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to record obligation');
    },
  });

  const overdueList = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return obligations.filter(
      (o) => o.payment_status === 'OVERDUE' || (o.payment_status === 'PENDING' && o.due_date < today)
    );
  }, [obligations]);

  const filteredObligations = useMemo(() => {
    return obligations.filter((o) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (o.property_name && o.property_name.toLowerCase().includes(q)) ||
        (o.city && o.city.toLowerCase().includes(q)) ||
        (o.unit_number && o.unit_number.toLowerCase().includes(q)) ||
        (o.paid_by && o.paid_by.toLowerCase().includes(q)) ||
        (o.reference_invoice && o.reference_invoice.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [obligations, searchQuery]);

  const getStatusBadge = (status?: string, dueDate?: string) => {
    const currentStatus = status || 'PENDING';
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = currentStatus === 'OVERDUE' || (currentStatus === 'PENDING' && dueDate && dueDate < today);

    if (status === 'PAID') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-medium animate-pulse">
          <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium">
        <Clock className="w-3 h-3 mr-1" /> Upcoming
      </Badge>
    );
  };

  const getObligationLabel = (type: string) => {
    switch (type) {
      case 'RENT':
        return 'Monthly Rent';
      case 'ANNUAL_TAX':
        return 'Annual Property Tax';
      case 'HOA_CONDO_FEE':
        return 'HOA / Strata Assessment';
      case 'INSURANCE_PREMIUM':
        return 'Insurance Policy';
      case 'INSPECTION_FEE':
        return 'Property Inspection';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold text-indigo-200">
            <Receipt className="w-3.5 h-3.5 text-indigo-400" />
            <span>Accounting & Operational Obligations Controller</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Rent, HOA & Property Tax Monitoring</h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Monitor monthly rent, building HOA dues, and annual municipal property taxes across all
            condos. Real-time overdue alerts and accounting verification.
          </p>
        </div>

        {canVerifyPayments && (
          <Button
            onClick={() => {
              if (units.length > 0 && !newObligation.unit_id) {
                setNewObligation((prev) => ({ ...prev, unit_id: units[0].id }));
              }
              setIsAddObligationOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Obligation</span>
          </Button>
        )}
      </div>

      {/* OVERDUE NOTIFICATIONS ALERT BANNER */}
      {overdueList.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs flex-1">
            <div className="font-bold text-sm">
              Attention Required: {overdueList.length} Payment Obligation(s) Overdue
            </div>
            <p className="text-rose-700 dark:text-rose-300">
              Payments requiring immediate settlement:
            </p>
            <ul className="list-disc list-inside space-y-0.5 pt-1 text-[11px]">
              {overdueList.map((item) => (
                <li key={item.id}>
                  <span className="font-semibold">{item.property_name} (Unit #{item.unit_number})</span>:
                  {' '}{getObligationLabel(item.obligation_type)} of{' '}
                  <span className="font-mono font-bold">{item.currency} ${Number(item.amount).toLocaleString()}</span>{' '}
                  (Due {item.due_date})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-border flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Overdue Payments</div>
            <div className="text-xl font-bold text-rose-600">{overdueList.length} Items</div>
          </div>
        </Card>

        <Card className="p-4 border border-border flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Upcoming & Pending</div>
            <div className="text-xl font-bold text-foreground">
              {obligations.filter((o) => o.payment_status === 'PENDING' || o.payment_status === 'UPCOMING').length} Items
            </div>
          </div>
        </Card>

        <Card className="p-4 border border-border flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Verified Paid</div>
            <div className="text-xl font-bold text-emerald-600">
              {obligations.filter((o) => o.payment_status === 'PAID').length} Settled
            </div>
          </div>
        </Card>

        <Card className="p-4 border border-border flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Monthly Assessment Run</div>
            <div className="text-xl font-bold text-foreground">
              ${Number(summary?.total_monthly_obligations_usd || 0).toLocaleString()} /mo
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8.5 w-36 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="OVERDUE">Overdue Only</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8.5 w-44 text-xs">
              <SelectValue placeholder="All Obligation Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Obligation Types</SelectItem>
              <SelectItem value="RENT">Monthly Rent</SelectItem>
              <SelectItem value="ANNUAL_TAX">Annual Property Tax</SelectItem>
              <SelectItem value="HOA_CONDO_FEE">HOA / Strata Assessment</SelectItem>
              <SelectItem value="INSURANCE_PREMIUM">Insurance</SelectItem>
              <SelectItem value="INSPECTION_FEE">Inspection</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search property, payer, or invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8.5 text-xs"
          />
        </div>
      </div>

      {/* Obligations Table */}
      <Card className="border border-border/70 overflow-hidden shadow-xs">
        <CardHeader className="py-3.5 px-4 bg-muted/20 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Payment Obligations Directory ({filteredObligations.length})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Monthly rent, HOA fees, and annual taxes tracking with payer accountability.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/40">
                <TableHead className="text-xs font-semibold">Property & Unit</TableHead>
                <TableHead className="text-xs font-semibold">Obligation Type</TableHead>
                <TableHead className="text-xs font-semibold">Amount & Currency</TableHead>
                <TableHead className="text-xs font-semibold">Due Date</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Paid By / Coordinator</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : filteredObligations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No payment obligations found matching filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredObligations.map((o) => (
                  <TableRow key={o.id} className="hover:bg-muted/30 transition-colors">
                    {/* 1. Property */}
                    <TableCell className="py-3">
                      <div>
                        <div className="font-semibold text-xs text-foreground truncate max-w-[200px]">
                          {o.property_name || 'Global Property'}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span className="font-mono font-bold">Unit #{o.unit_number}</span>
                          <span>• {o.city}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* 2. Type */}
                    <TableCell className="py-3">
                      <div>
                        <div className="font-medium text-xs text-foreground">
                          {getObligationLabel(o.obligation_type)}
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                          {o.frequency}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* 3. Amount */}
                    <TableCell className="py-3">
                      <div className="font-bold text-xs text-foreground">
                        {o.currency} ${Number(o.amount).toLocaleString()}
                      </div>
                    </TableCell>

                    {/* 4. Due Date */}
                    <TableCell className="py-3">
                      <div className="text-xs text-foreground font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{o.due_date}</span>
                      </div>
                    </TableCell>

                    {/* 5. Status */}
                    <TableCell className="py-3">{getStatusBadge(o.payment_status, o.due_date ?? '')}</TableCell>

                    {/* 6. Paid By */}
                    <TableCell className="py-3">
                      <div className="text-xs text-foreground">
                        {o.paid_by ? (
                          <div className="font-medium flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{o.paid_by}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                        {o.reference_invoice && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Ref: {o.reference_invoice}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* 7. Action */}
                    <TableCell className="py-3 text-right">
                      {o.payment_status !== 'PAID' && canVerifyPayments && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedObligation(o);
                            setPayFormData({
                              paid_date: new Date().toISOString().split('T')[0],
                              paid_by: o.paid_by || user?.full_name || 'Accounting Team',
                              reference_invoice: o.reference_invoice || '',
                              notes: '',
                            });
                            setIsPayModalOpen(true);
                          }}
                          className="h-7 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          <Check className="w-3 h-3" />
                          <span>Verify & Pay</span>
                        </Button>
                      )}
                      {o.payment_status === 'PAID' && (
                        <span className="text-[11px] text-emerald-600 font-medium">Settled</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Verify & Pay Modal */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Obligation as Paid</DialogTitle>
            <DialogDescription className="text-xs">
              Verify payment settlement for accounting audit records.
            </DialogDescription>
          </DialogHeader>

          {selectedObligation && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                <div className="font-bold text-sm text-foreground">
                  {selectedObligation.property_name} (Unit #{selectedObligation.unit_number})
                </div>
                <div className="text-muted-foreground">
                  {getObligationLabel(selectedObligation.obligation_type)} • Due:{' '}
                  {selectedObligation.due_date}
                </div>
                <div className="text-base font-extrabold text-emerald-600 pt-1">
                  {selectedObligation.currency} ${Number(selectedObligation.amount).toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Payment Date</label>
                  <Input
                    type="date"
                    value={payFormData.paid_date}
                    onChange={(e) => setPayFormData({ ...payFormData, paid_date: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Paid By (Payer)</label>
                  <Input
                    placeholder="e.g. Vanessa, Corporate Wire"
                    value={payFormData.paid_by}
                    onChange={(e) => setPayFormData({ ...payFormData, paid_by: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Reference / Invoice #</label>
                <Input
                  placeholder="e.g. WIRE-84920, COOK-CNTY-RECEIPT"
                  value={payFormData.reference_invoice}
                  onChange={(e) =>
                    setPayFormData({ ...payFormData, reference_invoice: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Verification Note</label>
                <Input
                  placeholder="e.g. Confirmed with Chicago tax authority portal"
                  value={payFormData.notes}
                  onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={markPaidMutation.isPending || !selectedObligation}
              onClick={() => {
                if (selectedObligation) {
                  markPaidMutation.mutate({
                    id: selectedObligation.id,
                    data: payFormData,
                  });
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {markPaidMutation.isPending ? 'Verifying...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Obligation Modal */}
      <Dialog open={isAddObligationOpen} onOpenChange={setIsAddObligationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Payment Obligation</DialogTitle>
            <DialogDescription className="text-xs">
              Schedule recurring rent, condo assessment, or annual municipal tax.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Select Condo / Unit</label>
              <Select
                value={newObligation.unit_id}
                onValueChange={(val) => setNewObligation({ ...newObligation, unit_id: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose unit..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.city} • {u.property_name} (Unit #{u.unit_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Obligation Type</label>
                <Select
                  value={newObligation.obligation_type}
                  onValueChange={(val) => setNewObligation({ ...newObligation, obligation_type: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOA_CONDO_FEE">HOA / Strata Assessment</SelectItem>
                    <SelectItem value="RENT">Monthly Rent</SelectItem>
                    <SelectItem value="ANNUAL_TAX">Annual Property Tax</SelectItem>
                    <SelectItem value="INSURANCE_PREMIUM">Insurance Policy</SelectItem>
                    <SelectItem value="INSPECTION_FEE">Inspection Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Frequency</label>
                <Select
                  value={newObligation.frequency}
                  onValueChange={(val) => setNewObligation({ ...newObligation, frequency: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="ANNUALLY">Annually</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="ONE_TIME">One Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Amount</label>
                <Input
                  type="number"
                  value={newObligation.amount}
                  onChange={(e) =>
                    setNewObligation({ ...newObligation, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Currency</label>
                <Select
                  value={newObligation.currency}
                  onValueChange={(val) => setNewObligation({ ...newObligation, currency: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="AED">AED (AED)</SelectItem>
                    <SelectItem value="SGD">SGD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Due Date</label>
                <Input
                  type="date"
                  value={newObligation.due_date}
                  onChange={(e) => setNewObligation({ ...newObligation, due_date: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Responsible Party</label>
                <Input
                  placeholder="e.g. Vanessa, Accounting"
                  value={newObligation.paid_by}
                  onChange={(e) => setNewObligation({ ...newObligation, paid_by: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Notes</label>
              <Input
                placeholder="e.g. Cook County 2nd installment, Direct Debit"
                value={newObligation.notes}
                onChange={(e) => setNewObligation({ ...newObligation, notes: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddObligationOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newObligation.unit_id || newObligation.amount <= 0 || createObligationMutation.isPending}
              onClick={() => createObligationMutation.mutate(newObligation)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {createObligationMutation.isPending ? 'Scheduling...' : 'Schedule Obligation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
