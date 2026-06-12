import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {}

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port:   this.config.get<number>('SMTP_PORT') ?? 587,
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    } else {
      // Dev fallback: Ethereal test account — preview URL logged to console
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host:   'smtp.ethereal.email',
        port:   587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      this.logger.warn('No SMTP_HOST configured — using Ethereal test account. Preview emails at https://ethereal.email');
    }

    return this.transporter;
  }

  async sendInvoiceSent(opts: {
    toEmail:       string;
    toName:        string;
    invoiceNumber: string;
    projectName:   string;
    total:         string;
    currency:      string;
    dueDate:       string;
    fromName:      string;
  }) {
    const transport = await this.getTransporter();
    const fromAddress = this.config.get<string>('SMTP_FROM') ?? 'noreply@pmtool.local';

    const info = await transport.sendMail({
      from:    `"${opts.fromName}" <${fromAddress}>`,
      to:      `"${opts.toName}" <${opts.toEmail}>`,
      subject: `Invoice ${opts.invoiceNumber} is ready for your review`,
      text: [
        `Hi ${opts.toName},`,
        '',
        `Invoice ${opts.invoiceNumber} has been sent to you for review.`,
        '',
        `  Project : ${opts.projectName}`,
        `  Amount  : ${opts.currency} ${opts.total}`,
        `  Due     : ${opts.dueDate}`,
        '',
        'Please log in to the PM Tool to review and approve this invoice.',
        '',
        `Best regards,`,
        opts.fromName,
      ].join('\n'),
      html: `
        <p>Hi ${opts.toName},</p>
        <p>Invoice <strong>${opts.invoiceNumber}</strong> has been sent to you for review.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Project</td><td><strong>${opts.projectName}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Amount</td><td><strong>${opts.currency} ${opts.total}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Due</td><td><strong>${opts.dueDate}</strong></td></tr>
        </table>
        <p>Please <a href="${this.config.get('FRONTEND_URL') ?? 'http://localhost:5173'}/invoices">log in to the PM Tool</a> to review and approve this invoice.</p>
        <p>Best regards,<br>${opts.fromName}</p>
      `,
    });

    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      this.logger.log(`Invoice sent email preview: ${preview}`);
    }
  }
}
