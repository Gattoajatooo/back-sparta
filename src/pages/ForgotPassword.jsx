import React, { useState } from "react";
import { Users } from "@/entities/Users";
import { Company } from "@/entities/Company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Mail, 
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ForgotPassword() {
  const [formData, setFormData] = useState({
    company: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState([]);

  React.useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const companyList = await Company.list();
      setCompanies(companyList);
    } catch (error) {
      console.error("Error loading companies:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Find the company
      const company = companies.find(c => 
        c.name.toLowerCase() === formData.company.toLowerCase()
      );

      if (!company) {
        setError('Company not found. Please check the company name.');
        setIsLoading(false);
        return;
      }

      // Find the user by email within the company
      const users = await Users.filter({ company_id: company.id });
      const user = users.find(u => 
        u.email.toLowerCase() === formData.email.toLowerCase()
      );

      if (!user) {
        setError('User not found in this company. Please check your email address.');
        setIsLoading(false);
        return;
      }

      // In a real application, you would send a password reset email here
      // For now, we'll just show a success message
      setSuccess(true);

    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Failed to process request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl shadow-xl">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset Email Sent</h2>
            <p className="text-gray-600 mb-6">
              We've sent password reset instructions to your email address.
            </p>
            <Link to={createPageUrl("Login")}>
              <Button className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700">
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Reset Password
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Enter your company and email to reset your password
          </p>
        </CardHeader>

        <CardContent className="p-8">
          {error && (
            <Alert variant="destructive" className="mb-6 rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Field */}
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <div className="relative">
                <Building2 className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({...prev, company: e.target.value}))}
                  placeholder="Your company name"
                  className="pl-10 rounded-2xl border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                  placeholder="your@email.com"
                  className="pl-10 rounded-2xl border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 h-12 text-base font-medium"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send Reset Instructions
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <Link to={createPageUrl("Login")}>
              <Button variant="ghost" className="text-blue-600 hover:text-blue-700 rounded-2xl">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}