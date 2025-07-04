import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Cookies from "js-cookie";
import { Request, Invoice } from "@/features/invoicing/types";

interface RequestWithInvoice extends Request {
  invoices?: Invoice[]; 
}

type SortConfig = {
  key: keyof Request | null;
  direction: 'asc' | 'desc';
};

export function InvoiceTable() {
  const [requests, setRequests] = useState<RequestWithInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminBranch, setAdminBranch] = useState<string | null>(null);
  const [branches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const handleSort = (key: keyof Request) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const getSortedRequests = () => {
    if (!sortConfig.key) return requests;

    return [...requests].sort((a, b) => {
      if (a[sortConfig.key!] === null) return 1;
      if (b[sortConfig.key!] === null) return -1;

      let aValue = a[sortConfig.key!];
      let bValue = b[sortConfig.key!];

      if (sortConfig.key === 'due_date' || sortConfig.key === 'date_requested') {
        aValue = new Date(String(aValue)).getTime();
        bValue = new Date(String(bValue)).getTime();
      } else if (sortConfig.key === 'amount' || sortConfig.key === 'balance') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortConfig.key === 'company_name' || sortConfig.key === 'first_name' || sortConfig.key === 'last_name') {

        const aClientName = a.is_company ? a.company_name : `${a.first_name} ${a.last_name}`;
        const bClientName = b.is_company ? b.company_name : `${b.first_name} ${b.last_name}`;
        aValue = aClientName.toLowerCase();
        bValue = bClientName.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Pagination logic
  const getPaginatedRequests = () => {
    const sortedRequests = getSortedRequests();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedRequests.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(requests.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const getSortIcon = (key: keyof Request) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleRowClick = (request: RequestWithInvoice) => {
    navigate(`/invoicing/${request.id}`, { state: { request } });
  };

  useEffect(() => {
    async function fetchDataForBranch(branchToFetch: string) {
      setIsLoading(true);
      setAdminBranch(branchToFetch); 
      try {
        const [requestData, invoiceData] = await Promise.all([
          fetch(`${process.env.VITE_SERVER_URL}/api/requests/branch/${branchToFetch}`),
          fetch(`${process.env.VITE_SERVER_URL}/api/invoices/branch/${branchToFetch}`)
        ]);
        
        if (!requestData.ok) {
          console.error(`Failed to fetch requests for branch ${branchToFetch}:`, requestData.statusText);
          setRequests([]);
          setIsLoading(false);
          return;
        }
        
        const requestRes = await requestData.json();
        // console.log("Raw request data:", JSON.stringify(requestRes, null, 2));
        
        let invoiceRes: any[] = [];
        if (invoiceData.ok) {
          invoiceRes = await invoiceData.json();
        } else {
          console.error(`Failed to fetch invoices for branch ${branchToFetch}:`, invoiceData.statusText);
        }
        
        if (Array.isArray(requestRes)) {
          const transformedRequests = requestRes.map(item => ({
            id: item.UUID,
            is_company: item.IsCompany,
            first_name: item.FirstName,
            last_name: item.LastName,
            company_name: item.CompanyName,
            email: item.Email,
            phone_number: item.PhoneNumber,
            due_date: item.StartDate, 
            date_requested: item.DateRequested,
            branch_name: item.ClosestBranchName,
            branch_id: item.ClosestBranchID,
            type_of_event: item.TypeOfEvent,
            amount: 0,
            balance: 0,
            status: "pending"
          })) as RequestWithInvoice[];
          
          if (Array.isArray(invoiceRes) && invoiceRes.length > 0) {
            const invoicesByRequestId: Record<string, Invoice[]> = {};
            
            invoiceRes.forEach(invoice => {
              const requestId = invoice.request_id;
              if (!invoicesByRequestId[requestId]) {
                invoicesByRequestId[requestId] = [];
              }
              invoicesByRequestId[requestId].push({
                uuid: invoice.uuid,
                request_id: invoice.request_id,
                due_date: invoice.due_date,
                amount: invoice.amount,
                balance: invoice.balance,
                status: invoice.status,
                po_number: invoice.po_number,
                client_name: invoice.client_name,
                branch: invoice.branch_name
              } as Invoice);
            });
            
            transformedRequests.forEach(request => {
              const requestInvoices = invoicesByRequestId[request.id];
              if (requestInvoices && requestInvoices.length > 0) {
                request.invoices = requestInvoices;
                const primaryInvoice = requestInvoices[0];
                request.amount = primaryInvoice.amount;
                request.balance = primaryInvoice.balance;
                request.status = primaryInvoice.status;
                
                if (requestInvoices.length > 1) {
                  request.amount = requestInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                  request.balance = requestInvoices.reduce((sum, inv) => sum + inv.balance, 0);
                  
                  if (requestInvoices.some(inv => inv.status === 'unpaid')) {
                    request.status = 'unpaid';
                  } else if (requestInvoices.every(inv => inv.status === 'paid')) {
                    request.status = 'paid';
                  } else {
                    request.status = 'partially_paid';
                  }
                }
              }
            });
          }
          
          setRequests(transformedRequests);
        } else {
          console.error("Fetched request data is not an array:", requestRes);
          setRequests([]);
        }
      } catch (error) {
        console.error(`Error fetching data for branch ${branchToFetch}:`, error);
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (isSuperAdmin) {
      if (selectedBranch) {
        fetchDataForBranch(selectedBranch);
      } else {
        console.log("Superadmin: 'All Branches' selected or no specific branch.");
        setRequests([]);
        setIsLoading(false);
        setAdminBranch(null);
      }
    } else {
      const userBranchIdFromCookie = Cookies.get('user_branch_id');
      if (userBranchIdFromCookie) {
        fetchDataForBranch(userBranchIdFromCookie);
      } else {
        console.error('No branch ID found for admin in cookies.');
        setAdminBranch(null);
        setRequests([]);
        setIsLoading(false);
      }
    }
  }, [isSuperAdmin, selectedBranch]);

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch === "all" ? null : branch);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-4">Loading requests...</div>;
  }

  if (!isSuperAdmin && !adminBranch) {
    return <div className="flex justify-center items-center p-4">No branch assigned to admin</div>;
  }

  return (
    <div>
      {isSuperAdmin && (
        <div className="mb-4 flex items-center gap-4">
          <Badge variant="outline">Superadmin</Badge>
          
          <Select
            value={selectedBranch || "all"}
            onValueChange={handleBranchChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(branch => (
                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="text-sm text-muted-foreground">
            {requests.length} request{requests.length !== 1 ? 's' : ''} found
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('id')}
                  className="h-8 flex items-center justify-center gap-1 w-full"
                >
                  Request ID
                  {getSortIcon('id')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('company_name')}
                  className="h-8 flex items-center justify-center gap-1 w-full"
                >
                  Client
                  {getSortIcon('company_name')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('date_requested')}
                  className="h-8 flex items-center justify-center gap-1 w-full"
                >
                  Date Requested
                  {getSortIcon('date_requested')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('due_date')}
                  className="h-8 flex items-center justify-center gap-1 w-full"
                >
                  Event Date
                  {getSortIcon('due_date')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('amount')}
                  className="h-8 flex items-center justify-center gap-1 w-full"
                >
                  Amount
                  {getSortIcon('amount')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('balance')}
                  className="h-8 flex items-center justify-center gap-1 w-full"
                >
                  Balance
                  {getSortIcon('balance')}
                </Button>
              </TableHead>
              <TableHead className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('status')}
                  className="h-8 flex items-center justify-center gap-1 w-full"
                >
                  Status
                  {getSortIcon('status')}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No requests found {adminBranch && !isSuperAdmin ? `for ${adminBranch}` : isSuperAdmin && selectedBranch ? `for ${selectedBranch}` : ''}
                </TableCell>
              </TableRow>
            ) : (
              getPaginatedRequests().map((request) => (
                <TableRow 
                  key={request.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(request)}
                >
                  <TableCell className="text-center">{request.id}</TableCell>
                  <TableCell className="text-center">
                    {request.is_company ? request.company_name : `${request.first_name} ${request.last_name}`}
                    {isSuperAdmin && !selectedBranch && request.branch_name && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Branch: {request.branch_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {request.date_requested ? new Date(request.date_requested).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">{new Date(request.due_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-center">{formatCurrency(request.amount)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(request.balance)}</TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${request.status === 'paid' ? 'bg-green-100 text-green-800' : 
                        request.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {request.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, requests.length)} to{' '}
            {Math.min(currentPage * itemsPerPage, requests.length)} of {requests.length} entries
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className="w-8 h-8"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
