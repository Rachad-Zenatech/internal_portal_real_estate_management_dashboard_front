import { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  Trash2,
  Building2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { realEstateService } from '@/services/realEstateService';
import type { SpreadsheetRowImport, BulkImportResponse } from '@/types/realEstate';

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: BulkImportResponse) => void;
}

export default function SpreadsheetImportModal({
  isOpen,
  onClose,
  onSuccess,
}: SpreadsheetImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<SpreadsheetRowImport[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Parse Excel or CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();

      if (file.name.endsWith('.csv')) {
        // Read as text then buffer
        await workbook.csv.read(buffer);
      } else {
        await workbook.xlsx.load(buffer);
      }

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheets found in uploaded workbook.');
      }

      // Read header row
      const headerRow = worksheet.getRow(1);
      const headers: Record<number, string> = {};
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value || '').trim().toLowerCase();
      });

      const rows: SpreadsheetRowImport[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip headers

        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.value;
          }
        });

        // Flexible fuzzy matching for Vanessa's existing column names
        const findVal = (keywords: string[]) => {
          for (const k of keywords) {
            for (const h of Object.keys(rowData)) {
              if (h.includes(k)) {
                const val = rowData[h];
                if (val !== undefined && val !== null) {
                  // Handle rich text or formula results
                  if (typeof val === 'object' && 'result' in val) return val.result;
                  if (typeof val === 'object' && 'text' in val) return val.text;
                  return val;
                }
              }
            }
          }
          return undefined;
        };

        const name = findVal(['name', 'property', 'building', 'office']) || `Property Row ${rowNumber}`;
        const city = findVal(['city', 'location']) || 'Chicago';
        const country = findVal(['country', 'nation']) || 'USA';
        const address = findVal(['address', 'street']) || `${city} Corporate Site`;
        const categoryRaw = String(findVal(['category', 'type', 'use']) || '').toUpperCase();
        
        let property_category = 'LEASED_OFFICE';
        if (categoryRaw.includes('HQ') || categoryRaw.includes('OWNED')) property_category = 'OWNED_HQ';
        else if (categoryRaw.includes('CONDO') || categoryRaw.includes('RESIDENCE')) property_category = 'COMPANY_CONDO';
        else if (categoryRaw.includes('LAB') || categoryRaw.includes('R&D') || categoryRaw.includes('FACILITY')) property_category = 'RD_FACILITY';
        else if (categoryRaw.includes('WAREHOUSE')) property_category = 'WAREHOUSE';

        const sqftRaw = findVal(['sq', 'feet', 'area', 'size']);
        const square_feet = Number(sqftRaw) || 0;

        const capRaw = findVal(['capacity', 'headcount', 'seats', 'people', 'max']);
        const max_capacity = Number(capRaw) || Math.max(Math.round(square_feet / 140), 10);

        const occRaw = findVal(['occupancy', 'current', 'staff']);
        const current_occupancy = Number(occRaw) || Math.round(max_capacity * 0.8);

        const rentRaw = findVal(['rent', 'base rent', 'monthly rent']);
        const monthly_rent = Number(rentRaw) || 0;

        const camRaw = findVal(['cam', 'maintenance', 'service charge']);
        const monthly_cam = Number(camRaw) || 0;

        const taxRaw = findVal(['tax', 'property tax', 'annual tax']);
        const annual_property_tax = Number(taxRaw) || 0;

        const leaseExpRaw = findVal(['expiration', 'expire', 'end date', 'term end']);
        let lease_expiration_date: string | undefined;
        if (leaseExpRaw instanceof Date) {
          lease_expiration_date = leaseExpRaw.toISOString().split('T')[0];
        } else if (typeof leaseExpRaw === 'string' && leaseExpRaw.includes('-')) {
          lease_expiration_date = leaseExpRaw;
        }

        const renewalRaw = findVal(['renewal', 'notice deadline', 'notice']);
        let renewal_notice_deadline: string | undefined;
        if (renewalRaw instanceof Date) {
          renewal_notice_deadline = renewalRaw.toISOString().split('T')[0];
        } else if (typeof renewalRaw === 'string' && renewalRaw.includes('-')) {
          renewal_notice_deadline = renewalRaw;
        }

        const landlord = findVal(['landlord', 'lessor', 'owner']);
        const landlord_name = landlord ? String(landlord) : undefined;

        const maEntity = findVal(['m&a', 'acquisition', 'acquired entity', 'deal']);
        const is_ma_acquisition = Boolean(maEntity && String(maEntity).trim() !== '' && String(maEntity).toLowerCase() !== 'false' && String(maEntity).toLowerCase() !== 'no');
        const acquisition_entity_name = is_ma_acquisition ? String(maEntity) : undefined;

        rows.push({
          name: String(name),
          city: String(city),
          country: String(country),
          address: String(address),
          property_category,
          square_feet,
          max_capacity,
          current_occupancy,
          monthly_rent,
          monthly_cam,
          annual_property_tax,
          lease_expiration_date,
          renewal_notice_deadline,
          landlord_name,
          is_ma_acquisition,
          acquisition_entity_name,
          primary_contact: 'Vanessa',
          notes: `Imported via spreadsheet batch ingestion (${file.name})`,
        });
      });

      if (rows.length === 0) {
        toast.warning('No property records could be parsed from the file.');
      } else {
        setParsedRows(rows);
        toast.success(`Successfully parsed ${rows.length} properties from ${file.name}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error parsing spreadsheet: ${err.message || 'Check file format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Bulk Import
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);

    try {
      const res = await realEstateService.bulkImportSpreadsheet({
        source_filename: fileName || 'Spreadsheet_Import.xlsx',
        rows: parsedRows,
      });

      toast.success(res.message);
      onSuccess(res);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(`Import failed: ${err.message || 'Please check data'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Remove single row from preview
  const handleRemoveRow = (index: number) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Download Sample Template for Vanessa
  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Company Real Estate');

    sheet.columns = [
      { header: 'Property Name', key: 'name', width: 32 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'Country', key: 'country', width: 14 },
      { header: 'Address', key: 'address', width: 36 },
      { header: 'Category (OFFICE/CONDO/LAB/HQ)', key: 'category', width: 26 },
      { header: 'Square Feet', key: 'square_feet', width: 15 },
      { header: 'Headcount Capacity', key: 'max_capacity', width: 18 },
      { header: 'Current Staff', key: 'current_occupancy', width: 15 },
      { header: 'Monthly Rent ($)', key: 'monthly_rent', width: 16 },
      { header: 'Monthly CAM ($)', key: 'monthly_cam', width: 16 },
      { header: 'Annual Property Tax ($)', key: 'annual_property_tax', width: 22 },
      { header: 'Lease Expiration Date (YYYY-MM-DD)', key: 'lease_expiration', width: 28 },
      { header: 'Renewal Notice Deadline', key: 'renewal_deadline', width: 24 },
      { header: 'Landlord Name', key: 'landlord', width: 26 },
      { header: 'M&A Acquired Entity (Optional)', key: 'ma_entity', width: 28 },
      { header: 'Primary Contact', key: 'contact', width: 16 },
    ];

    // Sample data rows
    sheet.addRow({
      name: 'Chicago Global Headquarters',
      city: 'Chicago',
      country: 'USA',
      address: '500 W Monroe St, Floors 28-30',
      category: 'OWNED_HQ',
      square_feet: 38500,
      max_capacity: 280,
      current_occupancy: 245,
      monthly_rent: 0,
      monthly_cam: 18500,
      annual_property_tax: 142000,
      lease_expiration: '',
      renewal_deadline: '',
      landlord: 'ZenaTech Properties LLC',
      ma_entity: '',
      contact: 'Vanessa',
    });

    sheet.addRow({
      name: 'Denver Innovation Hub',
      city: 'Denver',
      country: 'USA',
      address: '1801 California St, Suite 2400',
      category: 'LEASED_OFFICE',
      square_feet: 9800,
      max_capacity: 65,
      current_occupancy: 52,
      monthly_rent: 26000,
      monthly_cam: 4200,
      annual_property_tax: 19500,
      lease_expiration: '2027-06-30',
      renewal_deadline: '2026-12-31',
      landlord: 'Brookfield Properties',
      ma_entity: 'AeroGrid Analytics',
      contact: 'Vanessa',
    });

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Company_Real_Estate_Template_Vanessa.xlsx';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully!');
  };

  // Quick stats from parsed rows
  const totalSqft = parsedRows.reduce((acc, r) => acc + (r.square_feet || 0), 0);
  const totalRent = parsedRows.reduce((acc, r) => acc + (r.monthly_rent || 0), 0);
  const maCount = parsedRows.filter((r) => r.is_ma_acquisition).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Spreadsheet Ingestion & Migration Center
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Replace scattered existing spreadsheets with one unified system for Vanessa, Pat (CEO), & team.
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs h-8 border-dashed"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Excel Template</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/80 hover:border-emerald-500/80 rounded-2xl p-6 sm:p-8 text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-sm text-foreground">
              {fileName ? fileName : 'Click to browse or drop Vanessa\'s spreadsheets here'}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Supports Microsoft Excel (.xlsx, .xls) and CSV files. Automatic column mapping for Square Footage, Headcount, Rent, CAM, Lease Terms, and M&A acquisitions.
            </p>
          </div>

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Parsing spreadsheet worksheets and mapping columns...</span>
            </div>
          )}

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Properties Found: </span>
                    <span className="font-bold text-foreground">{parsedRows.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Sq Ft: </span>
                    <span className="font-bold text-foreground">{totalSqft.toLocaleString()} sq ft</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monthly Rent: </span>
                    <span className="font-bold text-emerald-600">${totalRent.toLocaleString()}/mo</span>
                  </div>
                  {maCount > 0 && (
                    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {maCount} M&A Acquisitions
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setParsedRows([])}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  Clear All
                </Button>
              </div>

              {/* Table Preview */}
              <div className="rounded-xl border border-border overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] font-semibold sticky top-0 border-b">
                    <tr>
                      <th className="p-2.5 pl-3">Property & City</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Sq Footage</th>
                      <th className="p-2.5 text-right">Cap / Occ</th>
                      <th className="p-2.5 text-right">Rent + CAM</th>
                      <th className="p-2.5">Lease Expiration</th>
                      <th className="p-2.5">M&A Context</th>
                      <th className="p-2.5 pr-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="p-2.5 pl-3">
                          <div className="font-bold text-foreground truncate max-w-[180px]">
                            {row.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {row.city}, {row.country}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {row.property_category || 'OFFICE'}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right font-medium">
                          {Number(row.square_feet || 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {row.current_occupancy || 0} / {row.max_capacity || 0}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-emerald-600">
                          ${(Number(row.monthly_rent || 0) + Number(row.monthly_cam || 0)).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {row.lease_expiration_date || 'N/A'}
                        </td>
                        <td className="p-2.5">
                          {row.is_ma_acquisition ? (
                            <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 truncate max-w-[120px] block">
                              {row.acquisition_entity_name || 'Acquired'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Organic</span>
                          )}
                        </td>
                        <td className="p-2.5 pr-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRow(idx)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Central PostgreSQL Real Estate Database Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isImporting} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleExecuteImport}
              disabled={parsedRows.length === 0 || isImporting}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing {parsedRows.length} properties...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Import {parsedRows.length} Properties</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
