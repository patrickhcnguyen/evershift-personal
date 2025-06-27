import { Amplify } from 'aws-amplify';
import { signUp as amplifySignUp, signIn as amplifySignIn, signOut as amplifySignOut, getCurrentUser } from 'aws-amplify/auth';
import { error } from 'console';
// import { Auth } from 'node_modules/@supabase/auth-ui-react/dist/components/Auth';
import Cookies from 'js-cookie';
import { v4 as uuidv4 } from 'uuid'; 


Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'your-user-pool-id',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'your-client-id',
    //   region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
    }
  }
});

type AdminSignUpData = {
    email: string;
    password: string;
    username: string;
    branch: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
}

// Helper function to format phone number to E.164 format
const formatPhoneNumber = (phoneNumber: string): string => {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If it's a US number (10 digits), add +1
    if (digits.length === 10) {
        return `+1${digits}`;
    }
    
    // If it already has country code (11 digits starting with 1), add +
    if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
    }
    
    // If it already starts with +, return as is
    if (phoneNumber.startsWith('+')) {
        return phoneNumber;
    }
    
    // Default: assume US number and add +1
    return `+1${digits}`;
};

export const signUp = async ({ email, password, username, branch, firstName, lastName, phoneNumber }: AdminSignUpData) => {
    try {
        const userAttributes: any = {
            email: email,
            given_name: firstName || username,
            family_name: lastName || '',
            'custom:branch_id': branch, 
        };

        if (phoneNumber && phoneNumber.trim()) {
            userAttributes.phone_number = formatPhoneNumber(phoneNumber);
        }

        // Use non-email username for signup (firstname.lastname format)
        const { isSignUpComplete, userId, nextStep } = await amplifySignUp({
            username: username, 
            password: password,
            options: {
                userAttributes,
                autoSignIn: true
            }
        });

        console.log('Cognito signup result:', { isSignUpComplete, userId, nextStep });

        const dbUuid = uuidv4();
        
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/post-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    uuid: dbUuid, 
                    name: `${firstName} ${lastName}`,
                    email: email,
                    role: 'employee',
                    branch_id: branch,
                    cognito_user_id: userId 
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to save user to database:', errorText);
            } else {
                console.log('User successfully saved to database');
            }
        } catch (dbError) {
            console.error('Database save error:', dbError);
        }

        if (isSignUpComplete) {
            return { user: { id: userId } };
        } else if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
            return { user: { id: userId }, needsConfirmation: true };
        } else {
            throw new Error(`Unexpected signup step: ${nextStep.signUpStep}`);
        }
    } catch (error) {
        console.error('Signup error:', error);
        throw new Error(error.message || 'Sign up failed');
    }
}

// Sign-in uses EMAIL 
export const signIn = async (email: string, password: string) => {
    try {
        const { isSignedIn, nextStep } = await amplifySignIn({
            username: email, 
            password: password
        });

        if (isSignedIn) {
            console.log('API URL:', import.meta.env.VITE_API_URL || import.meta.env.VITE_AWS_URL);
            console.log('Fetching user data for email:', email);
            
            const res = await fetch(`${import.meta.env.VITE_API_URL}/get-user-data?email=${encodeURIComponent(email)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (res.ok) {
                const userData = await res.json();
                console.log('Fetched user data:', userData);
                
                const cookieOptions = { 
                    expires: 7,
                    secure: window.location.protocol === 'https:',
                    sameSite: 'strict' as const
                };
                
                Cookies.set('user_id', userData.id, cookieOptions);
                Cookies.set('user_email', userData.email, cookieOptions);
                Cookies.set('user_role', userData.role || 'employee', cookieOptions);
                Cookies.set('user_branch_id', userData.branch || userData.branch_id, cookieOptions); 
                Cookies.set('user_name', `${userData.first_name} ${userData.last_name}`, cookieOptions);
                
                // Cookies.set('user_data', JSON.stringify({
                //     id: userData.id,
                //     email: userData.email,
                //     first_name: userData.first_name,
                //     last_name: userData.last_name,
                //     role: userData.role || 'employee',
                //     branch_id: userData.branch || userData.branch_id,
                //     full_name: `${userData.first_name} ${userData.last_name}`
                // }), cookieOptions);
                
                console.log('User metadata stored in cookies:', {
                    role: userData.role,
                    branch_id: userData.branch || userData.branch_id
                });
            } else {
                const errorText = await res.text();
                console.error('Failed to fetch user data:', errorText);
                throw new Error('Failed to fetch user profile data');
            }

            return { user: await getCurrentUser() };
        } else {
            throw new Error(`Sign in incomplete: ${nextStep.signInStep}`);
        }
    } catch (error) {
        console.error('Sign in error:', error);
        throw new Error(error.message || 'Sign in failed');
    }
}

// Enhanced helper functions
export const getUserFromCookies = () => {
    const userData = Cookies.get('user_data');
    if (!userData) return null;
    
    try {
        return JSON.parse(userData);
    } catch (error) {
        console.error('Error parsing user data from cookies:', error);
        return null;
    }
}

export const getUserRole = (): string | null => {
    return Cookies.get('user_role') || null;
}

export const getUserBranchId = (): string | null => {
    return Cookies.get('user_branch_id') || null;
}

export const getUserBranch = (): string | null => {
    // Maintain backward compatibility
    return getUserBranchId();
}

// New helper function to check if user has specific role
export const hasRole = (requiredRole: string): boolean => {
    const userRole = getUserRole();
    return userRole === requiredRole;
}

// New helper function to check if user belongs to specific branch
export const belongsToBranch = (branchId: string): boolean => {
    const userBranchId = getUserBranchId();
    return userBranchId === branchId;
}

export const signOut = async () => {
    try {
        await amplifySignOut();
        
        // Clear all user-related cookies
        const cookiesToClear = [
            'user_id',
            'user_email', 
            'user_role',
            'user_branch',
            'user_branch_id',
            'user_name',
            'user_data'
        ];
        
        cookiesToClear.forEach(cookie => Cookies.remove(cookie));
        
        console.log('User signed out and cookies cleared');
    } catch (error) {
        console.error('Sign out error:', error);
        throw new Error('Sign out failed');
    }
}