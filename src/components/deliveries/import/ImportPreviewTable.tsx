
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportPreviewTableProps {
  previewData: any[];
}

const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({ previewData }) => {
  if (!previewData.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        אין נתונים להצגה
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] rounded-md border">
      <Table>
        <TableHeader>
          {previewData[0] && Object.keys(previewData[0]).map((key, i) => (
            <TableHead key={i}>{key}</TableHead>
          ))}
        </TableHeader>
        <TableBody>
          {previewData.slice(0, 5).map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {Object.values(row).map((cell: any, cellIndex) => (
                <TableCell key={cellIndex}>{String(cell)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export default ImportPreviewTable;
