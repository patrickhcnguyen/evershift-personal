import { useState, useEffect } from "react";
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths, 
  startOfWeek,
  endOfWeek,
  format,
  parseISO
} from "date-fns";
import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { ScheduleContainer } from "@/components/schedule/ScheduleContainer";
import Cookies from 'js-cookie';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  location: string;
  eventType: string;
  startTime: string;
  endTime: string;
  staffing: any[];
  shifts: any[];
  attachments: any[];
}

interface InvoiceResponse {
  id: string;
  request_id: string;
  due_date: string;
  amount: number;
  balance: number;
  status: string;
  po_number: string;
  client_name: string;
  branch_name?: string;
}

interface RequestData {
  UUID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  IsCompany: boolean;
  CompanyName: string;
  TypeOfEvent: string;
  PhoneNumber: string;
  StartDate: string;
  EndDate: string;
  ClosestBranchID: string;
  ClosestBranchName: string;
  EventLocation: string;
  DateRequested: string;
  CustomRequirementsText: string;
}

export default function Schedule() {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<"Month" | "Week" | "Day">("Month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminBranch, setAdminBranch] = useState<string>('');

  const fetchEvents = async () => {
    const userBranchId = Cookies.get('user_branch_id');
    

    
    if (!userBranchId) {
      console.error('No branch ID found for user in cookies');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setAdminBranch(userBranchId);

      console.log('📡 Fetching invoices for branch:', userBranchId);

      const invoicesResponse = await fetch(`${process.env.VITE_SERVER_URL}/api/invoices/branch/${userBranchId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📡 Invoices response status:', invoicesResponse.status);

      if (!invoicesResponse.ok) {
        console.error('Error fetching invoices:', invoicesResponse.statusText);
        return;
      }

      const invoicesData: InvoiceResponse[] = await invoicesResponse.json();
      console.log('📊 Fetched invoices data:', invoicesData);
      
      if (!invoicesData?.length) {
        console.log('⚠️ No invoices found for branch');
        setEvents([]);
        setIsLoading(false);
        return;
      }

      const paidInvoices = invoicesData.filter(invoice => invoice.status === 'paid');
      console.log('💰 Paid invoices:', paidInvoices);
      
      if (!paidInvoices.length) {
        console.log('⚠️ No paid invoices found');
        setEvents([]);
        setIsLoading(false);
        return;
      }

      // Get request data for each paid invoice
      const calendarEvents: CalendarEvent[] = [];

      for (const invoice of paidInvoices) {
        try {
          console.log(`📡 Fetching request data for invoice ${invoice.id}, request ${invoice.request_id}`);
          
          const requestResponse = await fetch(`${process.env.VITE_SERVER_URL}/api/requests/${invoice.request_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (requestResponse.ok) {
            const requestData: RequestData = await requestResponse.json();
            console.log('📄 Request data:', requestData);

            // Create calendar event with safe date parsing
            let eventDate: Date;
            try {
              // Try parsing the StartDate, handle different possible formats
              if (requestData.StartDate) {
                // If it's already in ISO format, use it directly
                if (requestData.StartDate.includes('T')) {
                  eventDate = parseISO(requestData.StartDate);
                } else {
                  // If it's just a date, add time to make it valid
                  eventDate = parseISO(`${requestData.StartDate}T12:00:00`);
                }
              } else {
                // Fallback to today if no date
                eventDate = new Date();
              }
              
              // Validate the parsed date
              if (isNaN(eventDate.getTime())) {
                console.warn('⚠️ Invalid date parsed, using today as fallback');
                eventDate = new Date();
              }
            } catch (error) {
              console.error('❌ Error parsing date:', error);
              eventDate = new Date();
            }
            
            const calendarEvent: CalendarEvent = {
              id: invoice.id,
              title: `${requestData.TypeOfEvent || 'Event'} - ${invoice.client_name}`,
              date: eventDate,
              location: requestData.EventLocation || '',
              eventType: requestData.TypeOfEvent || '',
              startTime: '09:00', // Default start time
              endTime: '17:00',   // Default end time
              staffing: [],
              shifts: [],
              attachments: []
            };

            calendarEvents.push(calendarEvent);
            console.log('✅ Created calendar event:', calendarEvent);
          } else {
            console.error(`❌ Failed to fetch request ${invoice.request_id}:`, requestResponse.statusText);
          }
        } catch (error) {
          console.error(`❌ Error processing invoice ${invoice.id}:`, error);
        }
      }

      console.log('📅 Final calendar events:', calendarEvents);
      setEvents(calendarEvents);
    } catch (error) {
      console.error('❌ Error in fetchEvents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 Component mounted, fetching events...');
    fetchEvents();
  }, []);

  const handlePreviousMonth = () => setDate(subMonths(date, 1));
  const handleNextMonth = () => setDate(addMonths(date, 1));
  const handleTodayClick = () => setDate(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(date)),
    end: endOfWeek(endOfMonth(date))
  });

  const isCurrentMonth = (day: Date) => format(day, 'M') === format(date, 'M');

  const handleEventCreate = () => {};
  const handleEventDelete = () => {};
  const handleEventUpdate = () => {};

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  console.log('🎨 Rendering schedule with events:', events);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <div className="flex-1 p-6">
        <div className="h-full flex flex-col bg-background">
          <ScheduleHeader
            date={date}
            view={view}
            onViewChange={setView}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onTodayClick={handleTodayClick}
            selectedBranch={[]}
            onBranchChange={() => {}} 
          />

          <ScheduleContainer
            view={view}
            date={date}
            days={days}
            events={events}
            isCurrentMonth={isCurrentMonth}
            onEventCreate={handleEventCreate}
            onEventDelete={handleEventDelete}
            onEventUpdate={handleEventUpdate}
          />
        </div>
      </div>
    </div>
  );
}