import type { InvitationContentInput } from "../models/invitation.model";

export const invitationContent = (input: InvitationContentInput) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #f4f6f8;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 8px 24px rgba(0,0,0,0.05);
            }
            .header {
              background: linear-gradient(135deg, #4f46e5, #7c3aed);
              color: white;
              padding: 32px;
              text-align: center;
              font-size: 20px;
              font-weight: 600;
            }
            .content {
              padding: 32px;
              color: #111827;
            }
            .content p {
              margin: 0 0 16px;
              line-height: 1.6;
              font-size: 15px;
            }
            .highlight {
              font-weight: 600;
              color: #4f46e5;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 14px 24px;
              background: #4f46e5;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 500;
              font-size: 14px;
            }
            .footer {
              padding: 24px;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            }
            .link {
              word-break: break-all;
              color: #4f46e5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              You're invited 🎉
            </div>
    
            <div class="content">
              <p>Hello,</p>
    
              <p>
                <span class="highlight">${input.currentUserName}</span> invited you to join 
                <span class="highlight">${input.organizationName}</span> on <strong>Collabill</strong>.
              </p>
    
              <p>
                You will join as a <strong>${input.role}</strong>.
              </p>
    
              <p style="text-align:center;">
                <a href="${input.inviteLink}" class="button">
                  Accept Invitation
                </a>
              </p>
    
              <p>
                This invitation will expire in <strong>7 days</strong>.
              </p>
            </div>
    
            <div class="footer">
              © ${new Date().getFullYear()} Collabill — All rights reserved
            </div>
          </div>
        </body>
      </html>
      `;
