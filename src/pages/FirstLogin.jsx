import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { Role } from "@/entities/Role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Key,
  User as UserIcon,
  Building2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function FirstLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [token, setToken] = useState('');
  const [userData, setUserData] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    // Company data for users without company
    company_name: '',
    company_industry: '',
    company_website: '',
    company_phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      // First check if there's a token in the URL (invitation flow)
      const urlParams = new URLSearchParams(window.location.search);
      const inviteToken = urlParams.get('token');
      
      if (inviteToken) {
        setToken(inviteToken);
        await validateToken(inviteToken);
        return;
      }

      // No token, check if user is logged in
      const user = await User.me();
      
      if (!user.company_id) {
        // User exists but has no company - needs to create one and become owner
        setIsNewUser(true);
        setUserData(user);
        setFormData(prev => ({
          ...prev,
          full_name: user.full_name || '',
          phone: user.phone || ''
        }));
        return;
      }

      // If user has company_id, redirect to dashboard
      if (user.company_id) {
        navigate(createPageUrl("Dashboard"));
        return;
      }

    } catch (error) {
      // User not logged in, redirect to login
      console.error("User not authenticated:", error);
      setError('Please log in to continue');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  };

  const validateToken = async (inviteToken) => {
    try {
      // Handle owner setup tokens differently
      if (inviteToken.startsWith('owner_setup_')) {
        const userId = inviteToken.replace('owner_setup_', '');
        const users = await User.list();
        const ownerUser = users.find(u => u.id === userId);
        
        if (!ownerUser) {
          setError('Invalid setup link');
          return;
        }

        if (ownerUser.first_login_completed) {
          setError('Account setup has already been completed. Please use the regular login page.');
          return;
        }

        setUserData(ownerUser);
        setFormData(prev => ({
          ...prev,
          full_name: ownerUser.full_name || '',
          phone: ownerUser.phone || ''
        }));
        return;
      }

      // Regular invitation token validation
      const users = await User.list();
      const invitedUser = users.find(u => u.invitation_token === inviteToken);
      
      if (!invitedUser) {
        setError('Invalid or expired invitation token');
        return;
      }

      if (invitedUser.invitation_status === 'expired') {
        setError('This invitation has expired. Please contact your administrator for a new invitation.');
        return;
      }

      if (invitedUser.first_login_completed) {
        setError('This invitation has already been used. Please use the regular login page.');
        return;
      }

      setUserData(invitedUser);
      setFormData(prev => ({
        ...prev,
        full_name: invitedUser.full_name || '',
        phone: invitedUser.phone || ''
      }));
    } catch (error) {
      console.error('Error validating token:', error);
      setError('Unable to validate invitation. Please try again.');
    }
  };

  const createDefaultRoles = async (companyId) => {
    const defaultRoles = [
      {
        company_id: companyId,
        name: "Owner",
        description: "Full system access and control",
        is_system_role: true,
        permissions: {
          dashboard: "edit",
          contacts: "full",
          campaigns: "full",
          activities: "full",
          team: "full",
          settings: "full",
          reports: "edit"
        },
        restrictions: {
          can_export_data: true,
          can_delete_records: true,
          can_view_all_contacts: true
        }
      },
      {
        company_id: companyId,
        name: "Administrator",
        description: "Administrative access to most features",
        is_system_role: true,
        permissions: {
          dashboard: "edit",
          contacts: "full",
          campaigns: "full",
          activities: "full",
          team: "edit",
          settings: "view",
          reports: "edit"
        },
        restrictions: {
          can_export_data: true,
          can_delete_records: true,
          can_view_all_contacts: true
        }
      },
      {
        company_id: companyId,
        name: "Viewer",
        description: "Read-only access to basic features",
        is_system_role: true,
        permissions: {
          dashboard: "view",
          contacts: "view",
          campaigns: "view",
          activities: "view",
          team: "none",
          settings: "none",
          reports: "view"
        },
        restrictions: {
          can_export_data: false,
          can_delete_records: false,
          can_view_all_contacts: true
        }
      }
    ];

    for (const role of defaultRoles) {
      try {
        await Role.create(role);
      } catch (error) {
        console.log(`Role ${role.name} creation failed (may already exist):`, error);
      }
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (password) => {
    setFormData(prev => ({...prev, password}));
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (step === 1) {
        // Password validation step
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }

        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long');
          setIsLoading(false);
          return;
        }

        // If user is new user without company, go to company info
        if (isNewUser) {
          setStep(2);
        } else {
          // If invited user, go to personal info
          setStep(3);
        }
      } else if (step === 2 && isNewUser) {
        // Company info step for new users
        if (!formData.company_name.trim()) {
          setError('Company name is required');
          setIsLoading(false);
          return;
        }
        setStep(3);
      } else {
        // Complete the setup
        let companyId = userData.company_id;

        // If this is a new user without company, create the company first
        if (isNewUser && !userData.company_id) {
          const newCompany = await Company.create({
            name: formData.company_name,
            industry: formData.company_industry || '',
            website: formData.company_website || '',
            phone: formData.company_phone || '',
            owner_id: userData.id
          });

          companyId = newCompany.id;

          // Create default roles for the new company
          await createDefaultRoles(companyId);

          // Update user with company_id and owner role
          await User.updateMyUserData({
            full_name: formData.full_name,
            phone: formData.phone,
            company_id: companyId,
            system_role: 'owner',
            role: 'owner',
            first_login_completed: true,
            password_set_date: new Date().toISOString(),
            last_login: new Date().toISOString()
          });
        } else {
          // Regular invitation completion or existing user
          const updateData = {
            full_name: formData.full_name,
            phone: formData.phone,
            first_login_completed: true,
            password_set_date: new Date().toISOString(),
            last_login: new Date().toISOString()
          };

          // If user had no company but was created elsewhere, set as owner
          if (!userData.company_id && isNewUser) {
            updateData.system_role = 'owner';
            updateData.role = 'owner';
          }

          if (token && !token.startsWith('owner_setup_')) {
            updateData.invitation_status = 'accepted';
          }

          await User.update(userData.id, updateData);
        }

        // Navigate to dashboard
        navigate(createPageUrl("Dashboard"));
      }
    } catch (error) {
      console.error('Error during setup:', error);
      setError('Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 30) return 'bg-red-500';
    if (passwordStrength < 60) return 'bg-yellow-500';
    if (passwordStrength < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 30) return 'Weak';
    if (passwordStrength < 60) return 'Fair';
    if (passwordStrength < 80) return 'Good';
    return 'Strong';
  };

  if (error && !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Setup Required</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => navigate('/')}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalSteps = isNewUser ? 3 : 2;
  const progressValue = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg rounded-3xl shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            {isNewUser ? <Building2 className="w-8 h-8 text-white" /> : <Shield className="w-8 h-8 text-white" />}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isNewUser ? 'Welcome! Set Up Your Company 🎉' : 'Welcome to the Team! 🎉'}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {isNewUser ? 'Complete your company setup to get started' : 'Complete your account setup to get started'}
          </p>
          
          {/* Progress Indicator */}
          <div className="mt-6">
            <Progress value={progressValue} className="h-2 rounded-full" />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {error && (
            <Alert variant="destructive" className="mb-6 rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 ? (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Key className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Create Your Password</h3>
                  <p className="text-sm text-gray-600">Choose a strong password to secure your account</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Enter your password"
                      className="rounded-2xl border-gray-200 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Password strength</span>
                        <span className={`font-medium ${
                          passwordStrength < 30 ? 'text-red-600' :
                          passwordStrength < 60 ? 'text-yellow-600' :
                          passwordStrength < 80 ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {getPasswordStrengthLabel()}
                        </span>
                      </div>
                      <Progress 
                        value={passwordStrength} 
                        className={`h-2 rounded-full ${getPasswordStrengthColor()}`}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                      placeholder="Confirm your password"
                      className="rounded-2xl border-gray-200 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {formData.confirmPassword && (
                    <div className="flex items-center gap-2 text-sm">
                      {formData.password === formData.confirmPassword ? (
                        <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-green-600">Passwords match</span></>
                      ) : (
                        <><AlertCircle className="w-4 h-4 text-red-600" /><span className="text-red-600">Passwords don't match</span></>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-center gap-2">
                      {formData.password.length >= 8 ? 
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> : 
                        <div className="w-3 h-3 border border-gray-300 rounded-full" />
                      }
                      At least 8 characters
                    </li>
                    <li className="flex items-center gap-2">
                      {/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) ? 
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> : 
                        <div className="w-3 h-3 border border-gray-300 rounded-full" />
                      }
                      Upper and lowercase letters
                    </li>
                    <li className="flex items-center gap-2">
                      {/[0-9]/.test(formData.password) ? 
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> : 
                        <div className="w-3 h-3 border border-gray-300 rounded-full" />
                      }
                      At least one number
                    </li>
                  </ul>
                </div>
              </div>
            ) : step === 2 && isNewUser ? (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
                  <p className="text-sm text-gray-600">Tell us about your company</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({...prev, company_name: e.target.value}))}
                      placeholder="Your company name"
                      className="rounded-2xl border-gray-200"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_industry">Industry</Label>
                    <Input
                      id="company_industry"
                      value={formData.company_industry}
                      onChange={(e) => setFormData(prev => ({...prev, company_industry: e.target.value}))}
                      placeholder="e.g., Technology, Healthcare, Finance"
                      className="rounded-2xl border-gray-200"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_website">Website</Label>
                      <Input
                        id="company_website"
                        value={formData.company_website}
                        onChange={(e) => setFormData(prev => ({...prev, company_website: e.target.value}))}
                        placeholder="https://yourcompany.com"
                        className="rounded-2xl border-gray-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company_phone">Phone</Label>
                      <Input
                        id="company_phone"
                        value={formData.company_phone}
                        onChange={(e) => setFormData(prev => ({...prev, company_phone: e.target.value}))}
                        placeholder="+1 (555) 123-4567"
                        className="rounded-2xl border-gray-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <UserIcon className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Complete Your Profile</h3>
                  <p className="text-sm text-gray-600">Add your personal information</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
                    placeholder="Your full name"
                    className="rounded-2xl border-gray-200"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                    placeholder="+1 (555) 123-4567"
                    className="rounded-2xl border-gray-200"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-blue-800 text-sm font-medium mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Almost Done!
                  </div>
                  <p className="text-sm text-blue-700">
                    {isNewUser 
                      ? "You're about to create your company and gain full access to the CRM system."
                      : "You're about to join the team and gain access to the CRM system."
                    }
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 h-12 text-base font-medium"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                step === totalSteps ? 'Complete Setup' : 'Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}