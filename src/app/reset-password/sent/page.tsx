import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Mail, ArrowLeft, RefreshCw } from "lucide-react"

export default function ResetPasswordSentPage() {
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

        {/* Success Card */}
        <Card className="border border-border shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Check your email
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              We&apos;ve sent a password reset link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Info */}
            <div className="rounded-lg bg-muted/50 p-4 border border-border/50">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Email sent to
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    user@example.com
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">
                Next steps:
              </h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-medium flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Check your email inbox for a message from Astra</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-medium flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Click the &quot;Reset Password&quot; button in the email</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-medium flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Create a new, secure password for your account</span>
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Resend email
              </Button>

              <div className="text-center">
                <Link
                  href="/auth"
                  className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to sign in
                </Link>
              </div>
            </div>

            {/* Help Section */}
            <div className="border-t pt-6" style={{borderColor: '#EAEDF0'}}>
              <h4 className="text-sm font-medium text-foreground mb-3">
                Didn&apos;t receive the email?
              </h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Check your spam or junk folder</p>
                <p>• Make sure the email address is correct</p>
                <p>• Wait a few minutes for the email to arrive</p>
              </div>
              <div className="mt-4">
                <Link
                  href="#"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Still need help? Contact support
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            The reset link will expire in 24 hours for your security
          </p>
        </div>
      </div>
    </div>
  )
}