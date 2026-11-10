import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, File as FileIcon, FileImage, FileText, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SectionCard } from '@/components/common/PageKit';
import { apiClient } from '@/services/apiClient';
import { realEstateService } from '@/services/realEstateService';
import type { PropertyDocument } from '@/types/realEstate';

// Mirrors the server's rules (property_document_service.py); the server checks again.
const ALLOWED = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const MAX_MB = 20;
const ACCEPT = ALLOWED.map((e) => `.${e}`).join(',');

const ext = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');
const isImage = (d: Pick<PropertyDocument, 'content_type'>) => d.content_type.startsWith('image/');
const isPdf = (d: Pick<PropertyDocument, 'content_type'>) => d.content_type === 'application/pdf';
const isText = (d: Pick<PropertyDocument, 'content_type'>) => d.content_type === 'text/plain' || d.content_type === 'text/csv';
const canPreview = (d: PropertyDocument) => isImage(d) || isPdf(d) || isText(d);

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ doc }: { doc: PropertyDocument }) {
  const cls = 'h-5 w-5 shrink-0 text-muted-foreground';
  if (isImage(doc)) return <FileImage className={cls} />;
  if (isPdf(doc) || isText(doc)) return <FileText className={cls} />;
  return <FileIcon className={cls} />;
}

const base = (propertyId: string) => `/api/real-estate/properties/${propertyId}/documents`;

/** Documents of one property: a drag-and-drop upload area, the list, and preview / download / delete. */
export default function PropertyDocuments({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const key = ['real-estate-documents', propertyId];
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PropertyDocument | null>(null);
  const [toDelete, setToDelete] = useState<PropertyDocument | null>(null);

  const { data: docs = [], isLoading, isError } = useQuery({ queryKey: key, queryFn: () => realEstateService.listDocuments(propertyId) });

  const upload = useMutation({
    mutationFn: (files: File[]) => realEstateService.uploadDocuments(propertyId, files),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: key });
      toast.success(created.length === 1 ? 'Document uploaded' : `${created.length} documents uploaded`);
    },
    onError: (err: Error) => toast.error(err.message || 'Could not upload the document'),
  });

  const remove = useMutation({
    mutationFn: (doc: PropertyDocument) => realEstateService.deleteDocument(propertyId, doc.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      setToDelete(null);
      toast.success('Document deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not delete the document'),
  });

  const addFiles = useCallback((list: FileList | File[] | null) => {
    const files = Array.from(list ?? []);
    if (!files.length || !canEdit) return;
    const bad = files.find((f) => !ALLOWED.includes(ext(f.name)) || f.size === 0 || f.size > MAX_MB * 1024 * 1024);
    if (bad) {
      toast.error(
        !ALLOWED.includes(ext(bad.name)) ? `'${bad.name}': this file type is not allowed.`
          : bad.size === 0 ? `'${bad.name}' is empty.` : `'${bad.name}' is larger than ${MAX_MB} MB.`,
      );
      return; // nothing is uploaded when one file is not acceptable
    }
    upload.mutate(files);
  }, [canEdit, upload]);

  const download = (doc: PropertyDocument) =>
    apiClient.downloadFile(`${base(propertyId)}/${doc.id}/file?download=true`, doc.file_name).catch((e: Error) => toast.error(e.message || 'Could not download the document'));

  return (
    <SectionCard title="Documents" subtitle="Deeds, leases, inspection reports and photos for this property">
      {canEdit && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload documents: drop files here or press Enter to choose files"
          onClick={() => input.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
          }`}
        >
          {upload.isPending ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <UploadCloud className="h-6 w-6 text-muted-foreground" />}
          <p className="text-sm font-medium">{upload.isPending ? 'Uploading…' : 'Drag and drop files here, or click to browse'}</p>
          <p className="text-xs text-muted-foreground">PDF, images, Word, Excel, PowerPoint, text or CSV · up to {MAX_MB} MB each</p>
          <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" data-testid="document-input"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading documents…</p>}
      {isError && <p className="text-sm text-destructive">The documents could not be loaded.</p>}
      {!isLoading && !isError && docs.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
      {docs.length > 0 && (
        <ul className="divide-y divide-border/60">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5">
              <DocIcon doc={doc} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={doc.file_name}>{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
              {canPreview(doc) && (
                <Button type="button" variant="ghost" size="icon" aria-label={`Preview ${doc.file_name}`} title="Preview" onClick={() => setPreview(doc)}>
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button type="button" variant="ghost" size="icon" aria-label={`Download ${doc.file_name}`} title="Download" onClick={() => download(doc)}>
                <Download className="h-4 w-4" />
              </Button>
              {canEdit && (
                <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${doc.file_name}`} title="Delete" onClick={() => setToDelete(doc)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <PreviewDialog propertyId={propertyId} doc={preview} onClose={() => setPreview(null)} onDownload={download} />

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this document?</DialogTitle>
            <DialogDescription>{toDelete?.file_name} will be removed from this property. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => toDelete && remove.mutate(toDelete)}>
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function PreviewDialog({ propertyId, doc, onClose, onDownload }: { propertyId: string; doc: PropertyDocument | null; onClose: () => void; onDownload: (d: PropertyDocument) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null); setText(null); setError(null);
    apiClient.getBlob(`${base(propertyId)}/${doc.id}/file`)
      .then(async (blob) => {
        if (cancelled) return;
        if (isText(doc)) setText((await blob.text()).slice(0, 200_000));
        else { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
      })
      .catch((e: Error) => !cancelled && setError(e.message || 'The preview could not be loaded'));
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [doc, propertyId]);

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{doc?.file_name}</DialogTitle>
          <DialogDescription>{doc ? `${formatBytes(doc.size_bytes)} · uploaded ${new Date(doc.created_at).toLocaleDateString()}` : ''}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] min-h-[200px] overflow-auto rounded-md border border-border bg-muted/20">
          {error && <p className="p-4 text-sm text-destructive">{error}</p>}
          {!error && !url && text === null && <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading preview…</p>}
          {doc && url && isImage(doc) && <img src={url} alt={doc.file_name} className="mx-auto max-h-[68vh] object-contain" />}
          {doc && url && isPdf(doc) && <iframe src={url} title={doc.file_name} className="h-[68vh] w-full" />}
          {text !== null && <pre className="whitespace-pre-wrap break-words p-4 text-xs">{text}</pre>}
        </div>
        <DialogFooter>
          {doc && <Button variant="outline" className="gap-2" onClick={() => onDownload(doc)}><Download className="h-4 w-4" />Download</Button>}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
