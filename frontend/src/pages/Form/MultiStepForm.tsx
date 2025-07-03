import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './styles.css'; 
import { formatDate } from 'date-fns';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { geocodeAndFindNearestOffice } from './locationService';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
const customStaff = '/customStaff.jpeg';

const CustomDateInput = React.forwardRef<HTMLInputElement, { value?: string, onClick?: () => void, placeholder?: string }>((props, ref) => {
    const { value, onClick, placeholder } = props;
    const displayValue = value?.endsWith(' - ') ? value.slice(0, -3) : value;

    return (
        <input
            ref={ref}
            className="date-picker-input"
            onClick={onClick}
            value={displayValue}
            placeholder={placeholder}
            readOnly
        />
    );
});
CustomDateInput.displayName = 'CustomDateInput';

interface StaffRequirement {
  date: string;
  position: string;
  count: number;
  start_time: string;
  end_time: string;
}

interface StaffInput {
  position: string;
  count: string;
  startTime: string;
  endTime: string;
}

interface DateStaffInputs {
  [date: string]: Record<string, StaffInput>;
}

interface DeletedPosition {
  date: string;
  position: string;
  timestamp: number;
  id: string;
}

interface DateDeletedPositions {
  [date: string]: string[];
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MultiStepForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const staffRequirementsRef = useRef<HTMLDivElement>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [staffInputs, setStaffInputs] = useState<DateStaffInputs>({});
  const navigate = useNavigate();
  const positionImages = {
    "Brand Ambassadors": "https://images.squarespace-cdn.com/content/65d3c0aefe9b024b40b6fa20/f1f125a8-db1a-40ad-aa6c-0460c4e521f5/F864B7BE-D5ED-4F06-8D41-991BDBE0D5FD.jpg",
    "Bartenders": "https://images.squarespace-cdn.com/content/65d3c0aefe9b024b40b6fa20/aab8a440-7624-4851-852e-56010bf8c40a/818E85D3-0507-401F-9C56-64EBB2420930_4_5005_c.jpeg",
    "Production Assistants": "https://images.squarespace-cdn.com/content/65d3c0aefe9b024b40b6fa20/a7745cd3-de4a-4869-8a07-fbc780097b81/IMG_1915.jpeg",
    "Catering Staff": "https://images.squarespace-cdn.com/content/65d3c0aefe9b024b40b6fa20/9ac51559-94cb-4df8-b304-6292023d427f/AFB61D4E-AA65-4D17-8F34-4E50050F9725_4_5005_c.jpeg",
    "Model Staff": "https://images.squarespace-cdn.com/content/65d3c0aefe9b024b40b6fa20/33f2610c-f979-41e2-98a8-b33c30ca4b9b/DA2CD34A-A52D-4C98-890F-5058246CB6F6.JPG",
    "Registration Staff": "https://images.squarespace-cdn.com/content/65d3c0aefe9b024b40b6fa20/89999afb-dde9-4592-86f6-b0f285742d3c/5BD59C48-F696-42A8-B1F3-AB8324BD1A9E.jpg",
    "Convention Staff": "https://images.squarespace-cdn.com/content/65d3c0aefe9b024b40b6fa20/1b99adb3-76f3-41b0-a01c-c24c5f14439e/12013A5A-50C6-48B0-98F3-076623A5A98C_4_5005_c.jpeg",
  } as const;

  const positions = Object.keys(positionImages);

  const [useCustomRequirements, setUseCustomRequirements] = useState(false);
  const [customRequirementsText, setCustomRequirementsText] = useState('');

  const [deletedPositions, setDeletedPositions] = useState<DateDeletedPositions>({});
  const [recentlyDeleted, setRecentlyDeleted] = useState<DeletedPosition[]>([]);

  useEffect(() => {
    if (currentStep === 3) {
      if (selectedDates.length > 1) {
      } else {
        populateStaffRequirements();
      }
    }
  }, [currentStep, selectedDates, selectedPositions]);

  useEffect(() => {
    if (currentStep === 2) {
      const geocoder = new MapboxGeocoder({
        accessToken: MAPBOX_TOKEN || '',
        types: 'address,place',
        placeholder: 'Enter event location',
        marker: false
      });

      const container = document.getElementById('geocoder-container');
      if (container) {
        container.innerHTML = '';
        geocoder.addTo('#geocoder-container');
      }

      geocoder.on('result', async (e) => {
        try {
          const location = await geocodeAndFindNearestOffice(e.result.place_name);
          setFormData(prev => ({
            ...prev,
            location: location.placeName,
            coordinates: location.coordinates,
            nearestOffice: location.nearestOffice
          }));
        } catch (error) {
          console.error('Error processing location:', error);
          alert('Error processing location. Please try again.');
        }
      });

      return () => {
        const container = document.getElementById('geocoder-container');
        if (container) {
          container.innerHTML = '';
        }
      };
    }
  }, [currentStep]);

  const handleSelectPosition = (position: string) => {
    setSelectedPositions((prev) =>
      prev.includes(position)
        ? prev.filter((p) => p !== position)
        : [...prev, position]
    );
    if (useCustomRequirements) {
      setUseCustomRequirements(false);
      setCustomRequirementsText('');
    }
  };

  const nextStep = (step: number) => {
    if (step === 1) {
      if (!useCustomRequirements && selectedPositions.length === 0) {
        alert('Please select at least one position or choose custom requirements.');
        return;
      }
      if (useCustomRequirements && !customRequirementsText.trim()) {
        alert('Please describe your custom staffing requirements.');
        return;
      }
    }

    if (step === 2) {
      if (formData.isCompany && !formData.companyName?.trim()) {
        alert('Please enter your company name.');
        return;
      }
      if (useCustomRequirements) {
        setCurrentStep(4);
        return;
      }
    }

    if (step === 3 && !useCustomRequirements && !validateStaffRequirements()) {
      return;
    }

    setCurrentStep(step + 1);
  };

  const prevStep = (step: number) => {
    if (step === 4 && useCustomRequirements) {
      setCurrentStep(2); 
      return;
    }
    setCurrentStep(step - 1);
  };

  const updateProgress = () => {
    return `${25 * currentStep}%`;
  };

  const validateStaffRequirements = () => {
    if (useCustomRequirements) {
      return true; 
    }
    
    const inputs = document.querySelectorAll('#staffRequirements input');
    for (let i = 0; i < inputs.length; i++) {
      if (!(inputs[i] as HTMLInputElement).value) {
        alert('Please fill in all staff requirements.');
        return false;
      }
    }
    return true;
  };

  const populateStaffRequirements = () => {
    if (staffRequirementsRef.current && selectedPositions.length > 0) {
      staffRequirementsRef.current.innerHTML = '';
      selectedPositions.forEach((position) => {
        const safePosition = position.replace(/\s+/g, '-'); 
        const positionDiv = document.createElement('div');
        positionDiv.className = 'staff-requirement mb-6';
        positionDiv.setAttribute('data-position', position);
        positionDiv.innerHTML = `
          <p class="font-medium mb-2">${position}</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="${safePosition}-count">Number of Staff:</label>
              <input 
                type="number" 
                id="${safePosition}-count"
                name="${safePosition}-count" 
                class="w-full p-2 border rounded-md"
                min="1"
                required 
              />
            </div>
            <div>
              <label for="${safePosition}-start">Start Time:</label>
              <input 
                type="time" 
                id="${safePosition}-start"
                name="${safePosition}-start" 
                class="bg-background appearance-none w-full p-2 border rounded-md [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                required 
              />
            </div>
            <div>
              <label for="${safePosition}-end">End Time:</label>
              <input 
                type="time" 
                id="${safePosition}-end"
                name="${safePosition}-end" 
                class="bg-background appearance-none w-full p-2 border rounded-md [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                required 
              />
            </div>
          </div>
        `;
        staffRequirementsRef.current.appendChild(positionDiv);
      });
    }
  };

  const renderStaffRequirements = () => {
    return selectedDates.map(date => {
      const displayDate = formatDate(date, 'MMMM d, yyyy');
      const formattedDate = formatDate(date, 'yyyy-MM-dd');
      return (
        <div key={formattedDate} className="mb-8">
          <h3 className="text-lg font-semibold mb-4">
            {displayDate}
          </h3>
          <div className="space-y-6">
            {selectedPositions.map((position) => {
              const safePosition = position.replace(/\s+/g, '-');
              return (
                <div key={`${formattedDate}-${position}`} className="staff-requirement mb-6">
                  <p className="font-medium mb-2">{position}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor={`${formattedDate}-${safePosition}-count`}>Number of Staff:</label>
                      <input 
                        type="number" 
                        id={`${formattedDate}-${safePosition}-count`}
                        value={staffInputs[formattedDate]?.[position]?.count || ''}
                        onChange={(e) => handleStaffInputChange(formattedDate, position, 'count', e.target.value)}
                        className="w-full p-2 border rounded-md"
                        min="1"
                        required 
                      />
                    </div>
                    <div>
                      <label htmlFor={`${formattedDate}-${safePosition}-start`}>Start Time:</label>
                      <Input 
                        type="time" 
                        id={`${formattedDate}-${safePosition}-start`}
                        value={staffInputs[formattedDate]?.[position]?.startTime || ''}
                        onChange={(e) => handleStaffInputChange(formattedDate, position, 'startTime', e.target.value)}
                        className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        required 
                      />
                    </div>
                    <div>
                      <label htmlFor={`${formattedDate}-${safePosition}-end`}>End Time:</label>
                      <Input 
                        type="time" 
                        id={`${formattedDate}-${safePosition}-end`}
                        value={staffInputs[formattedDate]?.[position]?.endTime || ''}
                        onChange={(e) => handleStaffInputChange(formattedDate, position, 'endTime', e.target.value)}
                        className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        required 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  const handleStaffInputChange = (date: string, position: string, field: keyof StaffInput, value: string) => {
    setStaffInputs(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [position]: {
          ...prev[date]?.[position],
          position,
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
  
    const staffRequirements: StaffRequirement[] = useCustomRequirements ? [] : selectedDates.flatMap(date => {
      const formattedDate = formatDate(date, 'yyyy-MM-dd');
      return selectedPositions
        .map(position => {
          const input = staffInputs[formattedDate]?.[position];
          if (!input) return null;
          
          return {
            date: formattedDate,
            position: position,
            count: parseInt(input.count || '0'),
            start_time: input.startTime,
            end_time: input.endTime
          };
        })
        .filter((req): req is StaffRequirement =>
          req !== null && req.count > 0 && req.start_time !== '' && req.end_time !== ''
        );
    });
  
    const requestPayload = {
      first_name: formData.firstName || "",
      last_name: formData.lastName || "",
      email: formData.email || "",
      phone_number: formData.phoneNumber || "",
      type_of_event: formData.eventType || "",
      event_location: formData.location || "",
      start_date: dateRange[0] ? formatDate(dateRange[0], 'yyyy-MM-dd') : null,
      end_date: dateRange[1] ? formatDate(dateRange[1], 'yyyy-MM-dd') : null,
      is_company: formData.isCompany || false,
      company_name: formData.isCompany ? formData.companyName || "" : "",
      custom_requirements_text: useCustomRequirements ? customRequirementsText : "",
      staff_requirements: staffRequirements.map(req => {
        const startDateTime = new Date(`${req.date}T${req.start_time}`);
        const endDateTime = new Date(`${req.date}T${req.end_time}`);
        
        console.log('Debug times:', {
          originalDate: req.date,
          originalStartTime: req.start_time,
          originalEndTime: req.end_time,
          formattedStartDateTime: startDateTime.toISOString(),
          formattedEndDateTime: endDateTime.toISOString()
        });
        
        return {
          uuid: crypto.randomUUID(),
          date: new Date(req.date).toISOString(),
          position: req.position,
          count: req.count,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          rate: 0
        };
      })
    };
  
    try {
      const response = await fetch(`${process.env.VITE_SERVER_URL}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        credentials: 'include',
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Request creation failed: ${errorData ? JSON.stringify(errorData) : "Unknown error"}`);
      }
      
      console.log('Form submitted successfully');
      setShowThankYou(true);
      setTimeout(() => {
        resetForm();
        setShowThankYou(false);
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Form submission error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({});
    setSelectedPositions([]);
    setSelectedDates([]);
    setStaffInputs({});
    setUseCustomRequirements(false);
    setCustomRequirementsText('');
  };


  return (
    <div className="multi-step-form-container">
      <div id="multi-step-form">
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: updateProgress() }}></div>
          <div className={`progress-step ${currentStep === 4 ? 'complete' : ''}`}>Inquire</div>
        </div>
        <form id="form" onSubmit={handleSubmit}>
          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="form-step active">
              <h2>What type of staff are you looking for?</h2>
              <p className="select-instruction">Select staff positions OR describe custom requirements:</p>
              
              <div className="position-grid">
                {positions.map((position) => (
                  <div
                    key={position}
                    className={`position-item ${selectedPositions.includes(position) && !useCustomRequirements ? 'selected' : ''} ${useCustomRequirements ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!useCustomRequirements) {
                        handleSelectPosition(position);
                      }
                    }}
                    data-position={position}
                  >
                    <img src={positionImages[position]} alt={position} />
                    <div className="overlay">{position}</div>
                  </div>
                ))}
                
                {/* Custom Requirements Option */}
                <div
                  className={`position-item custom-requirements ${useCustomRequirements ? 'selected' : ''} ${selectedPositions.length > 0 ? 'disabled' : ''}`}
                  onClick={() => {
                    if (selectedPositions.length === 0) {
                      const newCustomState = !useCustomRequirements;
                      setUseCustomRequirements(newCustomState);
                      if (newCustomState) {
                        setSelectedPositions([]);
                      } else {
                        setCustomRequirementsText('');
                      }
                    }
                  }}
                >
                  <img src={customStaff} alt="Custom Requirements" />
                  <div className="overlay">
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Custom Requirements</div>
                    <div style={{ fontSize: '0.8rem' }}>
                      {selectedPositions.length > 0 
                        ? 'Clear position selections first' 
                        : 'Describe your specific staffing needs'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {useCustomRequirements && (
                <div className="mt-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Custom Requirements</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Our team will review your requirements and create a detailed quote. You'll receive a follow-up within 24 hours.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="customRequirements" className="block text-sm font-medium text-gray-700 mb-2">
                      Describe your staffing needs:
                    </label>
                    <textarea
                      id="customRequirements"
                      value={customRequirementsText}
                      onChange={(e) => setCustomRequirementsText(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      rows={6}
                      placeholder="Please describe your staffing requirements in detail. Include:
• Specific positions needed (e.g., bartenders, brand ambassadors, etc.)
• Number of staff for each position  
• Working hours and dates
• Any special requirements or skills needed
• Event details and timeline

Example:
March 15-16: 2 bartenders (6pm-11pm daily), 4 brand ambassadors (5pm-10pm daily)
Special requirements: Black attire, cocktail experience for bartenders"
                      required={useCustomRequirements}
                    />
                  </div>
                </div>
              )}

              <input type="hidden" name="selectedPositions" value={JSON.stringify(selectedPositions)} />
              <button type="button" onClick={() => nextStep(1)}>Next</button>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="form-step active">
              <h2>Client Information</h2>
              
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">I am requesting staff as a:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      !formData.isCompany 
                        ? 'border-primary bg-primary/10' 
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({ ...formData, isCompany: false, companyName: '' })}
                  >
                    <h4 className="font-medium mb-2">Individual Client</h4>
                    <p className="text-sm text-gray-600">Personal or individual event booking</p>
                  </div>
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.isCompany 
                        ? 'border-primary bg-primary/10' 
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({ ...formData, isCompany: true })}
                  >
                    <h4 className="font-medium mb-2">Company</h4>
                    <p className="text-sm text-gray-600">Corporate or business event booking</p>
                  </div>
                </div>
              </div>
              
              {formData.isCompany && (
                <div className="mb-8">
                  <label className="block mb-2">Company Name:</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName || ''}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter your company name"
                    required
                  />
                </div>
              )}
              
              <h2>Event Information</h2>
              <div className="date-picker-container">
                <label>Event Date(s):</label>
                <p className="text-sm text-gray-600 mb-2">
                  Click one date for single-day events, or click and drag to select a date range for multi-day events.
                </p>
                <DatePicker
                  selected={dateRange[0]}
                  onChange={(dates) => {
                    const [start, end] = dates as [Date | null, Date | null];
                    setDateRange([start, end]);
                    
                    if (start) {
                      if (end) {
                        const dateArray: Date[] = [];
                        let currentDate = new Date(start);
                        
                        while (currentDate <= end) {
                          dateArray.push(new Date(currentDate));
                          currentDate.setDate(currentDate.getDate() + 1);
                        }
                        setSelectedDates(dateArray);
                      } else {
                        setSelectedDates([start]);
                      }
                    } else {
                      setSelectedDates([]);
                    }
                  }}
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  selectsRange
                  minDate={new Date()}
                  placeholderText="Select event date(s)"
                  className="date-picker-input"
                  calendarClassName="date-picker-calendar"
                  wrapperClassName="date-picker-wrapper"
                  popperProps={{
                    strategy: "fixed"
                  }}
                  popperPlacement="bottom-start"
                  isClearable
                  customInput={<CustomDateInput />}
                />
                {selectedDates.length > 0 && (
                  <div className="mt-2 text-sm text-green-600">
                    {selectedDates.length === 1 
                      ? `Selected: ${formatDate(selectedDates[0], 'MMMM d, yyyy')} (Single day event)`
                      : `Selected: ${formatDate(selectedDates[0], 'MMMM d')} - ${formatDate(selectedDates[selectedDates.length - 1], 'MMMM d, yyyy')} (${selectedDates.length} days)`
                    }
                  </div>
                )}
              </div>
              <label>What kind of event is this?</label>
              <input
                type="text"
                name="eventType"
                value={formData.eventType || ''}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                placeholder="e.g., Wedding, Corporate Event, Trade Show"
              />
              <label>Where is your event located?</label>
              <div 
                id="geocoder-container" 
                className="geocoder-container"
                style={{ position: 'relative' }}
              />
              <div className="button-group">
                <button type="button" onClick={() => prevStep(2)}>Back</button>
                <button type="button" onClick={() => nextStep(2)}>Next</button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && !useCustomRequirements && (
            <div className="form-step active">
              <h2>Staff Requirements</h2>
              <div id="staffRequirements">
                {renderStaffRequirements()}
              </div>
              <div className="button-group">
                <button type="button" onClick={() => prevStep(3)}>Back</button>
                <button type="button" onClick={() => nextStep(3)}>Next</button>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {currentStep === 4 && (
            <div className="form-step active">
              <h2>Contact Information</h2>
              <label>First name:</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <label>Last name:</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <label>Phone Number:</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber || ''}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
              />
              <div className="button-group">
                <button type="button" onClick={() => prevStep(4)}>Back</button>
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit'}</button>
              </div>
            </div>
          )}
        </form>
      </div>

      {showThankYou && (
        <div id="thankYouPopup" className="popup" style={{ display: 'block' }}>
          <div className="popup-content">
            <h2>Thank you for your submission!</h2>
            <p>Our Team will contact you regarding your staffing needs momentarily.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiStepForm;
