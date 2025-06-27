// signup form should have a basic form with name, email, password, confirm password, and a submit button
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { signUp } from '@/auth/AuthHandler';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
  branchId: z.string().min(1, 'Please select a branch'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

// TODO: Fetch branches from backend
const branches = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Los Angeles, CA" },
  { id: "00000000-0000-0000-0000-000000000002", name: "New York City, NY" },
  { id: "00000000-0000-0000-0000-000000000003", name: "Atlanta, GA" },
  { id: "00000000-0000-0000-0000-000000000004", name: "Houston, TX" },
  { id: "00000000-0000-0000-0000-000000000005", name: "Washington, DC" },
  { id: "00000000-0000-0000-0000-000000000006", name: "Orange County, CA" },
  { id: "00000000-0000-0000-0000-000000000007", name: "Chicago, IL" },
  { id: "00000000-0000-0000-0000-000000000008", name: "San Francisco, CA" },
  { id: "00000000-0000-0000-0000-000000000009", name: "Miami, FL" },
  { id: "00000000-0000-0000-0000-000000000010", name: "Las Vegas, NV" },
  { id: "00000000-0000-0000-0000-000000000011", name: "Salt Lake City, UT" },
  { id: "00000000-0000-0000-0000-000000000012", name: "Seattle, WA" },
  { id: "00000000-0000-0000-0000-000000000013", name: "Orlando, FL" },
  { id: "00000000-0000-0000-0000-000000000014", name: "Charlotte, NC" },
  { id: "00000000-0000-0000-0000-000000000015", name: "Boston, MA" },
  { id: "00000000-0000-0000-0000-000000000016", name: "Dallas, TX" },
  { id: "00000000-0000-0000-0000-000000000017", name: "Austin, TX" },
  { id: "00000000-0000-0000-0000-000000000018", name: "Tampa, FL" },
  { id: "00000000-0000-0000-0000-000000000019", name: "Phoenix, AZ" },
  { id: "00000000-0000-0000-0000-000000000020", name: "San Diego, CA" },
  { id: "00000000-0000-0000-0000-000000000021", name: "New Orleans, LA" },
];

export default function SignUpForm() {
  const navigate = useNavigate();
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      branchId: '',
    },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    try {
      await signUp({
        email: values.email,
        password: values.password,
        username: `${values.firstName}.${values.lastName}`.toLowerCase(),
        branch: values.branchId, // Pass the branch UUID
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
      });
      
      navigate('/dashboard');
    } catch (error) {
      form.setError('root', {
        message: error.message || 'Something went wrong',
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Create an Account</h2>
          <p className="text-muted-foreground mt-2">Sign up to get started</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-red-500 text-sm">{form.formState.errors.root.message}</p>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

