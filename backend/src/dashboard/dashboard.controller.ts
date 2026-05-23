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
}
