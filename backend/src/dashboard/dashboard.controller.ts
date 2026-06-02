import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Req() req: any) {
    return this.dashboardService.getStats(req.user.id);
  }

  @Get('time-report')
  getTimeReport(
    @Query('projectId') projectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getTimeReport({
      projectId: projectId ? Number(projectId) : undefined,
      from,
      to,
    });
  }

  @Get('invoice-report')
  getInvoiceReport(
    @Query('clientId') clientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getInvoiceReport({
      clientId: clientId ? Number(clientId) : undefined,
      from,
      to,
    });
  }

  @Get('vendor')
  getVendorDashboard(@Req() req: any) {
    const vendorId = req.user.vendor?.id;
    if (!vendorId) throw new Error('Not a vendor user');
    return this.dashboardService.getVendorDashboard(vendorId);
  }

  @Get('pm')
  getPMDashboard(@Req() req: any) {
    return this.dashboardService.getPMDashboard(req.user.id);
  }

  @Get('am')
  getAMDashboard(@Req() req: any) {
    return this.dashboardService.getAMDashboard(req.user.id);
  }

  @Get('client')
  getClientDashboard(@Req() req: any) {
    const clientId = req.user.client?.id;
    if (!clientId) throw new Error('Not a client user');
    return this.dashboardService.getClientDashboard(clientId);
  }
}
