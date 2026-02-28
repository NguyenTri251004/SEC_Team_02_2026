import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Thermometer, FileText, Calendar, Pencil } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { MaterialFormDialog } from '../components/materials/MaterialFormDialog';
import api from '../services/api';

type Material = {
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: 'RAW' | 'PACKAGING' | 'FINISHED' | 'CONSUMABLE';
  storage_conditions: string | null;
  specification_document: string | null;
  created_date: string;
  modified_date: string;
};

const mockData: Material[] = [
  { 
    material_id: 'MAT-001', 
    part_number: 'PART-10025', 
    material_name: 'Resin Alpha (Fake)', 
    material_type: 'RAW', 
    storage_conditions: 'Room Temp, Low Humidity',
    specification_document: 'DOC-RA-01',
    created_date: '2026-02-15',
    modified_date: '2026-02-15'
  },
  { 
    material_id: 'MAT-002', 
    part_number: 'PART-20599', 
    material_name: 'Packaging Box Type B (Fake)', 
    material_type: 'PACKAGING', 
    storage_conditions: 'Dry, Ambient',
    specification_document: null,
    created_date: '2026-02-20',
    modified_date: '2026-02-28'
  },
];

const columnHelper = createColumnHelper<Material>();

export default function MaterialsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tableData, setTableData] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await api.get('/materials');
        if (response.data && response.data.length > 0) {
            setTableData(response.data.data || response.data);
        } else {
             setTableData(mockData);
        }
      } catch (error) {
        console.warn("API call failed. Using mock data.", error);
        setTableData(mockData); 
      } finally {
        setIsLoading(false);
      }
    };
    fetchMaterials();
  }, []);

  const filteredData = useMemo(() => {
    return tableData.filter(m => 
      m.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.part_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, tableData]);

  const columns = useMemo(() => [
    columnHelper.accessor('material_id', { 
        header: 'ID', 
        cell: info => <span className="font-mono text-xs">{info.getValue()}</span> 
    }),
    columnHelper.accessor('part_number', { 
        header: 'Part Number', 
        cell: info => <span className="font-mono text-xs text-blue-600 font-semibold">{info.getValue()}</span> 
    }),
    columnHelper.accessor('material_name', { 
        header: 'Name', 
        cell: info => <span className="font-medium text-gray-900">{info.getValue()}</span> 
    }),
    columnHelper.accessor('material_type', { 
        header: 'Type', 
        cell: info => {
            const type = info.getValue();
            let color = 'bg-gray-200 text-gray-800';
            if (type === 'RAW') color = 'bg-amber-100 text-amber-800';
            if (type === 'PACKAGING') color = 'bg-blue-100 text-blue-800';
            return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>{type}</span>
        }
    }),
    columnHelper.accessor('storage_conditions', { 
        header: 'Storage', 
        cell: info => {
            const val = info.getValue();
            return val ? (
                <div className="flex items-center gap-1.5 text-xs text-gray-600"><Thermometer className="w-3.5 h-3.5" />{val}</div>
            ) : <span className="text-gray-400 text-xs italic">N/A</span>;
        }
    }),
    columnHelper.accessor('specification_document', { 
        header: 'Specs', 
        cell: info => {
            const val = info.getValue();
            return val ? (
                 <div className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline cursor-pointer"><FileText className="w-3.5 h-3.5" />{val}</div>
            ) : <span className="text-gray-400 text-xs italic">None</span>;
        }
    }),
    columnHelper.accessor('created_date', { 
        header: 'Created', 
        cell: info => (
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><Calendar className="w-3 h-3" />{info.getValue()}</div>
        )
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: info => (
          <button
            onClick={() => openEditDialog(info.row.original)}
            className="cursor-pointer p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Edit Material"
          >
          <Pencil className="w-4 h-4" />
        </button>
      )
    })
  ], []);

  const table = useReactTable({ 
    data: filteredData, 
    columns, 
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } }
  });

  const openCreateDialog = () => {
    setEditingMaterial(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material);
    setIsDialogOpen(true);
  };

  const handleSaveMaterial = async (formData: any) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (editingMaterial) {
        const updatedTable = tableData.map(item => 
          item.material_id === editingMaterial.material_id 
            ? { ...item, ...formData, modified_date: today } 
            : item
        );
        setTableData(updatedTable);
      } else {
        const newEntry: Material = {
          ...formData,
          material_id: `MAT-00${tableData.length + 1}`, // Fake ID
          created_date: today,
          modified_date: today
        };
        setTableData([...tableData, newEntry]);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving material:", error);
      alert("An error occurred.");
    }
  };

  if (isLoading) return <div className="p-6 flex justify-center items-center h-full"><div className="animate-pulse text-gray-500">Loading Materials data...</div></div>;

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Materials</h1>
          <p className="text-gray-500 text-sm mt-1">Manage raw materials and finished products</p>
        </div>
          <button 
            onClick={openCreateDialog}
            className="cursor-pointer bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
          >
          <Plus className="w-4 h-4" /> Add Material
        </button>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search by Name or Part Number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-200">
                {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                    {hg.headers.map(h => (
                    <th key={h.id} className="p-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                    ))}
                </tr>
                ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
                {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                    {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                    ))}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="disabled:cursor-not-allowed hover:cursor-pointer relative inline-flex items-center rounded-l-md px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors focus:z-20 border-r border-gray-700">
              Previous
            </button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="disabled:cursor-not-allowed hover:cursor-pointer relative inline-flex items-center rounded-r-md px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors focus:z-20 border-l border-gray-700">
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium text-gray-900">{table.getState().pagination.pageIndex + 1}</span> /{' '}
                <span className="font-medium text-gray-900">{table.getPageCount()}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="relative inline-flex items-center rounded-l-md px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors focus:z-20 border-r border-gray-700"
                >
                  Previous
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="relative inline-flex items-center rounded-r-md px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors focus:z-20 border-l border-gray-700"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <MaterialFormDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSuccess={handleSaveMaterial}
        initialData={editingMaterial ? {
          ...editingMaterial,
          // Fallback to empty strings if the database returned null
          storage_conditions: editingMaterial.storage_conditions || '',
          specification_document: editingMaterial.specification_document || ''
        } : null}
      />
    </div>
  );
}