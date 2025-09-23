import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, Shield, Clock } from "lucide-react"

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">
            <span className="text-primary">Astra</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            E-commerce Dashboard
          </p>
        </div>

        {/* Reset Password Form Card */}
        <Card className="border shadow-lg" style={{borderColor: '#EAEDF0'}}>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Reset your password
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your email address and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll send a password reset link to this email
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Send reset link
              </Button>
            </form>

            {/* Back to login */}
            <div className="text-center">
              <Link
                href="/auth"
                className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to sign in
              </Link>
            </div>

            {/* Information Section */}
            <div className="space-y-4 border-t pt-6" style={{borderColor: '#EAEDF0'}}>
              <h3 className="text-sm font-medium text-foreground">
                What happens next?
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                    <Mail className="h-3 w-3 text-primary" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Check your email:</strong> We&apos;ll send a secure reset link to your inbox
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                    <Shield className="h-3 w-3 text-primary" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Click the link:</strong> Follow the secure link to create a new password
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                    <Clock className="h-3 w-3 text-primary" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Link expires:</strong> The reset link will be valid for 24 hours
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="rounded-lg p-4 border" style={{backgroundColor: 'rgba(248, 249, 250, 0.5)', borderColor: 'rgba(234, 237, 240, 0.5)'}}>
              <h4 className="text-sm font-medium text-foreground mb-2">
                Need help?
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                If you don&apos;t receive the email within a few minutes, check your spam folder or contact your administrator.
              </p>
              <div className="flex flex-col space-y-2">
                <Link
                  href="#"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Contact Administrator
                </Link>
                <Link
                  href="#"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Having trouble? Get support
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Your security is important to us.{" "}
            <Link href="#" className="text-primary hover:text-primary/80">
              Learn more
            </Link>{" "}
            about how we protect your account
          </p>
        </div>
      </div>
    </div>
  )
}