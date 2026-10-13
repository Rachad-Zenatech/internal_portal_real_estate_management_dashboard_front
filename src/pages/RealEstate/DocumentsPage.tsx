import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realEstateService } from '@/services/realEstateService';
import {
  FileText,
  FileCheck,
  Shield,
  Download,
  Search,
  FileSpreadsheet,
  FileSignature,
  FileBadge,
  Building2,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { toast } from 'sonner';

export default function DocumentsPage() {
  const queryClient = useQueryClient();

  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // New Document State
  const [newDoc, setNewDoc] = useState({
    title: '',
    document_type: 'LEASE',
    property_id: '',
    file_url: '/documents/uploads/sample_document.pdf',
    file_size_bytes: 1450000,
    uploaded_date: new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    notes: '',
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['real-estate-documents', documentTypeFilter, searchQuery],
    queryFn: () =>
      realEstateService.getDocuments({
        document_type: documentTypeFilter,
        search: searchQuery,
      }),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['real-estate-properties'],
    queryFn: () => realEstateService.getProperties(),
  });

  const createDocMutation = useMutation({
    mutationFn: (data: typeof newDoc) => realEstateService.createDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-documents'] });
      toast.success('Document record added to vault');
      setIsUploadModalOpen(false);
      setNewDoc({
        title: '',
        document_type: 'LEASE',
        property_id: '',
        file_url: '/documents/uploads/sample_document.pdf',
        file_size_bytes: 1450000,
        uploaded_date: new Date().toLocaleDateString('en-GB'),
        notes: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to upload document');
    },
  });

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '1.2 MB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case 'DEED':
        return <FileBadge className="w-5 h-5 text-amber-500" />;
      case 'CLOSING_STATEMENT':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'LEASE':
        return <FileSignature className="w-5 h-5 text-indigo-500" />;
      case 'INSURANCE':
        return <Shield className="w-5 h-5 text-sky-500" />;
      case 'INSPECTION':
        return <FileCheck className="w-5 h-5 text-blue-500" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold text-indigo-200">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Central Document & Records Vault</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Property Documents & Records</h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Store and retrieve deeds, buyer closing statements, lease contracts, inspection reports,
            Allstate insurance policies, and SEPA direct debit forms across all company properties.
          </p>
        </div>

        <Button
          onClick={() => {
            if (properties.length > 0 && !newDoc.property_id) {
              setNewDoc((prev) => ({ ...prev, property_id: properties[0].id }));
            }
            setIsUploadModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        {/* Type Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            size="sm"
            variant={documentTypeFilter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setDocumentTypeFilter('ALL')}
            className="text-xs h-8 rounded-lg cursor-pointer shrink-0"
          >
            All Types
          </Button>
          <Button
            size="sm"
            variant={documentTypeFilter === 'DEED' ? 'default' : 'outline'}
            onClick={() => setDocumentTypeFilter('DEED')}
            className="text-xs h-8 rounded-lg cursor-pointer shrink-0"
          >
            Deeds & Titles
          </Button>
          <Button
            size="sm"
            variant={documentTypeFilter === 'CLOSING_STATEMENT' ? 'default' : 'outline'}
            onClick={() => setDocumentTypeFilter('CLOSING_STATEMENT')}
            className="text-xs h-8 rounded-lg cursor-pointer shrink-0"
          >
            Closing Statements
          </Button>
          <Button
            size="sm"
            variant={documentTypeFilter === 'LEASE' ? 'default' : 'outline'}
            onClick={() => setDocumentTypeFilter('LEASE')}
            className="text-xs h-8 rounded-lg cursor-pointer shrink-0"
          >
            Leases & Contracts
          </Button>
          <Button
            size="sm"
            variant={documentTypeFilter === 'INSURANCE' ? 'default' : 'outline'}
            onClick={() => setDocumentTypeFilter('INSURANCE')}
            className="text-xs h-8 rounded-lg cursor-pointer shrink-0"
          >
            Insurance Policies
          </Button>
          <Button
            size="sm"
            variant={documentTypeFilter === 'HOA_CONDO_FEE' ? 'default' : 'outline'}
            onClick={() => setDocumentTypeFilter('HOA_CONDO_FEE')}
            className="text-xs h-8 rounded-lg cursor-pointer shrink-0"
          >
            HOA & Fees
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search document title or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-muted/40 animate-pulse border border-border" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="text-center p-12 border-dashed">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-lg text-foreground">No documents found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search query or type filter.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="border border-border/70 hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                    {getDocTypeIcon(doc.document_type)}
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                    {doc.document_type.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 truncate">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{doc.property_name || 'Global Property'}</span>
                    {doc.unit_number && (
                      <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                        • #{doc.unit_number}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <div>
                    <span>{formatFileSize(doc.file_size_bytes)}</span>
                    {doc.uploaded_date && <span> • {doc.uploaded_date.split(',')[0]}</span>}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      toast.info(`Opening ${doc.title}`);
                    }}
                    className="h-7 text-xs gap-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>View File</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Document to Vault</DialogTitle>
            <DialogDescription className="text-xs">
              Record deed, lease agreement, inspection report, or tax file metadata.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Document Title</label>
              <Input
                placeholder="e.g. 2026 Lease Renewal Amendment.pdf"
                value={newDoc.title}
                onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Document Type</label>
                <Select
                  value={newDoc.document_type}
                  onValueChange={(val) => setNewDoc({ ...newDoc, document_type: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEASE">Lease / Contract</SelectItem>
                    <SelectItem value="DEED">Grant Deed / Title</SelectItem>
                    <SelectItem value="CLOSING_STATEMENT">Closing Statement</SelectItem>
                    <SelectItem value="INSURANCE">Insurance Policy</SelectItem>
                    <SelectItem value="INSPECTION">Inspection Report</SelectItem>
                    <SelectItem value="HOA_CONDO_FEE">HOA Assessment</SelectItem>
                    <SelectItem value="TAX_RECEIPT">Tax Assessment</SelectItem>
                    <SelectItem value="SEPA">SEPA Mandate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Property</label>
                <Select
                  value={newDoc.property_id}
                  onValueChange={(val) => setNewDoc({ ...newDoc, property_id: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select building..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.city} - {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Notes</label>
              <Input
                placeholder="e.g. Countersigned copy by Shaun Passley"
                value={newDoc.notes}
                onChange={(e) => setNewDoc({ ...newDoc, notes: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newDoc.title || !newDoc.property_id || createDocMutation.isPending}
              onClick={() => createDocMutation.mutate(newDoc)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {createDocMutation.isPending ? 'Saving...' : 'Save Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
