import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

interface TestEmailRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;

    if (!resendApiKey) {
      return NextResponse.json({
        error: 'RESEND_API_KEY environment variable is not configured',
        code: 'MISSING_RESEND_API_KEY'
      }, { status: 500 });
    }

    if (!emailFrom) {
      return NextResponse.json({
        error: 'EMAIL_FROM environment variable is not configured',
        code: 'MISSING_EMAIL_FROM'
      }, { status: 500 });
    }

    // Parse and validate request body
    let requestBody: TestEmailRequest;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid JSON format',
        code: 'INVALID_JSON'
      }, { status: 400 });
    }

    const { email } = requestBody;

    // Validate required fields
    if (!email) {
      return NextResponse.json({
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT'
      }, { status: 400 });
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // HTML email template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Test Gas Alert Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Test Gas Alert Email</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>This is a test email to verify that your gas alert notifications are working correctly.</p>
              <p>If you received this email, it means:</p>
              <ul>
                <li>Your email address is properly configured</li>
                <li>Our email delivery system is functioning</li>
                <li>You will receive alerts when gas price conditions are met</li>
              </ul>
              <p>You can safely ignore this test email. No further action is required.</p>
              <p>Thank you for using our gas alert service!</p>
            </div>
            <div class="footer">
              <p>This is an automated test email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend
    const result = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: 'Test Gas Alert Email',
      html: htmlBody,
    });

    // Check if email was sent successfully
    if (result.error) {
      console.error('Resend error:', result.error);
      return NextResponse.json({
        error: 'Failed to send test email',
        code: 'EMAIL_SEND_FAILED',
        details: result.error
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}